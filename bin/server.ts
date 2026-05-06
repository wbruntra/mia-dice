import app from '../index'
import { wsOpen, wsMessage, wsClose, type WsData } from '~/src/routes/ws'
import { cleanupOldGames } from '~/src/services/cleanup'

const port = process.env.PORT || 9001

const server = Bun.serve<WsData>({
  port,
  fetch(req, server) {
    const url = new URL(req.url)
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req, { data: { gameId: null, player: null } })
      if (upgraded) return undefined
      return new Response('WebSocket upgrade failed', { status: 400 })
    }
    return app.fetch(req)
  },
  websocket: {
    open: wsOpen,
    message: wsMessage,
    close: wsClose,
  },
})

// Auto-cleanup old pending games every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let cleanupCount = 0
setInterval(async () => {
  const count = await cleanupOldGames()
  if (count > 0) cleanupCount += count
}, CLEANUP_INTERVAL_MS)

// Log cleanup stats periodically
setInterval(() => {
  if (cleanupCount > 0) {
    console.log(`Cleanup: removed ${cleanupCount} stale game(s) total`)
    cleanupCount = 0
  }
}, 10 * CLEANUP_INTERVAL_MS)

console.log(`Listening on http://localhost:${port}`)
