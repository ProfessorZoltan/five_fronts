import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Modal shell for instructions content. Portaled to document.body so ancestor
// stacking contexts (e.g. sticky headers with backdrop-blur, which create a
// containing block for fixed-position descendants) don't pin the overlay to
// the header strip instead of the viewport.
//
// Close interactions: the X button, the ESC key, or clicking/tapping the
// backdrop. Body scroll is locked while the overlay is open.
export default function InstructionsOverlay({ title = 'How to Play', children, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg max-h-[calc(100vh-2rem)] bg-felt-800 border border-gold-600/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold-600/20 shrink-0">
          <div className="text-gold-400 font-display text-xl">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gold-300 hover:text-gold-100 text-3xl leading-none w-9 h-9 flex items-center justify-center shrink-0 rounded-full hover:bg-felt-700 transition"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-5 text-gold-100/90 text-sm overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
