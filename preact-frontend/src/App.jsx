import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { GameContext } from './context/GameContext'
import { GameUIProvider } from './hooks/useGameUI'
import { useWebSocket } from './hooks/useWebSocket'
import Lobby from './components/lobby/Lobby'
import GameView from './components/game/GameView'

const SESSION_KEY = 'mia-active-session'

export function saveSession(gameId, playerName) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ gameId, playerName }))
  } catch {}
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {}
}

function parseRoute() {
  const params = new URLSearchParams(window.location.search)
  const gameId = params.get('game')
  const playerName = params.get('player')
  if (gameId && playerName) return { gameId, playerName }

  const joinId = params.get('join')
  if (joinId) return { joinId }

  return {}
}

function useRouter() {
  const [route, setRoute] = useState(parseRoute)

  useEffect(() => {
    function onChange() {
      setRoute(parseRoute())
    }
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])

  return route
}

function navigateToGame(gameId, playerName) {
  const url = `${window.location.pathname}?game=${encodeURIComponent(gameId)}&player=${encodeURIComponent(playerName)}`
  window.history.pushState(null, '', url)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function navigateToLobby() {
  window.history.pushState(null, '', window.location.pathname)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const { gameId, playerName, joinId } = useRouter()

  // Restore a saved session if the user lands on the base path
  useEffect(() => {
    if (gameId && playerName) {
      saveSession(gameId, playerName)
      return
    }
    const session = loadSession()
    if (session?.gameId && session?.playerName) {
      navigateToGame(session.gameId, session.playerName)
    }
  }, [gameId, playerName])

  const { state, connected, error, send } = useWebSocket(gameId, playerName)

  if (!gameId || !playerName) {
    return (
      <Lobby
        joinId={joinId}
        onNavigateToGame={navigateToGame}
        onNavigateToLobby={navigateToLobby}
      />
    )
  }

  function handleLeaveGame() {
    clearSession()
    navigateToLobby()
  }

  return (
    <GameContext.Provider
      value={{ state, connected, error, send, onLeave: handleLeaveGame, gameId, playerName }}
    >
      <div className="bg-pirate" />
      <GameUIProvider>
        <Toaster position="top-center" richColors />
        <div className="min-h-dvh flex flex-col bg-gradient-to-b from-pirate-navy/70 via-pirate-navy-light/70 to-pirate-navy/70">
          <GameView />
        </div>
      </GameUIProvider>
    </GameContext.Provider>
  )
}
