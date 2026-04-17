// Deck construction, shuffle, deal.
// Card shape: { rank, suit, value }  value is 2..14 (Ace high by default).

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']
export const SUIT_ORDER = { clubs: 1, diamonds: 2, hearts: 3, spades: 4 }
export const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
export const RANK_VALUE = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
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

// 52 cards -> two 25-card hands, 2 cards set aside (discarded).
export function dealFromSeed(seed) {
  const deck = shuffle(buildDeck(), seed)
  return {
    p1: deck.slice(0, 25),
    p2: deck.slice(25, 50),
    burned: deck.slice(50, 52),
  }
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
