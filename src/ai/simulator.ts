import { blankState, applyMove } from '../game/engine'
import { rollDice } from '../game/types'
import type { StoredMove } from '../game/types'
import type { Agent, AgentAction } from './agent'

export interface GameRecord {
  winner: number
  rounds: number
}

function toStoredMove(action: AgentAction, player: number): StoredMove {
  switch (action.type) {
    case 'claim':
      return { type: 'claim', player, data: { value: action.value } }
    case 'roll_raise':
      // The simulator provides the actual dice; the agent only picks the claimed value
      return { type: 'roll_raise', player, data: { value: action.value, dice: rollDice() } }
    case 'pass':
      return { type: 'pass', player }
    case 'challenge':
      return { type: 'challenge', player }
    case 'give_up':
      return { type: 'give_up', player }
  }
}

export function simulateGame(agent0: Agent, agent1: Agent, startingLives = 5): GameRecord {
  let state = blankState('sim', ['A0', 'A1'], startingLives)

  const init = applyMove(state, { type: 'game_start', data: { dice: rollDice() } })
  if (init.error) throw new Error(init.error)
  state = init.state

  const agents: Agent[] = [agent0, agent1]
  let limit = 2000

  while (state.status !== 'finished' && limit-- > 0) {
    if (state.roundPhase === 'challenge_result') {
      const r = applyMove(state, { type: 'challenge_ack' })
      if (r.error) throw new Error(r.error)
      state = r.state
      continue
    }

    if (state.roundPhase === 'round_end') {
      const r = applyMove(state, { type: 'round_end_ack', data: { nextRoundDice: rollDice() } })
      if (r.error) throw new Error(r.error)
      state = r.state
      continue
    }

    if (state.roundPhase !== 'claim' || state.turnPlayer === null) break

    const player = state.turnPlayer
    const action = agents[player].selectAction(state, player)
    const r = applyMove(state, toStoredMove(action, player))
    if (r.error) throw new Error(`${action.type}: ${r.error}`)
    state = r.state
  }

  const winner = state.players.indexOf(state.winner ?? '')

  agent0.onGameEnd?.(winner, 0)
  agent1.onGameEnd?.(winner, 1)

  return { winner, rounds: state.roundNumber }
}
