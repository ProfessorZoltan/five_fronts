import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import { CardBack, CardSlot } from '../components/Card.jsx'
import ResultCard from '../components/ResultCard.jsx'
import { evaluateHand, compareHands } from '../game/evaluate.js'
import { playHand, respondToHand, readyForNextRound } from '../firebase/game.js'

// One screen for the whole matching phase — it flips between three substates:
//   play    -> active player picks a hand AND 3 face-up cards
//   respond -> other player sees offered 3 face-up cards, picks a response + face-ups
//   reveal  -> both hands fully shown, face-down cards flip, winner highlighted

export default function MatchupScreen({ code, game, slot }) {
  const opp = slot === 'p1' ? 'p2' : 'p1'
  const rounds = game.rounds || []
  const usedMine = new Set(rounds.map(r => slot === 'p1' ? r.p1HandId : r.p2HandId))
  const usedOpp = new Set(rounds.map(r => slot === 'p1' ? r.p2HandId : r.p1HandId))

  const myHands = game.players[slot]?.hands || []
  const myRemainingIds = myHands.map(h => h.id).filter(id => !usedMine.has(id))
  const oppRemainingCount = 5 - usedOpp.size

  const isMyTurn = game.currentPlayer === slot
  const state = game.roundState  // 'play' | 'respond' | 'reveal'

  return (
    <div className="min-h-screen flex flex-col pb-4">
      <Header game={game} slot={slot} />

      {state === 'play' && (isMyTurn
        ? <PlayView code={code} slot={slot} myHands={myHands} myRemainingIds={myRemainingIds} />
        : <WaitingView message="Opponent is choosing a hand to play…" oppRemainingCount={oppRemainingCount} />
      )}

      {state === 'respond' && (isMyTurn
        ? <RespondView code={code} slot={slot} game={game} myHands={myHands} myRemainingIds={myRemainingIds} />
        : <WaitingOnResponseView game={game} oppRemainingCount={oppRemainingCount} />
      )}

      {state === 'reveal' && (
        <RevealView code={code} slot={slot} game={game} />
      )}

      {rounds.length > 0 && (
        <RoundHistory rounds={rounds} slot={slot} />
      )}
    </div>
  )
}

function Header({ game, slot }) {
  const rounds = game.rounds || []
  let me = 0, opp = 0
  for (const r of rounds) {
    if (r.winner === slot) me++
    else if (r.winner && r.winner !== 'draw') opp++
  }
  const n = (game.currentRound ?? 0) + 1
  return (
    <div className="px-4 py-3 border-b border-gold-600/20 flex items-center justify-between">
      <div>
        <div className="text-gold-400 font-display text-lg leading-none">Round {n} of 5</div>
        <div className="text-gold-200/60 text-xs">
          {game.currentPlayer === slot ? 'Your turn' : 'Opponent\'s turn'}
        </div>
      </div>
      <div className="text-sm">
        <span className="text-gold-200/60 mr-1">You</span>
        <span className="font-display text-gold-400 text-xl">{me}</span>
        <span className="text-gold-200/30 mx-2">|</span>
        <span className="font-display text-gold-400 text-xl">{opp}</span>
        <span className="text-gold-200/60 ml-1">Opp</span>
      </div>
    </div>
  )
}

// ---------- Play view (your turn to play a hand) ----------

