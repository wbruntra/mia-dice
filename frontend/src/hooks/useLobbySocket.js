import { useEffect, useState } from 'react'

export function useLobbySocket() {
  const [pendingGames, setPendingGames] = useState([])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'lobby_join' }))
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'lobby_games') setPendingGames(msg.games)
      } catch {}
    }

    return () => ws.close()
  }, [])

  return { pendingGames }
}
