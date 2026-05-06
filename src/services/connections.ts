import type { ServerWebSocket } from 'bun'
import type { GameState } from '../game/types'
import { stateForPlayer } from '../game/engine'
import { listPendingGames } from '../db/game-store'

type PlayerLabel = number

const connections = new Map<string, Map<PlayerLabel, ServerWebSocket<any>>>()
const lobbyConnections = new Set<ServerWebSocket<any>>()

export function registerConnection(
  gameId: string,
  player: PlayerLabel,
  ws: ServerWebSocket<any>,
) {
  if (!connections.has(gameId)) connections.set(gameId, new Map())
  connections.get(gameId)!.set(player, ws)
}

export function unregisterConnection(gameId: string, player: PlayerLabel) {
  const gameConns = connections.get(gameId)
  if (gameConns) {
    gameConns.delete(player)
    if (gameConns.size === 0) connections.delete(gameId)
  }
}

export function broadcast(state: GameState) {
  const gameConns = connections.get(state.id)
  if (!gameConns) return
  for (const [player, ws] of gameConns) {
    ws.send(JSON.stringify({ type: 'state', state: stateForPlayer(state, player) }))
  }
}

export function registerLobbyConnection(ws: ServerWebSocket<any>) {
  lobbyConnections.add(ws)
}

export function unregisterLobbyConnection(ws: ServerWebSocket<any>) {
  lobbyConnections.delete(ws)
}

export async function broadcastLobbyUpdate() {
  if (lobbyConnections.size === 0) return
  const games = await listPendingGames()
  const msg = JSON.stringify({ type: 'lobby_games', games })
  for (const ws of lobbyConnections) {
    ws.send(msg)
  }
}
