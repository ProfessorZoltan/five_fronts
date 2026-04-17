// Firebase client initialization + a persistent local playerId.
import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { firebaseConfig, isConfigured } from './config.js'

let app = null
let db = null

export function getDb() {
  if (!isConfigured) {
    throw new Error('Firebase config is not set. Edit src/firebase/config.js.')
  }
  if (!app) {
    app = initializeApp(firebaseConfig)
    db = getDatabase(app)
  }
  return db
}

// A stable per-device id kept in localStorage. Used as the "auth" for which
// player slot (p1/p2) the current device occupies in a given game.
const LS_KEY = 'five_fronts_player_id'
export function getPlayerId() {
  let id = null
  try { id = localStorage.getItem(LS_KEY) } catch { /* private mode */ }
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    try { localStorage.setItem(LS_KEY, id) } catch { /* ignore */ }
  }
  return id
}

export { isConfigured }
