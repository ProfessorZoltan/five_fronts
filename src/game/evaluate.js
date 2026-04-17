// Poker hand evaluation for 5-card hands.
//
// evaluateHand(cards) -> { rank: 1..10, label, tiebreakers: number[], suitTiebreaker }
//   rank: 1 = Royal Flush (best), 10 = High Card (worst)
//   tiebreakers: rank-values in descending priority for kicker comparison
//   suitTiebreaker: sorted descending card-values paired with suit-weights, used
//                   only when all ranks match (extremely rare, one-deck corner case)
//
// compareHands(h1, h2) -> 'p1' | 'p2' | 'draw'

import { SUIT_ORDER } from './deck.js'

export const HAND_LABELS = {
  1: 'Royal Flush',
  2: 'Straight Flush',
  3: 'Four of a Kind',
  4: 'Full House',
  5: 'Flush',
  6: 'Straight',
  7: 'Three of a Kind',
  8: 'Two Pair',
  9: 'One Pair',
  10: 'High Card',
}

function sortedByValueDesc(cards) {
  return cards.slice().sort((a, b) => b.value - a.value)
}

function countsByRank(cards) {
  // Map of value -> count
  const m = new Map()
  for (const c of cards) m.set(c.value, (m.get(c.value) || 0) + 1)
  return m
}

function isFlush(cards) {
  return cards.every(c => c.suit === cards[0].suit)
}

// Returns the high-card value of the straight, or 0 if not a straight.
// Handles A-2-3-4-5 as a 5-high straight.
function straightHigh(cards) {
  const values = Array.from(new Set(cards.map(c => c.value))).sort((a, b) => a - b)
  if (values.length !== 5) return 0
  // Normal straight: consecutive
  if (values[4] - values[0] === 4) return values[4]
  // Wheel: A-2-3-4-5 -> [2,3,4,5,14]
  if (values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
    return 5
  }
  return 0
}

// Suit tiebreaker data: sorted by (value desc, suit desc). Used only when two
// hands are fully rank-equal across kickers.
function suitTiebreakerArray(cards) {
  return cards
    .slice()
    .sort((a, b) => (b.value - a.value) || (SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit]))
    .map(c => ({ value: c.value, suitWeight: SUIT_ORDER[c.suit] }))
}

export function evaluateHand(cards) {
  if (!cards || cards.length !== 5) {
    throw new Error('evaluateHand expects exactly 5 cards')
  }

  const sorted = sortedByValueDesc(cards)
  const counts = countsByRank(cards)
  // Group counts: e.g. [[count, value], ...] sorted by (count desc, value desc)
  const groups = Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || b.value - a.value)

  const flush = isFlush(cards)
  const sHigh = straightHigh(cards)
  const straight = sHigh > 0

  const suitTiebreaker = suitTiebreakerArray(cards)

  // Straight flush / royal flush
  if (flush && straight) {
    if (sHigh === 14) {
      return { rank: 1, label: HAND_LABELS[1], tiebreakers: [14], suitTiebreaker }
    }
    return { rank: 2, label: HAND_LABELS[2], tiebreakers: [sHigh], suitTiebreaker }
  }

  // Four of a kind
  if (groups[0].count === 4) {
    return {
      rank: 3,
      label: HAND_LABELS[3],
      tiebreakers: [groups[0].value, groups[1].value],
      suitTiebreaker,
    }
  }

  // Full house
  if (groups[0].count === 3 && groups[1] && groups[1].count === 2) {
    return {
      rank: 4,
      label: HAND_LABELS[4],
      tiebreakers: [groups[0].value, groups[1].value],
      suitTiebreaker,
    }
  }

  // Flush
  if (flush) {
    return {
      rank: 5,
      label: HAND_LABELS[5],
      tiebreakers: sorted.map(c => c.value),
      suitTiebreaker,
    }
  }

  // Straight
  if (straight) {
    return { rank: 6, label: HAND_LABELS[6], tiebreakers: [sHigh], suitTiebreaker }
  }

  // Three of a kind
  if (groups[0].count === 3) {
    const kickers = groups.slice(1).map(g => g.value).sort((a, b) => b - a)
    return {
      rank: 7,
      label: HAND_LABELS[7],
      tiebreakers: [groups[0].value, ...kickers],
      suitTiebreaker,
    }
  }

  // Two pair
  if (groups[0].count === 2 && groups[1] && groups[1].count === 2) {
    const high = Math.max(groups[0].value, groups[1].value)
    const low = Math.min(groups[0].value, groups[1].value)
    const kicker = groups[2].value
    return {
      rank: 8,
      label: HAND_LABELS[8],
      tiebreakers: [high, low, kicker],
      suitTiebreaker,
    }
  }

  // One pair
  if (groups[0].count === 2) {
    const kickers = groups.slice(1).map(g => g.value).sort((a, b) => b - a)
    return {
      rank: 9,
      label: HAND_LABELS[9],
      tiebreakers: [groups[0].value, ...kickers],
      suitTiebreaker,
    }
  }

  // High card
  return {
    rank: 10,
    label: HAND_LABELS[10],
    tiebreakers: sorted.map(c => c.value),
    suitTiebreaker,
  }
}

