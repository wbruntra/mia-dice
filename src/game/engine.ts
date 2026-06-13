import type { GameState, ChallengeResult, StoredMove } from './types'
import { rollDice, diceRank, rankDisplay } from './types'

export function blankState(id: string, players: string[], startingLives: number): GameState {
  return {
    id,
    status: 'waiting',
    players,
    startingLives,
    winner: null,
    dice: null,
    lastRoller: null,
    lives: new Array(players.length).fill(startingLives),
    currentClaim: null,
    originalCaller: null,
    turnPlayer: null,
    roundPhase: null,
    roundNumber: 1,
    challengeResult: null,
    challengeAcks: [],
    roundEndAcks: [],
    lastAction: null,
    cpuPlayer: null,
    lastStartingPlayer: 0,
    rematchOfferedBy: null,
  }
}

export function newGame(dice: [number, number]): Partial<GameState> {
  return {
    status: 'playing',
    turnPlayer: 0,
    roundPhase: 'claim',
    dice,
    lastRoller: 0,
    currentClaim: null,
    originalCaller: 0,
    roundNumber: 1,
    challengeResult: null,
    challengeAcks: [],
    roundEndAcks: [],
    lastStartingPlayer: 0,
    rematchOfferedBy: null,
  }
}

export function newRound(state: GameState, startingPlayer: number, dice: [number, number]): GameState {
  return {
    ...state,
    dice,
    currentClaim: null,
    originalCaller: startingPlayer,
    lastRoller: startingPlayer,
    turnPlayer: startingPlayer,
    roundPhase: 'claim',
    roundNumber: state.roundNumber + 1,
    challengeResult: null,
    challengeAcks: [],
    roundEndAcks: [],
    rematchOfferedBy: null,
  }
}

export function makeClaim(
  state: GameState,
  player: number,
  value: number,
): { state: GameState; error?: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (state.currentClaim !== null) return { state, error: 'Claim already exists' }
  if (value < 0 || value > 20) return { state, error: 'Invalid claim value' }

  return {
    state: {
      ...state,
      currentClaim: { value, player },
      originalCaller: player,
      lastRoller: player,
      turnPlayer: 1 - player,
    },
  }
}

export function rollDiceAction(
  state: GameState,
  player: number,
  dice: [number, number],
): { state: GameState; error?: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (!state.currentClaim) return { state, error: 'No claim to roll against' }
  if (state.currentClaim.value === 20) return { state, error: 'Mia claimed — must give up or look' }

  return {
    state: {
      ...state,
      dice,
      lastRoller: player,
    },
  }
}

export function raise(
  state: GameState,
  player: number,
  value: number,
): { state: GameState; error?: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (!state.currentClaim) return { state, error: 'No claim to raise' }
  if (state.currentClaim.value === 20) return { state, error: 'Mia claimed — must give up or look' }
  if (value <= state.currentClaim.value) {
    return {
      state,
      error: `Must claim higher than ${rankDisplay(state.currentClaim.value)}`,
    }
  }

  return {
    state: {
      ...state,
      currentClaim: { value, player },
      originalCaller: player,
      lastRoller: player,
      turnPlayer: 1 - player,
    },
  }
}

export function rollAndRaise(
  state: GameState,
  player: number,
  value: number,
  dice: [number, number],
): { state: GameState; error?: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (!state.currentClaim) return { state, error: 'No claim to raise' }
  if (state.currentClaim.value === 20) return { state, error: 'Mia claimed — must give up or look' }
  if (value <= state.currentClaim.value) {
    return {
      state,
      error: `Must claim higher than ${rankDisplay(state.currentClaim.value)}`,
    }
  }

  return {
    state: {
      ...state,
      dice,
      currentClaim: { value, player },
      originalCaller: player,
      lastRoller: player,
      turnPlayer: 1 - player,
    },
  }
}

