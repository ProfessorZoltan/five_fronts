import { useState } from 'react'
import Button from '../components/Button.jsx'
import { ResultCard } from './RevealScreen.jsx'
import { rematch } from '../firebase/game.js'

export default function ResultsScreen({ code, game, slot, onLeave }) {
  const opp = slot === 'p1' ? 'p2' : 'p1'
  const results = game.results || []
  let myWins = 0, oppWins = 0
  for (const r of results) {
    if (r.winner === slot) myWins++
    else if (r.winner === opp) oppWins++
  }
  const isDraw = game.winner === 'draw' || myWins === oppWins
  const youWon = game.winner === slot
  const [busy, setBusy] = useState(false)

  async function handleRematch() {
    setBusy(true)
    try { await rematch(code) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex flex-col pb-4">
      <div className={
        'p-6 text-center border-b border-gold-600/20 ' +
        (youWon ? 'bg-emerald-600/10' : isDraw ? 'bg-felt-800' : 'bg-red-900/10')
      }>
        <div className="text-gold-200/60 uppercase tracking-widest text-xs">Game Over</div>
        <div className={
          'font-display text-4xl mt-1 ' +
          (youWon ? 'text-emerald-300' : isDraw ? 'text-gold-300' : 'text-red-300')
        }>
          {isDraw ? 'Draw' : youWon ? 'You Won' : 'You Lost'}
        </div>
        <div className="mt-2 text-gold-100/80">
          You won {myWins} — Opponent won {oppWins}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {results.map((r, i) => (
          <div key={i}>
            <div className="text-gold-200/60 text-xs mb-1">Pairing {i + 1}</div>
            <ResultCard result={r} slot={slot} revealed compact reorder />
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gold-600/20 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onLeave}>New Game</Button>
        <Button className="flex-1" onClick={handleRematch} disabled={busy}>
          {busy ? 'Starting…' : 'Rematch'}
        </Button>
      </div>
    </div>
  )
}
