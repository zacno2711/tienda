'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Brand from '@/components/Brand'
import PriceTag from '@/components/PriceTag'
import ThemeToggle from '@/components/ThemeToggle'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!usuario || !password) { setError('Completa todos los campos'); return }
    setLoading(true)
    setError('')
    const err = await login(usuario, password)
    if (err) { setError(err); setLoading(false) }
    else router.push('/')
  }

  const inputClass = "w-full px-5 py-3 border-2 border-zinc-700 rounded-full text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <ThemeToggle variant="plain" className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-5">
          <Brand size="lg" />
          <PriceTag className="text-lg">Entra a tu tienda</PriceTag>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-zinc-900 p-6" style={{ boxShadow: '0 6px 0 var(--z-700)' }}>
          {error && (
            <div role="alert" className="rounded-2xl bg-red-900 px-4 py-2 text-sm font-semibold text-red-300">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="usuario" className="mb-1 block text-sm font-bold text-zinc-300">Usuario o email</label>
            <input id="usuario" type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)}
              className={inputClass} placeholder="admin o tu@email.com" autoFocus />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-bold text-zinc-300">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className={inputClass} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 py-3 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
