// Marca de la tienda: caramelo envuelto + nombre.
export default function Brand({ size = 'md', className = '' }: { size?: 'md' | 'lg'; className?: string }) {
  const icon = size === 'lg' ? 'size-14' : 'size-10'
  const text = size === 'lg' ? 'text-3xl' : 'text-xl'
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg className={`${icon} shrink-0`} viewBox="0 0 48 48" aria-hidden="true">
        <path d="M4 14l10 6v8L4 34z" fill="#FFD93B" />
        <path d="M44 14l-10 6v8l10 6z" fill="#FFD93B" />
        <circle cx="24" cy="24" r="13" fill="#FF4F9A" />
        <path d="M17 16c4 2 10 8 14 15" stroke="#fff" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>
      <span className={`font-extrabold leading-none tracking-tight ${text}`}>
        Tienda de<br />Dulces
      </span>
    </div>
  )
}
