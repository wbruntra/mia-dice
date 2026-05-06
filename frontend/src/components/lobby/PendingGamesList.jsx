import { useLobbySocket } from '../../hooks/useLobbySocket'

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60) return `${mins} mins ago`
  const hours = Math.floor(mins / 60)
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`
}

export default function PendingGamesList({ currentName, onJoinGame }) {
  const { pendingGames } = useLobbySocket()
  const trimmedName = currentName.trim()

  const visible = pendingGames.filter((g) => g.playerName !== trimmedName)

  if (visible.length === 0) return null

  return (
    <div className="mt-8 w-full">
      <p className="text-pirate-parchment/50 text-xs uppercase tracking-wider mb-3">
        Open Games
      </p>
      <div className="flex flex-col gap-2">
        {visible.map((game) => (
          <div
            key={game.id}
            className="flex items-center justify-between px-4 py-3 bg-pirate-wood-light border border-pirate-gold/20 rounded-xl"
          >
            <div className="flex flex-col">
              <span className="text-pirate-parchment font-medium">{game.playerName}</span>
              <span className="text-pirate-parchment/40 text-xs">
                {formatRelativeTime(game.createdAt)}
              </span>
            </div>
            <button
              onClick={() => onJoinGame(game.id)}
              className="btn-gold text-sm px-4 py-1.5"
            >
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
