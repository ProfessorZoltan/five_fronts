// Firebase client config. Fill in via Firebase Console -> Project Settings -> Your apps.
// All of these values are public / shipped to the browser — no secrets here.
// Security is enforced by Realtime Database rules (see database.rules.json), not by hiding these.

export const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  databaseURL: 'https://REPLACE_ME.firebaseio.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
}

export const isConfigured = !Object.values(firebaseConfig).some(
  v => typeof v === 'string' && v.startsWith('REPLACE_ME')
)