export function passDice(
  state: GameState,
  player: number,
): { state: GameState; error?: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (!state.currentClaim) return { state, error: 'No active claim' }
  if (state.currentClaim.value === 20) return { state, error: 'Mia claimed — must give up or look' }
  if (state.originalCaller === player) {
    return { state, error: 'Dice returned — must challenge or raise' }
  }

  return {
    state: {
      ...state,
      currentClaim: { ...state.currentClaim, player },
      turnPlayer: 1 - player,
      lastRoller: null,
    },
  }
}

export function resolveChallenge(
  state: GameState,
  challenger: number,
): { state: GameState; result: ChallengeResult } | { state: GameState; error: string } {
  if (state.roundPhase !== 'claim') {
    return { state, error: 'Not in claim phase' }
  }
  if (!state.currentClaim) return { state, error: 'No claim to challenge' }
  if (!state.dice) return { state, error: 'Dice not rolled' }

  const claimedValue = state.currentClaim.value
  const actualValue = diceRank(state.dice)
  const challenged = state.currentClaim.player

  if (challenged === challenger) {
    return { state, error: 'Cannot challenge your own claim' }
  }

  let challengerWins: boolean
  let livesLost: number

  if (claimedValue === 20) {
    if (actualValue === 20) {
      challengerWins = false
      livesLost = 2
    } else {
      challengerWins = true
      livesLost = 1
    }
  } else {
    challengerWins = actualValue < claimedValue
    livesLost = 1
  }

  let nextState = { ...state, lives: [...state.lives] }
  if (challengerWins) {
    nextState.lives[challenged] -= livesLost
  } else {
    nextState.lives[challenger] -= livesLost
  }

  const result: ChallengeResult = {
    challenger,
    challenged,
    claimedValue,
    actualValue,
    dice: nextState.dice!,
    challengerWins,
    livesLost,
  }

  nextState.roundPhase = 'challenge_result'
  nextState.challengeResult = result
  nextState.challengeAcks = []

  if (nextState.lives[0] <= 0) {
    nextState.winner = nextState.players[1]
    nextState.status = 'finished'
  } else if (nextState.lives[1] <= 0) {
    nextState.winner = nextState.players[0]
    nextState.status = 'finished'
  }

  return { state: nextState, result }
}

export function giveUp(
  state: GameState,
  player: number,
): { state: GameState; result: ChallengeResult } | { state: GameState; error: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (!state.currentClaim) return { state, error: 'No claim to give up against' }
  if (state.currentClaim.value !== 20) return { state, error: 'Can only give up against Mia' }

  const result: ChallengeResult = {
    challenger: player,
    challenged: state.currentClaim.player,
    claimedValue: 20,
    actualValue: -1,
    dice: [0, 0],
    challengerWins: false,
    livesLost: 1,
    gaveUp: true,
  }

  const nextState = { ...state, lives: [...state.lives] }
  nextState.lives[player] -= 1

  nextState.roundPhase = 'challenge_result'
  nextState.challengeResult = result
  nextState.challengeAcks = []

  if (nextState.lives[0] <= 0) {
    nextState.winner = nextState.players[1]
    nextState.status = 'finished'
  } else if (nextState.lives[1] <= 0) {
    nextState.winner = nextState.players[0]
    nextState.status = 'finished'
  }

  return { state: nextState, result }
}

export function surrender(state: GameState, player: number): { state: GameState; error?: string } {
  if (state.status === 'finished') return { state, error: 'Game already finished' }

  const nextState = { ...state, lives: [...state.lives] }
  nextState.lives[player] = 0
  nextState.winner = nextState.players[1 - player]
  nextState.status = 'finished'
  nextState.roundPhase = 'game_over'

  return { state: nextState }
}

export function rematchOffer(
  state: GameState,
  player: number,
): { state: GameState; error?: string } {
  if (state.status !== 'finished') return { state, error: 'Game is not finished' }
  if (state.rematchOfferedBy !== null) return { state, error: 'Rematch already offered' }

  return {
    state: {
      ...state,
      rematchOfferedBy: player,
      lastAction: `${state.players[player]} wants a rematch`,
    },
  }
}

