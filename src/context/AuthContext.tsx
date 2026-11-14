'use client'

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type User = {
  id: string
  nombre: string
  rol: 'admin' | 'vendedor'
  username: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (usuarioOEmail: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, login: async () => null, logout: async () => {}, isAdmin: false
})

const noopSubscribe = () => () => {}

async function loadProfile(userId: string): Promise<User | null> {
  const { data } = await supabase
    .from('users')
    .select('id, nombre, rol, username')
    .eq('id', userId)
    .maybeSingle()
  return (data as User | null) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // false en el servidor y durante la hidratación → evita desajustes servidor/cliente
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    // Limpieza del sistema de sesión anterior
    try { localStorage.removeItem('tienda_user') } catch {}

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return
      if (session) {
        const profile = await loadProfile(session.user.id)
        if (!active) return
        if (profile) setUser(profile)
        else await supabase.auth.signOut()
      }
      setReady(true)
    })

    // Solo reaccionamos al cierre de sesión (expirada o desde otra pestaña).
    // El inicio de sesión lo maneja login().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null)
    })

    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const login = useCallback(async (usuarioOEmail: string, password: string): Promise<string | null> => {
    const { data: email, error: lookupError } = await supabase.rpc('email_for_login', { p_login: usuarioOEmail })
    if (lookupError) return 'Error de conexión: ' + lookupError.message
    if (!email) return 'Usuario o contraseña incorrectos'

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      return error?.status === 400 ? 'Usuario o contraseña incorrectos' : 'Error de conexión: ' + (error?.message ?? '')
    }

    const profile = await loadProfile(data.user.id)
    if (!profile) {
      await supabase.auth.signOut()
      return 'Tu usuario no tiene perfil en la tienda. Contacta al administrador.'
    }
    setUser(profile)
    return null
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading: !hydrated || !ready,
      login,
      logout,
      isAdmin: user?.rol === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
