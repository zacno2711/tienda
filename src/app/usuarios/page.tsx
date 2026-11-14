'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type UserRow = { id: string; nombre: string; username: string; email: string; rol: string; created_at: string }
type FormState = { nombre: string; username: string; email: string; password: string; rol: string }

const emptyForm: FormState = { nombre: '', username: '', email: '', password: '', rol: 'vendedor' }

// Las altas, cambios y bajas de usuarios pasan por una Edge Function que verifica que quien llama es admin.
async function callAdmin(body: object): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    try {
      const j = await (error as any).context.json()
      return j.error ?? error.message
    } catch {
      return error.message
    }
  }
  return data?.error ?? null
}

export default function UsuariosPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('users').select('id, nombre, username, email, rol, created_at').order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  function openNew() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(u: UserRow) {
    setEditingId(u.id)
    setForm({ nombre: u.nombre, username: u.username, email: u.email, password: '', rol: u.rol })
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.username.trim() || !form.email.trim() || (!editingId && !form.password)) {
      setError('Completa todos los campos obligatorios')
      return
    }
    setSaving(true)
    setError('')
    const err = await callAdmin({
      action: editingId ? 'update' : 'create',
      id: editingId,
      nombre: form.nombre.trim(),
      username: form.username.trim().toLowerCase(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      rol: form.rol,
    })
    setSaving(false)
    if (err) { setError(err); return }
    setShowForm(false)
    loadUsers()
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`¿Eliminar al usuario ${u.nombre}?`)) return
    const err = await callAdmin({ action: 'delete', id: u.id })
    if (err) { alert(err); return }
    loadUsers()
  }

  const inputClass = "w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Usuarios</h1>
        <button onClick={openNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nuevo Usuario
        </button>
      </div>

      {loading ? <p className="text-zinc-400">Cargando...</p> : (
        <div className="overflow-x-auto bg-zinc-900 rounded-xl border border-zinc-800">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-white">
                    {u.nombre}{u.id === me?.id && <span className="ml-2 text-xs text-zinc-500">(tú)</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">@{u.username}</td>
                  <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.rol === 'admin' ? 'bg-blue-900/50 text-blue-300' : 'bg-zinc-700 text-zinc-300'
                    }`}>{u.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(u)} className="text-blue-400 hover:text-blue-300 text-sm mr-4">Editar</button>
                    {u.id !== me?.id && (
                      <button onClick={() => handleDelete(u)} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            {error && <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-2 mb-3">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Nombre completo</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={inputClass} placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Nombre de usuario</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                  <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '') })}
                    className={inputClass + " pl-7"} placeholder="juanperez" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass} placeholder="juan@email.com" />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">
                  Contraseña {editingId && <span className="text-zinc-500">(déjala vacía para no cambiarla)</span>}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClass} placeholder={editingId ? 'Sin cambios' : 'Mínimo 6 caracteres'} autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Rol</label>
                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className={inputClass}
                  disabled={editingId === me?.id}>
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
