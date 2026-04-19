import { useState } from 'react'
import InstructionsOverlay from './InstructionsOverlay.jsx'

// A circled lowercase "i" button that, when tapped, opens an instructions
// overlay. Content is passed in via children so each screen can supply its
// own context-appropriate instructions.
export default function InfoButton({ children, title = 'How to Play', size = 'md', className = '' }) {
  const [open, setOpen] = useState(false)
  const dims = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-11 h-11 text-base'
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={title}
        className={[
          'rounded-full border border-gold-500/60 text-gold-300 bg-felt-800/60',
          'hover:bg-felt-700 active:scale-95 transition shrink-0',
          'flex items-center justify-center font-serif italic font-semibold',
          dims,
          className,
        ].join(' ')}
      >
        i
      </button>
      {open && (
        <InstructionsOverlay title={title} onClose={() => setOpen(false)}>
          {children}
        </InstructionsOverlay>
      )}
    </>
  )
}
