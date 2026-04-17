export default function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  type = 'button',
}) {
  const base =
    'min-h-[44px] px-5 rounded-xl font-semibold tracking-wide transition ' +
    'active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gold-400/60 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 no-select'
  const variants = {
    primary: 'bg-gold-500 text-felt-900 hover:bg-gold-400',
    secondary: 'bg-felt-800 text-gold-300 border border-gold-600/60 hover:bg-felt-700',
    ghost: 'bg-transparent text-gold-300 hover:bg-felt-800',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}
