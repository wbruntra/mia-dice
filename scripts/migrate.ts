#!/usr/bin/env bun
/**
 * Apply pending drizzle migrations with bun:sqlite (no drizzle-kit, so it
 * needs no better-sqlite3 native build on the server).
 *
 * Usage:
 *   bun run migrate
 */

import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { db } from '~/src/db'

migrate(db, { migrationsFolder: './drizzle' })
console.log('Migrations up to date')
