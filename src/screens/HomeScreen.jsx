import { useState } from 'react'
import Button from '../components/Button.jsx'
import { createGame, joinGame } from '../firebase/game.js'

export default function HomeScreen({ onEnter }) {
  const [mode, setMode] = useState(null) // null | 'join'
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate() {
    setBusy(true); setError(null)
    try {
      const session = await createGame()
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-5xl text-gold-400 drop-shadow mb-1">Five Fronts</h1>
        <p className="text-gold-200/70 mb-10 tracking-wider">a poker hand duel</p>

        {mode === null && (
          <div className="space-y-3">
            <Button className="w-full" onClick={handleCreate} disabled={busy}>
              {busy ? 'Creating…' : 'Create Game'}
            </Button>
            <Button className="w-full" variant="secondary" onClick={() => setMode('join')} disabled={busy}>
              Join Game
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

      <div className="absolute bottom-4 text-gold-200/30 text-xs">Tap a button to begin</div>
    </div>
  )
}