export function rematchAccept(
  state: GameState,
  player: number,
  dice: [number, number],
): { state: GameState; error?: string } {
  if (state.status !== 'finished') return { state, error: 'Game is not finished' }
  if (state.rematchOfferedBy === null) return { state, error: 'No rematch offer to accept' }
  if (state.rematchOfferedBy === player) return { state, error: 'Cannot accept your own offer' }

  const startingPlayer = 1 - state.lastStartingPlayer
  return {
    state: {
      ...state,
      status: 'playing',
      roundPhase: 'claim',
      roundNumber: 1,
      dice,
      lastRoller: startingPlayer,
      currentClaim: null,
      originalCaller: startingPlayer,
      turnPlayer: startingPlayer,
      lives: new Array(state.players.length).fill(state.startingLives),
      winner: null,
      challengeResult: null,
      challengeAcks: [],
      roundEndAcks: [],
      lastStartingPlayer: startingPlayer,
      rematchOfferedBy: null,
      lastAction: 'Rematch accepted — new game started',
    },
  }
}

export function finishChallenge(state: GameState): GameState {
  if (state.status === 'finished') {
    return { ...state, roundPhase: 'game_over' }
  }
  return {
    ...state,
    roundPhase: 'round_end',
    roundEndAcks: [],
  }
}

export function stateForPlayer(state: GameState, player: number) {
  const canSeeDice = state.lastRoller === player && state.turnPlayer === player

  return {
    id: state.id,
    status: state.status,
    currentClaim: state.currentClaim
      ? {
          value: state.currentClaim.value,
          player: state.currentClaim.player,
          display: rankDisplay(state.currentClaim.value),
        }
      : null,
    originalCaller: state.originalCaller,
    turnPlayer: state.turnPlayer,
    roundPhase: state.roundPhase,
    roundNumber: state.roundNumber,
    winner: state.winner,

    playerStates: state.players.map((name, i) => ({
      name,
      lives: state.lives[i],
      isMe: i === player,
    })),

    startingLives: state.startingLives,

    dice: canSeeDice ? state.dice : null,
    diceDisplay: canSeeDice && state.dice ? rankDisplay(diceRank(state.dice)) : null,

    canPass: state.originalCaller !== player && state.roundPhase === 'claim',

    challengeResult: state.challengeResult
      ? {
          challenger: state.challengeResult.challenger,
          challenged: state.challengeResult.challenged,
          claimedValue: rankDisplay(state.challengeResult.claimedValue),
          actualValue: rankDisplay(state.challengeResult.actualValue),
          dice: state.challengeResult.dice,
          challengerWins: state.challengeResult.challengerWins,
          livesLost: state.challengeResult.livesLost,
          iChallenged: state.challengeResult.challenger === player,
          iWon:
            state.challengeResult.challengerWins
              ? state.challengeResult.challenger === player
              : state.challengeResult.challenged === player,
          gaveUp: state.challengeResult.gaveUp,
        }
      : null,
    challengeAcks: state.challengeAcks,
    roundEndAcks: state.roundEndAcks,

    player,
    cpuPlayer: state.cpuPlayer,
    lastAction: state.lastAction,
    rematchOfferedBy: state.rematchOfferedBy,
  }
}

// --- Event sourcing reducer ---

