import { TabularAgent } from '../src/ai/tabular-agent'
import { RuleAgent } from '../src/ai/rule-agent'
import { simulateGame } from '../src/ai/simulator'

const SELF_PLAY_GAMES = 50_000
const REPORT_EVERY = 5_000
const BENCH_GAMES = 10_000
const LIVES = 5
const POLICY_PATH = new URL('../src/ai/policy.json', import.meta.url).pathname

async function bench(agent: TabularAgent, label: string) {
  const rule = new RuleAgent()
  let wins = 0
  for (let i = 0; i < BENCH_GAMES; i++) {
    // Alternate sides to avoid seat bias
    const record = i % 2 === 0
      ? simulateGame(agent, rule, LIVES)
      : simulateGame(rule, agent, LIVES)
    const agentSide = i % 2 === 0 ? 0 : 1
    if (record.winner === agentSide) wins++
  }
  const pct = (wins / BENCH_GAMES * 100).toFixed(1)
  console.log(`  ${label} vs rule-based: ${pct}% (${BENCH_GAMES.toLocaleString()} games)`)
}

async function main() {
  const agent0 = new TabularAgent(0.05)
  const agent1 = new TabularAgent(0.05)

  let wins = [0, 0]
  let totalRounds = 0
  let windowWins = [0, 0]

  console.log(`Self-play training: ${SELF_PLAY_GAMES.toLocaleString()} games, ${LIVES} lives`)
  console.log('─'.repeat(64))

  for (let i = 0; i < SELF_PLAY_GAMES; i++) {
    const record = simulateGame(agent0, agent1, LIVES)
    if (record.winner >= 0) {
      wins[record.winner]++
      windowWins[record.winner]++
    }
    totalRounds += record.rounds

    if ((i + 1) % REPORT_EVERY === 0) {
      const windowTotal = windowWins[0] + windowWins[1]
      const wr0 = (windowWins[0] / windowTotal * 100).toFixed(1)
      const wr1 = (windowWins[1] / windowTotal * 100).toFixed(1)
      const avgRounds = (totalRounds / (i + 1)).toFixed(1)
      console.log(
        `[${String(i + 1).padStart(6)}]  A0 ${wr0}%  A1 ${wr1}%  ` +
        `avg rounds ${avgRounds}  info-sets ${agent0.infoSetCount}`
      )
      windowWins = [0, 0]
    }
  }

  console.log('\n── Benchmark ───────────────────────────────────────')
  await bench(agent0, 'Agent0 (trained)')

  await Bun.write(POLICY_PATH, JSON.stringify(agent0.exportPolicy(), null, 2))
  console.log(`\nPolicy saved → src/ai/policy.json`)
}

main().catch(console.error)
