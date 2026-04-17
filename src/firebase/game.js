// Firebase game-state operations for Five Fronts.
//
// Data shape (under /games/{code}):
//   status: 'waiting' | 'setting' | 'matching' | 'revealing' | 'done'
//   seed: number
//   createdAt: number
//   players:
//     p1: { uid, connected, hand[25], hands[5], locked, ready }
//     p2: { same }
//   visibleHands: { p1: [5 hands w/ hidden face-downs], p2: [...] }
//   pairings: [{ p1HandId, p2HandId, madeBy }]
//   currentTurn: 'p1' | 'p2'
//   firstSelector: 'p1' | 'p2'
//   results: [{ pairingIndex, p1Hand, p2Hand, winner, p1HandRank, p2HandRank }]
//   winner: null | 'p1' | 'p2' | 'draw'

import {
  ref, get, set, update, onValue, off, runTransaction, serverTimestamp,
} from 'firebase/database'
import { getDb, getPlayerId } from './client.js'
import { dealFromSeed, randomSeed, randomGameCode } from '../game/deck.js'
import { evaluateHand, compareHands } from '../game/evaluate.js'

const gameRef = code => ref(getDb(), `games/${code}`)
const childRef = (code, path) => ref(getDb(), `games/${code}/${path}`)

// ---------- Create / Join ----------

