'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

type CashClosing = {
  id: string
  fecha: string
  ventas_efectivo: number
  ventas_fiado: number
  abonos_recibidos: number
  total_esperado: number
  total_contado: number | null
  diferencia: number | null
  notas: string | null
  created_at: string
}

export default function CierrePage() {
  const [closings, setClosings] = useState<CashClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState({ ventas_efectivo: 0, ventas_fiado: 0, abonos_recibidos: 0 })
  const [form, setForm] = useState({ total_contado: '', notas: '' })
  const { user } = useAuth()

  async function loadClosings() {
    setLoading(true)
    const { data } = await supabase.from('cash_closings').select('*').order('fecha', { ascending: false }).limit(30)
    setClosings(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadClosings() }, [])

  async function openNewClosing() {
    const today = new Date().toISOString().slice(0, 10)

    // Ventas de hoy en efectivo
    const { data: salesEfectivo } = await supabase
      .from('sales')
      .select('total')
      .eq('forma_pago', 'Efectivo')
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59')

    // Ventas de hoy fiado
    const { data: salesFiado } = await supabase
      .from('sales')
      .select('total')
      .eq('forma_pago', 'Fiado')
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59')

    // Abonos recibidos hoy
    const { data: payments } = await supabase
      .from('payments')
      .select('monto')
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59')

    const ventasEfectivo = (salesEfectivo ?? []).reduce((s, v) => s + Number(v.total), 0)
    const ventasFiado = (salesFiado ?? []).reduce((s, v) => s + Number(v.total), 0)
    const abonosRecibidos = (payments ?? []).reduce((s, p) => s + Number(p.monto), 0)

    setPreview({ ventas_efectivo: ventasEfectivo, ventas_fiado: ventasFiado, abonos_recibidos: abonosRecibidos })
    setForm({ total_contado: '', notas: '' })
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    const totalContado = parseFloat(form.total_contado) || 0
    const totalEsperado = preview.ventas_efectivo + preview.abonos_recibidos

    const userId = user!.id

    await supabase.from('cash_closings').insert({
      fecha: today,
      user_id: userId,
      ventas_efectivo: preview.ventas_efectivo,
      ventas_fiado: preview.ventas_fiado,
      abonos_recibidos: preview.abonos_recibidos,
      total_esperado: totalEsperado,
      total_contado: totalContado,
      diferencia: totalContado - totalEsperado,
      notas: form.notas.trim() || null,
    })

    setSaving(false)
    setShowForm(false)
    loadClosings()
  }

  const formatCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

  const inputClass = "w-full px-3 py-2 border border-zinc-700 rounded-lg text-sm bg-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"

  const totalEsperado = preview.ventas_efectivo + preview.abonos_recibidos
  const totalContado = parseFloat(form.total_contado) || 0
  const diferencia = form.total_contado ? totalContado - totalEsperado : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Cierre de Caja</h1>
        <button onClick={openNewClosing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nuevo Cierre
        </button>
      </div>

      {loading ? <p className="text-zinc-400">Cargando...</p> : closings.length === 0 ? (
        <p className="text-zinc-400">No hay cierres registrados.</p>
      ) : (
        <div className="overflow-x-auto bg-zinc-900 rounded-xl border border-zinc-800">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-right">Ventas Efectivo</th>
                <th className="px-4 py-3 font-medium text-right">Ventas Fiado</th>
                <th className="px-4 py-3 font-medium text-right">Abonos</th>
                <th className="px-4 py-3 font-medium text-right">Esperado</th>
                <th className="px-4 py-3 font-medium text-right">Contado</th>
                <th className="px-4 py-3 font-medium text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {closings.map((c) => (
                <tr key={c.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-4 py-3 text-white">{c.fecha}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{formatCOP(c.ventas_efectivo)}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{formatCOP(c.ventas_fiado)}</td>
                  <td className="px-4 py-3 text-right text-green-400">{formatCOP(c.abonos_recibidos)}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{formatCOP(c.total_esperado)}</td>
                  <td className="px-4 py-3 text-right text-white">{c.total_contado !== null ? formatCOP(c.total_contado) : '-'}</td>
                  <td className={`px-4 py-3 text-right font-medium ${c.diferencia !== null ? (c.diferencia === 0 ? 'text-green-400' : c.diferencia > 0 ? 'text-blue-400' : 'text-red-400') : 'text-zinc-500'}`}>
                    {c.diferencia !== null ? formatCOP(c.diferencia) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">Cierre de Caja — Hoy</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Ventas Efectivo</p>
                <p className="text-lg font-bold text-white">{formatCOP(preview.ventas_efectivo)}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Ventas Fiado</p>
                <p className="text-lg font-bold text-zinc-300">{formatCOP(preview.ventas_fiado)}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Abonos Recibidos</p>
                <p className="text-lg font-bold text-green-400">{formatCOP(preview.abonos_recibidos)}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-600">
                <p className="text-xs text-zinc-400">Total Esperado en Caja</p>
                <p className="text-lg font-bold text-blue-400">{formatCOP(totalEsperado)}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">¿Cuánto hay en la caja? ($)</label>
                <input type="number" value={form.total_contado} onChange={(e) => setForm({ ...form, total_contado: e.target.value })}
                  className={inputClass} placeholder="Ingrese el total contado" />
              </div>
              {diferencia !== null && (
                <div className={`p-3 rounded-lg text-sm font-medium ${diferencia === 0 ? 'bg-green-900/30 text-green-400' : diferencia > 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-red-900/30 text-red-400'}`}>
                  {diferencia === 0 ? '✓ Cuadra perfecto' : diferencia > 0 ? `↑ Sobrante: ${formatCOP(diferencia)}` : `↓ Faltante: ${formatCOP(Math.abs(diferencia))}`}
                </div>
              )}
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Notas (opcional)</label>
                <input type="text" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  className={inputClass} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.total_contado}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
