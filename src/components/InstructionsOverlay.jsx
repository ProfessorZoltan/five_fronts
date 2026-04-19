// Modal shell for any instructions content. Scrollable body, sticky header.
export default function InstructionsOverlay({ title = 'How to Play', children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-felt-800 border border-gold-600/60 rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-felt-800/95 backdrop-blur border-b border-gold-600/20 flex items-center justify-between px-4 py-3 z-10">
          <div className="text-gold-400 font-display text-xl">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gold-300 hover:text-gold-100 text-3xl leading-none w-9 h-9 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-5 text-gold-100/90 text-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
