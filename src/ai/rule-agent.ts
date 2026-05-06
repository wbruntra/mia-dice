import { diceRank } from '../game/types'
import type { GameState } from '../game/types'
import type { Agent, AgentAction } from './agent'

// The current hand-tuned heuristic wrapped as an Agent for benchmarking.
export class RuleAgent implements Agent {
  selectAction(state: GameState, player: number): AgentAction {
    const claim = state.currentClaim

    if (!claim) {
      const actualRank = state.dice ? diceRank(state.dice) : 5
      const bluffUp = Math.random() < 0.3
      const claimVal = bluffUp
        ? Math.min(20, actualRank + Math.floor(Math.random() * 3) + 1)
        : actualRank
      return { type: 'claim', value: claimVal }
    }

    if (claim.value === 20) {
      const myLives = state.lives[player]
      const opLives = state.lives[1 - player]
      if (myLives === 1) return { type: 'challenge' }
      const challengeProb = opLives === 1 ? 0.70 : opLives <= 2 ? 0.50 : 0.25
      return Math.random() < challengeProb ? { type: 'challenge' } : { type: 'give_up' }
    }

    if (state.originalCaller === player) {
      const actualRank = state.dice ? diceRank(state.dice) : claim.value
      if (actualRank < claim.value) {
        return Math.random() < 0.93 ? { type: 'challenge' } : { type: 'roll_raise', value: Math.min(20, claim.value + 1) }
      }
      const bluffExtra = Math.random() < 0.35 ? Math.floor(Math.random() * 3) + 1 : 0
      return { type: 'roll_raise', value: Math.min(20, claim.value + 1 + bluffExtra) }
    }

    if (claim.value >= 14) {
      const r = Math.random()
      if (r < 0.78) return { type: 'challenge' }
      if (r < 0.93) return { type: 'pass' }
      return { type: 'roll_raise', value: Math.min(20, claim.value + 1) }
    }

    const challengeProb = claim.value <= 7
      ? 0.25
      : 0.20 + (claim.value / 20) * 0.30

    if (Math.random() < challengeProb) return { type: 'challenge' }
    if (Math.random() < 0.15) return { type: 'pass' }

    const minClaim = claim.value + 1
    const bluffExtra = Math.random() < 0.35 ? Math.floor(Math.random() * 3) + 1 : 0
    return { type: 'roll_raise', value: Math.min(20, minClaim + bluffExtra) }
  }
}
