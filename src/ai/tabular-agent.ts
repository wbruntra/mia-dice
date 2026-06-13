import { diceRank } from '../game/types'
import type { GameState } from '../game/types'
import type { Agent, AgentAction } from './agent'

// Discretized situation types, each with a fixed action set
type Situation = 'start' | 'respond' | 'respond_orig' | 'mia'

const ACTIONS: Record<Situation, string[]> = {
  // First claim of a round: decide how much to bluff above actual rank
  start: ['honest', 'bluff1', 'bluff2', 'bluff3'],
  // Responding to a claim when you are NOT the original caller (pass is available)
  respond: ['challenge', 'pass', 'raise_min', 'raise_bluff'],
  // Responding when you ARE the original caller (dice returned to you, cannot pass)
  respond_orig: ['challenge', 'raise_min', 'raise_bluff'],
  // Mia claimed: must give up or look
  mia: ['challenge', 'give_up'],
}

function claimBucket(value: number | null): string {
  if (value === null) return 'none'
  if (value <= 7) return 'low'
  if (value <= 13) return 'mid'
  if (value <= 19) return 'double'
  return 'mia'
}

function diceRelation(state: GameState, player: number): string {
  const canSee = state.lastRoller === player && state.turnPlayer === player
  if (!canSee || !state.dice) return 'hidden'
  if (!state.currentClaim) return 'first'
  const rank = diceRank(state.dice)
  if (rank > state.currentClaim.value) return 'above'
  if (rank === state.currentClaim.value) return 'equal'
  return 'below'
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits)
  const exp = logits.map((l) => Math.exp(l - max))
  const sum = exp.reduce((a, b) => a + b, 0)
  return exp.map((e) => e / sum)
}

function sample(probs: number[]): number {
  let r = Math.random()
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i]
    if (r <= 0) return i
  }
  return probs.length - 1
}

interface Step {
  key: string
  situation: Situation
  actionIdx: number
}

export class TabularAgent implements Agent {
  private logits = new Map<string, number[]>()
  private steps: Step[] = []
  readonly lr: number

  constructor(lr = 0.05) {
    this.lr = lr
  }

  private getLogits(key: string, situation: Situation): number[] {
    if (!this.logits.has(key)) {
      this.logits.set(key, new Array(ACTIONS[situation].length).fill(0.0))
    }
    return this.logits.get(key)!
  }

  private infoKey(state: GameState, player: number, situation: Situation): string {
    return [
      situation,
      claimBucket(state.currentClaim?.value ?? null),
      diceRelation(state, player),
      state.lives[player],
      state.lives[1 - player],
    ].join(':')
  }

  selectAction(state: GameState, player: number): AgentAction {
    const claim = state.currentClaim

    let situation: Situation
    if (!claim) {
      situation = 'start'
    } else if (claim.value === 20) {
      situation = 'mia'
    } else if (state.originalCaller === player) {
      situation = 'respond_orig'
    } else {
      situation = 'respond'
    }

    const key = this.infoKey(state, player, situation)
    const logits = this.getLogits(key, situation)
    const probs = softmax(logits)
    const actionIdx = sample(probs)

    this.steps.push({ key, situation, actionIdx })

    return this.decode(ACTIONS[situation][actionIdx], state)
  }

  private decode(code: string, state: GameState): AgentAction {
    const claimVal = state.currentClaim?.value ?? 0

    switch (code) {
      case 'honest': {
        const rank = state.dice ? diceRank(state.dice) : 5
        return { type: 'claim', value: rank }
      }
      case 'bluff1': {
        const rank = state.dice ? diceRank(state.dice) : 5
        return { type: 'claim', value: Math.min(20, rank + 1) }
      }
      case 'bluff2': {
        const rank = state.dice ? diceRank(state.dice) : 5
        return { type: 'claim', value: Math.min(20, rank + 2) }
      }
      case 'bluff3': {
        const rank = state.dice ? diceRank(state.dice) : 5
        return { type: 'claim', value: Math.min(20, rank + 3) }
      }
      case 'challenge':
        return { type: 'challenge' }
      case 'give_up':
        return { type: 'give_up' }
      case 'pass':
        return { type: 'pass' }
      case 'raise_min':
        return { type: 'roll_raise', value: Math.min(20, claimVal + 1) }
      case 'raise_bluff':
        return {
          type: 'roll_raise',
          value: Math.min(20, claimVal + Math.floor(Math.random() * 3) + 2),
        }
      default:
        return { type: 'challenge' }
    }
  }

  onGameEnd(winner: number, myPlayer: number): void {
    const reward = winner === myPlayer ? 1.0 : -1.0

    for (const { key, situation, actionIdx } of this.steps) {
      const logits = this.logits.get(key)!
      const probs = softmax(logits)

      // Centered REINFORCE: keeps logit scale stable while shifting mass toward winning actions
      for (let i = 0; i < logits.length; i++) {
        if (i === actionIdx) {
          logits[i] += this.lr * reward * (1 - probs[i])
        } else {
          logits[i] -= this.lr * reward * probs[i]
        }
      }
    }

    this.steps = []
  }

  get infoSetCount(): number {
    return this.logits.size
  }

  exportPolicy(): Record<string, number[]> {
    return Object.fromEntries(this.logits)
  }

  importPolicy(data: Record<string, number[]>): void {
    this.logits = new Map(Object.entries(data))
  }
}
