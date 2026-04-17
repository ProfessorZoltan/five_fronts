// Lightweight self-tests for evaluate.js. Run with: `node src/game/evaluate.test.js`
import { evaluateHand, compareHands, HAND_LABELS } from './evaluate.js'
import { RANK_VALUE } from './deck.js'

function card(rank, suit) {
  return { rank, suit, value: RANK_VALUE[rank] }
}

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { passed++ } else { failed++; console.error('FAIL:', msg) }
}

// Royal Flush
const royal = [card('A','spades'), card('K','spades'), card('Q','spades'), card('J','spades'), card('10','spades')]
assert(evaluateHand(royal).rank === 1, 'royal flush is rank 1')

// Straight Flush (K-high)
const sfKing = [card('K','hearts'), card('Q','hearts'), card('J','hearts'), card('10','hearts'), card('9','hearts')]
assert(evaluateHand(sfKing).rank === 2, 'K-high straight flush rank 2')
assert(compareHands(royal, sfKing) === 'p1', 'royal flush beats straight flush')

// Four of a kind
const quads = [card('7','spades'), card('7','hearts'), card('7','clubs'), card('7','diamonds'), card('2','spades')]
assert(evaluateHand(quads).rank === 3, 'four of a kind rank 3')

// Full house
const full = [card('J','spades'), card('J','hearts'), card('J','clubs'), card('4','diamonds'), card('4','spades')]
assert(evaluateHand(full).rank === 4, 'full house rank 4')

// Flush (non-straight)
const flush = [card('A','clubs'), card('J','clubs'), card('9','clubs'), card('6','clubs'), card('3','clubs')]
assert(evaluateHand(flush).rank === 5, 'flush rank 5')

// Flush tiebreaker: A-high flush beats K-high flush
const flushLower = [card('K','diamonds'), card('J','diamonds'), card('9','diamonds'), card('6','diamonds'), card('3','diamonds')]
assert(compareHands(flush, flushLower) === 'p1', 'A-high flush beats K-high flush')

// Straight (Q high)
const straightQ = [card('Q','spades'), card('J','hearts'), card('10','clubs'), card('9','diamonds'), card('8','spades')]
assert(evaluateHand(straightQ).rank === 6, 'straight rank 6')

// Higher straight beats lower straight
const straightK = [card('K','spades'), card('Q','hearts'), card('J','clubs'), card('10','diamonds'), card('9','spades')]
assert(compareHands(straightK, straightQ) === 'p1', 'K-high straight beats Q-high')

// Ace-low straight (wheel)
const wheel = [card('A','spades'), card('2','hearts'), card('3','clubs'), card('4','diamonds'), card('5','spades')]
const wheelEval = evaluateHand(wheel)
assert(wheelEval.rank === 6, 'wheel is a straight')
assert(wheelEval.tiebreakers[0] === 5, 'wheel high card is 5')
assert(compareHands(straightQ, wheel) === 'p1', 'Q-high straight beats wheel')

// Three of a kind
const trips = [card('9','spades'), card('9','hearts'), card('9','clubs'), card('A','diamonds'), card('2','spades')]
assert(evaluateHand(trips).rank === 7, 'trips rank 7')

// Two pair
const twoPair = [card('A','spades'), card('A','hearts'), card('5','clubs'), card('5','diamonds'), card('2','spades')]
assert(evaluateHand(twoPair).rank === 8, 'two pair rank 8')

// One pair
const onePair = [card('K','spades'), card('K','hearts'), card('7','clubs'), card('4','diamonds'), card('2','spades')]
assert(evaluateHand(onePair).rank === 9, 'one pair rank 9')

// High card
const highCard = [card('A','spades'), card('J','hearts'), card('9','clubs'), card('5','diamonds'), card('3','hearts')]
assert(evaluateHand(highCard).rank === 10, 'high card rank 10')

// Category beats: flush beats straight
assert(compareHands(flush, straightQ) === 'p1', 'flush beats straight')
// Two pair beats one pair
assert(compareHands(twoPair, onePair) === 'p1', 'two pair beats one pair')
// Full house beats flush
assert(compareHands(full, flush) === 'p1', 'full house beats flush')

// Kicker comparison: A-K vs A-Q two pair
const apK = [card('A','spades'), card('A','hearts'), card('K','clubs'), card('K','diamonds'), card('2','spades')]
const apQ = [card('A','clubs'), card('A','diamonds'), card('Q','hearts'), card('Q','spades'), card('3','clubs')]
assert(compareHands(apK, apQ) === 'p1', 'A-K two pair beats A-Q two pair')

// Suit tiebreaker: identical ranks, different suits.
// Hand A has a spade where hand B has a club at the top. Spades > Clubs.
const suitA = [card('A','spades'), card('K','hearts'), card('Q','diamonds'), card('J','clubs'), card('9','spades')]
const suitB = [card('A','clubs'),  card('K','spades'), card('Q','hearts'),   card('J','diamonds'), card('9','diamonds')]
// Both: A-high, K, Q, J, 9 — ranks match. Walk descending: A-spades vs A-clubs -> spades wins.
assert(compareHands(suitA, suitB) === 'p1', 'suit tiebreaker fires only when ranks tie')

// Regular flush where tiebreakers differ by exactly one card
const flushH = [card('A','hearts'), card('J','hearts'), card('9','hearts'), card('6','hearts'), card('3','hearts')]
const flushC = [card('A','clubs'),  card('J','clubs'),  card('9','clubs'),  card('6','clubs'),  card('4','clubs')]
assert(compareHands(flushH, flushC) === 'p2', 'last-card kicker breaks flush tie (4 > 3)')

// Summary
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
