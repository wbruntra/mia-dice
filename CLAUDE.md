# Mia — Dev Guide

## Running

```bash
bun install && cd frontend && bun install && cd ..
bun run dev        # backend :9001 + frontend (Vite)
```

## Project Structure

```
bin/server.ts              # Bun.serve() entry — HTTP + WebSocket upgrade
index.ts                   # Hono app (routes)
src/
  db/schema.ts            # Drizzle tables: games, game_moves
  db/game-store.ts        # insertMove, loadMoves, reconstructState
  db/index.ts             # DB connection (mexico.db)
  game/engine.ts          # Pure game logic + applyMove reducer
  game/types.ts           # Game types, dice ranking, StoredMove
  services/game.ts        # handleMove, auto-advance timers, broadcast
  services/connections.ts # WebSocket connection registry
  routes/games.ts         # HTTP: create, join, GET state
  routes/ws.ts            # WebSocket: join, handle moves
frontend/                 # React app (Vite)
drizzle/                  # Migration files (committed, never edit by hand)
```

## Architecture: Event Sourcing

State is never mutated in place. Every action is recorded as an immutable `game_moves` row.

- **`games`**: identity + metadata — `id`, `players` (JSON array of names), `winner`, `created_at`
- **`game_moves`**: append-only event log — `game_id`, `seq`, `type`, `player`, `data` (JSON payload)
- **State reconstruction**: `reconstructState(gameId)` replays all moves through `applyMove(state, move) → newState`
- **Identity**: Player names are identifiers. Join validates uniqueness. `players` array maps index 0→p1, 1→p2.

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

**Mia (21) special rules:**
When a player claims Mia, the next player CANNOT raise, roll, or pass. They must choose:

- **Give Up**: accept the claim, lose 1 life, round ends
- **Look**: reveal the dice. If the dice really are Mia (21), the looker loses 2 lives. If not, the Mia claimer was bluffing and loses 1 life.

4. Each player has 5 lives. Last one standing wins.
