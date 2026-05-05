# Napkin

## Corrections

| Date       | Source | What Went Wrong                                                                      | What To Do Instead                                                                                  |
| ---------- | ------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 2026-05-06 | self   | Built Mexico with per-player dice initially — only 2 shared dice in the whole game   | Single `dice` field on GameState, passed back and forth between players                            |
| 2026-05-06 | rules  | Ranking: 11 beats 66 (doubles go 11>22>33>44>55>66, all above singles)              | Use rank-based comparison (0-20) with `RANK_TABLE` Map lookup, not simple numeric computation       |
| 2026-05-06 | rules  | Mia (21) doubles life loss, initial player can claim lower value                     | `isMiaRank()` check in `resolveChallenge`; `makeClaim` allows any value regardless of actual dice    |
| 2026-05-06 | user   | Wanted PvP only, no CPU player                                                       | Stripped all CPU player code, simplified to 2-player WebSocket                                      |

## Patterns That Work

- Rank-based comparison (0-20) simplifies "higher/lower" logic since ranks map 1:1 to dice combinations
- `originalCaller` tracks who first made the current claim; used for full-circle detection (`canPass = originalCaller !== player`)
- Only the `originalCaller` sees dice via `stateForPlayer` — others see hidden dice
- Auto-advance timers for challenge_result and round_end phases handle disconnected players

## Domain Notes

- Mia is a 2-player shared-dice bluffing game. Two dice, one cup, passed back and forth.
- Rankings stored as rank 0-20: 31(0), 32(1), 41(2)...66(14), 55(15)...11(19), 21/Mia(20)
- When challenged: actualRank < claimedRank means claim was a lie → claimer loses
- Full circle: if `originalCaller === turnPlayer`, they cannot pass (must challenge or raise)
- DB: `mexico.db`, drizzle migrations in `drizzle/`
