#!/usr/bin/env bun
import { cleanupOldGames } from '../src/services/cleanup'

const count = await cleanupOldGames()
console.log(`Cleaned up ${count} old game(s)`)
process.exit(0)
