import { useMemo, useState } from 'react'
import { CardSlot } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import { makePairing } from '../firebase/game.js'

// Matching UI:
// - Top half: opponent's 5 hands (3 face-up, 2 card backs). Bottom half: your hands.
// - On your turn: tap one of your hands, then one of opponent's hands to pair. They are then greyed out and linked.
// - Turn indicator at the top.

export default function MatchupScreen({ code, game, slot, onLeave }) {
  const opp = slot === 'p1' ? 'p2' : 'p1'
  const myVisible = game.visibleHands?.[slot] || []
  const oppVisible = game.visibleHands?.[opp] || []
  const pairings = game.pairings || []
  const isMyTurn = game.currentTurn === slot

  const [selMine, setSelMine] = useState(null)
  const [selOpp, setSelOpp] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const myPaired = new Set(pairings.map(p => slot === 'p1' ? p.p1HandId : p.p2HandId))
  const oppPaired = new Set(pairings.map(p => slot === 'p1' ? p.p2HandId : p.p1HandId))

  const pairIndexByMyHand = useMemo(() => {
    const map = {}
    pairings.forEach((p, i) => { map[slot === 'p1' ? p.p1HandId : p.p2HandId] = i })
    return map
  }, [pairings, slot])
  const pairIndexByOppHand = useMemo(() => {
    const map = {}
    pairings.forEach((p, i) => { map[slot === 'p1' ? p.p2HandId : p.p1HandId] = i })
    return map
  }, [pairings, slot])

  function selectMine(id) {
    if (!isMyTurn || myPaired.has(id)) return
    setSelMine(prev => prev === id ? null : id)
  }
  function selectOpp(id) {
    if (!isMyTurn || oppPaired.has(id)) return
    setSelOpp(prev => prev === id ? null : id)
  }

  async function confirm() {
    if (selMine == null || selOpp == null) return
    setBusy(true); setError(null)
    try {
      await makePairing(code, slot, selMine, selOpp)
      setSelMine(null); setSelOpp(null)
    } catch (e) {
      setError(e.message || 'Could not pair.')
    } finally {
      setBusy(false)
    }
  }

  const firstSelectorIsMe = game.firstSelector === slot

  return (
    <div className="min-h-screen flex flex-col">
      <TurnBanner isMyTurn={isMyTurn} />

      <HandsSection
        title="Opponent"
        hands={oppVisible}
        pairedIds={oppPaired}
        pairIndexMap={pairIndexByOppHand}
        selected={selOpp}
        onSelect={selectOpp}
        mirrored
        side="opp"
      />

      <PairingLegend pairings={pairings} slot={slot} />

      <HandsSection
        title="You"
        hands={myVisible}
        pairedIds={myPaired}
        pairIndexMap={pairIndexByMyHand}
        selected={selMine}
        onSelect={selectMine}
        side="me"
      />

      <div className="p-3 border-t border-gold-600/20 flex items-center justify-between gap-2">
        <div className="text-gold-200/60 text-xs">
          Pairings {pairings.length} / 5
          {firstSelectorIsMe ? ' · you pick first' : ' · opponent picks first'}
        </div>
        <Button
          onClick={confirm}
          disabled={!isMyTurn || selMine == null || selOpp == null || busy}
        >
          {busy ? 'Pairing…' : 'Confirm Pairing'}
        </Button>
      </div>

      {error && <div className="px-3 pb-2 text-red-300 text-sm">{error}</div>}
    </div>
  )
}

function TurnBanner({ isMyTurn }) {
  return (
    <div className={
      'py-3 px-4 text-center font-display text-lg tracking-wide border-b border-gold-600/20 ' +
      (isMyTurn ? 'bg-gold-500/20 text-gold-200' : 'bg-felt-800 text-gold-300/70')
    }>
      {isMyTurn ? 'Your turn to pair' : 'Opponent is choosing…'}
    </div>
  )
}

function HandsSection({ title, hands, pairedIds, pairIndexMap, selected, onSelect, mirrored = false, side }) {
  return (
    <div className={'px-3 py-3 ' + (mirrored ? 'order-first' : '')}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-gold-200/70 text-xs uppercase tracking-widest">{title}</div>
      </div>
      <div className="space-y-2">
        {hands.map(h => (
          <HandTile
            key={h.id}
            hand={h}
            paired={pairedIds.has(h.id)}
            pairIndex={pairIndexMap[h.id]}
            selected={selected === h.id}
            onClick={() => onSelect(h.id)}
            side={side}
          />
        ))}
      </div>
    </div>
  )
}

function HandTile({ hand, paired, pairIndex, selected, onClick, side }) {
  const disabled = paired
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        'w-full flex items-center gap-2 p-2 rounded-xl border transition',
        disabled ? 'opacity-40 border-gold-600/20 bg-felt-800/40' :
        selected ? 'border-gold-400 bg-felt-800' :
        'border-gold-600/30 bg-felt-800/70 active:scale-[0.995]',
      ].join(' ')}
    >
      <div className="w-8 text-center">
        <div className="text-gold-400 font-display leading-none">{hand.id + 1}</div>
        {pairIndex != null && (
          <div className="text-[10px] text-gold-200/70 mt-0.5">P{pairIndex + 1}</div>
        )}
      </div>
      <div className="flex gap-1 flex-1">
        {hand.cards.map((c, i) => (
          <div key={i} className="flex-1 max-w-[18%]">
            <CardSlot
              card={c && c.faceUp ? c : undefined}
              hidden={!!c && c.faceUp === false}
              size="sm"
            />
          </div>
        ))}
      </div>
    </button>
  )
}

function PairingLegend({ pairings, slot }) {
  if (pairings.length === 0) return null
  return (
    <div className="px-3 pb-2">
      <div className="text-gold-200/60 text-xs mb-1">Pairings made</div>
      <div className="flex flex-wrap gap-1.5">
        {pairings.map((p, i) => {
          const mine = slot === 'p1' ? p.p1HandId : p.p2HandId
          const opp = slot === 'p1' ? p.p2HandId : p.p1HandId
          const madeByYou = p.madeBy === slot
          return (
            <div
              key={i}
              className={
                'text-xs px-2 py-1 rounded-md border ' +
                (madeByYou ? 'border-gold-500/60 text-gold-200' : 'border-gold-600/30 text-gold-200/70')
              }
            >
              P{i + 1}: your #{mine + 1} vs opp #{opp + 1}
              {p.madeBy === 'auto' && ' (auto)'}
            </div>
          )
        })}
      </div>
    </div>
  )
}
