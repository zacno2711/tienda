'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type Category = { id: string; nombre: string }
type Product = {
  id: string; nombre: string; category_id: string; ultimo_costo: number
  margen: number | null; precio_venta: number; stock: number; estado: string
  categories?: { nombre: string }
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nombre: '', category_id: '', margen: '', precio_venta_manual: '' })
  const { isAdmin } = useAuth()

  async function loadData() {
    setLoading(true)
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*, categories(nombre)').order('nombre'),
      supabase.from('categories').select('*').order('nombre'),
    ])
    setProducts(prodRes.data ?? [])
    setCategories(catRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function openNew() {
    setForm({ nombre: '', category_id: categories[0]?.id ?? '', margen: '', precio_venta_manual: '' })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setForm({
      nombre: p.nombre, category_id: p.category_id,
      margen: p.margen !== null ? String(p.margen * 100) : '',
      precio_venta_manual: p.ultimo_costo > 0 ? '' : String(p.precio_venta),
    })
    setEditingId(p.id)
    setShowForm(true)
  }

  async function handleSave() {
    const nombre = form.nombre.trim()
    if (!nombre) return alert('El nombre es obligatorio')

    const margen = form.margen !== '' ? parseFloat(form.margen) / 100 : null
    const data: Record<string, unknown> = {
      nombre,
      category_id: form.category_id,
      margen,
    }

    if (editingId) {
      // Si edita, recalcular precio si tiene costo
      const existing = products.find(p => p.id === editingId)
      if (existing && existing.ultimo_costo > 0) {
        const m = margen ?? 0.20
        data.precio_venta = Math.round(existing.ultimo_costo * (1 + m))
      } else if (form.precio_venta_manual) {
        data.precio_venta = parseFloat(form.precio_venta_manual) || 0
      }
      await supabase.from('products').update(data).eq('id', editingId)
    } else {
      // Nuevo producto: sin costo, precio manual opcional
      data.ultimo_costo = 0
      data.precio_venta = parseFloat(form.precio_venta_manual) || 0
      data.stock = 0
      data.estado = 'SIN STOCK'
      await supabase.from('products').insert(data)
    }
    setShowForm(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    // Verificar si tiene ventas o compras asociadas
    const { count: salesCount } = await supabase.from('sale_items').select('*', { count: 'exact', head: true }).eq('product_id', id)
    const { count: purchasesCount } = await supabase.from('purchase_items').select('*', { count: 'exact', head: true }).eq('product_id', id)

    if ((salesCount ?? 0) > 0 || (purchasesCount ?? 0) > 0) {
      alert('No se puede eliminar: este producto tiene ventas o compras registradas.')
      return
    }

    // Eliminar historial de precios primero
    await supabase.from('product_prices').delete().eq('product_id', id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      alert('Error al eliminar: ' + error.message)
      return
    }
    loadData()
  }

  const filtered = products.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()))
  const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

  const inputClass = "w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Productos</h1>
        {isAdmin && <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Nuevo Producto</button>}
      </div>

      <input type="text" placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm mb-4 px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-900 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />

      {loading ? (
        <p className="text-zinc-400">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-zinc-400">No hay productos. ¡Agrega el primero!</p>
      ) : (
        <div className="overflow-x-auto bg-zinc-900 rounded-xl border border-zinc-800">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400 bg-zinc-900">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium text-right">Costo</th>
                <th className="px-4 py-3 font-medium text-right">Precio Venta</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-white">{p.nombre}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.categories?.nombre}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{p.ultimo_costo > 0 ? formatCOP(p.ultimo_costo) : <span className="text-zinc-500">Sin compras</span>}</td>
                  <td className="px-4 py-3 text-right font-medium text-white">{p.precio_venta > 0 ? formatCOP(p.precio_venta) : <span className="text-zinc-500">—</span>}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{p.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.estado === 'OK' ? 'bg-green-900/50 text-green-300' :
                      p.estado === 'STOCK BAJO' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-red-900/50 text-red-300'
                    }`}>{p.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && <><button onClick={() => openEdit(p)} className="text-blue-400 hover:text-blue-300 mr-3">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300">Eliminar</button></>}
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
            <h2 className="text-lg font-bold text-white mb-4">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Nombre</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={inputClass} placeholder="Ej: Colombina Fresa" />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Categoría</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className={inputClass}>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Margen % <span className="text-zinc-500">(vacío = 20% por defecto)</span></label>
                <input type="number" value={form.margen} onChange={(e) => setForm({ ...form, margen: e.target.value })}
                  className={inputClass} placeholder="20" />
              </div>
              {(!editingId || (editingId && products.find(p => p.id === editingId)?.ultimo_costo === 0)) && (
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">Precio venta manual ($) <span className="text-zinc-500">(opcional, se recalcula con la primera compra)</span></label>
                  <input type="number" value={form.precio_venta_manual} onChange={(e) => setForm({ ...form, precio_venta_manual: e.target.value })}
                    className={inputClass} placeholder="0" />
                </div>
              )}
              {editingId && (products.find(p => p.id === editingId)?.ultimo_costo ?? 0) > 0 && (
                <p className="text-xs text-zinc-400 bg-zinc-800 rounded-lg p-3">
                  El precio de venta se recalcula automáticamente desde el último costo de compra × (1 + margen).
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                {editingId ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
