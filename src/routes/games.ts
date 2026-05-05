import { Hono } from 'hono'
import { db } from '../db'
import { games } from '../db/schema'
import { eq } from 'drizzle-orm'
import { stateForPlayer } from '../game/engine'
import { rollDice } from '../game/types'
import { loadGame, saveGameMetadata, reconstructState } from '../db/game-store'
import { startGame } from '../services/game'

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

const app = new Hono()

app.post('/api/games', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const gameId = generateId()
  const playerName = (body.name || '').trim().slice(0, 20) || 'Player 1'

  await db.insert(games).values({
    id: gameId,
    players: JSON.stringify([playerName]),
    startingLives: 5,
    createdAt: new Date().toISOString(),
  })

  return c.json({ gameId, playerName })
})

app.post('/api/games/:id/join', async (c) => {
  const gameId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const playerName = (body.name || '').trim().slice(0, 20) || 'Player 2'

  const metadata = await loadGame(gameId)
  if (!metadata) return c.json({ error: 'Game not found' }, 404)
  if (metadata.players.length >= 2) return c.json({ error: 'Game is full' }, 400)
  if (metadata.players.includes(playerName)) return c.json({ error: 'Name already taken' }, 400)

  const newPlayers = [...metadata.players, playerName]
  await saveGameMetadata(gameId, { players: newPlayers })

  const dice = rollDice()
  await startGame(gameId, dice)

  return c.json({ gameId, playerName })
})

app.get('/api/games/:id', async (c) => {
  const gameId = c.req.param('id')
  const playerName = c.req.query('player')
  if (!playerName) return c.json({ error: 'player query param required' }, 400)

  const metadata = await loadGame(gameId)
  if (!metadata) return c.json({ error: 'Game not found' }, 404)

  const idx = metadata.players.indexOf(playerName)
  if (idx === -1) return c.json({ error: 'Not in this game' }, 403)

  const state = await reconstructState(gameId)
  if (!state) return c.json({ error: 'Game not found' }, 404)

  const player = idx
  return c.json(stateForPlayer(state, player))
})

export default app
