import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Modal shell for instructions content. Portaled to document.body so ancestor
// stacking contexts (e.g. sticky headers with backdrop-blur, which create a
// containing block for fixed-position descendants) don't pin the overlay to
// the header strip instead of the viewport.
//
// Mobile quirks handled:
//   - `100dvh` for height (dynamic viewport; `100vh` can be taller than the
//     visible area when the browser's address bar is shown on iOS/Android).
//     A `100vh` fallback stays on the class for old browsers.
//   - `flex-1 min-h-0` on the scrollable body so it actually scrolls inside
//     the max-height box rather than collapsing or clipping.
//   - Lock scroll on both <html> and <body> — some iOS versions ignore
//     body-only overflow locking.
//
// Close interactions: the X button, the ESC key, or clicking/tapping the
// backdrop.
export default function InstructionsOverlay({ title = 'How to Play', children, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="m-4 w-full max-w-lg max-h-[calc(100vh-2rem)] bg-felt-800 border border-gold-600/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100dvh - 2rem)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gold-600/20">
          <div className="text-gold-400 font-display text-xl">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gold-300 hover:text-gold-100 text-3xl leading-none w-9 h-9 flex items-center justify-center shrink-0 rounded-full hover:bg-felt-700 transition"
          >
            ×
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 text-gold-100/90 text-sm">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