function PlayView({ code, slot, myHands, myRemainingIds }) {
  const [pickedHandId, setPickedHandId] = useState(null)
  const [faceUp, setFaceUp] = useState([false, false, false, false, false])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Auto-pick the hand when only one remaining (round 5).
  useEffect(() => {
    if (pickedHandId == null && myRemainingIds.length === 1) {
      setPickedHandId(myRemainingIds[0])
    }
  }, [pickedHandId, myRemainingIds])

  const pickedHand = pickedHandId != null ? myHands.find(h => h.id === pickedHandId) : null
  const faceUpCount = faceUp.filter(Boolean).length

  function toggleFaceUp(i) {
    setFaceUp(prev => {
      const next = prev.slice()
      if (next[i]) { next[i] = false; return next }
      if (prev.filter(Boolean).length >= 3) return prev
      next[i] = true
      return next
    })
  }

  async function commit() {
    setBusy(true); setError(null)
    try {
      await playHand(code, slot, pickedHandId, faceUp)
    } catch (e) {
      setError(e.message || 'Could not play hand.')
      setBusy(false)
    }
  }

  return (
    <div className="px-3 pt-3 flex-1">
      {pickedHand == null ? (
        <div>
          <div className="text-gold-200/80 mb-2">Choose a hand to play</div>
          <div className="space-y-2">
            {myHands.map(h => {
              const disabled = !myRemainingIds.includes(h.id)
              const label = (() => { try { return evaluateHand(h.cards).label } catch { return '' } })()
              return (
                <button
                  key={h.id}
                  disabled={disabled}
                  onClick={() => setPickedHandId(h.id)}
                  className={[
                    'w-full flex items-center gap-2 p-2 rounded-xl border transition',
                    disabled
                      ? 'opacity-40 border-gold-600/20 bg-felt-800/40'
                      : 'border-gold-600/30 bg-felt-800/70 active:scale-[0.995]',
                  ].join(' ')}
                >
                  <div className="w-10 text-center">
                    <div className="text-gold-400 font-display leading-none">{h.id + 1}</div>
                    <div className="text-[10px] text-gold-200/60 mt-0.5 h-3">{disabled ? 'used' : label}</div>
                  </div>
                  <div className="flex gap-1 flex-1">
                    {h.cards.map((c, i) => (
                      <div key={i} className="flex-1 max-w-[18%]">
                        <CardSlot card={{ ...c, faceUp: true }} size="sm" />
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-gold-200/80 mb-2">
            Tap <b>3</b> cards to turn face-up. The other 2 stay hidden from your opponent.
          </div>
          <div className="text-gold-200/60 text-xs mb-2">Hand #{pickedHand.id + 1}</div>
          <div className="flex gap-1.5 mb-3">
            {pickedHand.cards.map((c, i) => (
              <div key={i} className="flex-1 max-w-[18%]">
                <CardSlot
                  card={{ ...c, faceUp: faceUp[i] }}
                  size="sm"
                  selected={faceUp[i]}
                  onClick={() => toggleFaceUp(i)}
                />
              </div>
            ))}
          </div>
          <div className="text-gold-200/60 text-xs mb-3">{faceUpCount} / 3 face-up</div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => { setPickedHandId(null); setFaceUp([false,false,false,false,false]) }}
              disabled={busy || myRemainingIds.length === 1}
            >
              Change hand
            </Button>
            <Button className="flex-1" onClick={commit} disabled={busy || faceUpCount !== 3}>
              {busy ? 'Playing…' : 'Play hand'}
            </Button>
          </div>
          {error && <div className="text-red-300 text-sm mt-2">{error}</div>}
        </div>
      )}
    </div>
  )
}

// ---------- Waiting views (opponent is acting) ----------

function WaitingView({ message, oppRemainingCount }) {
  return (
    <div className="px-3 pt-3 flex-1">
      <div className="text-gold-200/80 animate-pulseSoft">{message}</div>
      <div className="mt-4">
        <div className="text-gold-200/50 text-xs mb-1">Opponent's remaining hands ({oppRemainingCount})</div>
        <div className="flex gap-1.5">
          {Array.from({ length: oppRemainingCount }).map((_, i) => (
            <div key={i} className="flex-1 max-w-[18%]">
              <CardBack size="sm" className="w-full h-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Shown to the offerer after they've played, while the responder is choosing.
// The cards displayed here are the player's OWN played hand — face-down cards
// render with the FACE-DOWN overlay (from CardSlot) so the player remembers
// which cards their opponent can't see.
function WaitingOnResponseView({ game, oppRemainingCount }) {
  const offer = game.currentOffer
  if (!offer) {
    return <WaitingView message="Waiting…" oppRemainingCount={oppRemainingCount} />
  }
  return (
    <div className="px-3 pt-3 flex-1">
      <div className="text-gold-200/80 animate-pulseSoft mb-2">
        You played a hand. Opponent is choosing a response…
      </div>
      <div className="text-gold-200/50 text-xs mb-1">Your played hand</div>
      <div className="flex gap-1.5">
        {offer.cards.map((c, i) => (
          <div key={i} className="flex-1 max-w-[18%]">
            <CardSlot card={c} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Respond view (your turn to respond to opponent's play) ----------

function RespondView({ code, slot, game, myHands, myRemainingIds }) {
  const offer = game.currentOffer
  const [pickedHandId, setPickedHandId] = useState(null)
  const [faceUp, setFaceUp] = useState([false, false, false, false, false])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (pickedHandId == null && myRemainingIds.length === 1) {
      setPickedHandId(myRemainingIds[0])
    }
  }, [pickedHandId, myRemainingIds])

  const pickedHand = pickedHandId != null ? myHands.find(h => h.id === pickedHandId) : null
  const faceUpCount = faceUp.filter(Boolean).length

  function toggleFaceUp(i) {
    setFaceUp(prev => {
      const next = prev.slice()
      if (next[i]) { next[i] = false; return next }
      if (prev.filter(Boolean).length >= 3) return prev
      next[i] = true
      return next
    })
  }

  async function commit() {
    setBusy(true); setError(null)
    try {
      await respondToHand(code, slot, pickedHandId, faceUp)
    } catch (e) {
      setError(e.message || 'Could not respond.')
      setBusy(false)
    }
  }

  return (
    <div className="px-3 pt-3 flex-1 space-y-3">
      {/* Opponent's offer */}
      <div>
        <div className="text-gold-200/50 text-xs mb-1">Opponent played</div>
        <div className="flex gap-1.5">
          {offer?.cards?.map((c, i) => (
            <div key={i} className="flex-1 max-w-[18%]">
              {c.faceUp ? <CardSlot card={c} size="sm" /> : <CardBack size="sm" />}
            </div>
          ))}
        </div>
      </div>

      {pickedHand == null ? (
        <div>
          <div className="text-gold-200/80 mb-2">Choose a hand to respond with</div>
          <div className="space-y-2">
            {myHands.map(h => {
              const disabled = !myRemainingIds.includes(h.id)
              const label = (() => { try { return evaluateHand(h.cards).label } catch { return '' } })()
              return (
                <button
                  key={h.id}
                  disabled={disabled}
                  onClick={() => setPickedHandId(h.id)}
                  className={[
                    'w-full flex items-center gap-2 p-2 rounded-xl border transition',
                    disabled
                      ? 'opacity-40 border-gold-600/20 bg-felt-800/40'
                      : 'border-gold-600/30 bg-felt-800/70 active:scale-[0.995]',
                  ].join(' ')}
                >
                  <div className="w-10 text-center">
                    <div className="text-gold-400 font-display leading-none">{h.id + 1}</div>
                    <div className="text-[10px] text-gold-200/60 mt-0.5 h-3">{disabled ? 'used' : label}</div>
                  </div>
                  <div className="flex gap-1 flex-1">
                    {h.cards.map((c, i) => (
                      <div key={i} className="flex-1 max-w-[18%]">
                        <CardSlot card={{ ...c, faceUp: true }} size="sm" />
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-gold-200/80 mb-2">
            Tap <b>3</b> cards to turn face-up.
          </div>
          <div className="text-gold-200/60 text-xs mb-2">Your hand #{pickedHand.id + 1}</div>
          <div className="flex gap-1.5 mb-3">
            {pickedHand.cards.map((c, i) => (
              <div key={i} className="flex-1 max-w-[18%]">
                <CardSlot
                  card={{ ...c, faceUp: faceUp[i] }}
                  size="sm"
                  selected={faceUp[i]}
                  onClick={() => toggleFaceUp(i)}
                />
              </div>
            ))}
          </div>
          <div className="text-gold-200/60 text-xs mb-3">{faceUpCount} / 3 face-up</div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => { setPickedHandId(null); setFaceUp([false,false,false,false,false]) }}
              disabled={busy || myRemainingIds.length === 1}
            >
              Change hand
            </Button>
            <Button className="flex-1" onClick={commit} disabled={busy || faceUpCount !== 3}>
              {busy ? 'Responding…' : 'Commit response'}
            </Button>
          </div>
          {error && <div className="text-red-300 text-sm mt-2">{error}</div>}
        </div>
      )}
    </div>
  )
}

// ---------- Reveal view (both hands shown; flip face-down cards) ----------

function RevealView({ code, slot, game }) {
  const [busy, setBusy] = useState(false)

  const opp = slot === 'p1' ? 'p2' : 'p1'
  const myReady = game.roundReady?.[slot]
  const oppReady = game.roundReady?.[opp]
  const bothReady = myReady && oppReady

  const offer = game.currentOffer
  const response = game.currentResponse
  const ready = !!(offer && response)

  // Responder is currentPlayer; offerer is the other slot.
  const offerer = game.currentPlayer === 'p1' ? 'p2' : 'p1'
  const p1Cards = ready ? (offerer === 'p1' ? offer.cards : response.cards) : null
  const p2Cards = ready ? (offerer === 'p1' ? response.cards : offer.cards) : null

  const stripped = arr => arr.map(c => ({ rank: c.rank, suit: c.suit, value: c.value }))
  let round = null, winnerText = null
  if (ready) {
    try {
      const e1 = evaluateHand(stripped(p1Cards))
      const e2 = evaluateHand(stripped(p2Cards))
      const winner = compareHands(stripped(p1Cards), stripped(p2Cards))
      round = {
        playedBy: offerer,
        p1Hand: p1Cards,
        p2Hand: p2Cards,
        p1HandRank: e1.label,
        p2HandRank: e2.label,
        winner,
      }
      winnerText =
        winner === slot ? 'You win this round!' :
        winner === 'draw' ? 'Tied round!' :
        'Opponent wins this round.'
    } catch {
      round = null
    }
  }

  async function cont() {
    setBusy(true)
    try { await readyForNextRound(code, slot) } finally { setBusy(false) }
  }

  if (!round) return <div className="p-6 text-gold-200/70">Preparing…</div>

  return (
    <div className="px-3 pt-3 flex-1">
      <div className="text-gold-200/80 mb-2">{winnerText}</div>
      <ResultCard round={round} slot={slot} revealed reorder />
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-gold-200/60">
          {myReady ? 'You are ready.' : 'Tap Continue when you\'re ready.'}
          {oppReady ? ' Opponent ready.' : ' Waiting for opponent.'}
        </div>
        <Button onClick={cont} disabled={busy || myReady}>
          {bothReady ? 'Advancing…' : myReady ? 'Waiting…' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}

// ---------- History of completed rounds ----------

function RoundHistory({ rounds, slot }) {
  return (
    <div className="px-3 pt-3 mt-2 border-t border-gold-600/20">
      <div className="text-gold-200/60 text-xs mb-2">Rounds so far — newest on top</div>
      <div className="space-y-2">
        {rounds.slice().reverse().map((r, i) => (
          <ResultCard
            key={rounds.length - 1 - i}
            round={r}
            slot={slot}
            revealed
            reorder
            compact
          />
        ))}
      </div>
    </div>
  )
}
