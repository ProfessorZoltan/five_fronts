// Firebase game-state operations for Five Fronts.
//
// Data shape (under /games/{code}):
//   status: 'waiting' | 'setting' | 'matching' | 'done'
//   seed, createdAt
//   firstPlayer: 'p1' | 'p2'            // who plays hand first in round 0
//   players:
//     p1: { uid, connected, hand[25], hands[5 {id, cards[5]}], locked }
//     p2: same
//   currentRound: 0..4
//   currentPlayer: 'p1' | 'p2'          // whose action we're waiting on
//   roundState: 'play' | 'respond' | 'reveal'
//   currentOffer:    { handId, cards[5 w/ faceUp] } | null
//   currentResponse: { handId, cards[5 w/ faceUp] } | null
//   roundReady: { p1, p2 }              // both true -> advance past 'reveal'
//   rounds: [                           // completed rounds
//     {
//       playedBy: 'p1' | 'p2',
//       p1HandId, p2HandId,
//       p1Hand: [cards w/ faceUp],
//       p2Hand: [cards w/ faceUp],
//       winner, p1HandRank, p2HandRank,
//     }
//   ]
//   winner: null | 'p1' | 'p2' | 'draw'

import {
  ref, get, set, update, onValue, off, runTransaction,
} from 'firebase/database'
import { getDb, getPlayerId } from './client.js'
import { dealFromSeed, randomSeed, randomGameCode, isJoker } from '../game/deck.js'
import { evaluateHand, compareHands } from '../game/evaluate.js'
import { getVariant, VARIANTS } from '../game/variants.js'

const gameRef = code => ref(getDb(), `games/${code}`)
const childRef = (code, path) => ref(getDb(), `games/${code}/${path}`)

// ---------- Create / Join ----------

export async function createGame({ variantId = 'standard', cannonFodder = false } = {}) {
  if (!VARIANTS[variantId]) throw new Error(`Unknown variant: ${variantId}`)
  const uid = getPlayerId()
  const db = getDb()
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomGameCode()
    const tx = await runTransaction(ref(db, `games/${code}`), existing => {
      if (existing && existing.createdAt) return // collision
      return {
        status: 'waiting',
        seed: randomSeed(),
        variant: variantId,
        cannonFodder: !!cannonFodder,
        createdAt: Date.now(),
        firstPlayer: Math.random() < 0.5 ? 'p1' : 'p2',
        players: {
          p1: { uid, connected: true, locked: false },
          p2: null,
        },
      }
    })
    if (tx.committed) return { code, slot: 'p1' }
  }
  throw new Error('Could not generate a unique game code — try again.')
}

export async function joinGame(code) {
  code = code.toUpperCase()
  const uid = getPlayerId()
  const snap = await get(gameRef(code))
  if (!snap.exists()) throw new Error('Game not found.')
  const game = snap.val()
  if (game.players?.p1?.uid === uid) return { code, slot: 'p1' }
  if (game.players?.p2?.uid === uid) return { code, slot: 'p2' }
  if (game.players?.p2) throw new Error('Game is full.')

  const tx = await runTransaction(childRef(code, 'players/p2'), existing => {
    if (existing) return
    return { uid, connected: true, locked: false }
  })
  if (!tx.committed) throw new Error('Game is full.')

  await dealIfReady(code)
  return { code, slot: 'p2' }
}

async function dealIfReady(code) {
  const snap = await get(gameRef(code))
  if (!snap.exists()) return
  const g = snap.val()
  if (g.status !== 'waiting') return
  if (!g.players?.p1 || !g.players?.p2) return

  const variant = getVariant(g.variant)
  const { p1, p2 } = dealFromSeed(g.seed, variant.cardsDealt, g.cannonFodder === true)
  await update(gameRef(code), {
    'players/p1/hand': p1,
    'players/p2/hand': p2,
    status: 'setting',
  })
}

// ---------- Setting phase ----------

