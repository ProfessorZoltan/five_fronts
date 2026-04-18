// Deck construction, shuffle, deal.
// Card shape: { rank, suit, value }  value is 2..14 (Ace high by default).

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']
// joker sorts below everything (ties are rare, but a joker always loses
// the suit tiebreaker vs any real suit).
export const SUIT_ORDER = { joker: 0, clubs: 1, diamonds: 2, hearts: 3, spades: 4 }
export const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
export const RANK_VALUE = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
}

// Joker sentinel. Value 0 means it can't extend a straight, and its unique
// suit 'joker' means it can't join a flush. It effectively contributes nothing
// to hand strength and acts as the lowest possible kicker.
export const JOKER_SUIT = 'joker'
export const JOKER_RANK = 'Joker'
export const JOKER_VALUE = 0

export function makeJoker() {
  return { rank: JOKER_RANK, suit: JOKER_SUIT, value: JOKER_VALUE }
}

export function isJoker(card) {
  return card && card.suit === JOKER_SUIT
}

export function buildDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, value: RANK_VALUE[rank] })
    }
  }
  return deck
}

// Fisher–Yates shuffle using a seeded PRNG (mulberry32). Stable across clients
// given the same seed — lets us deal deterministically from a shared seed.
export function mulberry32(seed) {
  let t = seed >>> 0
  return function () {
    t += 0x6D2B79F5
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle(deck, seed) {
  const rng = typeof seed === 'number' ? mulberry32(seed) : Math.random
  const a = deck.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 52 cards -> two cardsPerPlayer-sized piles, remainder burned.
// Defaults to 25 (standard variant). Three-hand uses 18. When `includeJoker`
// is true (Cannon Fodder), each player additionally gets one Joker appended
// to their pool — they may or may not choose to place it in a hand.
export function dealFromSeed(seed, cardsPerPlayer = 25, includeJoker = false) {
  const deck = shuffle(buildDeck(), seed)
  const p1 = deck.slice(0, cardsPerPlayer)
  const p2 = deck.slice(cardsPerPlayer, 2 * cardsPerPlayer)
  const burned = deck.slice(2 * cardsPerPlayer)
  if (includeJoker) {
    p1.push(makeJoker())
    p2.push(makeJoker())
  }
  return { p1, p2, burned }
}

export function randomSeed() {
  // 32-bit unsigned integer seed
  return (Math.random() * 0xffffffff) >>> 0
}

export function randomGameCode() {
  // Avoid confusing chars (0/O, 1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}
