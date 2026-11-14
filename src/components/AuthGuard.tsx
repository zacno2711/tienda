'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/AppShell'
import LoginPage from '@/app/login/page'

const ADMIN_ONLY_ROUTES = ['/cierre', '/usuarios']
const ADMIN_ONLY_ACTIONS = ['edit', 'delete'] // usado en componentes individuales

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth()
  const pathname = usePathname()

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Cargando...</p>
      </div>
    )
  }

  // Sin usuario → login
  if (!user) {
    return <LoginPage />
  }

  // Ruta solo admin
  if (ADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r)) && !isAdmin) {
    return (
      <AppShell>
          <div className="bg-red-900 rounded-xl p-6 max-w-md">
            <h2 className="text-lg font-bold text-red-300 mb-2">Acceso restringido</h2>
            <p className="text-zinc-400 text-sm">No tienes permisos para acceder a esta sección. Contacta al administrador.</p>
          </div>
        </AppShell>
    )
  }

  // Login page cuando ya está logueado → redirigir al dashboard
  if (pathname === '/login') {
    return (
      <AppShell>{children}</AppShell>
    )
  }

  return (
    <AppShell>{children}</AppShell>
  )
}

export { ADMIN_ONLY_ACTIONS }
