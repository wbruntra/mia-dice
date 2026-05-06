import {
  applyMove,
  stateForPlayer,
} from '../game/engine'
import type { GameState, StoredMove } from '../game/types'
import { rollDice, diceRank } from '../game/types'
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
const CPU_MOVE_DELAY_MS = 1200

function getAIMove(state: GameState): Move {
  const claim = state.currentClaim

  if (!claim) {
    const actualRank = state.dice ? diceRank(state.dice) : 5
    const bluffUp = Math.random() < 0.3
    const claimVal = bluffUp
      ? Math.min(20, actualRank + Math.floor(Math.random() * 3) + 1)
      : actualRank
    return { type: 'claim', value: claimVal }
  }

  // Mia: challenge rate depends on lives — at 1 life, giving up is strictly worse (guaranteed loss)
  if (claim.value === 20) {
    const myLives = state.lives[state.turnPlayer!]
    const opLives = state.lives[1 - state.turnPlayer!]
    if (myLives === 1) return { type: 'challenge' }
    const challengeProb = opLives === 1 ? 0.70 : opLives <= 2 ? 0.50 : 0.25
    return Math.random() < challengeProb ? { type: 'challenge' } : { type: 'give_up' }
  }

  // Respond as original caller: originalCaller is only set via makeClaim or rollAndRaise,
  // both of which write that player's dice into state.dice — so this is the CPU's own roll.
  if (state.originalCaller === state.turnPlayer) {
    const actualRank = state.dice ? diceRank(state.dice) : claim.value
    if (actualRank < claim.value) {
      return { type: 'challenge' }
    }
    // Our dice support the claim — raising is the only sensible play
    const bluffExtra = Math.random() < 0.35 ? Math.floor(Math.random() * 3) + 1 : 0
    return { type: 'roll_raise', value: Math.min(20, claim.value + 1 + bluffExtra) }
  }

  // Respond without dice visibility: use heuristics
  // Doubles (66=14 through 11=19): rolling to beat requires another double or Mia (~17% at best)
  if (claim.value >= 14) {
    const r = Math.random()
    if (r < 0.78) return { type: 'challenge' }
    if (r < 0.93) return { type: 'pass' }
    return { type: 'roll_raise', value: Math.min(20, claim.value + 1) }
  }

  // Low claims (31–42, ranks 0–3): almost certainly truthful — challenging is a bad bet
  // Mid-low (43–53, ranks 4–7): some room for bluff, increase a bit
  // Mid/high non-doubles (54–65, ranks 8–13): scale up toward 45%
  const challengeProb = claim.value <= 0
    ? 0
    : claim.value <= 3
      ? 0.05
      : claim.value <= 7
        ? 0.15
        : 0.20 + (claim.value / 20) * 0.30

  if (Math.random() < challengeProb) return { type: 'challenge' }

  // Occasionally pass without rerolling to keep the opponent honest
  if (Math.random() < 0.15) return { type: 'pass' }

  const minClaim = claim.value + 1
  const bluffExtra = Math.random() < 0.35 ? Math.floor(Math.random() * 3) + 1 : 0
  return { type: 'roll_raise', value: Math.min(20, minClaim + bluffExtra) }
}

function scheduleAIMove(gameId: string) {
  setTimeout(async () => {
    const state = await reconstructState(gameId)
    if (!state || state.cpuPlayer === null) return
    if (state.turnPlayer !== state.cpuPlayer) return
    if (state.roundPhase !== 'claim' || state.status !== 'playing') return
    await handleMove(gameId, state.cpuPlayer, getAIMove(state))
  }, CPU_MOVE_DELAY_MS)
}

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
      if (next.cpuPlayer !== null && next.turnPlayer === next.cpuPlayer && next.roundPhase === 'claim' && next.status === 'playing') {
        scheduleAIMove(gameId)
      }
    }, ROUND_END_ACK_TIMEOUT_MS),
  )
}

export async function startGame(gameId: string, dice: [number, number], cpuPlayer?: number) {
  await insertMove(gameId, 'game_start', null, { dice, ...(cpuPlayer !== undefined ? { cpuPlayer } : {}) })
  const state = await reconstructState(gameId)
  if (!state) throw new Error('Failed to reconstruct state after game_start')
  broadcast(state)
  if (cpuPlayer !== undefined && state.turnPlayer === cpuPlayer && state.roundPhase === 'claim') {
    scheduleAIMove(gameId)
  }
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

  broadcast(validation.state)

  if (validation.state.roundPhase === 'challenge_result') {
    scheduleChallengeAutoAdvance(gameId)
  } else if (
    validation.state.cpuPlayer !== null &&
    validation.state.turnPlayer === validation.state.cpuPlayer &&
    validation.state.roundPhase === 'claim' &&
    validation.state.status === 'playing'
  ) {
    scheduleAIMove(gameId)
  }

  return { ok: true }
}
