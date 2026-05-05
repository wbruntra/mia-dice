export const RANKS = [
  { value: 0, label: '31' },
  { value: 1, label: '32' },
  { value: 2, label: '41' },
  { value: 3, label: '42' },
  { value: 4, label: '43' },
  { value: 5, label: '51' },
  { value: 6, label: '52' },
  { value: 7, label: '53' },
  { value: 8, label: '54' },
  { value: 9, label: '61' },
  { value: 10, label: '62' },
  { value: 11, label: '63' },
  { value: 12, label: '64' },
  { value: 13, label: '65' },
  { value: 14, label: '66' },
  { value: 15, label: '55' },
  { value: 16, label: '44' },
  { value: 17, label: '33' },
  { value: 18, label: '22' },
  { value: 19, label: '11' },
  { value: 20, label: 'Mia' },
]

export function getRankLabel(rank) {
  return RANKS.find((r) => r.value === rank)?.label ?? '??'
}

const DIE_DOTS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

export function Die({ value, size = 48, hidden = false }) {
  const sz = size
  const dotSz = sz * 0.16
  const dots = DIE_DOTS[value] || []
  return (
    <div
      className="rounded-lg inline-flex items-center justify-center relative"
      style={{
        width: sz,
        height: sz,
        background: hidden ? '#1e1b2e' : '#fafafa',
        border: hidden ? '2px solid #2d2a3e' : '2px solid #e0e0e0',
      }}
    >
      {!hidden &&
        dots.map(([r, c], i) => (
          <div
            key={i}
            className="absolute rounded-full bg-neutral-900"
            style={{
              width: dotSz,
              height: dotSz,
              top: sz * 0.2 + r * sz * 0.27 - dotSz / 2,
              left: sz * 0.2 + c * sz * 0.27 - dotSz / 2,
            }}
          />
        ))}
    </div>
  )
}

export function diceFromRank(rank) {
  const entry = RANKS[rank]
  if (!entry) return null
  if (entry.label === 'Mia') return [2, 1]
  const a = parseInt(entry.label[0])
  const b = parseInt(entry.label[1])
  return [a, b]
}

const RANK_MAP = new Map([
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

export function diceRank(dice) {
  if (!dice) return -1
  const [a, b] = dice[0] >= dice[1] ? dice : [dice[1], dice[0]]
  return RANK_MAP.get(`${a},${b}`) ?? -1
}
