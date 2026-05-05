import app from '../index'
import { wsOpen, wsMessage, wsClose, type WsData } from '../src/routes/ws'

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

console.log(`Listening on http://localhost:${port}`)
