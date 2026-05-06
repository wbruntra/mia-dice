import { db } from './index'
import { games, gameMoves } from './schema'
import { eq, sql, asc } from 'drizzle-orm'
import type { GameState, StoredMove } from '../game/types'
import { blankState, applyMove } from '../game/engine'

export async function loadGame(id: string): Promise<{ id: string; players: string[]; startingLives: number; winner: string | null; status: string } | null> {
  const rows = await db.select().from(games).where(eq(games.id, id))
  if (rows.length === 0) return null
  const row = rows[0]!
  return {
    id: row.id,
    players: JSON.parse(row.players || '[]'),
    startingLives: row.startingLives,
    winner: row.winner,
    status: row.status,
  }
}

export async function listPendingGames(): Promise<Array<{ id: string; playerName: string; createdAt: string }>> {
  const rows = await db
    .select()
    .from(games)
    .where(eq(games.status, 'pending'))
    .orderBy(asc(games.createdAt))
  return rows.map((row) => {
    const players = JSON.parse(row.players || '[]')
    return { id: row.id, playerName: players[0] || 'Unknown', createdAt: row.createdAt }
  })
}

export async function insertMove(
  gameId: string,
  type: string,
  player: number | null,
  data?: Record<string, unknown>,
) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(gameMoves)
    .where(eq(gameMoves.gameId, gameId))
  const seq = (result[0]?.count ?? 0) + 1

  await db.insert(gameMoves).values({
    gameId,
    seq,
    type,
    player: player ?? null,
    data: data ? JSON.stringify(data) : null,
    createdAt: new Date().toISOString(),
  })

  return seq
}

export async function loadMoves(gameId: string): Promise<StoredMove[]> {
  const rows = await db
    .select()
    .from(gameMoves)
    .where(eq(gameMoves.gameId, gameId))
    .orderBy(asc(gameMoves.seq))

  return rows.map((row) => ({
    type: row.type,
    player: row.player ?? undefined,
    data: row.data ? JSON.parse(row.data) : undefined,
  }))
}

export async function reconstructState(gameId: string): Promise<GameState | null> {
  const metadata = await loadGame(gameId)
  if (!metadata) return null

  const moves = await loadMoves(gameId)
  let state = blankState(gameId, metadata.players, metadata.startingLives)

  for (const move of moves) {
    const result = applyMove(state, move)
    if (result.error) {
      console.error(`Error replaying move seq for game ${gameId}: ${result.error}`)
      return state
    }
    state = result.state
  }

  return state
}

export async function saveGameMetadata(id: string, updates: { players?: string[]; winner?: string | null; startingLives?: number; status?: string }) {
  const set: Record<string, unknown> = {}
  if (updates.players) set.players = JSON.stringify(updates.players)
  if (updates.winner !== undefined) set.winner = updates.winner
  if (updates.startingLives !== undefined) set.startingLives = updates.startingLives
  if (updates.status !== undefined) set.status = updates.status

  await db.update(games).set(set).where(eq(games.id, id))
}
