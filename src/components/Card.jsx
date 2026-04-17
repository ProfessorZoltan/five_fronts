// Reusable playing card rendered as SVG-ish markup. No external assets so the
// app works offline and on slow connections.

const SUIT_GLYPH = {
  clubs: '\u2663',
  diamonds: '\u2666',
  hearts: '\u2665',
  spades: '\u2660',
}
const SUIT_COLOR = {
  clubs: 'text-slate-900',
  spades: 'text-slate-900',
  diamonds: 'text-red-600',
  hearts: 'text-red-600',
}

export function CardBack({ className = '', size = 'md' }) {
  const s = sizeClasses(size)
  return (
    <div
      className={
        'relative rounded-lg shadow-md border border-gold-600/60 ' +
        'bg-gradient-to-br from-felt-700 to-felt-900 ' +
        s.root + ' ' + className
      }
      aria-label="card back"
    >
      <div className="absolute inset-1 rounded-md border border-gold-500/40" />
      <div className="absolute inset-0 flex items-center justify-center font-display text-gold-400 select-none">
        <span className={s.backLabel}>5F</span>
      </div>
    </div>
  )
}

export function CardFace({ card, dimmed = false, highlighted = false, wasFaceDown = false, size = 'md', className = '' }) {
  const s = sizeClasses(size)
  const color = SUIT_COLOR[card.suit]
  return (
    <div
      className={[
        'relative rounded-lg shadow-md bg-[#fbf6e6] border',
        wasFaceDown ? 'border-felt-900 ring-2 ring-felt-900/70' : 'border-neutral-300',
        dimmed ? 'opacity-40' : '',
        highlighted ? 'ring-4 ring-emerald-400 shadow-emerald-400/40' : '',
        s.root,
        className,
      ].join(' ')}
    >
      <div className={`absolute top-0.5 left-1 leading-none ${color} ${s.corner} no-select`}>
        <div className="font-semibold">{card.rank}</div>
        <div>{SUIT_GLYPH[card.suit]}</div>
      </div>
      <div className={`absolute bottom-0.5 right-1 leading-none ${color} ${s.corner} no-select rotate-180`}>
        <div className="font-semibold">{card.rank}</div>
        <div>{SUIT_GLYPH[card.suit]}</div>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center ${color} ${s.center} no-select`}>
        {SUIT_GLYPH[card.suit]}
      </div>
      {wasFaceDown && (
        <div className="absolute top-0 left-0 right-0 flex justify-center">
          <div className="bg-felt-900 text-gold-400 text-[0.5rem] font-bold tracking-widest px-1.5 py-0.5 rounded-b-md shadow">
            HIDDEN
          </div>
        </div>
      )}
    </div>
  )
}

// A card slot — either empty, face-up, face-down, or hidden.
// Variants:
//   - card present + faceUp   -> CardFace
//   - card present + !faceUp  -> Face-down marker over the known card (setting phase)
//   - hidden (opponent's face-down during matching/reveal pre-flip) -> CardBack
//   - empty -> dashed slot
export function CardSlot({
  card,
  hidden = false,
  dimmed = false,
  highlighted = false,
  wasFaceDown = false,
  size = 'md',
  onClick,
  selected = false,
  className = '',
  label,
}) {
  const s = sizeClasses(size)
  const base =
    'relative rounded-lg select-none ' + s.root +
    (onClick ? ' cursor-pointer active:scale-[0.98] transition-transform' : '')

  if (!card && !hidden) {
    return (
      <div
        onClick={onClick}
        className={
          base + ' border-2 border-dashed border-gold-500/40 bg-felt-800/40 ' +
          (selected ? 'ring-2 ring-gold-400' : '') + ' ' + className
        }
      >
        {label && (
          <div className="absolute inset-0 flex items-center justify-center text-gold-400/60 text-xs">
            {label}
          </div>
        )}
      </div>
    )
  }

  if (hidden) {
    return (
      <div onClick={onClick} className={base + ' ' + (selected ? 'ring-2 ring-gold-400 rounded-lg' : '') + ' ' + className}>
        <CardBack size={size} />
      </div>
    )
  }

  // Card is present.
  if (card.faceUp === false) {
    // During setting phase we still know the card; show it under a "locked/face-down" treatment.
    return (
      <div onClick={onClick} className={base + ' ' + className}>
        <div className="absolute inset-0">
          <CardFace card={card} dimmed size={size} />
        </div>
        <div className="absolute inset-0 rounded-lg bg-felt-900/55 flex items-center justify-center">
          <div className="text-gold-400 text-xs font-semibold tracking-wider">FACE-DOWN</div>
        </div>
        {selected && <div className="absolute inset-0 rounded-lg ring-2 ring-gold-400 pointer-events-none" />}
      </div>
    )
  }

  return (
    <div onClick={onClick} className={base + ' ' + className}>
      <CardFace card={card} dimmed={dimmed} highlighted={highlighted} wasFaceDown={wasFaceDown} size={size} />
      {selected && <div className="absolute inset-0 rounded-lg ring-2 ring-gold-400 pointer-events-none" />}
    </div>
  )
}

// Flip-capable card: shows back until `revealed`, then flips to face.
export function FlipCard({ card, revealed, highlighted = false, dimmed = false, wasFaceDown = false, size = 'md', className = '' }) {
  const s = sizeClasses(size)
  return (
    <div className={'flip-scene ' + s.root + ' ' + className}>
      <div className={'flip-card w-full h-full ' + (revealed ? 'is-flipped' : '')}>
        <div className="flip-face front w-full h-full">
          <CardBack size={size} className="w-full h-full" />
        </div>
        <div className="flip-face back w-full h-full">
          <CardFace card={card} size={size} highlighted={highlighted} dimmed={dimmed} wasFaceDown={wasFaceDown} className="w-full h-full" />
        </div>
      </div>
    </div>
  )
}

function sizeClasses(size) {
  switch (size) {
    case 'xs':
      return { root: 'w-9 h-12', corner: 'text-[0.55rem]', center: 'text-base', backLabel: 'text-xs' }
    case 'sm':
      return { root: 'w-12 h-16', corner: 'text-[0.65rem]', center: 'text-xl', backLabel: 'text-sm' }
    case 'lg':
      return { root: 'w-20 h-28', corner: 'text-sm', center: 'text-4xl', backLabel: 'text-xl' }
    case 'md':
    default:
      return { root: 'w-14 h-20', corner: 'text-xs', center: 'text-2xl', backLabel: 'text-base' }
  }
}
