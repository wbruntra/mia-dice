import type { ServerWebSocket } from 'bun'
import type { GameState } from '../game/types'
import { stateForPlayer } from '../game/engine'
import { listPendingGames, loadGame, saveGameMetadata } from '../db/game-store'

type PlayerLabel = number

const connections = new Map<string, Map<PlayerLabel, ServerWebSocket<any>>>()
const lobbyConnections = new Set<ServerWebSocket<any>>()

// Heartbeat tracking: last time a pong was received per socket
const lastPongAt = new WeakMap<ServerWebSocket<any>, number>()
const HEARTBEAT_INTERVAL_MS = 20000
const HEARTBEAT_TIMEOUT_MS = 60000

// Grace period before abandoning a pending game when the creator disconnects
const pendingAbandonTimers = new Map<string, ReturnType<typeof setTimeout>>()
const PENDING_ABANDON_GRACE_MS = 30000

export function registerConnection(
  gameId: string,
  player: PlayerLabel,
  ws: ServerWebSocket<any>,
) {
  if (!connections.has(gameId)) connections.set(gameId, new Map())
  connections.get(gameId)!.set(player, ws)
  lastPongAt.set(ws, Date.now())

  // Creator reconnected within grace period — cancel abandon
  if (player === 0) {
    cancelPendingAbandon(gameId)
  }
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

// --- Heartbeat ---

export function recordPong(ws: ServerWebSocket<any>) {
  lastPongAt.set(ws, Date.now())
}

export function startHeartbeat() {
  setInterval(() => {
    const now = Date.now()
    for (const [gameId, gameConns] of connections) {
      for (const [player, ws] of gameConns) {
        const last = lastPongAt.get(ws) ?? now
        if (now - last > HEARTBEAT_TIMEOUT_MS) {
          console.log(`Heartbeat timeout for game ${gameId} player ${player}`)
          ws.close()
          continue
        }
        try {
          ws.ping()
        } catch {
          ws.close()
        }
      }
    }
    for (const ws of lobbyConnections) {
      const last = lastPongAt.get(ws) ?? now
      if (now - last > HEARTBEAT_TIMEOUT_MS) {
        ws.close()
        continue
      }
      try {
        ws.ping()
      } catch {
        ws.close()
      }
    }
  }, HEARTBEAT_INTERVAL_MS)
}

// --- Pending-game grace period ---

export function schedulePendingAbandon(gameId: string) {
  if (pendingAbandonTimers.has(gameId)) return
  pendingAbandonTimers.set(
    gameId,
    setTimeout(async () => {
      pendingAbandonTimers.delete(gameId)
      const metadata = await loadGame(gameId)
      if (metadata && metadata.status === 'pending') {
        console.log(`Abandoning stale pending game ${gameId}`)
        await saveGameMetadata(gameId, { status: 'abandoned' })
        await broadcastLobbyUpdate()
      }
    }, PENDING_ABANDON_GRACE_MS),
  )
}

export function cancelPendingAbandon(gameId: string) {
  const t = pendingAbandonTimers.get(gameId)
  if (t) {
    clearTimeout(t)
    pendingAbandonTimers.delete(gameId)
  }
}

export function clearPendingAbandonOnStart(gameId: string) {
  cancelPendingAbandon(gameId)
}
