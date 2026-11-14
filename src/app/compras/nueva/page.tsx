'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Product = { id: string; nombre: string; ultimo_costo: number; margen: number; stock: number }
type Supplier = { id: string; nombre: string }
type CartItem = { product_id: string; nombre: string; cantidad: number; precio_unitario: number }

function formatWithDots(value: string): string {
  const num = value.replace(/\D/g, '')
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function parseDots(value: string): number {
  return parseInt(value.replace(/\./g, '')) || 0
}

export default function NuevaCompraPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [precioDisplay, setPrecioDisplay] = useState('')
  const [saving, setSaving] = useState(false)
  const [modoTotal, setModoTotal] = useState(true)
  const [loading, setLoading] = useState(true)

  const precioUnitario = parseDots(precioDisplay)

  useEffect(() => {
    async function load() {
      const [prodRes, supRes] = await Promise.all([
        supabase.from('products').select('id, nombre, ultimo_costo, margen, stock').order('nombre'),
        supabase.from('suppliers').select('id, nombre').order('nombre'),
      ])
      setProducts(prodRes.data ?? [])
      setSuppliers(supRes.data ?? [])
      if (supRes.data?.[0]) setSupplierId(supRes.data[0].id)
      if (prodRes.data?.[0]) {
        setSelectedProduct(prodRes.data[0].id)
        setPrecioDisplay(formatWithDots(String(prodRes.data[0].ultimo_costo)))
      }
      setLoading(false)
    }
    load()
  }, [])

  function onProductChange(productId: string) {
    setSelectedProduct(productId)
    const p = products.find((x) => x.id === productId)
    if (p) setPrecioDisplay(formatWithDots(String(p.ultimo_costo)))
  }

  function handlePrecioChange(val: string) {
    setPrecioDisplay(formatWithDots(val))
  }

  function adjustPrecio(delta: number) {
    const newVal = Math.max(0, precioUnitario + delta)
    setPrecioDisplay(formatWithDots(String(newVal)))
  }

  function addToCart() {
    const p = products.find((x) => x.id === selectedProduct)
    if (!p) return
    const qty = parseInt(cantidad) || 0
    const finalPrecioUnit = modoTotal ? precioUnitario / qty : precioUnitario
    if (qty <= 0 || finalPrecioUnit <= 0) return alert("Cantidad y precio deben ser mayores a 0")

    const existing = cart.findIndex((c) => c.product_id === p.id)
    if (existing >= 0) {
      const updated = [...cart]
      updated[existing].cantidad += qty
      updated[existing].precio_unitario = finalPrecioUnit
      setCart(updated)
    } else {
      setCart([...cart, { product_id: p.id, nombre: p.nombre, cantidad: qty, precio_unitario: finalPrecioUnit }])
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
    if (!supplierId) return alert('Selecciona un proveedor')
    if (cart.length === 0) return alert('Agrega al menos un producto')
    setSaving(true)

    // La compra se crea de forma atómica en la base de datos. El stock, el último costo
    // y el precio de venta se actualizan solos (triggers).
    const { error } = await supabase.rpc('create_purchase', {
      p_supplier_id: supplierId,
      p_items: cart.map((i) => ({ product_id: i.product_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
    })

    setSaving(false)
    if (error) return alert('Error al registrar la compra: ' + error.message)
    router.push('/compras')
  }

  const inputClass = "w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"

  if (loading) return <p className="text-zinc-400">Cargando...</p>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">Nueva Compra</h1>

      {/* Proveedor */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-300 mb-1">Proveedor</label>
        {suppliers.length === 0 ? (
          <p className="text-zinc-400 text-sm">No hay proveedores. <a href="/proveedores" className="text-blue-400 hover:underline">Crea uno primero</a>.</p>
        ) : (
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Agregar producto */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Agregar producto</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="block text-sm text-zinc-400 mb-1">Producto</label>
            <select value={selectedProduct} onChange={(e) => onProductChange(e.target.value)} className={inputClass}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Cantidad</label>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setCantidad(String(Math.max(1, (parseInt(cantidad) || 1) - 1)))} className="px-2.5 py-2 bg-zinc-700 text-zinc-400 rounded-lg hover:bg-zinc-600 hover:text-zinc-200 text-sm font-bold">−</button>
              <input type="text" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))}
                className={inputClass + " text-center"} placeholder="1" />
              <button type="button" onClick={() => setCantidad(String((parseInt(cantidad) || 0) + 1))} className="px-2.5 py-2 bg-zinc-700 text-zinc-400 rounded-lg hover:bg-zinc-600 hover:text-zinc-200 text-sm font-bold">+</button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-zinc-400">Precio</label>
              <div className="flex bg-zinc-800 rounded-lg p-0.5 text-xs">
                <button type="button" onClick={() => setModoTotal(true)}
                  className={"px-2.5 py-1 rounded-md transition-colors " + (modoTotal ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-200")}>
                  Total
                </button>
                <button type="button" onClick={() => setModoTotal(false)}
                  className={"px-2.5 py-1 rounded-md transition-colors " + (!modoTotal ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-200")}>
                  Unitario
                </button>
              </div>
            </div>
            <input type="text" inputMode="numeric" value={precioDisplay}
              onChange={(e) => handlePrecioChange(e.target.value)}
              className={inputClass} placeholder="0" />
            {modoTotal && precioUnitario > 0 && (parseInt(cantidad) || 0) > 0 && (
              <p className="text-xs text-zinc-400 mt-1">= <span className="text-zinc-200 font-medium">{formatWithDots(String(Math.round(precioUnitario / (parseInt(cantidad) || 1))))}</span> c/u</p>
            )}
          </div>
        </div>
        <button onClick={addToCart} className="mt-3 bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-zinc-600">
          + Agregar al listado
        </button>
      </div>

      {/* Tabla del carrito */}
      {cart.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-200">
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                <th className="px-4 py-3 font-semibold text-right">Precio Unit.</th>
                <th className="px-4 py-3 font-semibold text-right">Subtotal</th>
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
        <button onClick={() => router.push('/compras')} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving || cart.length === 0}
          className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Guardando...' : 'Registrar Compra'}
        </button>
      </div>
    </div>
  )
}
