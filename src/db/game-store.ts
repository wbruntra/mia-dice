import { db } from './index'
import { games, gameEvents } from './schema'
import { eq, sql } from 'drizzle-orm'
import type { GameState, Player } from '../game/types'

function parseDice(raw: string | null): [number, number] | null {
  if (!raw) return null
  const arr = JSON.parse(raw)
  if (!Array.isArray(arr) || arr.length !== 2) return null
  return arr as [number, number]
}

function parseClaim(
  raw: string | null,
): { value: number; player: Player } | null {
  if (!raw) return null
  return JSON.parse(raw)
}

function parseGame(row: any): GameState {
  return {
    id: row.id,
    status: row.status,
    player1Id: row.player1Id,
    player1Name: row.player1Name,
    player2Id: row.player2Id,
    player2Name: row.player2Name,
    winner: row.winner,

    dice: parseDice(row.dice),
    p1Lives: row.p1Lives,
    p2Lives: row.p2Lives,

    currentClaim: parseClaim(row.currentClaim),
    originalCaller: row.originalCaller as Player | null,
    turnPlayer: row.turnPlayer as Player | null,
    roundPhase: row.roundPhase as GameState['roundPhase'],
    roundNumber: row.roundNumber,

    challengeResult: row.challengeResult ? JSON.parse(row.challengeResult) : null,
    challengeAcks: JSON.parse(row.challengeAcks || '[]'),
    roundEndAcks: JSON.parse(row.roundEndAcks || '[]'),

    cpuPlayer: row.cpuPlayer as Player | null,
  }
}

function serializeGame(state: GameState) {
  return {
    status: state.status,
    player1Id: state.player1Id,
    player1Name: state.player1Name,
    player2Id: state.player2Id,
    player2Name: state.player2Name,
    winner: state.winner,

    dice: state.dice ? JSON.stringify(state.dice) : null,
    p1Lives: state.p1Lives,
    p2Lives: state.p2Lives,

    currentClaim: state.currentClaim ? JSON.stringify(state.currentClaim) : null,
    originalCaller: state.originalCaller || null,
    turnPlayer: state.turnPlayer || null,
    roundPhase: state.roundPhase || null,
    roundNumber: state.roundNumber,

    challengeResult: state.challengeResult
      ? JSON.stringify(state.challengeResult)
      : null,
    challengeAcks: JSON.stringify(state.challengeAcks),
    roundEndAcks: JSON.stringify(state.roundEndAcks),

    cpuPlayer: state.cpuPlayer || null,
  }
}

export async function loadGame(id: string): Promise<GameState | null> {
  const rows = await db.select().from(games).where(eq(games.id, id))
  if (rows.length === 0) return null
  return parseGame(rows[0]!)
}

export async function saveGame(state: GameState) {
  await db
    .update(games)
    .set(serializeGame(state))
    .where(eq(games.id, state.id))
}

export async function appendEvent(
  gameId: string,
  player: Player | null,
  type: string,
  data?: Record<string, unknown>,
) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(gameEvents)
    .where(eq(gameEvents.gameId, gameId))
  const count = result[0]?.count ?? 0
  await db.insert(gameEvents).values({
    gameId,
    seq: count + 1,
    type,
    player: player ?? null,
    data: data ? JSON.stringify(data) : null,
    createdAt: new Date().toISOString(),
  })
}
