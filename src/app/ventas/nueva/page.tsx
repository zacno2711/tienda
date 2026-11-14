'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type Product = { id: string; nombre: string; precio_venta: number; stock: number }
type Customer = { id: string; nombre: string }
type CartItem = { product_id: string; nombre: string; cantidad: number; precio_unitario: number; stock: number }

export default function NuevaVentaPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [formaPago, setFormaPago] = useState<'Efectivo' | 'Fiado'>('Efectivo')
  const [customerId, setCustomerId] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [prodRes, custRes] = await Promise.all([
        supabase.from('products').select('id, nombre, precio_venta, stock').order('nombre'),
        supabase.from('customers').select('id, nombre').order('nombre'),
      ])
      setProducts(prodRes.data ?? [])
      setCustomers(custRes.data ?? [])
      if (prodRes.data?.[0]) setSelectedProduct(prodRes.data[0].id)
      setLoading(false)
    }
    load()
  }, [])

  function addToCart() {
    const p = products.find((x) => x.id === selectedProduct)
    if (!p) return
    const qty = parseInt(cantidad) || 0
    if (qty <= 0) return alert('La cantidad debe ser mayor a 0')
    if (qty > p.stock) return alert(`Solo hay ${p.stock} en stock`)

    const existing = cart.findIndex((c) => c.product_id === p.id)
    if (existing >= 0) {
      const updated = [...cart]
      const newQty = updated[existing].cantidad + qty
      if (newQty > p.stock) return alert(`Solo hay ${p.stock} en stock (ya tienes ${updated[existing].cantidad} en el carrito)`)
      updated[existing].cantidad = newQty
      setCart(updated)
    } else {
      setCart([...cart, { product_id: p.id, nombre: p.nombre, cantidad: qty, precio_unitario: p.precio_venta, stock: p.stock }])
    }
    setCantidad('1')
  }

  function removeFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index))
  }

  const total = cart.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0)

  const formatCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

  async function handleSave() {
    if (cart.length === 0) return alert('Agrega al menos un producto')
    if (formaPago === 'Fiado' && !customerId) return alert('Selecciona un cliente para venta fiado')
    setSaving(true)

    // La venta se crea de forma atómica en la base de datos: toma los precios actuales,
    // descuenta el stock y valida permisos. Si algo falla, no se guarda nada.
    const { error } = await supabase.rpc('create_sale', {
      p_forma_pago: formaPago,
      p_customer_id: customerId || null,
      p_items: cart.map((i) => ({ product_id: i.product_id, cantidad: i.cantidad })),
    })

    setSaving(false)
    if (error) return alert('Error al registrar la venta: ' + error.message)
    router.push('/ventas')
  }

  const inputClass = "w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"

  if (loading) return <p className="text-zinc-400">Cargando...</p>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">Nueva Venta</h1>

      {/* Forma de pago */}
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

      {/* Cliente: opcional en efectivo, obligatorio en fiado */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-300 mb-1">
          Cliente {formaPago === 'Fiado'
            ? <span className="text-yellow-400">(obligatorio)</span>
            : <span className="text-zinc-500">(opcional)</span>}
        </label>
        {customers.length === 0 ? (
          <p className="text-zinc-400 text-sm">
            No hay clientes. <a href="/clientes" className="text-blue-400 hover:underline">Crea uno primero</a>
            {formaPago === 'Efectivo' && ' (o registra la venta sin cliente)'}.
          </p>
        ) : (
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
            className={inputClass + (formaPago === 'Fiado' && !customerId ? ' border-yellow-600' : '')}>
            <option value="">{formaPago === 'Fiado' ? 'Selecciona un cliente...' : 'Sin cliente'}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Agregar producto */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Agregar producto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm text-zinc-400 mb-1">Producto</label>
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className={inputClass}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} — {formatCOP(p.precio_venta)} (stock: {p.stock})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Cantidad</label>
            <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
              className={inputClass} placeholder="1" min="1" />
          </div>
        </div>
        <button onClick={addToCart} className="mt-3 bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-zinc-600">
          + Agregar al carrito
        </button>
      </div>

      {/* Carrito */}
      {cart.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                <th className="px-4 py-3 font-medium text-right">Precio</th>
                <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, i) => (
                <tr key={i} className="border-b border-zinc-800">
                  <td className="px-4 py-3 text-white">{item.nombre}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{item.cantidad}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{formatCOP(item.precio_unitario)}</td>
                  <td className="px-4 py-3 text-right font-medium text-white">{formatCOP(item.cantidad * item.precio_unitario)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-300">Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center px-4 py-3 border-t border-zinc-700 bg-zinc-900">
            <span className="text-zinc-400 font-medium">Total</span>
            <span className="text-xl font-bold text-white">{formatCOP(total)}</span>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3">
        <button onClick={() => router.push('/ventas')} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
        <button onClick={handleSave} disabled={saving || cart.length === 0}
          className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Guardando...' : 'Registrar Venta'}
        </button>
      </div>
    </div>
  )
}