export async function createGame() {
  const uid = getPlayerId()
  const db = getDb()
  // Try codes until one is unclaimed.
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomGameCode()
    const tx = await runTransaction(ref(db, `games/${code}`), existing => {
      if (existing && existing.createdAt) return // collision
      return {
        status: 'waiting',
        seed: randomSeed(),
        createdAt: Date.now(),
        firstSelector: Math.random() < 0.5 ? 'p1' : 'p2',
        currentTurn: null,
        players: {
          p1: { uid, connected: true, locked: false, ready: false },
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
  // If this player already has a slot in this game, return it.
  if (game.players?.p1?.uid === uid) return { code, slot: 'p1' }
  if (game.players?.p2?.uid === uid) return { code, slot: 'p2' }
  if (game.players?.p2) throw new Error('Game is full.')

  // Claim p2 via transaction.
  const tx = await runTransaction(childRef(code, 'players/p2'), existing => {
    if (existing) return // raced — someone else joined
    return { uid, connected: true, locked: false, ready: false }
  })
  if (!tx.committed) throw new Error('Game is full.')

  // After both players are present, deal cards + move to setting.
  await dealIfReady(code)
  return { code, slot: 'p2' }
}

async function dealIfReady(code) {
  const snap = await get(gameRef(code))
  if (!snap.exists()) return
  const g = snap.val()
  if (g.status !== 'waiting') return
  if (!g.players?.p1 || !g.players?.p2) return

  const { p1, p2 } = dealFromSeed(g.seed)
  await update(gameRef(code), {
    'players/p1/hand': p1,
    'players/p2/hand': p2,
    status: 'setting',
  })
}

// ---------- Setting phase ----------

// handsConfig: array of 5 objects { cards: [{rank,suit,value,faceUp}x5] }
export async function lockIn(code, slot, handsConfig) {
  validateHandsConfig(handsConfig)
  const visible = handsConfig.map((h, id) => ({
    id,
    cards: h.cards.map(c =>
      c.faceUp
        ? { rank: c.rank, suit: c.suit, value: c.value, faceUp: true }
        : { faceUp: false }
    ),
  }))

  await update(gameRef(code), {
    [`players/${slot}/hands`]: handsConfig,
    [`players/${slot}/locked`]: true,
    [`visibleHands/${slot}`]: visible,
  })

  // If both players have locked in, move to matching phase.
  const snap = await get(gameRef(code))
  const g = snap.val()
  if (g.players.p1.locked && g.players.p2.locked && g.status !== 'matching') {
    await update(gameRef(code), {
      status: 'matching',
      currentTurn: g.firstSelector,
    })
  }
}

function validateHandsConfig(handsConfig) {
  if (!Array.isArray(handsConfig) || handsConfig.length !== 5) {
    throw new Error('Must have exactly 5 hands.')
  }
  for (const h of handsConfig) {
    if (!Array.isArray(h.cards) || h.cards.length !== 5) {
      throw new Error('Each hand must have exactly 5 cards.')
    }
    const faceUpCount = h.cards.filter(c => c.faceUp).length
    if (faceUpCount !== 3) {
      throw new Error('Each hand must have exactly 3 face-up cards.')
    }
  }
  // Ensure 25 distinct cards across all 5 hands.
  const seen = new Set()
  for (const h of handsConfig) {
    for (const c of h.cards) {
      const k = `${c.rank}-${c.suit}`
      if (seen.has(k)) throw new Error('Duplicate card detected.')
      seen.add(k)
    }
  }
  if (seen.size !== 25) throw new Error('Must place all 25 cards.')
}

// ---------- Matchup phase ----------

// p1HandId is the sender's own hand if slot === 'p1', else opponent's. We just
// store both ids and who made the pick.
export async function makePairing(code, slot, myHandId, oppHandId) {
  const snap = await get(gameRef(code))
  const g = snap.val()
  if (g.status !== 'matching') throw new Error('Not in matching phase.')
  if (g.currentTurn !== slot) throw new Error('Not your turn.')

  const pairings = g.pairings || []
  const opp = slot === 'p1' ? 'p2' : 'p1'

  // Prevent re-pairing an already-paired hand.
  for (const p of pairings) {
    if (slot === 'p1' && (p.p1HandId === myHandId || p.p2HandId === oppHandId)) {
      throw new Error('Hand already paired.')
    }
    if (slot === 'p2' && (p.p2HandId === myHandId || p.p1HandId === oppHandId)) {
      throw new Error('Hand already paired.')
    }
  }

  const newPairing = slot === 'p1'
    ? { p1HandId: myHandId, p2HandId: oppHandId, madeBy: 'p1' }
    : { p1HandId: oppHandId, p2HandId: myHandId, madeBy: 'p2' }

  const next = [...pairings, newPairing]

  // If this was the 4th pairing, auto-complete the 5th from the remaining ids.
  if (next.length === 4) {
    const p1Used = new Set(next.map(p => p.p1HandId))
    const p2Used = new Set(next.map(p => p.p2HandId))
    const p1Left = [0,1,2,3,4].find(i => !p1Used.has(i))
    const p2Left = [0,1,2,3,4].find(i => !p2Used.has(i))
    next.push({ p1HandId: p1Left, p2HandId: p2Left, madeBy: 'auto' })
  }

  const updates = { pairings: next }
  if (next.length >= 5) {
    // All 5 pairings made — resolve and move to reveal phase.
    updates.results = resolveResults(g, next)
    updates.winner = tallyWinner(updates.results)
    updates.status = 'revealing'
    updates.currentTurn = null
  } else {
    updates.currentTurn = opp
  }
  await update(gameRef(code), updates)
}

function resolveResults(g, pairings) {
  const p1Hands = g.players.p1.hands
  const p2Hands = g.players.p2.hands
  return pairings.map((p, i) => {
    const p1Hand = p1Hands[p.p1HandId].cards
    const p2Hand = p2Hands[p.p2HandId].cards
    const e1 = evaluateHand(p1Hand)
    const e2 = evaluateHand(p2Hand)
    const winner = compareHands(p1Hand, p2Hand)
    return {
      pairingIndex: i,
      p1Hand,
      p2Hand,
      p1HandRank: e1.label,
      p2HandRank: e2.label,
      winner,
    }
  })
}

function tallyWinner(results) {
  let p1 = 0, p2 = 0
  for (const r of results) {
    if (r.winner === 'p1') p1++
    else if (r.winner === 'p2') p2++
  }
  if (p1 > p2) return 'p1'
  if (p2 > p1) return 'p2'
  return 'draw'
}

// ---------- Reveal phase ----------

// Mark current device ready to flip the next pairing; when both ready,
// increment revealIndex.
export async function markReadyForReveal(code, slot) {
  const snap = await get(gameRef(code))
  const g = snap.val()
  const ready = g.revealReady || {}
  ready[slot] = true
  if (ready.p1 && ready.p2) {
    const next = (g.revealIndex || 0) + 1
    const done = next >= (g.results?.length || 0)
    await update(gameRef(code), {
      revealReady: { p1: false, p2: false },
      revealIndex: next,
      ...(done ? { status: 'done' } : {}),
    })
  } else {
    await update(gameRef(code), { revealReady: ready })
  }
}

// ---------- Rematch ----------

export async function rematch(code) {
  const snap = await get(gameRef(code))
  const g = snap.val()
  const { p1, p2 } = dealFromSeed(randomSeed())
  await set(gameRef(code), {
    status: 'setting',
    seed: randomSeed(),
    createdAt: Date.now(),
    firstSelector: Math.random() < 0.5 ? 'p1' : 'p2',
    currentTurn: null,
    players: {
      p1: { uid: g.players.p1.uid, connected: true, locked: false, ready: false, hand: p1 },
      p2: { uid: g.players.p2.uid, connected: true, locked: false, ready: false, hand: p2 },
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
