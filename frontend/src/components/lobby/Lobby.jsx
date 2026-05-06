import { useState } from 'react'
import { toast } from 'sonner'
import RulesModal from './RulesModal'

const API = '/api'

export default function Lobby({ joinId, onNavigateToGame, onNavigateToLobby }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showJoin, setShowJoin] = useState(!!joinId)
  const [joinCode, setJoinCode] = useState(joinId || '')
  const [showRules, setShowRules] = useState(false)

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
              onClick={() => setShowJoin(true)}
              className="w-full btn-parchment"
            >
              Join Game
            </button>
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
