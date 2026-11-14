'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CustomerDebt = {
  id: string
  nombre: string
  total_fiado: number
  total_pagado: number
  deuda: number
}

export default function CarteraPage() {
  const [debts, setDebts] = useState<CustomerDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebt | null>(null)
  const [payForm, setPayForm] = useState({ monto: '', metodo: 'Efectivo', notas: '' })
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)

    // Obtener clientes con ventas fiado
    const { data: customers } = await supabase.from('customers').select('id, nombre')
    if (!customers) { setLoading(false); return }

    const result: CustomerDebt[] = []
    for (const c of customers) {
      const { data: sales } = await supabase.from('sales').select('total').eq('customer_id', c.id).eq('forma_pago', 'Fiado')
      const { data: payments } = await supabase.from('payments').select('monto').eq('customer_id', c.id)

      const totalFiado = (sales ?? []).reduce((s, v) => s + Number(v.total), 0)
      const totalPagado = (payments ?? []).reduce((s, p) => s + Number(p.monto), 0)
      const deuda = totalFiado - totalPagado

      if (totalFiado > 0) {
        result.push({ id: c.id, nombre: c.nombre, total_fiado: totalFiado, total_pagado: totalPagado, deuda })
      }
    }
    setDebts(result.sort((a, b) => b.deuda - a.deuda))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function openPayment(customer: CustomerDebt) {
    setSelectedCustomer(customer)
    setPayForm({ monto: '', metodo: 'Efectivo', notas: '' })
    setShowPayment(true)
  }

  async function handlePayment() {
    if (!selectedCustomer) return
    const monto = parseFloat(payForm.monto) || 0
    if (monto <= 0) return alert('El monto debe ser mayor a 0')
    if (monto > selectedCustomer.deuda) return alert('El monto supera la deuda')
    setSaving(true)

    const { error } = await supabase.rpc('register_payment', {
      p_customer_id: selectedCustomer.id,
      p_monto: monto,
      p_metodo: payForm.metodo,
      p_notas: payForm.notas.trim() || null,
    })
    if (error) {
      setSaving(false)
      return alert('No se pudo registrar el abono: ' + error.message)
    }

    setSaving(false)
    setShowPayment(false)
    loadData()
  }

  const formatCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

  const inputClass = "w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"

  const totalDeuda = debts.reduce((s, d) => s + d.deuda, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Cartera</h1>
        {totalDeuda > 0 && (
          <div className="text-right">
            <p className="text-sm text-zinc-400">Deuda total</p>
            <p className="text-xl font-bold text-red-400">{formatCOP(totalDeuda)}</p>
          </div>
        )}
      </div>

      {loading ? <p className="text-zinc-400">Cargando...</p> : debts.length === 0 ? (
        <p className="text-zinc-400">No hay deudas pendientes.</p>
      ) : (
        <div className="overflow-x-auto bg-zinc-900 rounded-xl border border-zinc-800">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium text-right">Total Fiado</th>
                <th className="px-4 py-3 font-medium text-right">Abonado</th>
                <th className="px-4 py-3 font-medium text-right">Debe</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {debts.map((d) => (
                <tr key={d.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-white">{d.nombre}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{formatCOP(d.total_fiado)}</td>
                  <td className="px-4 py-3 text-right text-green-400">{formatCOP(d.total_pagado)}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-400">{formatCOP(d.deuda)}</td>
                  <td className="px-4 py-3 text-right">
                    {d.deuda > 0 && (
                      <button onClick={() => openPayment(d)} className="text-blue-400 hover:text-blue-300">Registrar Abono</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPayment && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-2">Registrar Abono</h2>
            <p className="text-sm text-zinc-400 mb-4">{selectedCustomer.nombre} — Debe: <span className="text-red-400">{formatCOP(selectedCustomer.deuda)}</span></p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Monto ($)</label>
                <input type="number" value={payForm.monto} onChange={(e) => setPayForm({ ...payForm, monto: e.target.value })}
                  className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Método de pago</label>
                <select value={payForm.metodo} onChange={(e) => setPayForm({ ...payForm, metodo: e.target.value })} className={inputClass}>
                  <option>Efectivo</option>
                  <option>Nequi</option>
                  <option>Daviplata</option>
                  <option>Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Notas (opcional)</label>
                <input type="text" value={payForm.notas} onChange={(e) => setPayForm({ ...payForm, notas: e.target.value })}
                  className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowPayment(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
              <button onClick={handlePayment} disabled={saving}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                {saving ? 'Guardando...' : 'Registrar Abono'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
