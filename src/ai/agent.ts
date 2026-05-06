import type { GameState } from '../game/types'

export type AgentAction =
  | { type: 'claim'; value: number }
  | { type: 'roll_raise'; value: number }
  | { type: 'pass' }
  | { type: 'challenge' }
  | { type: 'give_up' }

export interface Agent {
  selectAction(state: GameState, player: number): AgentAction
  onGameEnd?(winner: number, myPlayer: number): void
}
