// Game variants. Keep this the single source of truth — game logic and UI
// both derive from VARIANTS so adding a future variant touches nothing else.

export const VARIANTS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    shortName: '5-hand',
    tagline: '5 hands of 5 · 25 cards dealt',
    description: 'The full game. Each player is dealt 25 cards and builds 5 hands of 5.',
    cardsDealt: 25,
    handCount: 5,
    discardCount: 0,
  },
  'three-hand': {
    id: 'three-hand',
    name: 'Three-Hand',
    shortName: '3-hand',
    tagline: '3 hands of 5 · 18 cards dealt',
    description: 'A quicker match. 18 cards dealt; build 3 hands of 5 and discard the extra 3.',
    cardsDealt: 18,
    handCount: 3,
    discardCount: 3,
  },
}

export const VARIANT_ORDER = ['standard', 'three-hand']

export function getVariant(id) {
  return VARIANTS[id] || VARIANTS.standard
}
