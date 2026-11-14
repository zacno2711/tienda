'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type Supplier = { id: string; nombre: string; telefono: string | null; direccion: string | null; notas: string | null }

export default function ProveedoresPage() {
  const { isAdmin } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', notas: '' })

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('nombre')
    setSuppliers(data ?? [])
    setLoading(false)
  }
  useEffect(() => { loadData() }, [])

  function openNew() { setForm({ nombre: '', telefono: '', direccion: '', notas: '' }); setEditingId(null); setShowForm(true) }
  function openEdit(s: Supplier) { setForm({ nombre: s.nombre, telefono: s.telefono ?? '', direccion: s.direccion ?? '', notas: s.notas ?? '' }); setEditingId(s.id); setShowForm(true) }

  async function handleSave() {
    const data = { nombre: form.nombre.trim(), telefono: form.telefono.trim() || null, direccion: form.direccion.trim() || null, notas: form.notas.trim() || null }
    if (!data.nombre) return alert('El nombre es obligatorio')
    if (editingId) await supabase.from('suppliers').update(data).eq('id', editingId)
    else await supabase.from('suppliers').insert(data)
    setShowForm(false); loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proveedor?')) return
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) return alert('No se puede eliminar: el proveedor tiene compras registradas.')
    loadData()
  }

  const inputClass = "w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Proveedores</h1>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Nuevo Proveedor</button>
      </div>
      {loading ? <p className="text-zinc-400">Cargando...</p> : suppliers.length === 0 ? <p className="text-zinc-400">No hay proveedores registrados.</p> : (
        <div className="overflow-x-auto bg-zinc-900 rounded-xl border border-zinc-800">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr className="border-b border-zinc-700 text-left text-zinc-400 bg-zinc-900">
              <th className="px-4 py-3 font-medium">Nombre</th><th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Dirección</th><th className="px-4 py-3 font-medium">Notas</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>{suppliers.map((s) => (
              <tr key={s.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                <td className="px-4 py-3 font-medium text-white">{s.nombre}</td>
                <td className="px-4 py-3 text-zinc-300">{s.telefono ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-400">{s.direccion ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{s.notas ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && <>
                    <button onClick={() => openEdit(s)} className="text-blue-400 hover:text-blue-300 mr-3">Editar</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300">Eliminar</button>
                  </>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            <div className="space-y-3">
              <div><label className="block text-sm text-zinc-300 mb-1">Nombre</label><input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-sm text-zinc-300 mb-1">Teléfono</label><input type="text" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-sm text-zinc-300 mb-1">Dirección</label><input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-sm text-zinc-300 mb-1">Notas</label><textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className={inputClass} rows={2} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{editingId ? 'Guardar' : 'Crear Proveedor'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