// hands: array of handCount { id, cards[5 {rank, suit, value}] }
// Face-up decisions are NOT made here anymore — those happen per-round during matching.
export async function lockIn(code, slot, hands) {
  const snapPre = await get(gameRef(code))
  const variantPre = getVariant(snapPre.val()?.variant)
  validateHands(hands, variantPre)
  await update(gameRef(code), {
    [`players/${slot}/hands`]: hands,
    [`players/${slot}/locked`]: true,
  })

  const snap = await get(gameRef(code))
  const g = snap.val()
  if (g.players.p1.locked && g.players.p2.locked && g.status === 'setting') {
    await update(gameRef(code), {
      status: 'matching',
      currentRound: 0,
      currentPlayer: g.firstPlayer,
      roundState: 'play',
      currentOffer: null,
      currentResponse: null,
      roundReady: { p1: false, p2: false },
      rounds: [],
    })
  }
}

function validateHands(hands, variant) {
  if (!Array.isArray(hands) || hands.length !== variant.handCount) {
    throw new Error(`Must have exactly ${variant.handCount} hands.`)
  }
  const seen = new Set()
  for (const h of hands) {
    if (!Array.isArray(h.cards) || h.cards.length !== 5) {
      throw new Error('Each hand must have exactly 5 cards.')
    }
    for (const c of h.cards) {
      const k = `${c.rank}-${c.suit}`
      if (seen.has(k)) throw new Error('Duplicate card detected.')
      seen.add(k)
    }
  }
  const needed = variant.handCount * 5
  if (seen.size !== needed) throw new Error(`Must place all ${needed} cards.`)
}

// ---------- Matchup phase ----------

// Active player plays one of their remaining hands.
// On non-final rounds, `faceUp` must mark exactly 3 of the 5 cards face-up.
// On the final round, the face-up choice is skipped — all 5 are revealed.
export async function playHand(code, slot, handId, faceUp) {
  const snap = await get(gameRef(code))
  const g = snap.val()
  if (g.status !== 'matching') throw new Error('Not in matching phase.')
  if (g.roundState !== 'play') throw new Error('Not in play substate.')
  if (g.currentPlayer !== slot) throw new Error('Not your turn to play.')

  const used = usedHandIds(g.rounds || [], slot)
  if (used.has(handId)) throw new Error('Hand already used.')

  const variant = getVariant(g.variant)
  const isLast = (g.currentRound ?? 0) >= variant.handCount - 1

  assertJokerTiming(g, slot, handId, variant)

  // On the last round the face-up choice is skipped — everything reveals.
  const effectiveFaceUp = isLast ? [true, true, true, true, true] : faceUp
  assertFaceUpValid(effectiveFaceUp, !isLast)

  const baseHand = g.players[slot].hands[handId].cards
  const cards = baseHand.map((c, i) => ({ ...c, faceUp: !!effectiveFaceUp[i] }))

  await update(gameRef(code), {
    currentOffer: { handId, cards },
    roundState: 'respond',
    currentPlayer: slot === 'p1' ? 'p2' : 'p1',
  })
}

// Responder picks one of their remaining hands. They no longer choose
// face-up cards — the responder's hand is always revealed in full at resolve
// time. (Strategically, hiding responder cards gave no information to the
// offerer, who had already committed.)
export async function respondToHand(code, slot, handId) {
  const snap = await get(gameRef(code))
  const g = snap.val()
  if (g.status !== 'matching') throw new Error('Not in matching phase.')
  if (g.roundState !== 'respond') throw new Error('Not in respond substate.')
  if (g.currentPlayer !== slot) throw new Error('Not your turn to respond.')

  const used = usedHandIds(g.rounds || [], slot)
  if (used.has(handId)) throw new Error('Hand already used.')

  const variant = getVariant(g.variant)
  assertJokerTiming(g, slot, handId, variant)

  const baseHand = g.players[slot].hands[handId].cards
  const cards = baseHand.map(c => ({ ...c, faceUp: true }))

  await update(gameRef(code), {
    currentResponse: { handId, cards },
    roundState: 'reveal',
    roundReady: { p1: false, p2: false },
  })
}

