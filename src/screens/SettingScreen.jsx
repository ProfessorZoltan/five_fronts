import { useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import LeaveButton from '../components/LeaveButton.jsx'
import { CardSlot } from '../components/Card.jsx'
import { lockIn } from '../firebase/game.js'
import { evaluateHand } from '../game/evaluate.js'
import { SUIT_ORDER } from '../game/deck.js'
import { getVariant } from '../game/variants.js'

// Arrange dealt cards into the variant's hand count. No face-up decisions
// here — those happen per-round during matching. For variants where extra
// cards are dealt (e.g. 3-hand: 18 dealt, 15 placed), the leftover cards
// stay in the reserve and are discarded at lock-in.
//
// Interaction (tap-based):
// - Tap a reserve card -> selects it.
// - Tap an empty slot  -> places the selected card there.
// - Tap a placed card with another selected -> swap positions.
// - Tap a placed card alone -> sends it back to the reserve.

function cardKey(c) { return `${c.rank}-${c.suit}` }

export default function SettingScreen({ code, game, slot, onLeave }) {
  const variant = getVariant(game?.variant)
  const me = game.players[slot]
  const myDeal = me?.hand || []
  const locked = me?.locked
  const otherLocked = game.players[slot === 'p1' ? 'p2' : 'p1']?.locked

  // placements: { [cardKey]: { handIdx, slotIdx } }
  const [placements, setPlacements] = useState({})
  const [selectedKey, setSelectedKey] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const targetCardCount = variant.handCount * 5

  const hands = useMemo(() => {
    const out = Array.from({ length: variant.handCount }, (_, i) => ({
      id: i, cards: [null, null, null, null, null],
    }))
    const byKey = new Map(myDeal.map(c => [cardKey(c), c]))
    for (const [k, p] of Object.entries(placements)) {
      const card = byKey.get(k)
      if (card && p && out[p.handIdx]) {
        out[p.handIdx].cards[p.slotIdx] = card
      }
    }
    return out
  }, [placements, myDeal, variant.handCount])

  const reserveCards = useMemo(() => {
    return myDeal
      .filter(c => !placements[cardKey(c)])
      .slice()
      .sort((a, b) =>
        (b.value - a.value) || (SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit])
      )
  }, [myDeal, placements])

  const placedCount = myDeal.length - reserveCards.length
  const allPlaced = placedCount === targetCardCount
  const discardCount = allPlaced ? reserveCards.length : 0

  function selectCard(k) {
    setSelectedKey(prev => prev === k ? null : k)
  }

  function placeInSlot(handIdx, slotIdx) {
    if (!selectedKey) return
    const existing = hands[handIdx].cards[slotIdx]
    if (existing) return
    setPlacements(prev => ({ ...prev, [selectedKey]: { handIdx, slotIdx } }))
    setSelectedKey(null)
  }

  function onPlacedCardTap(key) {
    if (selectedKey && selectedKey !== key) {
      // Swap positions (or fill-from-reserve).
      setPlacements(prev => {
        const next = { ...prev }
        const target = next[key]
        const sel = next[selectedKey]
        if (sel && target) {
          next[selectedKey] = { ...target }
          next[key] = { ...sel }
        } else if (target) {
          // Selected came from the reserve — take this card's position and
          // send the displaced card back to the reserve.
          next[selectedKey] = { ...target }
          delete next[key]
        }
        return next
      })
      setSelectedKey(null)
      return
    }
    // Tap a placed card alone -> return it to the reserve.
    setPlacements(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSelectedKey(null)
  }

  async function handleLock() {
    setSubmitting(true); setError(null)
    try {
      const payload = hands.map(h => ({
        id: h.id,
        cards: h.cards.map(c => ({ rank: c.rank, suit: c.suit, value: c.value })),
      }))
      await lockIn(code, slot, payload)
      setConfirmOpen(false)
    } catch (e) {
      setError(e.message || 'Failed to lock in.')
    } finally {
      setSubmitting(false)
    }
  }

  if (locked && !otherLocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-gold-400 font-display text-3xl mb-2">Locked In</div>
        <div className="text-gold-200/70 animate-pulseSoft">Waiting for opponent…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pb-4">
      <div className="sticky top-0 z-10 bg-felt-900/95 backdrop-blur flex items-center justify-between gap-2 p-3 border-b border-gold-600/20">
        <div className="flex-1 min-w-0">
          <div className="text-gold-400 font-display text-lg leading-none">Setting Phase</div>
          <div className="text-gold-200/60 text-xs truncate">
            {placedCount} / {targetCardCount} placed · {variant.handCount} hands of 5
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LeaveButton code={code} slot={slot} onLeave={onLeave} />
          <Button onClick={() => setConfirmOpen(true)} disabled={!allPlaced || locked}>
            Lock In
          </Button>
        </div>
      </div>

      <div className="px-3 pt-2">
        <div className="max-w-xl mx-auto">
          <div className="space-y-4">
            {hands.map((h, hi) => (
              <HandRow
                key={h.id}
                hand={h}
                index={hi}
                selectedKey={selectedKey}
                onSlotTap={placeInSlot}
                onCardTap={onPlacedCardTap}
              />
            ))}
          </div>
          <Reserve
            cards={reserveCards}
            selectedKey={selectedKey}
            onCardTap={selectCard}
            allPlaced={allPlaced}
            discardCount={discardCount}
          />
        </div>
      </div>

      {confirmOpen && (
        <Modal onClose={() => !submitting && setConfirmOpen(false)}>
          <div className="text-lg font-semibold text-gold-100 mb-2">Lock in your hands?</div>
          <div className="text-gold-200/80 text-sm mb-4">
            {discardCount > 0
              ? `${discardCount} unplaced card${discardCount === 1 ? '' : 's'} will be discarded. You'll choose which cards to turn face-up when you play each hand during matching.`
              : 'You\'ll choose which cards to turn face-up when you play each hand during matching.'}
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

function HandRow({ hand, index, selectedKey, onSlotTap, onCardTap }) {
  const filled = hand.cards.every(Boolean)
  const rankLabel = filled
    ? (() => { try { return evaluateHand(hand.cards).label } catch { return '' } })()
    : ''
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 text-center shrink-0">
        <div className="text-gold-400 font-display text-xl leading-none">{index + 1}</div>
        <div className="text-gold-200/60 text-[10px] leading-tight mt-1 h-6">{rankLabel}</div>
      </div>
      <div className="flex gap-1">
        {hand.cards.map((c, si) => (
          <CardSlot
            key={si}
            card={c ? { ...c, faceUp: true } : undefined}
            size="sm"
            label={c ? undefined : 'Empty'}
            selected={c ? cardKey(c) === selectedKey : false}
            onClick={() => {
              if (c) onCardTap(cardKey(c))
              else onSlotTap(index, si)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function Reserve({ cards, selectedKey, onCardTap, allPlaced, discardCount }) {
  if (cards.length === 0) {
    return (
      <div className="mt-3 px-4 py-3 rounded-xl bg-felt-800/60 border border-gold-600/20 text-center text-gold-200/50 text-sm">
        All cards placed — review and lock in.
      </div>
    )
  }
  // When all hand slots are filled but cards remain, those leftovers are
  // headed for the discard pile at lock-in.
  const willBeDiscarded = allPlaced && discardCount > 0
  return (
    <div className="mt-3">
      <div className="text-gold-200/60 text-xs mb-1">
        {willBeDiscarded
          ? `These ${discardCount} card${discardCount === 1 ? '' : 's'} will be discarded — tap one then a hand card to swap.`
          : 'Your cards — strongest first. Tap one, then tap a slot above.'}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cards.map(c => {
          const k = cardKey(c)
          return (
            <CardSlot
              key={k}
              card={{ ...c, faceUp: true }}
              size="sm"
              dimmed={willBeDiscarded}
              selected={selectedKey === k}
              onClick={() => onCardTap(k)}
            />
          )
        })}
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
