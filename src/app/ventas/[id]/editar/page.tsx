'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type Product = { id: string; nombre: string; precio_venta: number }
type Customer = { id: string; nombre: string }
type Line = { product_id: string; nombre: string; cantidad: string; precio: string; orig: number | null; origDisplay: string }

const fmtDots = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const parseDots = (v: string) => parseInt(v.replace(/\./g, '')) || 0
// Si el precio no se tocó, se conserva el valor exacto original (sin perder decimales)
const precioDe = (l: { precio: string; orig: number | null; origDisplay: string }) =>
  l.orig !== null && l.precio === l.origDisplay ? l.orig : parseDots(l.precio)
const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function EditarVentaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [formaPago, setFormaPago] = useState<'Efectivo' | 'Fiado'>('Efectivo')
  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [newProduct, setNewProduct] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [prodRes, custRes, saleRes] = await Promise.all([
        supabase.from('products').select('id, nombre, precio_venta').order('nombre'),
        supabase.from('customers').select('id, nombre').order('nombre'),
        supabase.from('sales')
          .select('forma_pago, customer_id, sale_items(product_id, cantidad, precio_unitario, products(nombre))')
          .eq('id', id).maybeSingle(),
      ])
      setProducts(prodRes.data ?? [])
      setCustomers(custRes.data ?? [])
      if (prodRes.data?.[0]) setNewProduct(prodRes.data[0].id)
      if (!saleRes.data) {
        setNotFound(true)
      } else {
        setFormaPago(saleRes.data.forma_pago as 'Efectivo' | 'Fiado')
        setCustomerId(saleRes.data.customer_id ?? '')
        const items: any[] = saleRes.data.sale_items ?? []
        setLines(items.map((i) => {
          const display = fmtDots(String(Math.round(Number(i.precio_unitario))))
          return {
            product_id: i.product_id,
            nombre: i.products?.nombre ?? '',
            cantidad: String(i.cantidad),
            precio: display,
            orig: Number(i.precio_unitario),
            origDisplay: display,
          }
        }))
      }
      setLoading(false)
    }
    load()
  }, [id])

  function updateLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function addLine() {
    const p = products.find((x) => x.id === newProduct)
    if (!p) return
    if (lines.some((l) => l.product_id === p.id)) return alert('Ese producto ya está en la venta, edita su cantidad.')
    setLines([...lines, {
      product_id: p.id, nombre: p.nombre, cantidad: '1',
      precio: fmtDots(String(Math.round(Number(p.precio_venta)))), orig: null, origDisplay: '',
    }])
  }

  const total = lines.reduce((s, l) => s + (parseInt(l.cantidad) || 0) * precioDe(l), 0)

  async function handleSave() {
    if (formaPago === 'Fiado' && !customerId) return alert('Selecciona un cliente para una venta fiado')
    if (lines.length === 0) return alert('La venta debe tener al menos un producto')
    if (lines.some((l) => (parseInt(l.cantidad) || 0) <= 0 || precioDe(l) < 0))
      return alert('La cantidad debe ser mayor a 0')
    setSaving(true)

    // Una sola transacción en la base de datos: devuelve el stock anterior, aplica el nuevo
    // y valida que los abonos del cliente no superen su deuda. Si algo falla, no se cambia nada.
    const { error } = await supabase.rpc('update_sale', {
      p_id: id,
      p_forma_pago: formaPago,
      p_customer_id: customerId || null,
      p_items: lines.map((l) => ({
        product_id: l.product_id,
        cantidad: parseInt(l.cantidad) || 0,
        precio_unitario: precioDe(l),
      })),
    })

    setSaving(false)
    if (error) return alert('No se pudo guardar: ' + error.message)
    router.push('/ventas')
  }

  const inputClass = 'w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none'

  if (!isAdmin) return <p className="text-zinc-400">Solo el administrador puede editar ventas.</p>
  if (loading) return <p className="text-zinc-400">Cargando...</p>
  if (notFound) return <p className="text-zinc-400">La venta no existe. <a href="/ventas" className="text-blue-400 hover:underline">Volver a ventas</a></p>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">Editar Venta</h1>

      <div className="flex gap-3 mb-6">
        <button onClick={() => setFormaPago('Efectivo')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${formaPago === 'Efectivo' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
          Efectivo
        </button>
        <button onClick={() => setFormaPago('Fiado')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${formaPago === 'Fiado' ? 'bg-yellow-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
          Fiado
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm text-zinc-300 mb-1">
          Cliente {formaPago === 'Fiado'
            ? <span className="text-yellow-400">(obligatorio)</span>
            : <span className="text-zinc-500">(opcional)</span>}
        </label>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
          className={inputClass + (formaPago === 'Fiado' && !customerId ? ' border-yellow-600' : '')}>
          <option value="">{formaPago === 'Fiado' ? 'Selecciona un cliente...' : 'Sin cliente'}</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-4">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-zinc-400">
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium w-28">Cantidad</th>
              <th className="px-4 py-3 font-medium w-36">Precio Unit.</th>
              <th className="px-4 py-3 font-medium text-right">Subtotal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.product_id} className="border-b border-zinc-800">
                <td className="px-4 py-2 text-white">{l.nombre}</td>
                <td className="px-4 py-2">
                  <input type="text" inputMode="numeric" value={l.cantidad}
                    onChange={(e) => updateLine(i, { cantidad: e.target.value.replace(/\D/g, '') })}
                    className={inputClass + ' text-center'} />
                </td>
                <td className="px-4 py-2">
                  <input type="text" inputMode="numeric" value={l.precio}
                    onChange={(e) => updateLine(i, { precio: fmtDots(e.target.value) })}
                    className={inputClass} placeholder="0" />
                </td>
                <td className="px-4 py-2 text-right text-white font-medium">
                  {formatCOP((parseInt(l.cantidad) || 0) * precioDe(l))}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">Quitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center px-4 py-3 border-t border-zinc-700">
          <span className="text-zinc-400 font-medium">Total</span>
          <span className="text-xl font-bold text-white">{formatCOP(total)}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <select value={newProduct} onChange={(e) => setNewProduct(e.target.value)} className={inputClass}>
          {products.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {formatCOP(Number(p.precio_venta))}</option>)}
        </select>
        <button onClick={addLine} className="whitespace-nowrap bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-zinc-600">+ Agregar producto</button>
      </div>
      <p className="text-xs text-zinc-500 mb-6">Los productos que ya estaban conservan su precio original; los nuevos entran al precio actual. Puedes ajustar cualquier precio.</p>

      <div className="flex gap-3">
        <button onClick={() => router.push('/ventas')} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
