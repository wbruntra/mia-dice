import { useState, useEffect, useRef, useCallback } from 'react'

const MAX_RECONNECT_DELAY = 10000
const BASE_RECONNECT_DELAY = 500

export function useWebSocket(gameId, playerName) {
  const wsRef = useRef(null)
  const [state, setState] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const reconnectAttemptRef = useRef(0)
  const intentionalCloseRef = useRef(false)
  const gameIdRef = useRef(gameId)
  const playerNameRef = useRef(playerName)

  useEffect(() => {
    gameIdRef.current = gameId
    playerNameRef.current = playerName
  }, [gameId, playerName])

  useEffect(() => {
    if (!gameId || !playerName) return

    intentionalCloseRef.current = false
    reconnectAttemptRef.current = 0

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttemptRef.current = 0
        setConnected(true)
        setError(null)
        ws.send(
          JSON.stringify({
            type: 'join',
            gameId: gameIdRef.current,
            playerName: playerNameRef.current,
          }),
        )
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'state') {
            setState(msg.state)
            setError(null)
          } else if (msg.type === 'error') {
            setError(msg.message)
          }
        } catch (e) {
          console.error('WS parse error:', e)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (!intentionalCloseRef.current) {
          const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
            MAX_RECONNECT_DELAY,
          )
          reconnectAttemptRef.current++
          setTimeout(connect, delay)
        }
      }

      ws.onerror = () => {
        setError('WebSocket connection error')
      }
    }

    connect()

    return () => {
      intentionalCloseRef.current = true
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.addEventListener('open', () => wsRef.current.close())
        } else {
          wsRef.current.close()
        }
      }
    }
  }, [gameId, playerName])

  const send = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { state, connected, error, send }
}