export function applyMove(
  state: GameState,
  move: StoredMove,
): { state: GameState; error?: string } {
  const player = move.player

  switch (move.type) {
    case 'game_start': {
      const { dice, cpuPlayer } = (move.data || {}) as { dice?: [number, number]; cpuPlayer?: number }
      if (!dice) return { state, error: 'game_start missing dice' }
      return { state: { ...state, ...newGame(dice), cpuPlayer: cpuPlayer ?? null, lastAction: 'Game started' } }
    }

    case 'claim': {
      if (player === undefined) return { state, error: 'Missing player for claim' }
      const { value } = (move.data || {}) as { value?: number }
      if (value === undefined) return { state, error: 'claim missing value' }
      const r = makeClaim(state, player, value)
      if (r.error) return r
      return { state: { ...r.state, lastAction: `${state.players[player]} rolled, then bid ${rankDisplay(value)}` } }
    }

    case 'roll': {
      if (player === undefined) return { state, error: 'Missing player for roll' }
      const { dice } = (move.data || {}) as { dice?: [number, number] }
      if (!dice) return { state, error: 'roll missing dice' }
      const r = rollDiceAction(state, player, dice)
      if (r.error) return r
      return { state: r.state }
    }

    case 'pass': {
      if (player === undefined) return { state, error: 'Missing player for pass' }
      const r = passDice(state, player)
      if (r.error) return r
      return { state: { ...r.state, lastAction: `${state.players[player]} passed` } }
    }

    case 'raise': {
      if (player === undefined) return { state, error: 'Missing player for raise' }
      const { value } = (move.data || {}) as { value?: number }
      if (value === undefined) return { state, error: 'raise missing value' }
      const r = raise(state, player, value)
      if (r.error) return r
      const justRolled = state.lastRoller === player
      const message = justRolled
        ? `${state.players[player]} rolled, then bid ${rankDisplay(value)}`
        : `${state.players[player]} raised to ${rankDisplay(value)}`
      return { state: { ...r.state, lastAction: message } }
    }

    case 'roll_raise': {
      if (player === undefined) return { state, error: 'Missing player for roll_raise' }
      const { value, dice } = (move.data || {}) as { value?: number; dice?: [number, number] }
      if (value === undefined) return { state, error: 'roll_raise missing value' }
      if (!dice) return { state, error: 'roll_raise missing dice' }
      const r = rollAndRaise(state, player, value, dice)
      if (r.error) return r
      return { state: { ...r.state, lastAction: `${state.players[player]} rolled, then bid ${rankDisplay(value)}` } }
    }

    case 'challenge': {
      if (player === undefined) return { state, error: 'Missing player for challenge' }
      const result = resolveChallenge(state, player)
      if ('error' in result) return result
      return { state: result.state }
    }

    case 'give_up': {
      if (player === undefined) return { state, error: 'Missing player for give_up' }
      const result = giveUp(state, player)
      if ('error' in result) return result
      return { state: { ...result.state, lastAction: `${state.players[player]} gave up against Mia` } }
    }

    case 'surrender': {
      if (player === undefined) return { state, error: 'Missing player for surrender' }
      const result = surrender(state, player)
      if (result.error) return result
      return {
        state: {
          ...result.state,
          lastAction: `${state.players[player]} surrendered`,
        },
      }
    }

    case 'rematch_offer': {
      if (player === undefined) return { state, error: 'Missing player for rematch_offer' }
      const result = rematchOffer(state, player)
      if (result.error) return result
      return { state: result.state }
    }

    case 'rematch_accept': {
      if (player === undefined) return { state, error: 'Missing player for rematch_accept' }
      const { dice } = (move.data || {}) as { dice?: [number, number] }
      if (!dice) return { state, error: 'rematch_accept missing dice' }
      const result = rematchAccept(state, player, dice)
      if (result.error) return result
      return { state: result.state }
    }

    case 'challenge_ack': {
      if (state.roundPhase !== 'challenge_result' && state.roundPhase !== 'game_over') {
        return { state, error: 'Not in challenge_result phase' }
      }
      return { state: { ...finishChallenge(state), lastAction: state.lastAction } }
    }

    case 'round_end_ack': {
      if (state.roundPhase !== 'round_end') {
        return { state, error: 'Not in round_end phase' }
      }
      if (!state.challengeResult) return { state, error: 'No challenge result' }
      const { nextRoundDice } = (move.data || {}) as { nextRoundDice?: [number, number] }
      if (!nextRoundDice) return { state, error: 'round_end_ack missing nextRoundDice' }
      const loser = state.challengeResult.challengerWins
        ? state.challengeResult.challenged
        : state.challengeResult.challenger
      return { state: { ...newRound(state, 1 - loser, nextRoundDice), lastAction: 'New round started' } }
    }

    default:
      return { state, error: `Unknown move type: ${move.type}` }
  }
}
