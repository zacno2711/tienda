'use client'

import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function VentasPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { isAdmin } = useAuth()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('sales')
      .select('*, users(nombre), customers(nombre), sale_items(cantidad, precio_unitario, subtotal, products(nombre))')
      .order('fecha', { ascending: false }).limit(50)
    setSales(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta venta? Los productos vendidos volverán al stock.')) return
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (error) return alert('No se pudo eliminar: ' + error.message)
    load()
  }

  const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Ventas</h1>
        <a href="/ventas/nueva" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">+ Nueva Venta</a>
      </div>
      {loading ? <p className="text-zinc-400">Cargando...</p> : sales.length === 0 ? <p className="text-zinc-400">No hay ventas registradas.</p> : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium w-8"></th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Vendedor</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const items = s.sale_items ?? []
                const total = items.reduce((sum: number, i: any) => sum + Number(i.subtotal), 0)
                const isOpen = expandedId === s.id
                return (
                  <Fragment key={s.id}>
                    <tr onClick={() => setExpandedId(isOpen ? null : s.id)}
                      className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer">
                      <td className="px-4 py-3 text-zinc-500">{isOpen ? '▼' : '▶'}</td>
                      <td className="px-4 py-3 text-zinc-300">{new Date(s.fecha).toLocaleDateString('es-CO')}</td>
                      <td className="px-4 py-3 font-medium text-white">{s.users?.nombre}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.forma_pago === 'Efectivo' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                          {s.forma_pago === 'Efectivo' ? 'Efectivo' : 'Fiado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{s.customers?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-white">{formatCOP(total)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <a href={`/ventas/${s.id}/editar`} className="text-blue-400 hover:text-blue-300 text-sm mr-4">Editar</a>
                          <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
                        </td>
                      )}
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="bg-zinc-800/50 px-8 py-3">
                          <table className="w-full min-w-[36rem] text-sm">
                            <thead>
                              <tr className="text-zinc-400 text-xs">
                                <th className="text-left pb-2 font-medium">Producto</th>
                                <th className="text-right pb-2 font-medium">Cantidad</th>
                                <th className="text-right pb-2 font-medium">Precio Unit.</th>
                                <th className="text-right pb-2 font-medium">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item: any, i: number) => (
                                <tr key={i} className="border-t border-zinc-700/50">
                                  <td className="py-2 text-zinc-200">{item.products?.nombre}</td>
                                  <td className="py-2 text-right text-zinc-300">{item.cantidad}</td>
                                  <td className="py-2 text-right text-zinc-300">{formatCOP(item.precio_unitario)}</td>
                                  <td className="py-2 text-right text-white font-medium">{formatCOP(item.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
