import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  players: text('players').notNull().default('[]'),
  startingLives: integer('starting_lives').notNull().default(5),
  winner: text('winner'),
  status: text('status', { enum: ['pending', 'active', 'finished', 'abandoned'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
})

export const gameMoves = sqliteTable('game_moves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: text('game_id').notNull().references(() => games.id),
  seq: integer('seq').notNull(),
  type: text('type', {
    enum: [
      'game_start', 'claim', 'roll', 'pass', 'raise',
      'roll_raise', 'challenge', 'give_up',
      'challenge_ack', 'round_end_ack',
    ],
  }).notNull(),
  player: integer('player'),
  data: text('data'),
  createdAt: text('created_at').notNull(),
})
