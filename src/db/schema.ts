import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  status: text('status', { enum: ['waiting', 'playing', 'finished'] })
    .notNull()
    .default('waiting'),
  player1Id: text('player1_id').notNull(),
  player1Name: text('player1_name').notNull().default('Player 1'),
  player2Id: text('player2_id'),
  player2Name: text('player2_name'),

  dice: text('dice'),
  p1Lives: integer('p1_lives').notNull().default(3),
  p2Lives: integer('p2_lives').notNull().default(3),

  currentClaim: text('current_claim'),
  originalCaller: text('original_caller'),
  lastRoller: text('last_roller'),
  turnPlayer: text('turn_player'),
  roundPhase: text('round_phase', {
    enum: ['claim', 'challenge_result', 'round_end', 'game_over'],
  }),
  roundNumber: integer('round_number').notNull().default(1),

  winner: text('winner'),
  challengeResult: text('challenge_result'),
  challengeAcks: text('challenge_acks').notNull().default('[]'),
  roundEndAcks: text('round_end_acks').notNull().default('[]'),

  cpuPlayer: text('cpu_player'),
  createdAt: text('created_at').notNull(),
})

export const gameEvents = sqliteTable('game_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: text('game_id').notNull(),
  seq: integer('seq').notNull(),
  type: text('type').notNull(),
  player: text('player'),
  data: text('data'),
  createdAt: text('created_at').notNull(),
})