// Cannon Fodder constraint: a hand containing a Joker cannot be played in the
// final round. So on the last round the chosen hand must not have a Joker,
// and on the second-to-last round the player must play their Joker hand if
// they still hold one (otherwise it would be trapped for the final round).
function assertJokerTiming(g, slot, handId, variant) {
  if (g.cannonFodder !== true) return
  const hands = g.players[slot].hands
  const chosenHasJoker = hands[handId].cards.some(isJoker)
  const cr = g.currentRound ?? 0
  const isLast = cr >= variant.handCount - 1
  const isSecondToLast = cr === variant.handCount - 2

  if (isLast && chosenHasJoker) {
    throw new Error('A hand with a Joker cannot be played as the last hand.')
  }

  if (isSecondToLast && !chosenHasJoker) {
    const used = usedHandIds(g.rounds || [], slot)
    const remainingHasJoker = hands.some(h =>
      !used.has(h.id) && h.id !== handId && h.cards.some(isJoker)
    )
    if (remainingHasJoker) {
      throw new Error('You must play your Joker hand this round — it can\'t be saved for the final round.')
    }
  }
}

// Called when a player taps "Continue" on the reveal pane. When both players
// have tapped, we finalize the round and advance (or end the game).
export async function readyForNextRound(code, slot) {
  const snap = await get(gameRef(code))
  const g = snap.val()
  if (g.status !== 'matching' || g.roundState !== 'reveal') return
  const ready = { ...(g.roundReady || {}), [slot]: true }

  if (!(ready.p1 && ready.p2)) {
    await update(gameRef(code), { roundReady: ready })
    return
  }

  // Finalize the current round.
  const offer = g.currentOffer
  const response = g.currentResponse
  if (!offer || !response) return

  const offerer = previousPlayer(g.currentPlayer) // responder is currentPlayer; offerer is the other
  const responder = g.currentPlayer
  const p1HandId = offerer === 'p1' ? offer.handId : response.handId
  const p2HandId = offerer === 'p1' ? response.handId : offer.handId
  const p1Cards = offerer === 'p1' ? offer.cards : response.cards
  const p2Cards = offerer === 'p1' ? response.cards : offer.cards

  const e1 = evaluateHand(stripFaceUp(p1Cards))
  const e2 = evaluateHand(stripFaceUp(p2Cards))
  const winner = compareHands(stripFaceUp(p1Cards), stripFaceUp(p2Cards))

  const newRound = {
    playedBy: offerer,
    p1HandId, p2HandId,
    p1Hand: p1Cards,
    p2Hand: p2Cards,
    p1HandRank: e1.label,
    p2HandRank: e2.label,
    winner,
  }

  // --- Cannon Fodder: if exactly one player played a Joker in this round,
  // the game ends immediately with inverted stakes.
  //   - Joker-player wins the round -> opposing had the WEAKER hand -> opposing wins the game
  //   - Joker-player loses the round -> opposing had the STRONGER hand -> opposing LOSES the game
  // If both played a Joker, the effect cancels and the round resolves normally.
  const p1HasJoker = p1Cards.some(isJoker)
  const p2HasJoker = p2Cards.some(isJoker)
  const cfTriggers = g.cannonFodder === true && (p1HasJoker !== p2HasJoker)

  if (cfTriggers) {
    newRound.cannonFodder = true
    const jokerPlayer = p1HasJoker ? 'p1' : 'p2'
    const opposingPlayer = p1HasJoker ? 'p2' : 'p1'
    let gameWinner
    if (winner === jokerPlayer) {
      gameWinner = opposingPlayer // opposing was weakest -> opposing wins game
    } else if (winner === opposingPlayer) {
      gameWinner = jokerPlayer    // opposing was strongest -> opposing loses game
    } else {
      gameWinner = 'draw'
    }
    await update(gameRef(code), {
      rounds: [...(g.rounds || []), newRound],
      currentOffer: null,
      currentResponse: null,
      roundReady: { p1: false, p2: false },
      status: 'done',
      winner: gameWinner,
      cannonFodderEnding: {
        jokerPlayer,
        opposingPlayer,
        roundWinner: winner,
      },
    })
    return
  }

  if (g.cannonFodder === true && p1HasJoker && p2HasJoker) {
    newRound.bothJokers = true // for display only
  }

  const rounds = [...(g.rounds || []), newRound]
  const nextRoundIdx = (g.currentRound ?? 0) + 1
  const variant = getVariant(g.variant)
  const isLast = nextRoundIdx >= variant.handCount

  if (isLast) {
    await update(gameRef(code), {
      rounds,
      currentOffer: null,
      currentResponse: null,
      roundReady: { p1: false, p2: false },
      status: 'done',
      winner: tallyWinner(rounds),
    })
    return
  }

  // Whoever played in round 0 plays on even rounds; other plays on odd rounds.
  const firstPlayer = g.firstPlayer
  const nextPlayer = (nextRoundIdx % 2 === 0) ? firstPlayer : (firstPlayer === 'p1' ? 'p2' : 'p1')

  // Round 5 (index 4) — and in general the last remaining hand for each player —
  // auto-play if only 1 hand left on both sides. Actually with 5 rounds of 5
  // hands this only happens in the last round. We handled `isLast` above so
  // this isn't strictly necessary, but guard against future changes.

  await update(gameRef(code), {
    rounds,
    currentRound: nextRoundIdx,
    currentPlayer: nextPlayer,
    roundState: 'play',
    currentOffer: null,
    currentResponse: null,
    roundReady: { p1: false, p2: false },
  })
}

