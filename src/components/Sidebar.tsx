'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Brand from '@/components/Brand'
import ThemeToggle from '@/components/ThemeToggle'
import Icon, { IconName } from '@/components/Icons'

const links: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Resumen', icon: 'resumen' },
  { href: '/productos', label: 'Productos', icon: 'productos' },
  { href: '/ventas', label: 'Ventas', icon: 'ventas' },
  { href: '/compras', label: 'Compras', icon: 'compras' },
  { href: '/clientes', label: 'Clientes', icon: 'clientes' },
  { href: '/proveedores', label: 'Proveedores', icon: 'proveedores' },
  { href: '/cartera', label: 'Cartera', icon: 'cartera' },
]
const adminLinks: typeof links = [
  { href: '/cierre', label: 'Cierre de caja', icon: 'cierre' },
  { href: '/usuarios', label: 'Usuarios', icon: 'usuarios' },
]

// Contenido del menú. `collapsed` solo aplica en computador (tira de íconos).
export default function Sidebar({ collapsed = false, onNavigate, onToggleCollapse }: {
  collapsed?: boolean
  onNavigate?: () => void
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()
  const all = isAdmin ? [...links, ...adminLinks] : links

  return (
    <div className="flex h-full flex-col text-on-brand">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {collapsed
          ? <Icon name="productos" className="size-8 text-candy-lemon" />
          : <Brand />}
      </div>

      <nav className="mt-8 flex-1 space-y-1 overflow-y-auto" aria-label="Principal">
        {all.map(l => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href} onClick={onNavigate} title={collapsed ? l.label : undefined}
              aria-label={collapsed ? l.label : undefined} aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-full py-2.5 text-[0.95rem] font-bold transition-colors ${
                collapsed ? 'justify-center px-0' : 'px-4'
              } ${active ? '-rotate-1 bg-candy-lemon text-ink' : 'text-white/85 hover:bg-white/15'}`}>
              <Icon name={l.icon} />
              {!collapsed && l.label}
            </Link>
          )
        })}
      </nav>

      <div className={`mt-4 border-t border-white/20 pt-4 ${collapsed ? 'flex flex-col items-center gap-3' : ''}`}>
        {collapsed ? (
          <ThemeToggle />
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user?.nombre}</p>
              <p className="text-xs text-white/70">{isAdmin ? 'Administrador' : 'Vendedor'}</p>
            </div>
            <ThemeToggle />
          </div>
        )}
        <button onClick={logout}
          className={`rounded-full bg-white/15 text-sm font-bold hover:bg-white/25 ${collapsed ? 'px-3 py-2' : 'mt-3 w-full py-2'}`}
          title="Salir" aria-label="Salir">
          {collapsed ? 'Salir' : 'Salir'}
        </button>
        {onToggleCollapse && (
          <button onClick={onToggleCollapse}
            className={`hidden items-center justify-center gap-2 rounded-full text-sm font-bold text-white/80 hover:bg-white/15 md:flex ${collapsed ? 'size-10' : 'mt-2 w-full py-2'}`}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'} title={collapsed ? 'Expandir menú' : 'Colapsar menú'}>
            <Icon name={collapsed ? 'expandir' : 'colapsar'} />
            {!collapsed && 'Colapsar'}
          </button>
        )}
      </div>
    </div>
  )
}
