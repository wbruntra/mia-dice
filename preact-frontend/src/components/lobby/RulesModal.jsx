import { useState } from 'react'

export default function RulesModal({ onClose }) {
  const [lang, setLang] = useState('en')

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

        <div className="flex justify-between items-center mb-1 pr-6">
          <h2 className="font-pirate text-3xl text-pirate-gold">
            {lang === 'en' ? 'Rules of the Sea' : 'Leyes del Mar'}
          </h2>
          <div className="flex gap-1.5 text-xs font-semibold bg-black/40 p-1 rounded-lg border border-pirate-gold/20">
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded transition-colors ${
                lang === 'en'
                  ? 'bg-pirate-gold text-pirate-wood font-bold'
                  : 'text-pirate-parchment/60 hover:text-pirate-parchment'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('es')}
              className={`px-2 py-0.5 rounded transition-colors ${
                lang === 'es'
                  ? 'bg-pirate-gold text-pirate-wood font-bold'
                  : 'text-pirate-parchment/60 hover:text-pirate-parchment'
              }`}
            >
              ES
            </button>
          </div>
        </div>

        <p className="text-pirate-parchment/50 text-sm mb-5">
          {lang === 'en'
            ? 'Mia — A tense duel of lies and luck on a creaking deck'
            : 'Mia — Un tenso duelo de mentiras y azar sobre una cubierta crujiente'}
        </p>

        {lang === 'en' ? (
          <>
            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">The Face-Off</h3>
              <p className="text-sm text-pirate-parchment/80 leading-relaxed italic">
                The wind howls through the rigging of a storm-battered brigantine. In the dim,
                lantern-lit cabin, two weathered sailors face each other across a scarred oak
                table. Between them lies a single leather cup and two ivory dice. The stakes?
                Survival.
              </p>
              <p className="text-sm text-pirate-parchment/80 leading-relaxed mt-2">
                In Mia, you roll in secret. You only see your own dice, never your opponent's. When
                you pass the cup, you must declare what you rolled—but truth is as fickle as the
                sea, and you can bluff with a straight face. The next player must decide: believe
                the claim and raise the stakes, or lift the cup to expose a liar. Whoever is caught
                in a lie, or challenges a truthful roll, pays in blood.
              </p>
            </section>

            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">The Stakes</h3>
              <p className="text-sm text-pirate-parchment/80 leading-relaxed">
                Be the last sailor standing. Each player begins the voyage with{' '}
                <strong className="text-pirate-parchment">5 lives</strong>. Lose all your lives,
                and you walk the plank to feed the sharks.
              </p>
            </section>

            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">Your Turn at the Cup</h3>
              <ol className="text-sm text-pirate-parchment/80 space-y-2 leading-relaxed list-decimal list-inside">
                <li>
                  <strong className="text-pirate-parchment">Roll in Secret:</strong> Shake the two
                  dice, hidden safely beneath the heavy leather cup.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Declare Your Claim:</strong> Peek under
                  the cup, then declare your roll. Your claim <em>must</em> rank higher than the
                  previous claim. Speak with confidence, whether you hold a high hand or a
                  bold-faced lie.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Pass the Cup:</strong> Slide the cup
                  across the table to your opponent, leaving them to guess what lies beneath.
                </li>
              </ol>
            </section>

            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">Receiving the Cup</h3>
              <p className="text-sm text-pirate-parchment/80 mb-2 leading-relaxed">
                When the cup slides your way, you face a choice. Will you trust the wind, or do you
                smell a rat?
              </p>
              <ul className="text-sm text-pirate-parchment/80 space-y-2 leading-relaxed">
                <li>
                  <strong className="text-pirate-parchment">Raise</strong> — Accept the claim
                  without looking, and declare an even higher claim. You're betting your life on
                  what's already under the cup.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Re-Roll & Raise</strong> — Shake the
                  cup, roll the dice anew, peek at the result, and declare a higher claim.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Challenge (Call 'Em a Liar!)</strong> —
                  Lift the cup to reveal the truth. If the actual dice rank lower than their claim,
                  the liar loses a life. If they told the truth (or rolled even higher),{' '}
                  <em>you</em> lose a life.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Pass</strong> — Slide the cup to the
                  next sailor without looking, keeping the same claim. You now carry the burden of
                  their lie.
                </li>
              </ul>
              <p className="text-sm text-pirate-parchment/60 mt-2 leading-relaxed italic">
                If the dice return to the original roller (full circle), the passing stops. They
                must challenge or raise.
              </p>
            </section>

            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">Mia (21) — The Death Roll</h3>
              <p className="text-sm text-pirate-parchment/80 mb-2 leading-relaxed">
                A roll of <strong>2 and 1</strong> is called <strong>Mia</strong>—the ultimate hand
                on the seven seas. When Mia is claimed, there is no rolling, raising, or passing.
                The next sailor must choose:
              </p>
              <ul className="text-sm text-pirate-parchment/80 space-y-2 leading-relaxed">
                <li>
                  <strong className="text-pirate-parchment">Surrender</strong> — Accept the claim,
                  bow your head, and lose <strong>1 life</strong>. The round ends.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Call the Bluff</strong> — Lift the cup.
                  If the dice really show Mia, you lose <strong>2 lives</strong> for your
                  impudence. If they were bluffing, they lose <strong>1 life</strong> and are
                  branded a scoundrel.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-pirate-gold font-semibold mb-3">Hand Rankings</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-pirate-parchment/50 uppercase tracking-wider mb-1.5">
                    The Ultimate Hand
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-md border bg-pirate-gold/20 border-pirate-gold text-pirate-gold font-bold">
                      Mia (21)
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-pirate-parchment/50 uppercase tracking-wider mb-1.5">
                    The Captain's Pairs (best to worst)
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
                    The Crew's Scraps (best to worst)
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
          </>
        ) : (
          <>
            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">El Cara a Cara</h3>
              <p className="text-sm text-pirate-parchment/80 leading-relaxed italic">
                El viento aúlla entre los aparejos de un bergantín azotado por la tormenta. En el
                tenue camarote iluminado por faroles, dos curtidos marineros se enfrentan a ambos
                lados de una mesa de roble desgastada. Entre ellos yace un solo cubilete de cuero y
                dos dados de marfil. ¿El precio? La supervivencia.
              </p>
              <p className="text-sm text-pirate-parchment/80 leading-relaxed mt-2">
                En Mia, tiras en secreto. Solo ves tus propios dados, nunca los del oponente. Al
                pasar el cubilete, debes declarar qué has sacado; pero la verdad es tan voluble
                como el mar, y puedes tirarte un farol con la cara fría. El siguiente jugador debe
                decidir: creer la declaración y subir la apuesta, o levantar el cubilete para
                desenmascarar al mentiroso. Quien sea atrapado mintiendo, o desafíe una tirada
                real, pagará con su sangre.
              </p>
            </section>

            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">Las Vidas en Juego</h3>
              <p className="text-sm text-pirate-parchment/80 leading-relaxed">
                Sé el último marinero en pie. Cada jugador comienza el viaje con{' '}
                <strong className="text-pirate-parchment">5 vidas</strong>. Si pierdes todas tus
                vidas, caminarás por la plancha para alimentar a los tiburones.
              </p>
            </section>

            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">Tu Turno con el Cubilete</h3>
              <ol className="text-sm text-pirate-parchment/80 space-y-2 leading-relaxed list-decimal list-inside">
                <li>
                  <strong className="text-pirate-parchment">Tirar en Secreto:</strong> Agita los
                  dos dados, ocultos a salvo bajo el pesado cubilete de cuero.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Declarar tu Jugada:</strong> Echa un
                  vistazo bajo el cubilete y declara tu tirada. Tu declaración debe ser superior a
                  la anterior. Habla con firmeza, ya sea que sostengas una gran jugada o un farol
                  descarado.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Pasar el Cubilete:</strong> Desliza el
                  cubilete por la mesa hacia tu oponente, dejándolo adivinar qué se oculta debajo.
                </li>
              </ol>
            </section>

            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">Recibir el Cubilete</h3>
              <p className="text-sm text-pirate-parchment/80 mb-2 leading-relaxed">
                Cuando el cubilete se deslice hacia ti, te enfrentarás a una elección. ¿Confiarás
                en el viento o te huele a gato encerrado?
              </p>
              <ul className="text-sm text-pirate-parchment/80 space-y-2 leading-relaxed">
                <li>
                  <strong className="text-pirate-parchment">Subir</strong> — Acepta la declaración
                  sin mirar y declara una jugada aún mayor. Apuestas tu vida a lo que ya está bajo
                  el cubilete.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Volver a Tirar y Subir</strong> — Agita
                  el cubilete, tira los dados de nuevo, mira el resultado y declara una jugada
                  mayor.
                </li>
                <li>
                  <strong className="text-pirate-parchment">
                    Desafiar (¡Llamarlo Mentiroso!)
                  </strong>{' '}
                  — Levanta el cubilete para revelar la verdad. Si los dados reales son menores que
                  la declaración, el mentiroso pierde una vida. Si dijo la verdad (o sacó algo aún
                  mayor), tú pierdes una vida.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Pasar</strong> — Desliza el cubilete al
                  siguiente marinero sin mirar, manteniendo la misma declaración. Ahora tú cargas
                  con el peso de su mentira.
                </li>
              </ul>
              <p className="text-sm text-pirate-parchment/60 mt-2 leading-relaxed italic">
                Si los dados regresan al tirador original (vuelta completa), el pase se detiene.
                Debe desafiar o subir.
              </p>
            </section>

            <section className="mb-5">
              <h3 className="text-pirate-gold font-semibold mb-2">
                Mia (21) — La Tirada de la Muerte
              </h3>
              <p className="text-sm text-pirate-parchment/80 mb-2 leading-relaxed">
                Una tirada de <strong>2 y 1</strong> se llama <strong>Mia</strong>—la jugada
                suprema en los siete mares. Cuando se declara Mia, no se puede tirar, subir ni
                pasar. El siguiente marinero debe elegir:
              </p>
              <ul className="text-sm text-pirate-parchment/80 space-y-2 leading-relaxed">
                <li>
                  <strong className="text-pirate-parchment">Rendirse</strong> — Acepta la
                  declaración, inclina la cabeza y pierde <strong>1 vida</strong>. Termina la
                  ronda.
                </li>
                <li>
                  <strong className="text-pirate-parchment">Desafiar el Farol</strong> — Levanta el
                  cubilete. Si los dados realmente muestran Mia, pierdes <strong>2 vidas</strong>{' '}
                  por tu atrevimiento. Si estaba mintiendo, pierde <strong>1 vida</strong> y queda
                  marcado como un canalla.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-pirate-gold font-semibold mb-3">Rango de Jugadas</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-pirate-parchment/50 uppercase tracking-wider mb-1.5">
                    La Jugada Suprema
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-md border bg-pirate-gold/20 border-pirate-gold text-pirate-gold font-bold">
                      Mia (21)
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-pirate-parchment/50 uppercase tracking-wider mb-1.5">
                    Las Parejas del Capitán (de mejor a peor)
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
                    Las Sobras de la Tripulación (de mejor a peor)
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
          </>
        )}
      </div>
    </div>
  )
}
