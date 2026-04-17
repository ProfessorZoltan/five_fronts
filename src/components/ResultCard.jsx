import { CardSlot, FlipCard } from './Card.jsx'
import { orderCardsForDisplay } from '../game/evaluate.js'

// A visualization of a completed or in-progress round. Takes a round-like
// object with p1Hand / p2Hand (each a 5-card array with faceUp flags) plus
// rank labels and a winner marker.
export default function ResultCard({
  round,
  slot,
  revealed,           // if true, flip face-down cards to face-up
  current = false,    // styling hint for the "active" pairing
  compact = false,
  reorder = false,    // reorder cards for display by hand-value contribution
}) {
  const myHand = slot === 'p1' ? round.p1Hand : round.p2Hand
  const oppHand = slot === 'p1' ? round.p2Hand : round.p1Hand
  const myRank = slot === 'p1' ? round.p1HandRank : round.p2HandRank
  const oppRank = slot === 'p1' ? round.p2HandRank : round.p1HandRank
  const winner = round.winner

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
