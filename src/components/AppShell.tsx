'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Brand from '@/components/Brand'
import ThemeToggle from '@/components/ThemeToggle'
import Icon from '@/components/Icons'

// Estructura de la app: sidebar colapsable en computador, barra superior + menú desplegable en celular.
// Solo se monta con sesión iniciada (en el cliente), por eso puede leer localStorage al iniciar.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('tienda_sidebar') === 'collapsed' } catch { return false }
  })
  const [open, setOpen] = useState(false)

  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('tienda_sidebar', next ? 'collapsed' : 'expanded') } catch {}
      return next
    })
  }

  // Cierra el menú del celular al cambiar de página o con Escape
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-on-brand md:hidden">
        <Brand className="[&_svg]:size-8 [&_span]:text-base [&_span]:leading-tight" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open}
            className="grid size-10 place-items-center rounded-full bg-white/15 hover:bg-white/25">
            <Icon name="menu" />
          </button>
        </div>
      </header>

      {/* Sidebar (computador) */}
      <aside className={`sticky top-0 m-3 hidden h-[calc(100vh-1.5rem)] shrink-0 rounded-[2rem] bg-sidebar p-5 transition-[width] duration-200 md:block ${collapsed ? 'w-[5.25rem] px-3' : 'w-60'}`}>
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {/* Menú desplegable (celular) */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Cerrar menú" />
          <aside className="absolute inset-y-0 left-0 m-3 w-72 max-w-[85vw] rounded-[2rem] bg-sidebar p-5">
            <button onClick={() => setOpen(false)} aria-label="Cerrar menú"
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/15 text-on-brand hover:bg-white/25">
              <Icon name="cerrar" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  )
}
