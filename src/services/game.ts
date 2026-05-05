import {
  makeClaim,
  rollDiceAction,
  passDice,
  raise,
  rollAndRaise,
  resolveChallenge,
  ackChallenge,
  finishChallenge,
  ackRoundEnd,
  newRound,
} from '../game/engine'
import type { GameState, Player } from '../game/types'
import { opponent } from '../game/types'
import { loadGame, saveGame, appendEvent } from '../db/game-store'
import { broadcast } from './connections'

export type Move =
  | { type: 'claim'; value: number }
  | { type: 'roll' }
  | { type: 'pass' }
  | { type: 'raise'; value: number }
  | { type: 'roll_raise'; value: number }
  | { type: 'challenge' }
  | { type: 'challenge_ack' }
  | { type: 'round_end_ack' }

const CHALLENGE_ACK_TIMEOUT_MS = 15000
const ROUND_END_ACK_TIMEOUT_MS = 12000

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
      const state = await loadGame(gameId)
      if (
        !state ||
        (state.roundPhase !== 'challenge_result' && state.roundPhase !== 'game_over')
      )
        return
      if (state.status === 'finished') return
      const next = finishChallenge(state)
      await saveGame(next)
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
      const state = await loadGame(gameId)
      if (!state || state.roundPhase !== 'round_end') return
      if (!state.challengeResult) return
      const loser = state.challengeResult.challengerWins
        ? state.challengeResult.challenged
        : state.challengeResult.challenger
      const next = newRound(state, opponent(loser))
      await saveGame(next)
      broadcast(next)
    }, ROUND_END_ACK_TIMEOUT_MS),
  )
}

export async function handleMove(
  gameId: string,
  state: GameState,
  player: Player,
  move: Move,
): Promise<{ error: string } | { ok: true }> {
  switch (move.type) {
    case 'claim': {
      const r = makeClaim(state, player, move.value)
      if (r.error) return { error: r.error }
      await saveGame(r.state)
      await appendEvent(gameId, player, 'claim', { value: move.value })
      broadcast(r.state)
      return { ok: true }
    }

    case 'roll': {
      const r = rollDiceAction(state, player)
      if (r.error) return { error: r.error }
      await saveGame(r.state)
      await appendEvent(gameId, player, 'roll')
      broadcast(r.state)
      return { ok: true }
    }

    case 'pass': {
      const r = passDice(state, player)
      if (r.error) return { error: r.error }
      await saveGame(r.state)
      await appendEvent(gameId, player, 'pass')
      broadcast(r.state)
      return { ok: true }
    }

    case 'raise': {
      const r = raise(state, player, move.value)
      if (r.error) return { error: r.error }
      await saveGame(r.state)
      await appendEvent(gameId, player, 'raise', { value: move.value })
      broadcast(r.state)
      return { ok: true }
    }

    case 'roll_raise': {
      const r = rollAndRaise(state, player, move.value)
      if (r.error) return { error: r.error }
      await saveGame(r.state)
      await appendEvent(gameId, player, 'roll_raise', { value: move.value })
      broadcast(r.state)
      return { ok: true }
    }

    case 'challenge': {
      const r = resolveChallenge(state, player)
      if ('error' in r) return { error: r.error }
      await saveGame(r.state)
      await appendEvent(gameId, player, 'challenge', {
        claimedValue: r.result.claimedValue,
        actualValue: r.result.actualValue,
        challengerWins: r.result.challengerWins,
        livesLost: r.result.livesLost,
      })
      broadcast(r.state)
      scheduleChallengeAutoAdvance(gameId)
      return { ok: true }
    }

    case 'challenge_ack': {
      const ackResult = ackChallenge(state, player)
      if (ackResult.error) return { error: ackResult.error }
      if (ackResult.bothAcked) {
        clearChallengeTimer(gameId)
        if (ackResult.state.status === 'finished') {
          await saveGame(ackResult.state)
          broadcast(ackResult.state)
        } else {
          const next = finishChallenge(ackResult.state)
          await saveGame(next)
          broadcast(next)
          if (next.roundPhase === 'round_end') scheduleRoundEndAutoAdvance(gameId)
        }
      } else {
        await saveGame(ackResult.state)
        broadcast(ackResult.state)
      }
      return { ok: true }
    }

    case 'round_end_ack': {
      const ackResult = ackRoundEnd(state, player)
      if (ackResult.error) return { error: ackResult.error }
      if (ackResult.bothAcked) {
        clearRoundEndTimer(gameId)
        if (!state.challengeResult) return { error: 'No challenge result' }
        const loser = state.challengeResult.challengerWins
          ? state.challengeResult.challenged
          : state.challengeResult.challenger
        const next = newRound(ackResult.state, opponent(loser))
        await saveGame(next)
        broadcast(next)
      } else {
        await saveGame(ackResult.state)
        broadcast(ackResult.state)
      }
      return { ok: true }
    }

    default:
      return { error: `Unknown move type: ${(move as any).type}` }
  }
}
