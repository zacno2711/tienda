'use client'

import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type Customer = { id: string; nombre: string; area: string | null; telefono: string | null; notas: string | null }

type History = { sales: any[]; payments: any[] }

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function ClientesPage() {
  const { isAdmin } = useAuth()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, History>>({})
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', area: '', telefono: '', notas: '' })

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('nombre')
    setCustomers(data ?? [])
    setLoading(false)
  }
  useEffect(() => { loadData() }, [])

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    setLoadingHistory(true)
    const [salesRes, payRes] = await Promise.all([
      supabase.from('sales')
        .select('id, fecha, forma_pago, total, sale_items(cantidad, precio_unitario, subtotal, products(nombre))')
        .eq('customer_id', id).order('fecha', { ascending: false }),
      supabase.from('payments').select('id, fecha, monto, metodo, notas').eq('customer_id', id).order('fecha', { ascending: false }),
    ])
    setHistory((h) => ({ ...h, [id]: { sales: salesRes.data ?? [], payments: payRes.data ?? [] } }))
    setLoadingHistory(false)
  }

  function openNew() { setForm({ nombre: '', area: '', telefono: '', notas: '' }); setEditingId(null); setShowForm(true) }
  function openEdit(c: Customer) { setForm({ nombre: c.nombre, area: c.area ?? '', telefono: c.telefono ?? '', notas: c.notas ?? '' }); setEditingId(c.id); setShowForm(true) }

  async function handleSave() {
    const data = { nombre: form.nombre.trim(), area: form.area.trim() || null, telefono: form.telefono.trim() || null, notas: form.notas.trim() || null }
    if (!data.nombre) return alert('El nombre es obligatorio')
    if (editingId) await supabase.from('customers').update(data).eq('id', editingId)
    else await supabase.from('customers').insert(data)
    setShowForm(false); loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) return alert('No se puede eliminar: el cliente tiene ventas o abonos registrados.')
    loadData()
  }

  const inputClass = "w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Nuevo Cliente</button>
      </div>
      {loading ? <p className="text-zinc-400">Cargando...</p> : customers.length === 0 ? <p className="text-zinc-400">No hay clientes registrados.</p> : (
        <div className="overflow-x-auto bg-zinc-900 rounded-xl border border-zinc-800">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr className="border-b border-zinc-700 text-left text-zinc-400 bg-zinc-900">
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3 font-medium">Nombre</th><th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 font-medium">Teléfono</th><th className="px-4 py-3 font-medium">Notas</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>{customers.map((c) => {
              const isOpen = expandedId === c.id
              const h = history[c.id]
              const totalComprado = (h?.sales ?? []).reduce((a, v) => a + Number(v.total), 0)
              const totalFiado = (h?.sales ?? []).filter((v) => v.forma_pago === 'Fiado').reduce((a, v) => a + Number(v.total), 0)
              const totalAbonado = (h?.payments ?? []).reduce((a, p) => a + Number(p.monto), 0)
              const deuda = totalFiado - totalAbonado
              return (
              <Fragment key={c.id}>
                <tr onClick={() => toggleExpand(c.id)} className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer">
                  <td className="px-4 py-3 text-zinc-500">{isOpen ? '▼' : '▶'}</td>
                  <td className="px-4 py-3 font-medium text-white">{c.nombre}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.area ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-300">{c.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{c.notas ?? '—'}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && <>
                      <button onClick={() => openEdit(c)} className="text-blue-400 hover:text-blue-300 mr-3">Editar</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300">Eliminar</button>
                    </>}
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={6} className="bg-zinc-800/50 px-8 py-4">
                      {loadingHistory && !h ? <p className="text-zinc-400 text-sm">Cargando historial...</p> : !h ? null : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div className="bg-zinc-900 rounded-lg p-3"><p className="text-zinc-400 text-xs">Total comprado</p><p className="text-white font-semibold">{formatCOP(totalComprado)}</p></div>
                            <div className="bg-zinc-900 rounded-lg p-3"><p className="text-zinc-400 text-xs">Total fiado</p><p className="text-yellow-400 font-semibold">{formatCOP(totalFiado)}</p></div>
                            <div className="bg-zinc-900 rounded-lg p-3"><p className="text-zinc-400 text-xs">Abonado</p><p className="text-green-400 font-semibold">{formatCOP(totalAbonado)}</p></div>
                            <div className="bg-zinc-900 rounded-lg p-3"><p className="text-zinc-400 text-xs">Debe</p><p className={"font-semibold " + (deuda > 0 ? 'text-red-400' : 'text-zinc-300')}>{formatCOP(deuda)}</p></div>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-400 mb-2 font-medium">COMPRAS ({h.sales.length})</p>
                            {h.sales.length === 0 ? <p className="text-zinc-500 text-sm">Sin compras registradas.</p> : (
                              <div className="space-y-2">
                                {h.sales.map((v) => (
                                  <div key={v.id} className="bg-zinc-900 rounded-lg px-4 py-2 text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="text-zinc-300">{new Date(v.fecha).toLocaleDateString('es-CO')}
                                        <span className={"ml-3 px-2 py-0.5 rounded text-xs font-medium " + (v.forma_pago === 'Efectivo' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400')}>{v.forma_pago}</span>
                                      </span>
                                      <span className="text-white font-medium">{formatCOP(Number(v.total))}</span>
                                    </div>
                                    <p className="text-zinc-500 text-xs mt-1">
                                      {(v.sale_items ?? []).map((i: any) => `${i.cantidad} × ${i.products?.nombre}`).join(', ')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {h.payments.length > 0 && (
                            <div>
                              <p className="text-xs text-zinc-400 mb-2 font-medium">ABONOS ({h.payments.length})</p>
                              <div className="space-y-2">
                                {h.payments.map((p) => (
                                  <div key={p.id} className="bg-zinc-900 rounded-lg px-4 py-2 text-sm flex items-center justify-between">
                                    <span className="text-zinc-300">{new Date(p.fecha).toLocaleDateString('es-CO')} <span className="text-zinc-500 ml-2">{p.metodo}{p.notas ? ` — ${p.notas}` : ''}</span></span>
                                    <span className="text-green-400 font-medium">{formatCOP(Number(p.monto))}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
              )
            })}</tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <div className="space-y-3">
              <div><label className="block text-sm text-zinc-300 mb-1">Nombre</label><input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-sm text-zinc-300 mb-1">Área / Departamento</label><input type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-sm text-zinc-300 mb-1">Teléfono</label><input type="text" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={inputClass} /></div>
              <div><label className="block text-sm text-zinc-300 mb-1">Notas</label><textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className={inputClass} rows={2} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{editingId ? 'Guardar' : 'Crear Cliente'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
