# Training an AI to Play Mia

## Game Dynamics

Mia is a **partial-information bluffing game** with two key tensions:

1. **Information asymmetry**: The roller sees the dice; the opponent doesn't. Every claim is
   unverifiable — a player claiming "65" might have 65, or might have 32.
2. **Risk asymmetry at Mia**: A Mia challenge costs 1 life to the bluffer but 2 to the wrong
   challenger. This creates a non-uniform payout matrix unique to the highest-ranked hand.

The state space is small but the strategic space is large because optimal play depends on
beliefs about the opponent's tendencies, not just the dice.

## Information Model

**Public state (both players know):**

- Current claimed rank
- Lives remaining for each player
- Whether the claim has been passed, and how many times
- Round history within the game

**Private state (only the roller knows):**

- Actual dice value under the cup

**Latent / inferred:**

- Opponent's bluffing frequency at each rank
- Opponent's challenge threshold
- Whether the opponent tracks your own bluffing patterns

A player's **information set** at decision time can be represented as:

```
{
  myLives: 1–5,
  opponentLives: 1–5,
  claimValue: 0–20 | null,   // null = first claim this round
  myDiceRank: 0–20 | null,   // null = I didn't just roll
  isOriginalCaller: boolean,  // if true, I cannot pass
  passCount: number           // how many times claim has been passed
}
```

## Why This Is Interesting for AI

The game is a **repeated Bayesian signaling game** — every action is a signal that updates the
opponent's model of you, and vice versa. Pure Nash equilibria exist (mixed strategies at each
decision point), but the highest-skill play involves:

- **Exploiting opponent tendencies**: if the human never challenges low claims, bluff low more
- **Mixing unpredictably**: never be so predictable that you're exploitable
- **Life-count awareness**: risk tolerance should change with lives. At 1 life, avoid 50/50
  gambles. At 5 lives, aggressive play has positive expected value.

## Training Approaches

### 1. Self-Play with Reinforcement Learning

Train two agents to play against each other, rewarding wins and penalizing losses (weighted by
lives lost/won). Agents learn mixed strategies emergently. Challenges: the game is short (a
few rounds), so reward signal is sparse and REINFORCE variance is high.

**Policy inputs:**

- Current claim rank (normalized)
- Own lives remaining
- Opponent lives remaining
- Pass count on current claim
- Rolling average of opponent's challenge rate at this rank range
- Rolling average of opponent's bluff rate

**Tabular approach (viable given small state space):** Discretize information sets into buckets
and maintain a softmax policy over actions per bucket. Update via REINFORCE:

```
for each (infoset, action) taken:
  logit[infoset][action] += lr * reward * (1 - π(action|infoset))
  logit[infoset][other]  -= lr * reward * π(other|infoset)
```

The centered update keeps logit scale stable while shifting probability mass.

### 2. CFR (Counterfactual Regret Minimization)

CFR is well-suited to small imperfect-information games (it solved heads-up poker). Mia's
state space is small enough that CFR could converge on a near-optimal mixed strategy without
neural networks. The resulting strategy is equilibrium play — unexploitable, but not maximally
exploitative.

Information sets for CFR: `(claimRank, myLives, opLives, passCount)`.

### 3. Opponent Modeling Layer

A stronger agent maintains a running model of the opponent — essentially learned parameters
like "this opponent challenges doubles 40% of the time." The policy conditions on that model
to exploit tendencies rather than playing equilibrium.

This can sit on top of either a self-play RL policy or a CFR baseline.

## Key Design Decisions

| Decision                               | Tradeoff                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| Reward per life vs per game            | Per-life gives denser signal; per-game matches actual objective                 |
| Game-level vs round-level optimization | Round rewards can misalign (winning rounds ≠ winning game)                      |
| Memory depth for opponent modeling     | More history = better exploitation, more variance from noise                    |
| Discrete vs continuous action space    | Discrete (honest/bluff1/bluff2/bluff3) is tractable; continuous needs more data |

## Practical Path

1. **Tabular self-play** (implemented in `src/ai/`): discretized information sets, softmax
   policy, REINFORCE updates. Fast to run; gives a baseline and demonstrates the framework.

2. **Benchmark against rule-based agent** (`src/ai/rule-agent.ts`): compare win rate of
   trained tabular agent vs the current hand-tuned heuristic.

3. **Add opponent modeling**: track opponent's challenge frequency per rank bucket over the
   last N rounds; condition policy on these features.

4. **CFR for unexploitable baseline**: implement vanilla CFR over the discrete information
   sets; use as a reference point for self-play convergence.

## Files

```
src/ai/
  agent.ts         Agent interface and AgentAction type
  simulator.ts     Synchronous game simulator (no DB, no WebSocket)
  rule-agent.ts    Current rule-based heuristic wrapped as an Agent
  tabular-agent.ts Tabular policy with softmax + REINFORCE
scripts/
  train.ts         Self-play training loop; saves policy to src/ai/policy.json
```
