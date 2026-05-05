import type { GameState, Player, ChallengeResult } from './types'
import { opponent, rollDice, diceValue, diceRank, rankDisplay, isMiaRank } from './types'

const STARTING_LIVES = 3

export function newGame(): Pick<
  GameState,
  | 'status'
  | 'turnPlayer'
  | 'roundPhase'
  | 'p1Lives'
  | 'p2Lives'
  | 'dice'
  | 'lastRoller'
  | 'currentClaim'
  | 'originalCaller'
  | 'roundNumber'
  | 'challengeResult'
  | 'challengeAcks'
  | 'roundEndAcks'
> {
  const dice = rollDice()
  return {
    status: 'playing',
    turnPlayer: 'p1',
    roundPhase: 'claim',
    p1Lives: STARTING_LIVES,
    p2Lives: STARTING_LIVES,
    dice,
    lastRoller: 'p1',
    currentClaim: null,
    originalCaller: 'p1',
    roundNumber: 1,
    challengeResult: null,
    challengeAcks: [],
    roundEndAcks: [],
  }
}

export function newRound(state: GameState, startingPlayer: Player): GameState {
  return {
    ...state,
    dice: rollDice(),
    currentClaim: null,
    originalCaller: startingPlayer,
    lastRoller: startingPlayer,
    turnPlayer: startingPlayer,
    roundPhase: 'claim',
    roundNumber: state.roundNumber + 1,
    challengeResult: null,
    challengeAcks: [],
    roundEndAcks: [],
  }
}

export function makeClaim(
  state: GameState,
  player: Player,
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
      turnPlayer: opponent(player),
    },
  }
}

// Re-roll the dice, look, stay on your turn — must then use raise to claim
export function rollDiceAction(
  state: GameState,
  player: Player,
): { state: GameState; error?: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (!state.currentClaim) return { state, error: 'No claim to roll against' }

  return {
    state: {
      ...state,
      dice: rollDice(),
      lastRoller: player,
    },
  }
}

// Raise without rolling
export function raise(
  state: GameState,
  player: Player,
  value: number,
): { state: GameState; error?: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (!state.currentClaim) return { state, error: 'No claim to raise' }
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
      turnPlayer: opponent(player),
    },
  }
}

// Re-roll and claim higher (full-circle option: roll & raise in one)
export function rollAndRaise(
  state: GameState,
  player: Player,
  value: number,
): { state: GameState; error?: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (!state.currentClaim) return { state, error: 'No claim to raise' }
  if (value <= state.currentClaim.value) {
    return {
      state,
      error: `Must claim higher than ${rankDisplay(state.currentClaim.value)}`,
    }
  }

  return {
    state: {
      ...state,
      dice: rollDice(),
      currentClaim: { value, player },
      originalCaller: player,
      lastRoller: player,
      turnPlayer: opponent(player),
    },
  }
}

export function passDice(
  state: GameState,
  player: Player,
): { state: GameState; error?: string } {
  if (state.turnPlayer !== player) return { state, error: 'Not your turn' }
  if (state.roundPhase !== 'claim') return { state, error: 'Not in claim phase' }
  if (!state.currentClaim) return { state, error: 'No active claim' }
  if (state.originalCaller === player) {
    return { state, error: 'Dice returned — must challenge or raise' }
  }

  return {
    state: {
      ...state,
      currentClaim: { ...state.currentClaim, player },
      turnPlayer: opponent(player),
    },
  }
}

export function resolveChallenge(
  state: GameState,
  challenger: Player,
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

  const challengerWins = actualValue < claimedValue

  let livesLost = 1
  if (isMiaRank(claimedValue) || isMiaRank(actualValue)) {
    livesLost = 2
  }

  let nextState = { ...state }
  if (challengerWins) {
    if (challenged === 'p1') nextState.p1Lives -= livesLost
    else nextState.p2Lives -= livesLost
  } else {
    if (challenger === 'p1') nextState.p1Lives -= livesLost
    else nextState.p2Lives -= livesLost
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

  if (nextState.p1Lives <= 0) {
    nextState.winner = 'p2'
    nextState.status = 'finished'
    nextState.roundPhase = 'game_over'
  } else if (nextState.p2Lives <= 0) {
    nextState.winner = 'p1'
    nextState.status = 'finished'
    nextState.roundPhase = 'game_over'
  }

  return { state: nextState, result }
}

export function ackChallenge(
  state: GameState,
  player: Player,
): { state: GameState; bothAcked: boolean; error?: string } {
  if (state.roundPhase !== 'challenge_result' && state.roundPhase !== 'game_over') {
    return { state, bothAcked: false, error: 'Not in challenge_result phase' }
  }
  const acks = state.challengeAcks.includes(player)
    ? state.challengeAcks
    : [...state.challengeAcks, player]
  return {
    state: { ...state, challengeAcks: acks },
    bothAcked: acks.length === 2,
  }
}

export function finishChallenge(state: GameState): GameState {
  if (state.status === 'finished') return state
  return {
    ...state,
    roundPhase: 'round_end',
    roundEndAcks: [],
  }
}

export function ackRoundEnd(
  state: GameState,
  player: Player,
): { state: GameState; bothAcked: boolean; error?: string } {
  if (state.roundPhase !== 'round_end') {
    return { state, bothAcked: false, error: 'Not in round_end phase' }
  }
  const acks = state.roundEndAcks.includes(player)
    ? state.roundEndAcks
    : [...state.roundEndAcks, player]
  return {
    state: { ...state, roundEndAcks: acks },
    bothAcked: acks.length === 2,
  }
}

export function stateForPlayer(state: GameState, player: Player) {
  const opp = opponent(player)
  const canSeeDice = state.lastRoller === player

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

    myLives: player === 'p1' ? state.p1Lives : state.p2Lives,
    opponentLives: opp === 'p1' ? state.p1Lives : state.p2Lives,

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
        }
      : null,
    challengeAcks: state.challengeAcks,
    roundEndAcks: state.roundEndAcks,

    player,
    myName: player === 'p1' ? state.player1Name : state.player2Name!,
    opponentName: opp === 'p1' ? state.player1Name : state.player2Name,
    cpuPlayer: state.cpuPlayer,
  }
}
