import {
  applyMove,
  stateForPlayer,
} from '../game/engine'
import type { GameState, StoredMove } from '../game/types'
import { rollDice } from '../game/types'
import { insertMove, reconstructState } from '../db/game-store'
import { broadcast } from './connections'

export type Move =
  | { type: 'claim'; value: number }
  | { type: 'roll' }
  | { type: 'pass' }
  | { type: 'raise'; value: number }
  | { type: 'roll_raise'; value: number }
  | { type: 'challenge' }
  | { type: 'give_up' }
  | { type: 'challenge_ack' }
  | { type: 'round_end_ack' }

const CHALLENGE_ACK_TIMEOUT_MS = 5000
const ROUND_END_ACK_TIMEOUT_MS = 4000

const challengeTimers = new Map<string, ReturnType<typeof setTimeout>>()
const roundEndTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearChallengeTimer(gameId: string) {
  const t = challengeTimers.get(gameId)
  if (t) {
    clearTimeout(t)
    challengeTimers.delete(gameId)
  }
}

function clearRoundEndTimer(gameId: string) {
  const t = roundEndTimers.get(gameId)
  if (t) {
    clearTimeout(t)
    roundEndTimers.delete(gameId)
  }
}

function scheduleChallengeAutoAdvance(gameId: string) {
  clearChallengeTimer(gameId)
  challengeTimers.set(
    gameId,
    setTimeout(async () => {
      challengeTimers.delete(gameId)
      const state = await reconstructState(gameId)
      if (!state || (state.roundPhase !== 'challenge_result' && state.roundPhase !== 'game_over')) return
      await insertMove(gameId, 'challenge_ack', null)
      const next = await reconstructState(gameId)
      if (!next) return
      broadcast(next)
      if (next.roundPhase === 'round_end') scheduleRoundEndAutoAdvance(gameId)
    }, CHALLENGE_ACK_TIMEOUT_MS),
  )
}

function scheduleRoundEndAutoAdvance(gameId: string) {
  clearRoundEndTimer(gameId)
  roundEndTimers.set(
    gameId,
    setTimeout(async () => {
      roundEndTimers.delete(gameId)
      const state = await reconstructState(gameId)
      if (!state || state.roundPhase !== 'round_end') return
      if (!state.challengeResult) return
      const loser = state.challengeResult.challengerWins
        ? state.challengeResult.challenged
        : state.challengeResult.challenger
      const nextRoundDice = rollDice()
      await insertMove(gameId, 'round_end_ack', null, { nextRoundDice })
      const next = await reconstructState(gameId)
      if (!next) return
      broadcast(next)
    }, ROUND_END_ACK_TIMEOUT_MS),
  )
}

export async function startGame(gameId: string, dice: [number, number]) {
  await insertMove(gameId, 'game_start', null, { dice })
  const state = await reconstructState(gameId)
  if (!state) throw new Error('Failed to reconstruct state after game_start')
  broadcast(state)
}

function buildStoredMove(
  move: Move,
  player: number,
): { stored: StoredMove; error?: string } {
  switch (move.type) {
    case 'claim':
      return { stored: { type: 'claim', player, data: { value: move.value } } }
    case 'roll':
      return { stored: { type: 'roll', player, data: { dice: rollDice() } } }
    case 'pass':
      return { stored: { type: 'pass', player } }
    case 'raise':
      return { stored: { type: 'raise', player, data: { value: move.value } } }
    case 'roll_raise':
      return { stored: { type: 'roll_raise', player, data: { value: move.value, dice: rollDice() } } }
    case 'challenge':
      return { stored: { type: 'challenge', player } }
    case 'give_up':
      return { stored: { type: 'give_up', player } }
    case 'challenge_ack':
      return { stored: { type: 'challenge_ack', player } }
    case 'round_end_ack': {
      const dice = rollDice()
      return { stored: { type: 'round_end_ack', player, data: { nextRoundDice: dice } } }
    }
    default:
      return { stored: {} as StoredMove, error: `Unknown move type` }
  }
}

export async function handleMove(
  gameId: string,
  player: number,
  move: Move,
): Promise<{ error: string } | { ok: true }> {
  // Reconstruct current state
  const state = await reconstructState(gameId)
  if (!state) return { error: 'Game not found' }

  // Build the stored move (generate dice if needed)
  const { stored, error: buildError } = buildStoredMove(move, player)
  if (buildError) return { error: buildError }

  // Validate by applying the move to current state
  const validation = applyMove(state, stored)
  if (validation.error) return { error: validation.error }

  // Insert the move
  await insertMove(gameId, stored.type, stored.player !== undefined ? stored.player : null, stored.data)

  // Apply to get the new state (same as validation result)
  broadcast(validation.state)

  // Schedule auto-advance timers
  if (validation.state.roundPhase === 'challenge_result') {
    scheduleChallengeAutoAdvance(gameId)
  }

  return { ok: true }
}
