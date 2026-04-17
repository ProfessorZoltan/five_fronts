import { useEffect, useState } from 'react'
import { isConfigured, getPlayerId } from './firebase/client.js'
import { subscribeGame, getMySlot } from './firebase/game.js'
import HomeScreen from './screens/HomeScreen.jsx'
import LobbyScreen from './screens/LobbyScreen.jsx'
import SettingScreen from './screens/SettingScreen.jsx'
import MatchupScreen from './screens/MatchupScreen.jsx'
import ResultsScreen from './screens/ResultsScreen.jsx'
import AbandonedScreen from './screens/AbandonedScreen.jsx'
import ConfigMissingBanner from './components/ConfigMissingBanner.jsx'

// localStorage, not sessionStorage — the latter is evicted by iOS/Android
// when the tab is backgrounded (e.g. incoming phone call), which kicked
// players out mid-game. localStorage persists across tab eviction, browser
// kills, reboots, and PWA relaunches.
const SESSION_KEY = 'five_fronts_session'

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}
function saveSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* private mode, quota errors — ignore */ }
}

export default function App() {
  const [session, setSession] = useState(loadSession)
  const [game, setGame] = useState(null)
  const uid = getPlayerId()

  useEffect(() => { saveSession(session) }, [session])

  useEffect(() => {
    if (!session?.code || !isConfigured) { setGame(null); return }
    const unsub = subscribeGame(session.code, g => {
      setGame(g)
      if (!g) { setSession(null); return }
      const actualSlot = getMySlot(g, uid)
      if (!actualSlot) {
        // Our uid isn't a player in this game — don't squat on the session.
        setSession(null)
      } else if (actualSlot !== session.slot) {
        // Defensive: keep the stored slot in sync with the source of truth.
        setSession(s => s ? { ...s, slot: actualSlot } : s)
      }
    })
    return unsub
  }, [session?.code, uid, session?.slot])

  if (!isConfigured) {
    return <ConfigMissingBanner />
  }

  if (!session) {
    return <HomeScreen onEnter={setSession} />
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gold-400">
        <div className="animate-pulseSoft">Reconnecting…</div>
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
    case 'done':
      return <ResultsScreen code={session.code} game={game} slot={slot} onLeave={leave} />
    case 'abandoned':
      return <AbandonedScreen game={game} slot={slot} onLeave={leave} />
    default:
      return <div className="p-6 text-gold-400">Unknown game status: {game.status}</div>
  }
}
