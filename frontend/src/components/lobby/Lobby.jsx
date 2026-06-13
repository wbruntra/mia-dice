import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import RulesModal from './RulesModal'
import PendingGamesList from './PendingGamesList'
import { loadSession, clearSession } from '../../App'

const API = '/api'

export default function Lobby({ joinId, onNavigateToGame, onNavigateToLobby }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showJoin, setShowJoin] = useState(!!joinId)
  const [joinCode, setJoinCode] = useState(joinId || '')
  const [showRules, setShowRules] = useState(false)
  const [promptGameId, setPromptGameId] = useState(null)
  const [savedSession, setSavedSession] = useState(null)

  useEffect(() => {
    setSavedSession(loadSession())
  }, [])

  async function createGame() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        onNavigateToGame(data.gameId, data.playerName)
      }
    } catch (e) {
      toast.error('Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  async function createVsCPU() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, cpu: true }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        onNavigateToGame(data.gameId, data.playerName)
      }
    } catch (e) {
      toast.error('Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  async function joinSpecificGame(gameId) {
    if (!name.trim()) {
      setPromptGameId(gameId)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setPromptGameId(null)
        onNavigateToGame(data.gameId, data.playerName)
      }
    } catch (e) {
      toast.error('Failed to join game')
    } finally {
      setLoading(false)
    }
  }

  async function joinGame() {
    if (!joinCode.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/games/${joinCode.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        onNavigateToGame(data.gameId, data.playerName)
      }
    } catch (e) {
      toast.error('Failed to join game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-gradient-to-b from-pirate-navy/70 via-pirate-navy-light/70 to-pirate-navy/70">
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {promptGameId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xs bg-pirate-wood border border-pirate-gold/40 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
            <h2 className="font-pirate text-2xl text-pirate-gold text-center">
              What's your name?
            </h2>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && joinSpecificGame(promptGameId)}
              className="w-full px-4 py-3 bg-pirate-wood-light border border-pirate-gold/30 rounded-xl text-pirate-parchment placeholder-pirate-parchment/40 focus:outline-none focus:border-pirate-gold transition-colors"
            />
            <button
              onClick={() => joinSpecificGame(promptGameId)}
              disabled={loading || !name.trim()}
              className="w-full btn-gold disabled:opacity-50"
            >
              Join Game
            </button>
            <button onClick={() => setPromptGameId(null)} className="w-full btn-parchment">
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="bg-pirate" />
      <div className="w-full max-w-sm text-center relative z-10">
        <h1 className="font-pirate text-5xl text-pirate-gold mb-2">🏴‍☠️ Mia 🏴‍☠️</h1>
        <p className="text-pirate-parchment/50 text-sm mb-1">A classic bluffing dice game</p>
        <button
          onClick={() => setShowRules(true)}
          className="text-pirate-gold/70 hover:text-pirate-gold text-xs underline underline-offset-2 transition-colors mb-8"
        >
          How to Play
        </button>

        {!showJoin ? (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              maxLength={20}
              className="w-full px-4 py-3 bg-pirate-wood-light border border-pirate-gold/30 rounded-xl text-pirate-parchment placeholder-pirate-parchment/40 focus:outline-none focus:border-pirate-gold transition-colors"
            />
            <button
              onClick={createGame}
              disabled={loading}
              className="w-full btn-gold disabled:opacity-50"
            >
              Create Game
            </button>
            <button
              onClick={createVsCPU}
              disabled={loading}
              className="w-full btn-ocean disabled:opacity-50"
            >
              vs Computer
            </button>
            <button onClick={() => setShowJoin(true)} className="w-full btn-parchment">
              Join Game
            </button>
            {savedSession && (
              <div className="mt-4 p-3 bg-pirate-wood/60 border border-pirate-gold/20 rounded-xl">
                <p className="text-pirate-parchment/50 text-xs uppercase tracking-wider mb-2">
                  Active Game
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateToGame(savedSession.gameId, savedSession.playerName)}
                    className="flex-1 btn-gold text-sm"
                  >
                    Rejoin as {savedSession.playerName}
                  </button>
                  <button
                    onClick={() => {
                      clearSession()
                      setSavedSession(null)
                    }}
                    className="px-3 py-2 text-pirate-parchment/50 hover:text-pirate-parchment text-sm"
                    title="Forget this game"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            <PendingGamesList currentName={name} onJoinGame={joinSpecificGame} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              maxLength={20}
              className="w-full px-4 py-3 bg-pirate-wood-light border border-pirate-gold/30 rounded-xl text-pirate-parchment placeholder-pirate-parchment/40 focus:outline-none focus:border-pirate-gold transition-colors"
            />
            <input
              type="text"
              placeholder="Game code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.trim().slice(0, 20))}
              className="w-full px-4 py-3 bg-pirate-wood-light border border-pirate-gold/30 rounded-xl text-pirate-parchment placeholder-pirate-parchment/40 focus:outline-none focus:border-pirate-gold transition-colors font-mono"
              autoFocus
            />
            <button
              onClick={joinGame}
              disabled={loading || !joinCode.trim()}
              className="w-full btn-gold disabled:opacity-50"
            >
              Join Game
            </button>
            <button
              onClick={() => {
                setShowJoin(false)
                onNavigateToLobby()
              }}
              className="w-full btn-parchment"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
