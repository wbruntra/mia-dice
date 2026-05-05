import { useGame } from '../../context/GameContext'
import { useGameUI } from '../../hooks/useGameUI'
import { Die, getRankLabel, diceRank, RANKS } from '../../utils/game'
import { toast } from 'sonner'
import { useState, useCallback, useEffect } from 'react'

export default function GameView() {
  const { state, connected, error, send, onLeave } = useGame()
  const { showClaimPicker, setShowClaimPicker, pendingAction, setPendingAction, setPendingValue } =
    useGameUI()
  const [challengeAcked, setChallengeAcked] = useState(false)
  const [roundEndAcked, setRoundEndAcked] = useState(false)
  const [justRolled, setJustRolled] = useState(false)

  // Clear justRolled when it's no longer our turn (after raising)
  useEffect(() => {
    if (state && state.turnPlayer !== state.player) {
      setJustRolled(false)
    }
  }, [state?.turnPlayer, state?.player])

  if (!state) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-neutral-400">
          {!connected ? 'Connecting...' : 'Loading...'}
        </p>
      </div>
    )
  }

  if (state.status === 'waiting') {
    const joinUrl = `${window.location.origin}${window.location.pathname}?join=${state.id}`
    return (
      <WaitingRoom gameId={state.id} joinUrl={joinUrl} onLeave={onLeave} />
    )
  }

  if (error) {
    toast.error(error)
  }

  const isMyTurn = state.turnPlayer === state.player
  const hasCurrentClaim = state.currentClaim !== null
  const isOriginalCaller = state.originalCaller === state.player
  const canPass = state.canPass && state.roundPhase === 'claim' && isMyTurn && hasCurrentClaim && !isOriginalCaller
  const showActions =
    isMyTurn && state.roundPhase === 'claim' && state.status === 'playing'

  function doSend(move) {
    send(move)
    setShowClaimPicker(false)
    setPendingAction(null)
    setPendingValue(null)
  }

  function handleClaimValue(value) {
    if (pendingAction === 'claim') {
      doSend({ type: 'claim', value })
    } else if (pendingAction === 'raise') {
      doSend({ type: 'raise', value })
    } else if (pendingAction === 'roll_raise') {
      doSend({ type: 'roll_raise', value })
    }
  }

  function handlePass() {
    doSend({ type: 'pass' })
  }

  function handleChallenge() {
    doSend({ type: 'challenge' })
  }

  function handleAck(type) {
    if (type === 'challenge') {
      setChallengeAcked(true)
      send({ type: 'challenge_ack' })
    } else if (type === 'round_end') {
      setRoundEndAcked(true)
      send({ type: 'round_end_ack' })
    }
  }

  const showChallengeResult =
    state.roundPhase === 'challenge_result' || state.roundPhase === 'game_over'
  const showRoundEnd = state.roundPhase === 'round_end'
  const needChallengeAck =
    showChallengeResult && !state.challengeAcks.includes(state.player)
  const needRoundEndAck = showRoundEnd && !state.roundEndAcks.includes(state.player)

  const myDice = state.dice
  const currentClaimDisplay = state.currentClaim?.display

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <button
          onClick={onLeave}
          className="text-neutral-500 text-sm hover:text-neutral-300 transition-colors"
        >
          Leave
        </button>
        <span className="text-neutral-500 text-sm">Round {state.roundNumber}</span>
        <span className="text-neutral-700 text-sm">
          {state.status === 'waiting' && 'Waiting for opponent...'}
          {!connected && ' (reconnecting)'}
        </span>
      </header>

      {/* Opponent Area */}
      <div className="flex items-center justify-between bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
        <div>
          <p className="text-sm text-neutral-400">{state.opponentName}</p>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: state.opponentLives }, (_, i) => (
              <span key={i} className="text-red-500 text-lg">&#9829;</span>
            ))}
            {Array.from({ length: Math.max(0, 3 - state.opponentLives) }, (_, i) => (
              <span key={`e-${i}`} className="text-neutral-700 text-lg">&#9829;</span>
            ))}
          </div>
        </div>
        {state.turnPlayer !== state.player && state.roundPhase === 'claim' && (
          <span className="text-amber-500 text-xs animate-pulse">Thinking...</span>
        )}
      </div>

      {/* Dice Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {myDice ? (
          <div className="flex gap-4">
            <Die value={myDice[0]} size={72} />
            <Die value={myDice[1]} size={72} />
          </div>
        ) : (
          <div className="flex gap-4">
            <Die value={1} size={72} hidden />
            <Die value={1} size={72} hidden />
          </div>
        )}

        {/* Value display */}
        {myDice && (
          <p className="text-2xl font-bold text-white">
            {getRankLabel(diceRank(myDice))}
          </p>
        )}

        {/* Current Claim */}
        {currentClaimDisplay && (
          <div className="text-center">
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Current Claim</p>
            <p className="text-3xl font-bold text-amber-400">{currentClaimDisplay}</p>
            <p className="text-xs text-neutral-500 mt-1">
              by {state.currentClaim?.player === state.player ? 'You' : state.opponentName}
            </p>
          </div>
        )}
      </div>

      {/* Player Area */}
      <div className="flex items-center justify-between bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
        <div>
          <p className="text-sm font-medium text-white">
            {state.myName} {isMyTurn && state.roundPhase === 'claim' && '⬅'}
          </p>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: state.myLives }, (_, i) => (
              <span key={i} className="text-red-500 text-lg">&#9829;</span>
            ))}
            {Array.from({ length: Math.max(0, 3 - state.myLives) }, (_, i) => (
              <span key={`e-${i}`} className="text-neutral-700 text-lg">&#9829;</span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex flex-wrap gap-2 justify-center">
          {!hasCurrentClaim && (
            <button
              onClick={() => {
                setPendingAction('claim')
                setShowClaimPicker(true)
              }}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
            >
              Make Claim
            </button>
          )}

          {hasCurrentClaim && justRolled && (
            <button
              onClick={() => {
                setPendingAction('raise')
                setShowClaimPicker(true)
              }}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
            >
              Raise
            </button>
          )}

          {hasCurrentClaim && !justRolled && !isOriginalCaller && (
            <>
              <button
                onClick={() => {
                  setPendingAction('raise')
                  setShowClaimPicker(true)
                }}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
              >
                Raise
              </button>
              <button
                onClick={() => {
                  setJustRolled(true)
                  doSend({ type: 'roll' })
                }}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
              >
                Roll
              </button>
              <button
                onClick={handlePass}
                className="px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-xl transition-colors"
              >
                Pass
              </button>
              <button
                onClick={handleChallenge}
                className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors"
              >
                Challenge
              </button>
            </>
          )}

          {hasCurrentClaim && !justRolled && isOriginalCaller && (
            <>
              <button
                onClick={() => {
                  setPendingAction('raise')
                  setShowClaimPicker(true)
                }}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
              >
                Raise
              </button>
              <button
                onClick={() => {
                  setPendingAction('roll_raise')
                  setShowClaimPicker(true)
                }}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
              >
                Roll & Raise
              </button>
              <button
                onClick={handleChallenge}
                className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors"
              >
                Challenge
              </button>
            </>
          )}
        </div>
      )}

      {/* Waiting states */}
      {state.roundPhase === 'claim' && !isMyTurn && hasCurrentClaim && (
        <p className="text-center text-sm text-neutral-500">
          Waiting for {state.opponentName}...
        </p>
      )}

      {needChallengeAck && (
        <ChallengeResultOverlay
          result={state.challengeResult}
          myName={state.myName}
          opponentName={state.opponentName}
          onAck={() => handleAck('challenge')}
          acked={challengeAcked}
        />
      )}

      {needRoundEndAck && (
        <RoundEndOverlay
          result={state.challengeResult}
          onAck={() => handleAck('round_end')}
          acked={roundEndAcked}
        />
      )}

      {state.status === 'finished' && !needRoundEndAck && showChallengeResult && (
        <GameOverOverlay
          winner={state.winner}
          myName={state.myName}
          opponentName={state.opponentName}
          player={state.player}
          onLeave={onLeave}
        />
      )}

      {/* Claim Picker Modal */}
      {showClaimPicker && (
        <ClaimPickerModal
          currentClaim={state.currentClaim}
          myDice={myDice}
          onSelect={handleClaimValue}
          onClose={() => {
            setShowClaimPicker(false)
            setPendingAction(null)
          }}
        />
      )}

      <div className="h-4" />
    </div>
  )
}

