export default function ConfigMissingBanner() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md bg-felt-800 border border-gold-600 rounded-2xl p-6 text-center space-y-3">
        <h1 className="font-display text-3xl text-gold-400">Five Fronts</h1>
        <p className="text-gold-100/90">
          Firebase is not configured yet. Edit <code className="text-gold-400">src/firebase/config.js</code>
          &nbsp;and fill in the values from your Firebase project.
        </p>
        <p className="text-gold-100/60 text-sm">
          Realtime Database must be enabled. Security rules template is in
          <code className="text-gold-400"> database.rules.json</code>.
        </p>
      </div>
    </div>
  )
}
