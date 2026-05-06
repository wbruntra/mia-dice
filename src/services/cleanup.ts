import { db } from '../db/index'
import { games, gameMoves } from '../db/schema'
import { lt, eq, and, inArray } from 'drizzle-orm'
import { broadcastLobbyUpdate } from './connections'

const CUTOFF_MINUTES = 10

export async function cleanupOldGames(): Promise<number> {
  const cutoff = new Date(Date.now() - CUTOFF_MINUTES * 60 * 1000).toISOString()

  const oldGames = await db
    .select({ id: games.id })
    .from(games)
    .where(and(lt(games.createdAt, cutoff), eq(games.status, 'pending')))

  if (oldGames.length === 0) return 0

  const ids = oldGames.map((g) => g.id)

  await db.delete(gameMoves).where(inArray(gameMoves.gameId, ids))
  await db.delete(games).where(inArray(games.id, ids))

  await broadcastLobbyUpdate()

  return ids.length
}
