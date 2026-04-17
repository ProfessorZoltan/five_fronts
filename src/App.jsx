import { useEffect, useState } from 'react'
import { isConfigured, getPlayerId } from './firebase/client.js'
import { subscribeGame, getMySlot } from './firebase/game.js'
import HomeScreen from './screens/HomeScreen.jsx'
import LobbyScreen from './screens/LobbyScreen.jsx'
import SettingScreen from './screens/SettingScreen.jsx'
import MatchupScreen from './screens/MatchupScreen.jsx'
import RevealScreen from './screens/RevealScreen.jsx'
import ResultsScreen from './screens/ResultsScreen.jsx'
import ConfigMissingBanner from './components/ConfigMissingBanner.jsx'

const SESSION_KEY = 'five_fronts_session'

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}
function saveSession(s) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch { /* ignore */ }
}

export default function App() {
  // session: { code, slot } once a game is joined/created; null at home.
  const [session, setSession] = useState(loadSession)
  const [game, setGame] = useState(null)
  const uid = getPlayerId()

  useEffect(() => { saveSession(session) }, [session])

  useEffect(() => {
    if (!session?.code || !isConfigured) { setGame(null); return }
    const unsub = subscribeGame(session.code, g => {
      setGame(g)
      // If the game was deleted or our slot vanished, kick back to home.
      if (!g) { setSession(null); return }
      const mySlot = getMySlot(g, uid)
      if (!mySlot) { /* spectator / refresh-glitch; keep existing slot */ }
    })
    return unsub
  }, [session?.code, uid])

  if (!isConfigured) {
    return <ConfigMissingBanner />
  }

  if (!session) {
    return <HomeScreen onEnter={setSession} />
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gold-400">
        <div className="animate-pulseSoft">Connecting…</div>
      </div>
    )
  }

  const slot = session.slot
  const leave = () => setSession(null)

  switch (game.status) {
    case 'waiting':
      return <LobbyScreen code={session.code} game={game} slot={slot} onLeave={leave} />
    case 'setting':
      return <SettingScreen code={session.code} game={game} slot={slot} onLeave={leave} />
    case 'matching':
      return <MatchupScreen code={session.code} game={game} slot={slot} onLeave={leave} />
    case 'revealing':
      return <RevealScreen code={session.code} game={game} slot={slot} onLeave={leave} />
    case 'done':
      return <ResultsScreen code={session.code} game={game} slot={slot} onLeave={leave} />
    default:
      return <div className="p-6 text-gold-400">Unknown game status: {game.status}</div>
  }
}
