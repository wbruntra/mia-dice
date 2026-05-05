# Mia (Mexico)

A real-time 2-player bluffing dice game. Playable over the web with friends.

## Quick Start

```bash
# Install dependencies
bun install && cd frontend && bun install && cd ..

# Start both backend and frontend
bun run dev
```

- Backend runs on **http://localhost:9001**
- Frontend (Vite dev server) on **http://localhost:9002**
- Open the frontend URL in your browser to play

**Prerequisites:** [Bun](https://bun.sh) runtime.

## Game Rules

Mia (also known as Mexico) is a classic bluffing game played with two dice and a cup.

### Ranking (best to worst)

| Rank | Roll |     | Rank | Roll |
|------|------|-----|------|------|
| 20   | 2-1 (Mia) | | 9    | 6-1  |
| 19   | 1-1  |     | 8    | 5-4  |
| 18   | 2-2  |     | 7    | 5-3  |
| 17   | 3-3  |     | 6    | 5-2  |
| 16   | 4-4  |     | 5    | 5-1  |
| 15   | 5-5  |     | 4    | 4-3  |
| 14   | 6-6  |     | 3    | 4-2  |
| 13   | 6-5  |     | 2    | 4-1  |
| 12   | 6-4  |     | 1    | 3-2  |
| 11   | 6-3  |     | 0    | 3-1  |
| 10   | 6-2  |     |      |      |

Higher rank beats lower rank. Doubles beat singles except 65.

### How to Play

1. **Player 1** rolls the dice, looks, and announces a claim (they can bluff higher or lower than what they actually rolled)
2. The dice are passed to the next player, who can:
   - **Believe & Roll** — re-roll, look, then claim a higher value
   - **Challenge** — call the bluff. If the actual dice are lower than the claim, the claimer loses a life. Otherwise the challenger loses
   - **Pass** — accept responsibility for the current claim without looking, passing the turn back
3. When the dice return to the player who made the original claim (*full circle*), they **must** either challenge or raise
4. A roll or claim of **Mia (2-1)** causes the loser to lose **2 lives** instead of 1
5. Each player starts with **3 lives**. Last one standing wins

## Project Structure

```
index.ts                    # Bun.serve() entry — HTTP routes + WebSocket upgrade
src/
  db/
    schema.ts               # Drizzle table definitions (source of truth for DB)
    game-store.ts           # DB read/write helpers
    index.ts                # DB connection (SQLite via bun:sqlite + drizzle-orm)
  game/
    types.ts                # Types, dice ranking table, opponent helper
    engine.ts               # Pure game logic — all actions, challenge resolution, stateForPlayer
  routes/
    games.ts                # HTTP handlers (create, join, get game state)
    ws.ts                   # WebSocket message handlers (join, move dispatch)
  services/
    game.ts                 # Orchestrates engine + DB + WebSocket broadcast
    connections.ts          # WebSocket connection registry + per-player state push
frontend/                   # React 19 + Vite 8 + Tailwind CSS v4
  src/
    components/game/        # GameView, overlays (challenge result, round end, game over)
    context/                # GameContext (WebSocket state provider)
    hooks/                  # useWebSocket, useGameUI
    utils/                  # Die component, game helpers, card info
  public/cards/             # Card/dice art assets
drizzle/                    # Migration files (committed — never edit by hand)
scripts/
  db-migrate.ts             # Generate + apply Drizzle migrations
  download-card-art.ts      # Download and compress card images to WebP
```

### Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | [Bun](https://bun.sh) |
| HTTP | [Hono](https://hono.dev) |
| WebSocket | Native `Bun.serve()` |
| Database | SQLite (`mexico.db`) via [Drizzle ORM](https://orm.drizzle.team) |
| Frontend | React 19, Vite 8, Tailwind CSS v4 |
| Animations | [Motion](https://motion.dev) (Framer Motion successor) |

## Database Migrations

After changing `src/db/schema.ts`:

```bash
bun run db:update   # generate migration file + apply it
```

Or step by step:

```bash
bun run db:generate  # create migration file from schema diff
bun run db:migrate   # apply pending migrations
```

**Never run SQL directly against the database.** Always use migrations so `__drizzle_migrations` stays in sync.

## API

### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/games` | Create a new game. Returns `{ gameId, playerId }` |
| `POST` | `/api/games/:id/join` | Join an existing game. Returns `{ gameId, playerId }` |
| `GET` | `/api/games/:id?player=<playerId>` | Get game state for a specific player |

### WebSocket (`/ws`)

Connect via WebSocket and send JSON messages:

```json
{ "type": "join", "gameId": "...", "playerId": "..." }
```

**Actions** (sent once joined):

| Type | Payload | Description |
|------|---------|-------------|
| `claim` | `{ value: number }` | Make initial claim (0-20) |
| `roll` | — | Believe & roll (re-roll dice) |
| `raise` | `{ value: number }` | Claim higher without re-rolling |
| `roll_raise` | `{ value: number }` | Re-roll and claim higher |
| `pass` | — | Pass dice to next player |
| `challenge` | — | Challenge the current claim |
| `challenge_ack` | — | Acknowledge challenge result |
| `round_end_ack` | — | Acknowledge round end |

**Received messages:**

```json
{ "type": "connected" }
{ "type": "state", "state": { ... } }
{ "type": "error", "message": "..." }
```

The `state` object is per-player — dice values are only visible when it's your turn and you just rolled.

## Conventions

- **Bun-native APIs** — use `bun:sqlite` (not `better-sqlite3`), `Bun.file()`, `Bun.$`, `bunx`
- `.env` is loaded automatically (no dotenv package needed)
- No Express, no `ws` package — `Bun.serve()` handles HTTP + WebSocket natively
- `bunx` instead of `npx`
