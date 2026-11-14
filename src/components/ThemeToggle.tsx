'use client'

// Cambia entre tema claro y oscuro. El tema vive en <html data-theme>; el script del layout
// lo fija antes de pintar y aquí solo se alterna y se recuerda la elección en este navegador.
export default function ThemeToggle({ variant = 'brand', className = '' }: { variant?: 'brand' | 'plain'; className?: string }) {
  function toggle() {
    const root = document.documentElement
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    try { localStorage.setItem('tienda_theme', next) } catch {}
  }

  const look = variant === 'brand'
    ? 'bg-white/15 text-on-brand hover:bg-white/25'
    : 'bg-zinc-900 text-zinc-100 border border-zinc-700 hover:bg-zinc-800'

  return (
    <button type="button" onClick={toggle} aria-label="Cambiar entre tema claro y oscuro" title="Cambiar tema"
      className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors ${look} ${className}`}>
      <svg className="theme-moon size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
      <svg className="theme-sun size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  )
}
