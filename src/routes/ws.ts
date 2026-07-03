import type { ServerWebSocket } from 'bun'
import { stateForPlayer } from '../game/engine'
import { loadGame, reconstructState, listPendingGames, saveGameMetadata } from '../db/game-store'
import {
  registerConnection,
  unregisterConnection,
  broadcast,
  registerLobbyConnection,
  unregisterLobbyConnection,
  broadcastLobbyUpdate,
  recordPong,
  schedulePendingAbandon,
  cancelPendingAbandon,
} from '../services/connections'
import { handleMove, startGame } from '../services/game'
import type { Move } from '../services/game'
import { rollDice } from '../game/types'

export type WsData = {
  gameId: string | null
  player: number | null
}

function send(ws: ServerWebSocket<WsData>, msg: object) {
  ws.send(JSON.stringify(msg))
}

export function wsOpen(ws: ServerWebSocket<WsData>) {
  send(ws, { type: 'connected' })
}

export async function wsMessage(ws: ServerWebSocket<WsData>, rawMessage: string | Buffer) {
  try {
    const msg = JSON.parse(typeof rawMessage === 'string' ? rawMessage : rawMessage.toString())

    if (msg.type === 'lobby_join') {
      registerLobbyConnection(ws)
      const games = await listPendingGames()
      send(ws, { type: 'lobby_games', games })
      return
    }

    if (msg.type === 'join') {
      const metadata = await loadGame(msg.gameId)
      if (!metadata) {
        send(ws, { type: 'error', message: 'Game not found' })
        return
      }

      const idx = metadata.players.indexOf(msg.playerName)
      if (idx === -1) {
        send(ws, { type: 'error', message: 'Not a player in this game' })
        return
      }

      const player = idx
      ws.data.gameId = msg.gameId
      ws.data.player = player
      registerConnection(msg.gameId, player, ws)

      const state = await reconstructState(msg.gameId)
      if (state) {
        send(ws, { type: 'state', state: stateForPlayer(state, player) })
        broadcast(state)
      }
      return
    }

    const { gameId, player } = ws.data
    if (!gameId || player === null) {
      send(ws, { type: 'error', message: 'Not joined' })
      return
    }

    if (msg.type === 'start_game') {
      if (player !== 0) {
        send(ws, { type: 'error', message: 'Only the host can start the game' })
        return
      }
      const metadata = await loadGame(gameId)
      if (!metadata) {
        send(ws, { type: 'error', message: 'Game not found' })
        return
      }
      if (metadata.status !== 'pending') {
        send(ws, { type: 'error', message: 'Game already started' })
        return
      }
      if (metadata.players.length < 2) {
        send(ws, { type: 'error', message: 'Need at least 2 players to start' })
        return
      }
      await saveGameMetadata(gameId, { status: 'active' })
      await startGame(gameId, rollDice())
      await broadcastLobbyUpdate()
      return
    }

    const state = await reconstructState(gameId)
    if (!state) {
      send(ws, { type: 'error', message: 'Game not found' })
      return
    }

    const result = await handleMove(gameId, player, msg as Move)
    if ('error' in result) send(ws, { type: 'error', message: result.error })
  } catch (e: any) {
    send(ws, { type: 'error', message: e.message })
  }
}

export function wsPong(ws: ServerWebSocket<WsData>) {
  recordPong(ws)
}

export async function wsClose(ws: ServerWebSocket<WsData>) {
  unregisterLobbyConnection(ws)
  const { gameId, player } = ws.data
  if (!gameId || player === null) return
  unregisterConnection(gameId, player)
  // If the game creator disconnects while the game is still pending,
  // schedule abandonment after a grace period so accidental reloads can recover.
  if (player === 0) {
    const metadata = await loadGame(gameId)
    if (metadata && metadata.status === 'pending') {
      schedulePendingAbandon(gameId)
    }
  }
}
