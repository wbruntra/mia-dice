import { Hono } from 'hono'
import { db } from '../db'
import { games } from '../db/schema'
import { eq } from 'drizzle-orm'
import { newGame, stateForPlayer } from '../game/engine'
import type { GameState, Player } from '../game/types'
import { loadGame, saveGame, appendEvent } from '../db/game-store'

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

const app = new Hono()

app.post('/api/games', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const playerId = generateId()
  const gameId = generateId()
  const playerName = (body.name || '').trim().slice(0, 20) || 'Player 1'

  const gameState: GameState = {
    id: gameId,
    status: 'waiting',
    player1Id: playerId,
    player1Name: playerName,
    player2Id: null,
    player2Name: null,
    winner: null,
    dice: null,
    p1Lives: 3,
    p2Lives: 3,
    currentClaim: null,
    originalCaller: null,
    turnPlayer: null,
    roundPhase: null,
    roundNumber: 1,
    challengeResult: null,
    challengeAcks: [],
    roundEndAcks: [],
    cpuPlayer: null,
  }

  await db.insert(games).values({
    id: gameId,
    createdAt: new Date().toISOString(),
    status: gameState.status,
    player1Id: gameState.player1Id,
    player1Name: gameState.player1Name,
    p1Lives: gameState.p1Lives,
    p2Lives: gameState.p2Lives,
    roundNumber: gameState.roundNumber,
  })

  return c.json({ gameId, playerId })
})

app.post('/api/games/:id/join', async (c) => {
  const gameId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const rows = await db.select().from(games).where(eq(games.id, gameId))
  if (rows.length === 0) return c.json({ error: 'Game not found' }, 404)

  const row = rows[0]!
  if (row.status !== 'waiting') return c.json({ error: 'Game not joinable' }, 400)

  const playerId = generateId()
  const playerName = (body.name || '').trim().slice(0, 20) || 'Player 2'
  const gameState = await loadGame(gameId)
  if (!gameState) return c.json({ error: 'Game not found' }, 404)

  const started = { ...gameState, ...newGame() }
  started.player2Id = playerId
  started.player2Name = playerName

  await saveGame(started)
  await appendEvent(gameId, null, 'game_start', {
    player1: started.player1Name,
    player2: started.player2Name,
  })

  return c.json({ gameId, playerId })
})

app.get('/api/games/:id', async (c) => {
  const gameId = c.req.param('id')
  const playerId = c.req.query('player')
  if (!playerId) return c.json({ error: 'player query param required' }, 400)

  const rows = await db.select().from(games).where(eq(games.id, gameId))
  if (rows.length === 0) return c.json({ error: 'Game not found' }, 404)

  const row = rows[0]!
  if (row.player1Id !== playerId && row.player2Id !== playerId) {
    return c.json({ error: 'Not in this game' }, 403)
  }

  const state = await loadGame(gameId)
  if (!state) return c.json({ error: 'Game not found' }, 404)

  const player: Player = row.player1Id === playerId ? 'p1' : 'p2'
  return c.json(stateForPlayer(state, player))
})

export default app
