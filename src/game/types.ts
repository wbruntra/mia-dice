export type Player = 'p1' | 'p2'
export type GameStatus = 'waiting' | 'playing' | 'finished'
export type RoundPhase =
  | 'claim'
  | 'challenge_result'
  | 'round_end'
  | 'game_over'

export interface GameState {
  id: string
  status: GameStatus
  player1Id: string
  player1Name: string
  player2Id: string | null
  player2Name: string | null
  winner: string | null

  dice: [number, number] | null
  lastRoller: Player | null
  p1Lives: number
  p2Lives: number

  currentClaim: { value: number; player: Player } | null
  originalCaller: Player | null
  turnPlayer: Player | null
  roundPhase: RoundPhase | null
  roundNumber: number

  challengeResult: ChallengeResult | null
  challengeAcks: Player[]
  roundEndAcks: Player[]

  cpuPlayer: Player | null
}

export interface ChallengeResult {
  challenger: Player
  challenged: Player
  claimedValue: number
  actualValue: number
  dice: [number, number]
  challengerWins: boolean
  livesLost: number
  gaveUp?: boolean
}

export function opponent(player: Player): Player {
  return player === 'p1' ? 'p2' : 'p1'
}

export function rollDice(): [number, number] {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  return d1 >= d2 ? [d1, d2] : [d2, d1]
}

// All possible rolls ranked 0-20 (higher = better, harder to beat)
const RANK_TABLE: Map<string, number> = new Map([
  ['2,1', 20],
  ['1,1', 19],
  ['2,2', 18],
  ['3,3', 17],
  ['4,4', 16],
  ['5,5', 15],
  ['6,6', 14],
  ['6,5', 13],
  ['6,4', 12],
  ['6,3', 11],
  ['6,2', 10],
  ['6,1', 9],
  ['5,4', 8],
  ['5,3', 7],
  ['5,2', 6],
  ['5,1', 5],
  ['4,3', 4],
  ['4,2', 3],
  ['4,1', 2],
  ['3,2', 1],
  ['3,1', 0],
])

// Human-readable labels for each rank
const RANK_LABELS: string[] = [
  '31', '32', '41', '42', '43', '51', '52', '53', '54',
  '61', '62', '63', '64', '65', '66', '55', '44', '33', '22', '11', '21',
]

export function rankKey(dice: [number, number]): string {
  return `${dice[0]},${dice[1]}`
}

export function diceRank(dice: [number, number]): number {
  return RANK_TABLE.get(rankKey(dice)) ?? 0
}

export function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? '??'
}

export function rankDisplay(rank: number): string {
  return rankLabel(rank) === '21' ? 'Mia' : rankLabel(rank)
}

export function isMiaRank(rank: number): boolean {
  return rank === 20
}
