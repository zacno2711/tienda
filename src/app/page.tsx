'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import PriceTag from '@/components/PriceTag'

type Dia = { label: string; total: number; hoy: boolean }
type Deudor = { id: string; nombre: string; deuda: number }
type Bajo = { id: string; nombre: string; stock: number; estado: string }

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO')
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Resumen() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dias, setDias] = useState<Dia[]>([])
  const [hoy, setHoy] = useState(0)
  const [deudores, setDeudores] = useState<Deudor[]>([])
  const [bajos, setBajos] = useState<Bajo[]>([])

  useEffect(() => {
    async function load() {
      const desde = new Date()
      desde.setDate(desde.getDate() - 6)
      desde.setHours(0, 0, 0, 0)

      const [{ data: ventas }, { data: custs }, { data: fiados }, { data: pagos }, { data: prods }] = await Promise.all([
        supabase.from('sales').select('fecha, total').gte('fecha', desde.toISOString()),
        supabase.from('customers').select('id, nombre'),
        supabase.from('sales').select('customer_id, total').eq('forma_pago', 'Fiado'),
        supabase.from('payments').select('customer_id, monto'),
        supabase.from('products').select('id, nombre, stock, estado').neq('estado', 'OK').order('stock').limit(8),
      ])

      // últimos 7 días
      const porDia = new Map<string, number>()
      ;(ventas ?? []).forEach(v => {
        const k = localKey(new Date(v.fecha))
        porDia.set(k, (porDia.get(k) ?? 0) + Number(v.total))
      })
      const lista: Dia[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(desde)
        d.setDate(desde.getDate() + i)
        lista.push({ label: DIAS[d.getDay()], total: porDia.get(localKey(d)) ?? 0, hoy: i === 6 })
      }
      setDias(lista)
      setHoy(lista[6].total)

      // deudas por cliente
      const deuda = new Map<string, number>()
      ;(fiados ?? []).forEach(f => f.customer_id && deuda.set(f.customer_id, (deuda.get(f.customer_id) ?? 0) + Number(f.total)))
      ;(pagos ?? []).forEach(p => p.customer_id && deuda.set(p.customer_id, (deuda.get(p.customer_id) ?? 0) - Number(p.monto)))
      const nombres = new Map((custs ?? []).map(c => [c.id, c.nombre as string]))
      setDeudores(
        [...deuda.entries()]
          .filter(([, d]) => d > 0)
          .map(([id, d]) => ({ id, nombre: nombres.get(id) ?? 'Cliente', deuda: d }))
          .sort((a, b) => b.deuda - a.deuda)
      )
      setBajos((prods ?? []).map(p => ({ ...p, stock: Number(p.stock) })))
      setLoading(false)
    }
    load()
  }, [])

  const semana = dias.reduce((s, d) => s + d.total, 0)
  const max = Math.max(...dias.map(d => d.total), 1)
  const totalDeuda = deudores.reduce((s, d) => s + d.deuda, 0)
  const maxDeuda = Math.max(...deudores.map(d => d.deuda), 1)
  const primerNombre = user?.nombre.split(' ')[0] ?? ''

  if (loading) return <p className="text-zinc-400">Cargando...</p>

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-white">Hola, {primerNombre}</h1>
          <p className="mt-1 text-zinc-400">Así va la tienda esta semana.</p>
        </div>
        <PriceTag className="text-2xl">{cop(hoy)} hoy</PriceTag>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Ventas de la semana */}
        <section className="rounded-xl bg-zinc-900 p-6 lg:col-span-3" aria-labelledby="h-semana">
          <h2 id="h-semana" className="text-xl text-white">Ventas de los últimos 7 días</h2>
          <p className="text-3xl font-extrabold tracking-tight text-white mt-2">{cop(semana)}</p>
          <div className="mt-6 flex h-48 items-end gap-3" role="img" aria-label={`Ventas por día, total ${cop(semana)}`}>
            {dias.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${d.label}: ${cop(d.total)}`}>
                <span className="text-xs font-bold text-zinc-400">{d.total > 0 ? cop(d.total) : ''}</span>
                <div className={`w-full rounded-t-2xl ${d.hoy ? 'bg-candy-pink' : 'bg-candy-blue'}`}
                  style={{ height: `${Math.max((d.total / max) * 100, d.total > 0 ? 4 : 1)}%`, opacity: d.total > 0 ? 1 : 0.25 }} />
                <span className={`text-xs font-bold ${d.hoy ? 'text-candy-pink' : 'text-zinc-400'}`}>{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Nos deben */}
        <section className="flex flex-col items-center rounded-t-full rounded-b-xl bg-candy-pink px-6 pb-6 pt-14 text-center text-ink lg:col-span-2" aria-labelledby="h-deben">
          <h2 id="h-deben" className="text-lg">Nos deben</h2>
          <p className="mt-1 text-4xl font-extrabold tracking-tight">{cop(totalDeuda)}</p>
          <p className="mt-1 text-sm font-semibold">{deudores.length} {deudores.length === 1 ? 'cliente' : 'clientes'} con fiado</p>
          <Link href="/cartera" className="mt-auto rounded-full bg-ink px-5 py-2 text-sm font-bold text-white">Ver cartera</Link>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quién debe */}
        <section className="rounded-xl bg-zinc-900 p-6" aria-labelledby="h-quien">
          <h2 id="h-quien" className="mb-4 text-xl text-white">Quién debe</h2>
          {deudores.length === 0 ? (
            <p className="text-zinc-400">Nadie debe nada. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {deudores.slice(0, 6).map(d => (
                <li key={d.id} className="relative overflow-hidden rounded-full bg-zinc-800 px-4 py-2.5">
                  <span className="absolute inset-y-0 left-0 bg-candy-pink/30" style={{ width: `${(d.deuda / maxDeuda) * 100}%` }} aria-hidden="true" />
                  <span className="relative flex justify-between gap-3 text-sm font-bold text-white">
                    <span className="truncate">{d.nombre}</span><span>{cop(d.deuda)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Por reponer */}
        <section className="rounded-xl bg-zinc-900 p-6" aria-labelledby="h-reponer">
          <h2 id="h-reponer" className="mb-4 text-xl text-white">Por reponer</h2>
          {bajos.length === 0 ? (
            <p className="text-zinc-400">Todo el inventario está bien surtido.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {bajos.map(p => (
                <li key={p.id} className="rounded-2xl bg-zinc-800 p-3 text-center">
                  <p className={`text-3xl font-extrabold ${p.stock === 0 ? 'text-red-400' : 'text-yellow-400'}`}>{p.stock}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-white">{p.nombre}</p>
                  <p className="mt-1 text-[0.7rem] font-bold text-zinc-400">{p.estado}</p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/compras/nueva" className="mt-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white">Registrar compra</Link>
        </section>
      </div>
    </div>
  )
}
