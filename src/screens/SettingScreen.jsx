import { useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import { CardSlot } from '../components/Card.jsx'
import { lockIn } from '../firebase/game.js'
import { evaluateHand } from '../game/evaluate.js'

// Local state model:
// - placements: Map<cardKey, { handIdx, slotIdx, faceUp }>
// - cardKey is `${rank}-${suit}`
// - A card is in the reserve if it has no placement.
// - Interaction:
//   * Tap a reserve card -> selects it.
//   * Tap an empty slot -> places the selected card there (3 face-up, 2 face-down defaults to face-up until hand has 3 face-ups).
//   * Tap a placed card -> toggles face-up/face-down (clamped so each hand has exactly 3 face-up before lock).
//   * Long-press or "Remove" menu on placed card returns to reserve.
// For simplicity we offer: tap placed card once -> select it; tap again -> toggle face-up; tap empty slot moves it.

function cardKey(c) { return `${c.rank}-${c.suit}` }

export default function SettingScreen({ code, game, slot }) {
  const me = game.players[slot]
  const myDeal = me?.hand || []
  const locked = me?.locked
  const otherLocked = game.players[slot === 'p1' ? 'p2' : 'p1']?.locked

  // placements: { [cardKey]: { handIdx, slotIdx, faceUp } }
  const [placements, setPlacements] = useState({})
  const [selectedKey, setSelectedKey] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Build the five hands from current placements
  const hands = useMemo(() => {
    const out = [0,1,2,3,4].map(i => ({ id: i, cards: [null,null,null,null,null] }))
    const byKey = new Map(myDeal.map(c => [cardKey(c), c]))
    for (const [k, p] of Object.entries(placements)) {
      const card = byKey.get(k)
      if (card && p && out[p.handIdx]) {
        out[p.handIdx].cards[p.slotIdx] = { ...card, faceUp: p.faceUp }
      }
    }
    return out
  }, [placements, myDeal])

  const reserveCards = useMemo(() => {
    return myDeal.filter(c => !placements[cardKey(c)])
  }, [myDeal, placements])

  const placedCount = myDeal.length - reserveCards.length
  const allPlaced = placedCount === 25

  function selectCard(k) {
    setSelectedKey(prev => prev === k ? null : k)
  }

  function placeInSlot(handIdx, slotIdx) {
    if (!selectedKey) return
    const existing = hands[handIdx].cards[slotIdx]
    if (existing) return // occupied — ignore (tap the card itself to move/toggle)
    setPlacements(prev => {
      const next = { ...prev }
      // When placing, default faceUp=true if hand has fewer than 3 face-up so far, else faceUp=false.
      const handFaceUps = Object.values(next).filter(p => p.handIdx === handIdx && p.faceUp).length
      const faceUp = handFaceUps < 3
      next[selectedKey] = { handIdx, slotIdx, faceUp }
      return next
    })
    setSelectedKey(null)
  }

  function onPlacedCardTap(key) {
    if (selectedKey && selectedKey !== key) {
      // Swap: move selected into this position, push the displaced card into the reserve.
      const target = placements[key]
      setPlacements(prev => {
        const next = { ...prev }
        const sel = next[selectedKey]
        if (sel) {
          // The selected card might already be placed — swap slots.
          next[selectedKey] = { ...target }
          next[key] = { ...sel }
        } else {
          // Selected card is from reserve — displace this one back to reserve.
          next[selectedKey] = { ...target }
          delete next[key]
        }
        return next
      })
      setSelectedKey(null)
      return
    }
    // Toggle face-up/face-down with clamp.
    setPlacements(prev => {
      const p = prev[key]
      if (!p) return prev
      const next = { ...prev }
      const handFaceUps = Object.values(next).filter(x => x.handIdx === p.handIdx && x.faceUp).length
      if (p.faceUp) {
        // Allow flipping down only if we'd still have at least 0 face-ups (always fine).
        next[key] = { ...p, faceUp: false }
      } else {
        // Flipping up — only allow if under 3 face-ups currently.
        if (handFaceUps < 3) next[key] = { ...p, faceUp: true }
      }
      return next
    })
  }

  function returnToReserve(key) {
    setPlacements(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSelectedKey(null)
  }

  function handsReadyToLock() {
    if (!allPlaced) return false
    for (const h of hands) {
      if (h.cards.some(c => !c)) return false
      if (h.cards.filter(c => c.faceUp).length !== 3) return false
    }
    return true
  }

  async function handleLock() {
    setSubmitting(true); setError(null)
    try {
      const handsPayload = hands.map(h => ({
        id: h.id,
        cards: h.cards.map(c => ({ rank: c.rank, suit: c.suit, value: c.value, faceUp: c.faceUp })),
      }))
      await lockIn(code, slot, handsPayload)
      setConfirmOpen(false)
    } catch (e) {
      setError(e.message || 'Failed to lock in.')
    } finally {
      setSubmitting(false)
    }
  }

  // Waiting state (locked, but opponent not yet).
  if (locked && !otherLocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-gold-400 font-display text-3xl mb-2">Locked In</div>
        <div className="text-gold-200/70 animate-pulseSoft">Waiting for opponent…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pb-2">
      <Header placedCount={placedCount} allPlaced={allPlaced} onLock={() => setConfirmOpen(true)} canLock={handsReadyToLock() && !locked} />

      <div className="px-3 flex-1">
        <HandsGrid
          hands={hands}
          selectedKey={selectedKey}
          onSlotTap={placeInSlot}
          onCardTap={onPlacedCardTap}
        />
      </div>

      <Reserve
        cards={reserveCards}
        selectedKey={selectedKey}
        onCardTap={selectCard}
      />

      {confirmOpen && (
        <Modal onClose={() => !submitting && setConfirmOpen(false)}>
          <div className="text-lg font-semibold text-gold-100 mb-2">Lock in your hands?</div>
          <div className="text-gold-200/80 text-sm mb-4">
            Once locked, you can't change your arrangement.
          </div>
          {error && <div className="text-red-300 text-sm mb-2">{error}</div>}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleLock} disabled={submitting}>{submitting ? 'Locking…' : 'Lock In'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Header({ placedCount, allPlaced, onLock, canLock }) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gold-600/20">
      <div>
        <div className="text-gold-400 font-display text-lg leading-none">Setting Phase</div>
        <div className="text-gold-200/60 text-xs">
          {placedCount} / 25 cards placed {allPlaced && '· 3 face-up per hand required'}
        </div>
      </div>
      <Button onClick={onLock} disabled={!canLock}>Lock In</Button>
    </div>
  )
}

function HandsGrid({ hands, selectedKey, onSlotTap, onCardTap }) {
  return (
    <div className="space-y-2 pt-2">
      {hands.map((h, hi) => (
        <HandRow
          key={h.id}
          hand={h}
          index={hi}
          selectedKey={selectedKey}
          onSlotTap={onSlotTap}
          onCardTap={onCardTap}
        />
      ))}
    </div>
  )
}

function HandRow({ hand, index, selectedKey, onSlotTap, onCardTap }) {
  const filled = hand.cards.every(Boolean)
  const rankLabel = filled
    ? (() => { try { return evaluateHand(hand.cards).label } catch { return '' } })()
    : ''

  return (
    <div className="flex items-center gap-2">
      <div className="w-10 text-center">
        <div className="text-gold-400 font-display text-xl leading-none">{index + 1}</div>
        <div className="text-gold-200/60 text-[10px] leading-tight mt-1 h-6">{rankLabel}</div>
      </div>
      <div className="flex gap-1.5 flex-1">
        {hand.cards.map((c, si) => (
          <div key={si} className="flex-1 max-w-[18%]">
            <CardSlot
              card={c || undefined}
              size="sm"
              label={c ? undefined : 'Empty'}
              selected={c ? cardKey(c) === selectedKey : false}
              onClick={() => {
                if (c) onCardTap(cardKey(c))
                else onSlotTap(index, si)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function Reserve({ cards, selectedKey, onCardTap }) {
  if (cards.length === 0) {
    return (
      <div className="mt-3 mx-3 px-4 py-3 rounded-xl bg-felt-800/60 border border-gold-600/20 text-center text-gold-200/50 text-sm">
        All cards placed — review face-up choices (3 per hand) and lock in.
      </div>
    )
  }
  return (
    <div className="mt-3 px-3">
      <div className="text-gold-200/60 text-xs mb-1">Your cards — tap one, then tap a slot</div>
      <div className="overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1">
        <div className="flex gap-1.5">
          {cards.map(c => {
            const k = cardKey(c)
            return (
              <CardSlot
                key={k}
                card={{ ...c, faceUp: true }}
                size="sm"
                selected={selectedKey === k}
                onClick={() => onCardTap(k)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm bg-felt-800 border border-gold-600/60 rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