// Reorder 5 cards for display so the cards that contribute to the hand's
// value come first (leftmost). For grouped hands (pairs, trips, quads, full
// house) we follow the tiebreaker order from evaluateHand. For straights
// (including royal/straight flush) we sort by value descending, handling the
// A-2-3-4-5 wheel by moving the ace to the right end.
export function orderCardsForDisplay(cards) {
  const ev = evaluateHand(cards)
  const sortDesc = arr => arr.slice().sort((a, b) => b.value - a.value)

  // Royal flush, straight flush, straight: sorted descending, with wheel fixup.
  if (ev.rank === 1 || ev.rank === 2 || ev.rank === 6) {
    const sorted = sortDesc(cards)
    if (ev.tiebreakers[0] === 5) {
      const aceIdx = sorted.findIndex(c => c.value === 14)
      if (aceIdx !== -1) {
        const [ace] = sorted.splice(aceIdx, 1)
        sorted.push(ace)
      }
    }
    return sorted
  }

  // All other hands: pull cards out in tiebreaker order (grouped hands get
  // their groups placed together automatically). Then append any leftovers.
  const keyOf = c => `${c.rank}-${c.suit}`
  const out = []
  const used = new Set()
  for (const v of ev.tiebreakers) {
    for (const c of cards) {
      if (c.value === v && !used.has(keyOf(c))) {
        out.push(c)
        used.add(keyOf(c))
      }
    }
  }
  const remaining = cards.filter(c => !used.has(keyOf(c)))
  out.push(...sortDesc(remaining))
  return out
}

// Compare two 5-card hands.
// Returns 'p1', 'p2', or 'draw'.
export function compareHands(h1, h2) {
  const e1 = evaluateHand(h1)
  const e2 = evaluateHand(h2)

  if (e1.rank !== e2.rank) return e1.rank < e2.rank ? 'p1' : 'p2'

  const len = Math.max(e1.tiebreakers.length, e2.tiebreakers.length)
  for (let i = 0; i < len; i++) {
    const a = e1.tiebreakers[i] ?? 0
    const b = e2.tiebreakers[i] ?? 0
    if (a !== b) return a > b ? 'p1' : 'p2'
  }

  // All ranks equal — apply suit tiebreaker: walk highest to lowest; at the
  // first pair where suits differ, higher suit wins.
  const s1 = e1.suitTiebreaker
  const s2 = e2.suitTiebreaker
  for (let i = 0; i < 5; i++) {
    if (s1[i].value !== s2[i].value) {
      // Should not happen if tiebreakers matched, but guard anyway.
      return s1[i].value > s2[i].value ? 'p1' : 'p2'
    }
    if (s1[i].suitWeight !== s2[i].suitWeight) {
      return s1[i].suitWeight > s2[i].suitWeight ? 'p1' : 'p2'
    }
  }
  return 'draw'
}
