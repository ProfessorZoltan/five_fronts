import Button from '../components/Button.jsx'

// Shown to the remaining player when the other player leaves mid-game.
// (The leaver has already had their session cleared by LeaveButton and is
// back on the HomeScreen by the time this renders on the opponent's device.)
export default function AbandonedScreen({ game, slot, onLeave }) {
  const byMe = game.abandonedBy === slot
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="font-display text-3xl text-gold-400 mb-3">Game Ended</div>
        <div className="text-gold-100/90 mb-6">
          {byMe ? 'You left the game.' : 'Your opponent left the game.'}
        </div>
        <Button variant="primary" className="w-full" onClick={onLeave}>Back to Home</Button>
      </div>
    </div>
  )
}
