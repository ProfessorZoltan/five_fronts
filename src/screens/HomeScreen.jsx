import { useState } from 'react'
import Button from '../components/Button.jsx'
import InfoButton from '../components/InfoButton.jsx'
import { HomeInstructions } from '../components/Instructions.jsx'
import { createGame, joinGame } from '../firebase/game.js'
import { VARIANTS, VARIANT_ORDER } from '../game/variants.js'

export default function HomeScreen({ onEnter }) {
  const [mode, setMode] = useState(null) // null | 'create' | 'join'
  const [code, setCode] = useState('')
  const [variantId, setVariantId] = useState('standard')
  const [cannonFodder, setCannonFodder] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate() {
    setBusy(true); setError(null)
    try {
      const session = await createGame({ variantId, cannonFodder })
      onEnter(session)
    } catch (e) {
      setError(e.message || 'Could not create game.')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin() {
    setBusy(true); setError(null)
    try {
      const session = await joinGame(code.trim())
      onEnter(session)
    } catch (e) {
      setError(e.message || 'Could not join game.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="min-h-screen relative bg-felt-900 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/saloon-bg.png)' }}
    >
      {/* Dark scrim over the image for readability. Vignette-style gradient:
          edges darker, middle slightly lighter so the saloon doors still read. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(7,32,24,0.55) 0%, rgba(7,32,24,0.85) 100%), linear-gradient(180deg, rgba(7,32,24,0.45) 0%, transparent 25%, transparent 75%, rgba(7,32,24,0.80) 100%)',
        }}
      />

      <div className="absolute top-4 right-4 z-20">
        <InfoButton><HomeInstructions /></InfoButton>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
        <h1
          className="font-display text-5xl text-gold-400 mb-1"
          style={{ textShadow: '0 2px 16px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)' }}
        >
          Five Fronts
        </h1>
        <p
          className="text-gold-200/90 mb-10 tracking-wider"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
        >
          a poker hand duel
        </p>

        {mode === null && (
          <div className="space-y-3">
            <Button className="w-full" onClick={() => setMode('create')} disabled={busy}>
              Create Game
            </Button>
            <Button className="w-full" variant="secondary" onClick={() => setMode('join')} disabled={busy}>
              Join Game
            </Button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <div className="text-left">
              <div className="text-gold-200/70 text-xs uppercase tracking-widest mb-2">Variant</div>
              <div className="space-y-2">
                {VARIANT_ORDER.map(id => {
                  const v = VARIANTS[id]
                  const selected = variantId === id
                  return (
                    <button
                      key={id}
                      onClick={() => setVariantId(id)}
                      className={[
                        'w-full text-left rounded-xl border px-4 py-3 transition active:scale-[0.99] backdrop-blur-sm',
                        selected
                          ? 'border-gold-400 bg-felt-800/95'
                          : 'border-gold-600/40 bg-felt-800/80 hover:bg-felt-800',
                      ].join(' ')}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-gold-100 font-semibold">{v.name}</div>
                        <div className="text-gold-200/60 text-xs">{v.tagline}</div>
                      </div>
                      <div className="text-gold-200/70 text-xs mt-1">{v.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="text-left">
              <div className="text-gold-200/70 text-xs uppercase tracking-widest mb-2">Options</div>
              <button
                onClick={() => setCannonFodder(v => !v)}
                className={[
                  'w-full text-left rounded-xl border px-4 py-3 transition active:scale-[0.99] flex items-start gap-3 backdrop-blur-sm',
                  cannonFodder
                    ? 'border-amber-500 bg-felt-800/95'
                    : 'border-gold-600/40 bg-felt-800/80 hover:bg-felt-800',
                ].join(' ')}
              >
                <div className={
                  'mt-1 w-5 h-5 rounded border shrink-0 flex items-center justify-center ' +
                  (cannonFodder ? 'bg-amber-500 border-amber-400 text-felt-900' : 'border-gold-600/60')
                }>
                  {cannonFodder ? '\u2713' : ''}
                </div>
                <div className="flex-1">
                  <div className="text-gold-100 font-semibold">Cannon Fodder ★</div>
                  <div className="text-gold-200/70 text-xs mt-1">
                    Each player gets a Joker. Playing a hand with a Joker reverses the stakes — if your opponent has the strongest hand they lose the whole game; if they have the weakest they win it.
                  </div>
                </div>
              </button>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={busy}>
              {busy ? 'Creating…' : 'Create Game'}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => { setMode(null); setError(null) }}>
              Back
            </Button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-3">
            <input
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
              placeholder="CODE"
              inputMode="text"
              autoCapitalize="characters"
              className="w-full text-center tracking-[0.6em] text-3xl font-display bg-felt-800 border border-gold-600/60 rounded-xl py-4 text-gold-100 placeholder-gold-600/40 focus:outline-none focus:ring-2 focus:ring-gold-400/60"
            />
            <Button className="w-full" onClick={handleJoin} disabled={busy || code.length !== 4}>
              {busy ? 'Joining…' : 'Join'}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => { setMode(null); setError(null) }}>
              Back
            </Button>
          </div>
        )}

        {error && <div className="mt-4 text-red-300">{error}</div>}
        </div>
      </div>

      <div
        className="absolute bottom-4 left-0 right-0 text-center z-10 text-gold-200/60 text-xs"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}
      >
        Tap a button to begin
      </div>
    </div>
  )
}
