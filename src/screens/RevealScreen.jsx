import { useEffect, useState } from 'react'
import { CardSlot, FlipCard } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import { markReadyForReveal } from '../firebase/game.js'
import { orderCardsForDisplay } from '../game/evaluate.js'

// Reveal flow (simpler v1):
// - Show all 5 pairings stacked. The "current" one is expanded and in focus.
// - Both players tap "Flip" to reveal face-down cards; when both are ready, advance.
// - Running tally updates automatically from game.results + revealIndex.

export default function RevealScreen({ code, game, slot }) {
  const opp = slot === 'p1' ? 'p2' : 'p1'
  const results = game.results || []
  const revealIndex = game.revealIndex || 0
  const currentResult = results[revealIndex]
  const myReady = game.revealReady?.[slot]
  const oppReady = game.revealReady?.[opp]

  const revealedResults = results.slice(0, revealIndex) // fully revealed pairings
  const [busy, setBusy] = useState(false)
  const [animateReveal, setAnimateReveal] = useState(false)

  useEffect(() => {
    // When both ready, server increments revealIndex. Give a moment of flip
    // animation before the scene shifts by tracking a local reveal bool.
    if (myReady && oppReady) {
      setAnimateReveal(true)
    } else {
      setAnimateReveal(false)
    }
  }, [myReady, oppReady, revealIndex])

  const tally = computeTally(revealedResults.concat(animateReveal && currentResult ? [currentResult] : []), slot)

  async function flip() {
    setBusy(true)
    try { await markReadyForReveal(code, slot) } finally { setBusy(false) }
  }

  if (!currentResult) {
    return <div className="p-6 text-gold-200/70">Preparing reveal…</div>
  }

  return (
    <div className="min-h-screen flex flex-col pb-4">
      <div className="p-3 border-b border-gold-600/20 flex items-center justify-between">
        <div>
          <div className="text-gold-400 font-display text-lg leading-none">Reveal Phase</div>
          <div className="text-gold-200/60 text-xs">Pairing {revealIndex + 1} / {results.length}</div>
        </div>
        <Tally tally={tally} />
      </div>

      {revealedResults.length > 0 && (
        <div className="px-3 pt-2">
          <div className="text-gold-200/60 text-xs mb-2">Revealed so far — newest on top</div>
          <div className="space-y-2">
            {revealedResults.slice().reverse().map((r) => (
              <ResultCard
                key={r.pairingIndex}
                result={r}
                slot={slot}
                revealed
                reorder
                compact
              />
            ))}
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="text-gold-200/60 text-xs mb-2">Now flipping</div>
        <ResultCard
          result={currentResult}
          slot={slot}
          revealed={animateReveal}
          current
        />
      </div>

      <div className="px-4 py-2 flex items-center justify-between">
        <div className="text-xs text-gold-200/60">
          {myReady ? 'You are ready.' : 'Tap Flip when you\'re ready.'}
          {oppReady ? ' Opponent is ready.' : ' Waiting for opponent.'}
        </div>
        <Button onClick={flip} disabled={busy || myReady}>
          {myReady ? 'Waiting…' : 'Flip'}
        </Button>
      </div>
    </div>
  )
}

function Tally({ tally }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span>
        <span className="text-gold-200/60 mr-1">You</span>
        <span className="font-display text-gold-400 text-xl">{tally.me}</span>
      </span>
      <span className="text-gold-200/30">|</span>
      <span>
        <span className="font-display text-gold-400 text-xl">{tally.opp}</span>
        <span className="text-gold-200/60 ml-1">Opp</span>
      </span>
    </div>
  )
}

export function ResultCard({ result, slot, revealed, current = false, compact = false, reorder = false }) {
  const myHand = slot === 'p1' ? result.p1Hand : result.p2Hand
  const oppHand = slot === 'p1' ? result.p2Hand : result.p1Hand
  const myRank = slot === 'p1' ? result.p1HandRank : result.p2HandRank
  const oppRank = slot === 'p1' ? result.p2HandRank : result.p1HandRank
  const winner = result.winner

  const myWon = winner === slot
  const oppWon = winner && winner !== slot && winner !== 'draw'

  return (
    <div className={
      'rounded-2xl border p-3 ' +
      (current ? 'border-gold-400 bg-felt-800' : 'border-gold-600/20 bg-felt-800/60')
    }>
      <HandRow
        label="Opponent"
        cards={oppHand}
        rank={revealed ? oppRank : null}
        winHighlight={revealed && oppWon}
        loseDim={revealed && myWon}
        revealed={revealed}
        reorder={reorder}
        compact={compact}
      />
      <div className="my-2 h-px bg-gold-600/20" />
      <HandRow
        label="You"
        cards={myHand}
        rank={revealed ? myRank : null}
        winHighlight={revealed && myWon}
        loseDim={revealed && oppWon}
        revealed={revealed}
        reorder={reorder}
        compact={compact}
      />
    </div>
  )
}

function HandRow({ label, cards, rank, winHighlight, loseDim, revealed, compact, reorder }) {
  const size = compact ? 'xs' : 'sm'
  // When `reorder` is true (history, results), rearrange into a hand-aware
  // display order so the cards contributing to the hand's value sit on the
  // left. Otherwise we leave the original slot positions intact (for clean
  // flip animations on the current pairing).
  const display = reorder ? orderCardsForDisplay(cards) : cards
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 shrink-0">
        <div className={'text-xs ' + (winHighlight ? 'text-emerald-300' : 'text-gold-200/70')}>{label}</div>
        {rank && <div className={'text-[10px] ' + (winHighlight ? 'text-emerald-300' : 'text-gold-200/50')}>{rank}</div>}
      </div>
      <div className="flex gap-1 flex-1">
        {display.map((c, i) => (
          <div key={c.rank + '-' + c.suit + '-' + i} className="flex-1 max-w-[18%]">
            {c.faceUp
              ? <CardSlot card={c} size={size} highlighted={winHighlight} dimmed={loseDim} />
              : <FlipCard card={c} revealed={revealed} size={size} highlighted={winHighlight} dimmed={loseDim} wasFaceDown />
            }
          </div>
        ))}
      </div>
    </div>
  )
}

function computeTally(resolvedResults, slot) {
  let me = 0, opp = 0
  for (const r of resolvedResults) {
    if (r.winner === slot) me++
    else if (r.winner && r.winner !== 'draw') opp++
  }
  return { me, opp }
}
