# Mia AI Development — Work Log

## Overview

This document covers the iterative development of the computer opponent for Mia, including
heuristic tuning, a self-play training framework, analysis of what the trained agent learned,
and how those findings were applied back to the live computer player.

---

## Phase 1: Heuristic Tuning

The computer player (`getAIMove` in `src/services/game.ts`) started as a simple probability-
based agent. Several rounds of tuning improved its strategic behavior.

### Adding Pass Moves

The original agent never passed — it always rerolled or challenged. Passing without rerolling
is a legitimate move that keeps the opponent guessing (they can't tell if you're confident in
the dice or just passing the problem along). A 15% pass rate was added to the non-challenge,
non-doubles path.

### Better Challenge Probabilities

The original challenge formula `0.1 + (claim.value / 20) * 0.45` gave only ~10% challenge
rate for low claims. This was revised to:

- **Low values (ranks 0–7, e.g. 31–53):** flat 25% challenge — low claims are suspicious and
  the cost of a wrong challenge is the same regardless of claim value
- **Mid/high non-doubles (ranks 8–13):** scales from ~32% to ~39%
- **Doubles (ranks 14–19):** separate handling (see below)

### Doubles Handling

Rolling to beat a double requires rolling another double or Mia — roughly a 1-in-6 shot at
best, declining as the claimed double gets higher. The agent was updated to challenge doubles
~78% of the time and pass ~15%, with only a small chance of attempting to roll.

### Life-Count Dependent Mia Decisions

The original agent used a fixed 55% challenge / 45% give-up split for Mia regardless of the
game state. This ignores a critical asymmetry: a wrong Mia challenge costs 2 lives instead
of 1.

The updated logic:

| Situation             | Decision                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| My lives = 1          | Always challenge — giving up is guaranteed death, challenging at least has upside |
| Opponent lives = 1    | 70% challenge — a correct challenge ends the game                                 |
| Opponent lives ≤ 2    | 50% challenge — elevated stakes                                                   |
| Comfortable (both 3+) | 25% challenge — minimize risk of the 2-life penalty                               |

### Bug Fix: Pass as Original Caller

The engine rejects a pass move if the player is the original caller (the dice have gone full
circle and they must challenge or raise). The AI was not checking for this, so it could
occasionally try to pass in that situation and cause a game error. Fixed by guarding all pass
returns with `state.originalCaller !== state.turnPlayer`.

---

## Phase 2: Self-Play Training Framework

To systematically evaluate and improve the agent, a self-play training framework was built
in `src/ai/`.

### Architecture

**`src/ai/agent.ts`** — `Agent` interface: `selectAction(state, player)` and optional
`onGameEnd(winner, myPlayer)` callback for learning.

**`src/ai/simulator.ts`** — Synchronous game loop that drives two agents against each other
without the database or WebSocket layer. Auto-advances `challenge_ack` and `round_end_ack`
phases (no strategic decision needed) and only calls agents for actual choices.

**`src/ai/rule-agent.ts`** — The hand-tuned heuristic agent wrapped as an `Agent`, used as
a benchmark baseline.

**`src/ai/tabular-agent.ts`** — Policy gradient agent. Discretizes the game state into an
information set key and maintains a softmax distribution over actions per key. Updated via
centered REINFORCE after each game:

```
// for each (infoset, action) taken:
logit[action]  += lr * reward * (1 - π(action))   // taken action
logit[other]   -= lr * reward * π(other)           // all other actions
```

The centered update keeps logit scale stable (net change sums to zero) while shifting mass
toward winning actions.

**Information set key:** `situation : claimBucket : diceRelation : myLives : opLives`

- `situation`: start / respond / respond_orig / mia
- `claimBucket`: none / low (0–7) / mid (8–13) / double (14–19) / mia (20)
- `diceRelation`: first / above / equal / below / hidden
- `myLives`, `opLives`: 1–5

**`scripts/train.ts`** — Runs 50k self-play games between two tabular agents, reports win
rates every 5k games, benchmarks the trained agent against the rule agent, and saves the
policy to `src/ai/policy.json`. Run with `bun run train`.

---

## Phase 3: Training Results and Analysis

### Summary Stats

- **50,000 self-play games**, 5 lives each
- **196 information sets** discovered — the full reachable state space, explored within the
  first few thousand games
- **Self-play win rate:** ~50/50 throughout (expected for symmetric agents)
- **Trained agent vs rule-based:** 72% win rate

### What the Agent Learned

**Mia is strongly life-count dependent.** The trained agent effectively discovered the same
logic applied in Phase 1 — challenge when desperate or when opponent is vulnerable, give up
when comfortable. At 1v1 it challenges ~97% of the time, which is correct (giving up at 1
life is guaranteed death). At 4v4 it gives up ~84% of the time.