function ChallengeResultOverlay({ result, myName, opponentName, onAck, acked }) {
  if (!result) return null
  const iWon = result.iWon
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full text-center">
        <p className="text-4xl mb-4">{iWon ? '🎉' : '💀'}</p>
        <p className="text-xl font-bold text-white mb-2">
          {iWon ? 'You won the challenge!' : 'You lost the challenge!'}
        </p>
        <div className="flex justify-center gap-4 my-4">
          <div className="bg-neutral-800 rounded-xl px-4 py-3">
            <p className="text-xs text-neutral-400">Claimed</p>
            <p className="text-2xl font-bold text-amber-400">{result.claimedValue}</p>
          </div>
          <div className="bg-neutral-800 rounded-xl px-4 py-3">
            <p className="text-xs text-neutral-400">Actual</p>
            <p className="text-2xl font-bold text-white">{result.actualValue}</p>
          </div>
        </div>
        {result.livesLost > 1 && (
          <p className="text-red-400 text-sm mb-2">Mia! Loser loses {result.livesLost} lives!</p>
        )}
        <button
          onClick={onAck}
          disabled={acked}
          className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {acked ? 'Waiting...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

function RoundEndOverlay({ result, onAck, acked }) {
  if (!result) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full text-center">
        <p className="text-3xl mb-4">Round Over</p>
        <p className="text-neutral-400 text-sm">
          {result.challengerWins
            ? 'Challenger caught the bluff!'
            : 'Challenger was wrong!'}
        </p>
        <button
          onClick={onAck}
          disabled={acked}
          className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {acked ? 'Waiting...' : 'Next Round'}
        </button>
      </div>
    </div>
  )
}

function GameOverOverlay({ winner, myName, opponentName, player, onLeave }) {
  const iWon = winner === player
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-amber-700 rounded-2xl p-8 max-w-sm w-full text-center">
        <p className="text-5xl mb-4">{iWon ? '🏆' : '😞'}</p>
        <p className="text-2xl font-bold text-white mb-2">
          {iWon ? 'You Win!' : `${opponentName} Wins!`}
        </p>
        <button
          onClick={onLeave}
          className="mt-6 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  )
}

function ClaimPickerModal({ currentClaim, myDice, onSelect, onClose }) {
  const minValue = currentClaim ? currentClaim.value + 1 : 0
  const myRank = myDice ? diceRank(myDice) : -1

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-lg font-bold text-white">Choose Claim</p>
        <button onClick={onClose} className="text-neutral-400 hover:text-white text-2xl">&times;</button>
      </div>
      {currentClaim && (
        <p className="text-sm text-neutral-400 mb-3">
          Must be higher than{' '}
          <span className="text-amber-400 font-bold">{currentClaim.display}</span>
        </p>
      )}
      <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 content-start">
        {RANKS.filter((r) => r.value >= minValue).map((rank) => {
          const isMyRoll = rank.value === myRank
          return (
            <button
              key={rank.value}
              onClick={() => onSelect(rank.value)}
              className={`relative py-3 px-2 rounded-xl text-center font-bold text-lg transition-colors ${
                rank.label === 'Mia'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : rank.value >= 14
                    ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              {rank.label}
              {isMyRoll && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          )
        })}
        {minValue > 20 && (
          <p className="col-span-3 text-center text-neutral-500 py-8">
            No valid claims remaining. Must challenge!
          </p>
        )}
      </div>
    </div>
  )
}

function WaitingRoom({ gameId, joinUrl, onLeave }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied!')
    } catch {
      // fallback for non-HTTPS
      toast.error('Failed to copy')
    }
  }, [joinUrl])

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-xl font-bold text-white">Game Created</p>
      <p className="text-neutral-400 text-sm">Share this link with your opponent:</p>

      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-xl p-3 flex items-center gap-2">
        <p className="flex-1 text-sm font-mono text-amber-400 truncate">{joinUrl}</p>
        <button
          onClick={handleCopy}
          className={`shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'
          }`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p className="text-neutral-600 text-xs">or code: <span className="font-mono text-neutral-400">{gameId}</span></p>

      <p className="text-neutral-500 text-sm">Waiting for opponent to join...</p>
      <button
        onClick={onLeave}
        className="mt-4 px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-xl transition-colors"
      >
        Leave
      </button>
    </div>
  )
}
