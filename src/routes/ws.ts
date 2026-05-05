import type { ServerWebSocket } from 'bun'
import { stateForPlayer } from '../game/engine'
import { loadGame, reconstructState } from '../db/game-store'
import { registerConnection, unregisterConnection, broadcast } from '../services/connections'
import { handleMove } from '../services/game'
import type { Move } from '../services/game'

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

export function wsClose(ws: ServerWebSocket<WsData>) {
  const { gameId, player } = ws.data
  if (gameId && player !== null) unregisterConnection(gameId, player)
}