**Doubles should almost always be challenged.** In the respond (not original caller) path,
doubles were challenged 75–98% of the time. Rolling a double or Mia to beat another double
is ~17% at best.

**Pass is very popular for low and mid values.** The trained agent passes 80–99% of the
time on low/mid claims when not the original caller. Passing transfers responsibility —
the opponent becomes the original caller and cannot pass back.

**Opening claims converged toward honesty.** Both agents settled at 90–99% honest for first
claims. In a symmetric equilibrium, bluffing is partly self-defeating because both sides
calibrate their challenge rates accordingly.

### Strategy Is Opponent-Dependent

Applying the trained agent's strategies to the rule agent and benchmarking against the trained
agent showed a _decrease_ in win rate (from 28% to 24.8%). The trained agent had calibrated
to exploit the original rule agent's tendencies. Making the rule agent behave more like the
trained agent made it more legible to that opponent.

This illustrates the key limitation of self-play RL: it finds strategies that work against a
specific class of opponents, not universal strategies. CFR would produce unexploitable
equilibrium play instead.

---

## Phase 4: Dice-Aware Original Caller Logic

The most significant insight came from observing that the training framework had a blind spot:
when the dice return to the original caller (`respond_orig` situation), `diceRelation` was
always `'hidden'` because `canSeeDice` checks `lastRoller === player && turnPlayer === player`,
which is false after a pass resets `lastRoller` to null.

But the original caller **did** roll those dice. In the live game, `state.dice` always holds
the original caller's own roll in the `respond_orig` situation — because `originalCaller` is
only ever set by `makeClaim` or `rollAndRaise`, both of which write that player's dice into
`state.dice`. The pass move does not change `state.dice`.

This means the original caller has **perfect information** about whether a challenge wins:
if `diceRank(state.dice) < claim.value`, the claim is inflated and a challenge is guaranteed
to succeed.

### Updated Logic

```typescript
if (state.originalCaller === state.turnPlayer) {
  // originalCaller is only set via makeClaim or rollAndRaise — both write the
  // caller's own dice into state.dice. This is the CPU's own roll, not cheating.
  const actualRank = state.dice ? diceRank(state.dice) : claim.value
  if (actualRank < claim.value) {
    // Claim is inflated — challenge almost always (small variance for unpredictability)
    return Math.random() < 0.93 ? { type: 'challenge' } : { type: 'roll_raise', ... }
  }
  // Dice support the claim — raise
  return { type: 'roll_raise', value: Math.min(20, claim.value + 1 + bluffExtra) }
}
```

The 7% non-challenge rate when the AI knows it would win is intentional: always challenging
when bluffed would reveal the AI's knowledge to a human observer.

### Impact

Benchmarking the dice-aware rule agent against the trained tabular agent (which never had
this information) showed a win rate jump from 24.8% → **57.5%**. The trained agent's
`respond_orig` policy was entirely learned without dice visibility and is therefore easily
exploited by an agent that does use it.

---

## Files Changed

| File                      | Change                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/services/game.ts`    | `getAIMove`: pass guard, life-aware Mia, dice-aware respond_orig, better doubles/challenge probabilities |
| `src/ai/agent.ts`         | New — Agent interface                                                                                    |
| `src/ai/simulator.ts`     | New — synchronous game simulator                                                                         |
| `src/ai/rule-agent.ts`    | New — heuristic agent for benchmarking                                                                   |
| `src/ai/tabular-agent.ts` | New — tabular policy gradient agent                                                                      |
| `src/ai/policy.json`      | New — saved policy from 50k self-play games                                                              |
| `scripts/train.ts`        | New — self-play training loop                                                                            |
| `docs/ai-training.md`     | New — planning document for AI training approaches                                                       |
| `docs/ai-development.md`  | New — this document                                                                                      |

---

## Limitations and Next Steps

**Training framework blind spot:** The tabular agent's information set uses `diceRelation =
'hidden'` in respond_orig, so it never learns to use its own dice knowledge. A proper fix
would track "what did I last roll" as a separate memory field alongside the game state.

**Self-play finds exploitable strategies:** The trained policy is strong against a specific
opponent but not unexploitable. CFR (Counterfactual Regret Minimization) would produce a
Nash equilibrium strategy that cannot be exploited regardless of opponent behavior. Given the
small state space (196 information sets), CFR is tractable.

**Opponent modeling:** The current agent has no memory across rounds. Tracking the opponent's
challenge frequency per claim bucket over the last N rounds and conditioning on it would allow
the agent to exploit human tendencies (e.g., a human who never challenges low values should
be bluffed low more often).
