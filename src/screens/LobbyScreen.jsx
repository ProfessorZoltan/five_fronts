import { useState } from 'react'
import Button from '../components/Button.jsx'
import LeaveButton from '../components/LeaveButton.jsx'
import { getVariant } from '../game/variants.js'

export default function LobbyScreen({ code, game, slot, onLeave }) {
  const p1Here = !!game?.players?.p1
  const p2Here = !!game?.players?.p2
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-8">
        <div>
          <div className="text-gold-200/60 uppercase tracking-[0.4em] text-xs mb-2">Game Code</div>
          <button
            onClick={copyCode}
            className="font-display text-6xl text-gold-400 tracking-[0.4em] py-2 px-4 rounded-xl hover:bg-felt-800 active:scale-[0.98] transition"
            aria-label="copy game code"
          >
            {code}
          </button>
          <div className="text-gold-200/60 text-xs mt-2 h-4">
            {copied ? 'Copied!' : 'Tap to copy'}
          </div>
        </div>

        <div className="rounded-xl border border-gold-600/20 bg-felt-800/40 px-4 py-3">
          <div className="text-gold-200/60 uppercase tracking-widest text-[10px] mb-1">Variant</div>
          <div className="text-gold-100 font-semibold">
            {getVariant(game?.variant).name}
            {game?.cannonFodder && <span className="text-amber-500"> · Cannon Fodder ★</span>}
          </div>
          <div className="text-gold-200/60 text-xs mt-0.5">{getVariant(game?.variant).tagline}</div>
        </div>

        <div className="space-y-2">
          <PlayerRow label="Player 1" present={p1Here} isYou={slot === 'p1'} />
          <PlayerRow label="Player 2" present={p2Here} isYou={slot === 'p2'} />
        </div>

        <div className="text-gold-200/80 animate-pulseSoft">
          {p1Here && p2Here ? 'Dealing cards…' : 'Waiting for opponent…'}
        </div>

        <LeaveButton code={code} slot={slot} onLeave={onLeave} />
      </div>
    </div>
  )
}

function PlayerRow({ label, present, isYou }) {
  return (
    <div className={
      'flex items-center justify-between rounded-xl px-4 py-3 border ' +
      (present ? 'border-gold-500/60 bg-felt-800' : 'border-gold-600/20 bg-felt-800/40')
    }>
      <span className="text-gold-100/90">{label}{isYou && ' (you)'}</span>
      <span className={present ? 'text-emerald-400' : 'text-gold-200/40'}>
        {present ? 'Connected' : 'Waiting'}
      </span>
    </div>
  )
}
