import { Hono } from 'hono'
import { db } from '../db'
import { games } from '../db/schema'
import { eq } from 'drizzle-orm'
import { stateForPlayer } from '../game/engine'
import { rollDice } from '../game/types'
import { loadGame, saveGameMetadata, reconstructState, listPendingGames } from '../db/game-store'
import { startGame } from '../services/game'
import { broadcastLobbyUpdate } from '../services/connections'

const MAX_PLAYERS = 8

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

const app = new Hono()

app.post('/api/games', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const gameId = generateId()
  const playerName = (body.name || '').trim().slice(0, 20) || 'Player 1'
  const vsCpu = !!body.cpu

  const players = vsCpu ? [playerName, 'Computer'] : [playerName]

  await db.insert(games).values({
    id: gameId,
    players: JSON.stringify(players),
    startingLives: 5,
    status: vsCpu ? 'active' : 'pending',
    createdAt: new Date().toISOString(),
  })

  if (vsCpu) {
    const dice = rollDice()
    await startGame(gameId, dice, 1)
  } else {
    await broadcastLobbyUpdate()
  }

  return c.json({ gameId, playerName })
})

app.post('/api/games/:id/join', async (c) => {
  const gameId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const playerName = (body.name || '').trim().slice(0, 20) || 'Player 2'

  const metadata = await loadGame(gameId)
  if (!metadata) return c.json({ error: 'Game not found' }, 404)
  if (metadata.status !== 'pending') return c.json({ error: 'Game already started' }, 400)
  if (metadata.players.length >= MAX_PLAYERS) return c.json({ error: 'Game is full' }, 400)
  if (metadata.players.includes(playerName)) return c.json({ error: 'Name already taken' }, 400)

  const newPlayers = [...metadata.players, playerName]
  await saveGameMetadata(gameId, { players: newPlayers })
  await broadcastLobbyUpdate()

  return c.json({ gameId, playerName })
})

app.get('/api/games', async (c) => {
  const pendingGames = await listPendingGames()
  return c.json(pendingGames)
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
