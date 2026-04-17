import { useState } from 'react'
import Button from './Button.jsx'
import { leaveGame } from '../firebase/game.js'

// Reusable "Leave game" affordance with a confirmation modal.
// Fires the Firebase abandonment write in the background and immediately
// clears the local session so the leaver snaps back to the home screen.
// The remaining player's subscription picks up status: 'abandoned' and
// shows them an AbandonedScreen.
export default function LeaveButton({ code, slot, onLeave, label = 'Leave', markAbandoned = true }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  function confirm() {
    setBusy(true)
    if (markAbandoned && code && slot) {
      // Fire-and-forget; don't block navigation on the network round trip.
      leaveGame(code, slot).catch(() => {})
    }
    onLeave()
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>{label}</Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-felt-800 border border-gold-600/60 rounded-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-lg font-semibold text-gold-100 mb-2">Leave this game?</div>
            <div className="text-gold-200/80 text-sm mb-4">
              {markAbandoned
                ? 'You won\'t be able to rejoin. Your opponent will see that you left.'
                : 'Return to the home screen.'}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={confirm} disabled={busy}>
                {busy ? 'Leaving…' : 'Leave'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
