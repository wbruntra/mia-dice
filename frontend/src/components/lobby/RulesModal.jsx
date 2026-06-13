export default function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md max-h-[85dvh] overflow-y-auto scrollbar-none bg-pirate-wood rounded-2xl border border-pirate-gold/30 shadow-2xl shadow-black/60 p-6 text-pirate-parchment"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-pirate-parchment/50 hover:text-pirate-parchment transition-colors text-xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="font-pirate text-3xl text-pirate-gold mb-1">How to Play</h2>
        <p className="text-pirate-parchment/50 text-sm mb-5">
          Mia — the classic bluffing dice game
        </p>

        <section className="mb-5">
          <h3 className="text-pirate-gold font-semibold mb-2">The Game</h3>
          <p className="text-sm text-pirate-parchment/80 leading-relaxed">
            Mia is played with two players and a single pair of dice. In each round, players take
            turns rolling the dice and claiming what they got — but you can bluff. You only see
            your own roll, not what the other player rolled, so when your opponent claims a high
            number, you have to decide: do you believe them, or call their bluff? The claim must
            always be higher than the last one, pushing the stakes up until someone challenges.
            If you're caught bluffing, you lose a life. If you challenge and you're wrong,
            <em>you</em> lose a life. The last player standing wins.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="text-pirate-gold font-semibold mb-2">Objective</h3>
          <p className="text-sm text-pirate-parchment/80 leading-relaxed">
            Be the last player standing. Each player starts with{' '}
            <strong className="text-pirate-parchment">5 lives</strong>. Lose all your lives and
            you're out.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="text-pirate-gold font-semibold mb-2">On Your Turn</h3>
          <ol className="text-sm text-pirate-parchment/80 space-y-2 leading-relaxed list-decimal list-inside">
            <li>Roll the two dice (hidden under the cup).</li>
            <li>
              Look at the result, then announce a <em>claim</em> — which must be higher than the
              current claim. You can bluff.
            </li>
            <li>Pass the cup to the next player.</li>
          </ol>
        </section>

        <section className="mb-5">
          <h3 className="text-pirate-gold font-semibold mb-2">Receiving the Cup</h3>
          <p className="text-sm text-pirate-parchment/80 mb-2 leading-relaxed">
            When it's your turn to receive, you have four choices:
          </p>
          <ul className="text-sm text-pirate-parchment/80 space-y-2 leading-relaxed">
            <li>
              <strong className="text-pirate-parchment">Raise</strong> — Claim a higher number without rolling. You're bluffing or betting on your current dice.
            </li>
            <li>
              <strong className="text-pirate-parchment">Re-Roll & Raise</strong> — Roll the dice, look at the result, and announce a higher claim.
            </li>
            <li>
              <strong className="text-pirate-parchment">Challenge</strong> — Reveal the dice. If the actual value is lower than the claim, the claimer loses a life. If it's equal or higher, you lose a life.
            </li>
            <li>
              <strong className="text-pirate-parchment">Pass</strong> — Pass the cup without looking, keeping the same claim. You take responsibility for it.
            </li>
          </ul>
          <p className="text-sm text-pirate-parchment/60 mt-2 leading-relaxed">
            If the dice return to the original roller (full circle), they <em>must</em> challenge or raise — no more passing.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="text-pirate-gold font-semibold mb-2">Mia (21) — Special Rules</h3>
          <p className="text-sm text-pirate-parchment/80 mb-2 leading-relaxed">
            Mia is the highest roll (a 2 and a 1). When Mia is claimed, the next player{' '}
            <em>cannot</em> raise, roll, or pass. They must choose:
          </p>
          <ul className="text-sm text-pirate-parchment/80 space-y-2 leading-relaxed">
            <li>
              <strong className="text-pirate-parchment">Give Up</strong> — Accept the claim. Lose{' '}
              <strong>1 life</strong>. Round ends.
            </li>
            <li>
              <strong className="text-pirate-parchment">Look</strong> — Reveal the dice.
              <ul className="mt-1 ml-4 space-y-1 list-disc list-inside text-pirate-parchment/70">
                <li>
                  Dice really are Mia → you lose <strong>2 lives</strong>.
                </li>
                <li>
                  Dice are not Mia → claimer was bluffing, they lose <strong>1 life</strong>.
                </li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-pirate-gold font-semibold mb-3">Hand Rankings</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-pirate-parchment/50 uppercase tracking-wider mb-1.5">
                Special
              </p>
              <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                <span className="px-2 py-0.5 rounded-md border bg-pirate-gold/20 border-pirate-gold text-pirate-gold font-bold">
                  Mia (21)
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-pirate-parchment/50 uppercase tracking-wider mb-1.5">
                Doubles — best to worst
              </p>
              <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                {['11', '22', '33', '44', '55', '66'].map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 rounded-md border bg-pirate-ocean/20 border-pirate-ocean/60 text-pirate-parchment/80"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-pirate-parchment/50 uppercase tracking-wider mb-1.5">
                Mixed — best to worst
              </p>
              <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                {[
                  '65',
                  '64',
                  '63',
                  '62',
                  '61',
                  '54',
                  '53',
                  '52',
                  '51',
                  '43',
                  '42',
                  '41',
                  '32',
                  '31',
                ].map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 rounded-md border bg-pirate-wood-light/60 border-pirate-gold/20 text-pirate-parchment/70"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