function previousPlayer(currentPlayer) {
  return currentPlayer === 'p1' ? 'p2' : 'p1'
}

function usedHandIds(rounds, slot) {
  const s = new Set()
  for (const r of rounds) {
    s.add(slot === 'p1' ? r.p1HandId : r.p2HandId)
  }
  return s
}

function assertFaceUpValid(faceUp, requireThree = true) {
  if (!Array.isArray(faceUp) || faceUp.length !== 5) {
    throw new Error('faceUp must be an array of 5 booleans.')
  }
  if (requireThree) {
    const trues = faceUp.filter(Boolean).length
    if (trues !== 3) throw new Error('Exactly 3 cards must be face-up.')
  }
}

function stripFaceUp(cards) {
  return cards.map(c => ({ rank: c.rank, suit: c.suit, value: c.value }))
}

function tallyWinner(rounds) {
  let p1 = 0, p2 = 0
  for (const r of rounds) {
    if (r.winner === 'p1') p1++
    else if (r.winner === 'p2') p2++
  }
  if (p1 > p2) return 'p1'
  if (p2 > p1) return 'p2'
  return 'draw'
}

// ---------- Leave ----------

// Marks the game abandoned so the remaining player gets a clear signal instead
// of being stuck. Best-effort — caller should clear their local session even
// if this write fails.
export async function leaveGame(code, slot) {
  try {
    await update(gameRef(code), {
      status: 'abandoned',
      abandonedBy: slot,
      abandonedAt: Date.now(),
    })
  } catch (e) {
    console.warn('leaveGame failed:', e)
  }
}

// ---------- Rematch ----------

export async function rematch(code) {
  const snap = await get(gameRef(code))
  const g = snap.val()
  const variant = getVariant(g.variant)
  const cannonFodder = g.cannonFodder === true
  const seed = randomSeed()
  const deal = dealFromSeed(seed, variant.cardsDealt, cannonFodder)
  await set(gameRef(code), {
    status: 'setting',
    seed,
    variant: variant.id,
    cannonFodder,
    createdAt: Date.now(),
    firstPlayer: Math.random() < 0.5 ? 'p1' : 'p2',
    players: {
      p1: { uid: g.players.p1.uid, connected: true, locked: false, hand: deal.p1 },
      p2: { uid: g.players.p2.uid, connected: true, locked: false, hand: deal.p2 },
    },
  })
}

// ---------- Subscribe ----------

export function subscribeGame(code, cb) {
  const r = gameRef(code)
  const handler = onValue(r, snap => cb(snap.val()))
  return () => off(r, 'value', handler)
}

export function getMySlot(game, uid) {
  if (game?.players?.p1?.uid === uid) return 'p1'
  if (game?.players?.p2?.uid === uid) return 'p2'
  return null
}
