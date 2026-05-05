import { useGame } from '../../context/GameContext'
import { useGameUI } from '../../hooks/useGameUI'
import { Die, getRankLabel, diceRank, RANKS } from '../../utils/game'
import { toast } from 'sonner'
import { useState, useCallback, useEffect, useRef } from 'react'

function diceFromDisplay(display) {
  if (!display) return null
  if (display === 'Mia') return [2, 1]
  if (display.length < 2) return null
  const a = parseInt(display[0])
  const b = parseInt(display[1])
  return isNaN(a) || isNaN(b) ? null : [a, b]
}

function randomDie() {
  return Math.ceil(Math.random() * 6)
}

export default function GameView() {
  const { state, connected, error, send, onLeave } = useGame()
  const { showClaimPicker, setShowClaimPicker, pendingAction, setPendingAction, setPendingValue } =
    useGameUI()
  const [challengeAcked, setChallengeAcked] = useState(false)
  const [roundEndAcked, setRoundEndAcked] = useState(false)
  const [justRolled, setJustRolled] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [animDice, setAnimDice] = useState(null)
  const rollTimerRef = useRef(null)
  const rollIntervalRef = useRef(null)

  useEffect(() => {
    if (state && state.turnPlayer !== state.player) {
      setJustRolled(false)
    }
  }, [state?.turnPlayer, state?.player])

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current)
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current)
    }
  }, [])

  function startRollAnimation() {
    if (rolling) return
    setRolling(true)
    setJustRolled(true)

    rollIntervalRef.current = setInterval(() => {
      setAnimDice([randomDie(), randomDie()])
    }, 150)

    rollTimerRef.current = setTimeout(() => {
      clearInterval(rollIntervalRef.current)
      rollIntervalRef.current = null
      setRolling(false)
      setAnimDice(null)
    }, 1500)

    doSend({ type: 'roll' })
  }

  if (!state) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-pirate-parchment/50">
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
  const isMiaClaim = state.currentClaim?.value === 20
  const canPass = state.canPass && state.roundPhase === 'claim' && isMyTurn && hasCurrentClaim && !isOriginalCaller && !isMiaClaim
  const showActions =
    isMyTurn && state.roundPhase === 'claim' && state.status === 'playing'

  const me = state.playerStates.find(p => p.isMe)
  const opponent = state.playerStates.find(p => !p.isMe)

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

  function handleGiveUp() {
    doSend({ type: 'give_up' })
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
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-4 relative">
      {/* Background overlay */}
      <div className="bg-pirate" />

      {/* Header */}
      <header className="flex items-center justify-between relative z-10">
        <button
          onClick={onLeave}
          className="text-pirate-parchment/40 text-sm hover:text-pirate-parchment/70 transition-colors"
        >
          Leave
        </button>
        <span className="font-pirate text-pirate-gold text-base">⚓ Round {state.roundNumber}</span>
        <span className="text-pirate-parchment/30 text-sm">
          {state.status === 'waiting' && 'Waiting for opponent...'}
          {!connected && ' (reconnecting)'}
        </span>
      </header>

      {/* Opponent Area */}
      <div className="flex items-center justify-between bg-pirate-wood/60 rounded-xl p-4 border border-pirate-gold/20 relative z-10">
        <div>
          <p className="text-sm text-pirate-parchment/70">{opponent.name}</p>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: opponent.lives }, (_, i) => (
              <span key={i} className="text-red-500 text-lg">&#9829;</span>
            ))}
            {Array.from({ length: Math.max(0, state.startingLives - opponent.lives) }, (_, i) => (
              <span key={`e-${i}`} className="text-pirate-wood-light/50 text-lg">&#9829;</span>
            ))}
          </div>
        </div>
        {state.turnPlayer !== state.player && state.roundPhase === 'claim' && (
          <span className="text-pirate-gold text-xs animate-pulse">Thinking...</span>
        )}
      </div>

      {/* Last action */}
      {state.lastAction && (
        <p className="text-white text-sm text-center relative z-10">{state.lastAction}</p>
      )}

      {/* Dice Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-4">
            {rolling && animDice ? (
              <>
                <Die value={animDice[0]} size={72} />
                <Die value={animDice[1]} size={72} />
              </>
            ) : myDice ? (
              <>
                <Die value={myDice[0]} size={72} />
                <Die value={myDice[1]} size={72} />
              </>
            ) : (
              <>
                <Die value={1} size={72} hidden />
                <Die value={1} size={72} hidden />
              </>
            )}
          </div>

          <p className="h-8 font-pirate text-2xl text-pirate-gold text-center leading-8">
            {myDice && !rolling ? getRankLabel(diceRank(myDice)) : ''}
          </p>

          <div className="h-[72px] flex flex-col items-center justify-center text-center">
            {currentClaimDisplay && (
              <>
                <p className="text-xs text-pirate-parchment/40 uppercase tracking-widest">
                  ☠️ Current Claim ☠️
                </p>
                <p className="font-pirate text-4xl text-pirate-gold">{currentClaimDisplay}</p>
                <p className="text-xs text-pirate-parchment/40 mt-0.5">
                  by {state.currentClaim?.player === state.player ? 'You' : opponent.name}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Player Area */}
      <div className="flex items-center justify-between bg-pirate-wood/60 rounded-xl p-4 border border-pirate-gold/20 relative z-10">
        <div>
          <p className="text-sm font-medium text-pirate-parchment">
            {me.name} {isMyTurn && state.roundPhase === 'claim' && '🏴‍☠️'}
          </p>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: me.lives }, (_, i) => (
              <span key={i} className="text-red-500 text-lg">&#9829;</span>
            ))}
            {Array.from({ length: Math.max(0, state.startingLives - me.lives) }, (_, i) => (
              <span key={`e-${i}`} className="text-pirate-wood-light/50 text-lg">&#9829;</span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="min-h-[52px] flex flex-wrap gap-2 justify-center items-center relative z-10">
        {/* Mia claim — special options */}
        {showActions && isMiaClaim && (
          <>
            <button onClick={handleGiveUp} className="btn-parchment">
              Give Up
            </button>
            <button onClick={handleChallenge} className="btn-crimson">
              Look
            </button>
          </>
        )}

        {showActions && !isMiaClaim && !hasCurrentClaim && (
          <button
            onClick={() => {
              setPendingAction('claim')
              setShowClaimPicker(true)
            }}
            className="btn-gold"
          >
            Make Claim
          </button>
        )}

        {showActions && !isMiaClaim && hasCurrentClaim && justRolled && (
          <button
            onClick={() => {
              setPendingAction('raise')
              setShowClaimPicker(true)
            }}
            className="btn-gold"
          >
            Raise
          </button>
        )}

        {showActions && !isMiaClaim && hasCurrentClaim && !justRolled && !isOriginalCaller && (
          <>
            <button
              onClick={() => {
                setPendingAction('raise')
                setShowClaimPicker(true)
              }}
              className="btn-gold"
            >
              Raise
            </button>
            <button
              onClick={startRollAnimation}
              className="btn-ocean"
            >
              Roll
            </button>
            <button
              onClick={handlePass}
              className="btn-parchment"
            >
              Pass
            </button>
            <button
              onClick={handleChallenge}
              className="btn-crimson"
            >
              ☠️ Challenge
            </button>
          </>
        )}

        {showActions && !isMiaClaim && hasCurrentClaim && !justRolled && isOriginalCaller && (
          <>
            <button
              onClick={() => {
                setPendingAction('raise')
                setShowClaimPicker(true)
              }}
              className="btn-gold"
            >
              Raise
            </button>
            <button
              onClick={startRollAnimation}
              className="btn-ocean"
            >
              Roll &amp; Raise
            </button>
            <button
              onClick={handleChallenge}
              className="btn-crimson"
            >
              ☠️ Challenge
            </button>
          </>
        )}

        {!showActions && state.roundPhase === 'claim' && !isMyTurn && hasCurrentClaim && (
          <p className="text-sm text-pirate-parchment/40 italic">Waiting for {opponent.name}...</p>
        )}
      </div>

      {needChallengeAck && (
        <ChallengeResultOverlay
          result={state.challengeResult}
          onAck={() => handleAck('challenge')}
        />
      )}

      {needRoundEndAck && (
        <RoundEndOverlay
          result={state.challengeResult}
          onAck={() => handleAck('round_end')}
        />
      )}

      {state.roundPhase === 'game_over' && (
        <GameOverOverlay
          winner={state.winner}
          playerStates={state.playerStates}
          onLeave={onLeave}
        />
      )}

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
    </div>
  )
}

function ChallengeResultOverlay({ result, onAck }) {
  const [phase, setPhase] = useState('dramatic')
  const cardbackUp = phase === 'revealing' || phase === 'revealed'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('revealing'), 2000)
    const t2 = setTimeout(() => setPhase('revealed'), 6000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  if (!result) return null

  // Simplified overlay for giving up against Mia
  if (result.gaveUp) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-pirate-wood-light border border-pirate-gold/40 rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="font-pirate text-3xl text-pirate-gold mb-4">🏳️ Gave Up</p>
          <p className="text-pirate-parchment/60 text-sm mb-3">
            {result.iChallenged
              ? 'You folded against Mia.'
              : 'Opponent gave up against your Mia!'}
          </p>
          <p className="text-red-400 text-sm mb-4">
            {result.iChallenged ? 'You' : 'Opponent'} lost {result.livesLost} life
          </p>
          <button onClick={onAck} className="btn-gold">Continue</button>
        </div>
      </div>
    )
  }

  const iWon = result.iWon
  const claimedDice = diceFromDisplay(result.claimedValue)

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-pirate-wood-light border border-pirate-gold/40 rounded-2xl p-6 max-w-sm w-full text-center">

        <div className="h-10 flex items-center justify-center mb-4">
          {phase === 'dramatic' && (
            <p className="font-pirate text-3xl text-pirate-gold animate-pulse">Challenge!</p>
          )}
          {phase === 'revealing' && (
            <p className="font-pirate text-xl text-pirate-gold animate-pulse">Revealing...</p>
          )}
          {phase === 'revealed' && (
            <p className="font-pirate text-2xl text-pirate-parchment">
              {iWon ? '🎉 You won!' : '💀 You lost!'}
            </p>
          )}
        </div>

        <div className="bg-pirate-wood/40 rounded-xl px-4 py-3 mb-2">
          <p className="text-xs text-pirate-parchment/50 uppercase tracking-wide mb-2">Claimed</p>
          <div className="flex justify-center gap-3">
            {claimedDice
              ? claimedDice.map((v, i) => <Die key={i} value={v} size={56} />)
              : <span className="text-pirate-parchment/40 text-sm">—</span>
            }
          </div>
          <p className="font-pirate text-lg text-pirate-gold mt-2">{result.claimedValue}</p>
        </div>

        <p className="text-pirate-parchment/30 text-xs mb-2">▼ Actual</p>

        <div className="bg-pirate-wood/40 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-pirate-parchment/50 uppercase tracking-wide mb-2">Actual</p>
          <div className="flex justify-center gap-3">
            {result.dice.map((value, i) => (
              <div key={i} className="relative overflow-hidden rounded-lg bg-pirate-wood" style={{ width: 56, height: 56 }}>
                <div style={{ visibility: cardbackUp ? 'visible' : 'hidden' }}>
                  <Die value={value} size={56} />
                </div>
                <img
                  src="/cards/cardback.webp"
                  alt=""
                  className="absolute inset-0 rounded-lg"
                  style={{
                    width: 56,
                    height: 56,
                    transition: `transform 0.6s ${i * 0.15}s cubic-bezier(0.4, 0, 0.2, 1)`,
                    transform: cardbackUp ? 'translateY(-100%)' : 'translateY(0)',
                  }}
                />
              </div>
            ))}
          </div>
          <p
            className="font-pirate text-lg text-pirate-parchment mt-2 transition-opacity duration-500"
            style={{ opacity: phase === 'revealed' ? 1 : 0 }}
          >
            {result.actualValue}
          </p>
        </div>

        <div className="h-5 mb-3">
          {phase === 'revealed' && result.livesLost > 1 && (
            <p className="text-red-400 text-sm">Mia! Loser loses {result.livesLost} lives!</p>
          )}
        </div>

        <button
          onClick={phase === 'revealed' ? onAck : undefined}
          className={`btn-gold transition-opacity duration-300 ${
            phase === 'revealed' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function RoundEndOverlay({ result, onAck }) {
  if (!result) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-pirate-wood-light border border-pirate-gold/40 rounded-2xl p-6 max-w-sm w-full text-center">
        <p className="font-pirate text-3xl text-pirate-gold mb-4">⚓ Round Over</p>
        <p className="text-pirate-parchment/60 text-sm">
          {result.challengerWins
            ? 'Challenger caught the bluff!'
            : 'Challenger was wrong!'}
        </p>
        <button
          onClick={onAck}
          className="mt-4 btn-gold"
        >
          Next Round
        </button>
      </div>
    </div>
  )
}

function GameOverOverlay({ winner, playerStates, onLeave }) {
  const me = playerStates.find(p => p.isMe)
  const opponent = playerStates.find(p => !p.isMe)
  const iWon = winner === me.name
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-pirate-wood-light border border-pirate-gold rounded-2xl p-8 max-w-sm w-full text-center">
        <p className="text-5xl mb-4">{iWon ? '🏆' : '💀'}</p>
        <p className="font-pirate text-3xl text-pirate-gold mb-2">
          {iWon ? 'You Win!' : `${opponent.name} Wins!`}
        </p>
        <p className="text-pirate-parchment/50 text-sm mb-4">
          {iWon ? 'The seas are yours, captain!' : 'Walk the plank...'}
        </p>
        <button
          onClick={onLeave}
          className="btn-gold"
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
        <p className="font-pirate text-xl text-pirate-gold">Choose Claim</p>
        <button onClick={onClose} className="text-pirate-parchment/40 hover:text-pirate-parchment text-2xl">&times;</button>
      </div>
      {currentClaim && (
        <p className="text-sm text-pirate-parchment/50 mb-3">
          Must be higher than{' '}
          <span className="text-pirate-gold font-bold font-pirate">{currentClaim.display}</span>
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
                  ? 'bg-pirate-gold hover:bg-pirate-gold-light text-black font-pirate'
                  : rank.value >= 14
                    ? 'bg-pirate-wood-light hover:bg-pirate-wood text-pirate-parchment'
                    : 'bg-pirate-navy-light hover:bg-pirate-wood text-pirate-parchment/70'
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
          <p className="col-span-3 text-center text-pirate-parchment/40 py-8">
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
      toast.error('Failed to copy')
    }
  }, [joinUrl])

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 relative">
      <div className="bg-pirate" />
      <p className="font-pirate text-2xl text-pirate-gold relative z-10">Game Created</p>
      <p className="text-pirate-parchment/50 text-sm relative z-10">Share this link with your opponent:</p>

      <div className="w-full max-w-sm bg-pirate-wood/60 border border-pirate-gold/20 rounded-xl p-3 flex items-center gap-2 relative z-10">
        <p className="flex-1 text-sm font-mono text-pirate-ocean truncate">{joinUrl}</p>
        <button
          onClick={handleCopy}
          className={`shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            copied
              ? 'bg-pirate-ocean text-white'
              : 'bg-pirate-wood hover:bg-pirate-wood-light text-pirate-parchment/70'
          }`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p className="text-pirate-parchment/30 text-xs relative z-10">
        or code: <span className="font-mono text-pirate-parchment/50">{gameId}</span>
      </p>

      <p className="text-pirate-parchment/40 text-sm relative z-10">Waiting for opponent to join...</p>
      <button
        onClick={onLeave}
        className="mt-4 btn-parchment relative z-10"
      >
        Leave
      </button>
    </div>
  )
}
