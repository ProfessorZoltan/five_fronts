import { useState } from 'react'
import Button from '../components/Button.jsx'
import InfoButton from '../components/InfoButton.jsx'
import { ResultsInstructions } from '../components/Instructions.jsx'
import ResultCard from '../components/ResultCard.jsx'
import { rematch } from '../firebase/game.js'

export default function ResultsScreen({ code, game, slot, onLeave }) {
  const opp = slot === 'p1' ? 'p2' : 'p1'
  const rounds = game.rounds || []
  let myWins = 0, oppWins = 0
  for (const r of rounds) {
    if (r.winner === slot) myWins++
    else if (r.winner === opp) oppWins++
  }
  const isDraw = game.winner === 'draw' || (!game.cannonFodderEnding && myWins === oppWins)
  const youWon = game.winner === slot
  const [busy, setBusy] = useState(false)
  const cfEnding = game.cannonFodderEnding
  const cfBlurb = cfEnding
    ? (cfEnding.jokerPlayer === slot
        ? (cfEnding.roundWinner === slot
            ? 'You played a Joker and won the round — opponent held the weaker hand, so they win the whole game.'
            : 'You played a Joker and lost the round — opponent held the stronger hand, so they lose the whole game.')
        : (cfEnding.roundWinner === slot
            ? 'Opponent played a Joker and you held the stronger hand — they lose the whole game.'
            : 'Opponent played a Joker and you held the weaker hand — you win the whole game.'))
    : null

  async function handleRematch() {
    setBusy(true)
    try { await rematch(code) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex flex-col pb-4">
      <div className={
        'relative p-6 text-center border-b border-gold-600/20 ' +
        (youWon ? 'bg-emerald-600/10' : isDraw ? 'bg-felt-800' : 'bg-red-900/10')
      }>
        <div className="absolute top-4 right-4">
          <InfoButton size="sm"><ResultsInstructions game={game} /></InfoButton>
        </div>
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
        {cfBlurb && (
          <div className="mt-3 text-amber-300 text-sm border-t border-amber-500/30 pt-3">
            ★ Cannon Fodder ★<br/>
            {cfBlurb}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {rounds.map((r, i) => (
          <div key={i}>
            <div className="text-gold-200/60 text-xs mb-1">Round {i + 1}</div>
            <ResultCard round={r} slot={slot} revealed compact reorder />
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
