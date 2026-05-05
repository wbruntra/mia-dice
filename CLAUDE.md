# Mia — Dev Guide

## Running

```bash
bun install && cd frontend && bun install && cd ..
bun run dev        # backend :9001 + frontend (Vite)
```

## Project Structure

```
index.ts                  # Bun.serve() entry — HTTP routes + WebSocket upgrade
src/
  db/schema.ts            # Drizzle table definitions (source of truth)
  db/game-store.ts        # DB read/write helpers
  db/index.ts             # DB connection (mexico.db)
  game/engine.ts          # Pure game logic (no DB)
  game/types.ts           # Game types + dice ranking
  services/game.ts        # Orchestrates engine + DB + WebSocket push
  services/connections.ts # WebSocket connection registry
  routes/games.ts         # HTTP handlers
  routes/ws.ts            # WebSocket message handlers
frontend/                 # React app (Vite)
drizzle/                  # Migration files (committed, never edit by hand)
```

## Database Migrations

**Never run SQL directly against the DB.** Always use migrations so `__drizzle_migrations` stays in sync.

After changing `src/db/schema.ts`:

```bash
bun run db:update   # generate migration file + apply it
```

Steps separately if needed:

```bash
bun run db:generate  # create migration file from schema diff
bun run db:migrate   # apply pending migrations
```

## Bun-specific conventions

- Use `bun:sqlite` (not `better-sqlite3`), `Bun.file` (not `fs`), `Bun.$` (not `execa`)
- Use `bunx` instead of `npx`
- `.env` is loaded automatically — no dotenv
- Backend uses `Bun.serve()` — no express, no ws package

## Game Rules (Mia)

Classic bluffing dice game with two dice and a cup.

**Ranking** (best to worst): Mia (21), 11, 22, 33, 44, 55, 66, 65, 64, 63, 62, 61, 54, 53, 52, 51, 43, 42, 41, 32, 31

**Flow:**
1. Player 1 rolls, looks, announces a claim (can bluff up or down)
2. Dice passed to next player, who can:
   - **Believe & Roll**: re-roll, look, claim higher
   - **Challenge**: reveal dice. If actual < claimed, claimer loses a life. Otherwise challenger loses.
   - **Pass**: pass without looking, taking responsibility for current claim
3. When dice return to the original caller (full circle), they MUST challenge or raise
4. If Mia (21) is rolled or announced, loser loses 2 lives
5. Each player has 3 lives. Last one standing wins.
