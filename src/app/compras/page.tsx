'use client'

import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { isAdmin } = useAuth()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('purchases')
      .select('*, suppliers(nombre), users(nombre), purchase_items(cantidad, precio_unitario, subtotal, products(nombre))')
      .order('fecha', { ascending: false }).limit(50)
    setPurchases(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta compra? Se descontará del stock la mercadería que ingresó y se recalculará el costo de los productos.')) return
    const { error } = await supabase.from('purchases').delete().eq('id', id)
    if (error) return alert('No se pudo eliminar: ' + error.message)
    load()
  }

  const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Compras</h1>
        <a href="/compras/nueva" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Nueva Compra</a>
      </div>
      {loading ? <p className="text-zinc-400">Cargando...</p> : purchases.length === 0 ? <p className="text-zinc-400">No hay compras registradas.</p> : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium w-8"></th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Registrado por</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const items = p.purchase_items ?? []
                const total = items.reduce((s: number, i: any) => s + Number(i.subtotal), 0)
                const isOpen = expandedId === p.id
                return (
                  <Fragment key={p.id}>
                    <tr onClick={() => setExpandedId(isOpen ? null : p.id)}
                      className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer">
                      <td className="px-4 py-3 text-zinc-500">{isOpen ? '▼' : '▶'}</td>
                      <td className="px-4 py-3 text-zinc-300">{new Date(p.fecha).toLocaleDateString('es-CO')}</td>
                      <td className="px-4 py-3 font-medium text-white">{p.suppliers?.nombre}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.users?.nombre}</td>
                      <td className="px-4 py-3 text-right font-medium text-white">{formatCOP(total)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <a href={`/compras/${p.id}/editar`} className="text-blue-400 hover:text-blue-300 text-sm mr-4">Editar</a>
                          <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
                        </td>
                      )}
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="bg-zinc-800/50 px-8 py-3">
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
