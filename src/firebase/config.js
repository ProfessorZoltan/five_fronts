// Firebase client config. Values come from Firebase Console -> Project Settings -> Your apps.
// All of these are public / shipped to the browser — no secrets here.
// Security is enforced by Realtime Database rules (see database.rules.json), not by hiding these.

export const firebaseConfig = {
  apiKey: 'AIzaSyDhdmyZnbe8yVaIdbzWy1b2n_R48fZqNVY',
  authDomain: 'five-fronts.firebaseapp.com',
  databaseURL: 'https://five-fronts-default-rtdb.firebaseio.com',
  projectId: 'five-fronts',
  storageBucket: 'five-fronts.firebasestorage.app',
  messagingSenderId: '329903214214',
  appId: '1:329903214214:web:299550b69bc48611e4cb07',
}

export const isConfigured = !Object.values(firebaseConfig).some(
  v => typeof v === 'string' && v.startsWith('REPLACE_ME')
)
