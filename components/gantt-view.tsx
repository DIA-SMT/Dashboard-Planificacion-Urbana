'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Project, EjeTematico, Hito, avancePctFromHitos } from '@/types'
import { ESTADO_DOT, formatDate } from '@/lib/project-ui'
import { useRefreshOnFocus } from '@/lib/use-refresh-on-focus'
import { withTimeout } from '@/lib/with-timeout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { EstadoProyecto } from '@/types'

type Row = Project & {
    eje_tematico: EjeTematico | null
    avance: number
}

type Scale = 'day' | 'week' | 'month'

const PX_PER_UNIT: Record<Scale, number> = {
    day: 36,
    week: 28,
    month: 110,
}

function startOfDay(d: Date) {
    const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}

function diffDays(a: Date, b: Date) {
    return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000)
}

function addDays(d: Date, n: number) {
    const x = new Date(d); x.setDate(x.getDate() + n); return x
}

function parseDate(s: string | null): Date | null {
    if (!s) return null
    return new Date(s + 'T00:00:00')
}

export function GanttView() {
    const router = useRouter()
    const [rows, setRows] = useState<Row[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [scale, setScale] = useState<Scale>('month')
    const scrollRef = useRef<HTMLDivElement>(null)

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        setError(null)
        try {
            const [{ data: projects }, { data: hitos }] = await withTimeout(
                Promise.all([
                    supabase
                        .from('projects')
                        .select('*, eje_tematico:eje_tematico_id(*)')
                        .order('fecha_inicio', { ascending: true, nullsFirst: false }),
                    supabase.from('hitos').select('project_id, estado'),
                ]),
                10000,
                'cronograma'
            )

            const hitosByProject = new Map<string, Pick<Hito, 'estado'>[]>()
            ;(hitos || []).forEach((h: any) => {
                const list = hitosByProject.get(h.project_id) || []
                list.push({ estado: h.estado })
                hitosByProject.set(h.project_id, list)
            })

            setRows((projects || []).map((p: any) => ({
                ...p,
                avance: avancePctFromHitos(hitosByProject.get(p.id) || []),
            })))
        } catch (err) {
            console.error('Error fetching cronograma:', err)
            setError((err as Error).message ?? String(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])
    useRefreshOnFocus(useCallback(() => { fetchAll(true) }, [fetchAll]))

    // Calcular rango de fechas global
    const { rangeStart, rangeEnd, today } = useMemo(() => {
        const today = startOfDay(new Date())
        let min = addDays(today, -15)
        let max = addDays(today, 60)
        for (const r of rows) {
            const ini = parseDate(r.fecha_inicio)
            const fin = parseDate(r.deadline)
            if (ini && ini < min) min = ini
            if (fin && fin > max) max = fin
            if (ini && !fin && ini > max) max = addDays(ini, 30)
        }
        // padding
        min = addDays(min, -7)
        max = addDays(max, 14)
        return { rangeStart: min, rangeEnd: max, today }
    }, [rows])

    const totalDays = diffDays(rangeStart, rangeEnd)
    const pxPerDay = PX_PER_UNIT[scale] / (scale === 'week' ? 7 : scale === 'month' ? 30 : 1)
    const totalWidth = totalDays * pxPerDay

    const headerCells = useMemo(() => {
        const cells: { label: string; left: number; width: number; major?: boolean }[] = []
        if (scale === 'day') {
            for (let i = 0; i < totalDays; i++) {
                const d = addDays(rangeStart, i)
                cells.push({
                    label: `${d.getDate()}`,
                    left: i * pxPerDay,
                    width: pxPerDay,
                    major: d.getDay() === 1,
                })
            }
        } else if (scale === 'week') {
            // alinear al lunes
            const cursor = new Date(rangeStart)
            while (cursor.getDay() !== 1) cursor.setDate(cursor.getDate() - 1)
            let i = 0
            while (addDays(cursor, i * 7) < rangeEnd) {
                const d = addDays(cursor, i * 7)
                const offset = diffDays(rangeStart, d)
                cells.push({
                    label: `${d.getDate()}/${d.getMonth() + 1}`,
                    left: offset * pxPerDay,
                    width: 7 * pxPerDay,
                    major: d.getDate() <= 7,
                })
                i++
            }
        } else {
            // month
            const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
            while (cursor < rangeEnd) {
                const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                const offset = diffDays(rangeStart, cursor)
                const days = diffDays(cursor, next)
                cells.push({
                    label: cursor.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
                    left: offset * pxPerDay,
                    width: days * pxPerDay,
                    major: cursor.getMonth() === 0,
                })
                cursor.setMonth(cursor.getMonth() + 1)
            }
        }
        return cells
    }, [scale, rangeStart, rangeEnd, totalDays, pxPerDay])

    const todayLeft = diffDays(rangeStart, today) * pxPerDay
    const ROW_H = 56
    const HEADER_H = 56
    const BAR_H = 30
    const SIDEBAR_W = 340

    // Scroll a hoy al cargar
    useEffect(() => {
        if (loading || !scrollRef.current) return
        scrollRef.current.scrollLeft = Math.max(0, todayLeft - 200)
    }, [loading, todayLeft])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-[1600px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Cronograma</h1>
                        <p className="text-slate-600 text-sm">Línea de tiempo de los proyectos</p>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1">
                        {(['day', 'week', 'month'] as Scale[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setScale(s)}
                                className={`px-3 py-1 text-sm rounded ${scale === s ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                {s === 'day' ? 'Día' : s === 'week' ? 'Semana' : 'Mes'}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between gap-3">
                        <div className="flex-1">
                            <div className="font-semibold text-red-800 text-sm">No se pudo cargar el cronograma</div>
                            <div className="text-xs text-red-700 mt-0.5">{error}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fetchAll()}>Reintentar</Button>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-3">
                        <div className="bg-white rounded-lg border p-4 flex gap-2 flex-wrap">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-8 w-48" />
                            ))}
                        </div>
                        <div className="bg-white rounded-lg border p-4 space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center text-slate-500">
                        No hay proyectos para mostrar
                    </div>
                ) : (
                    <>
                    {/* Leyenda de proyectos */}
                    <div className="bg-white rounded-lg border shadow-sm mb-4 p-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-2.5">Proyectos</div>
                        <div className="flex flex-wrap gap-2">
                            {rows.map(r => {
                                const color = r.eje_tematico?.color || '#3b82f6'
                                return (
                                    <button
                                        key={r.id}
                                        onClick={() => router.push(`/projects/${r.id}`)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white hover:bg-slate-50 transition text-sm"
                                        style={{ borderColor: color + '60' }}
                                        title={r.eje_tematico?.nombre || 'Sin eje'}
                                    >
                                        <span
                                            className="w-3.5 h-3.5 rounded-sm shrink-0"
                                            style={{ background: color }}
                                        />
                                        <span className="font-medium text-slate-800">{r.nombre}</span>
                                        {r.codigo && (
                                            <span className="font-mono text-xs text-slate-400">{r.codigo}</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <div className="flex">
                            {/* Timeline scrollable */}
                            <div className="flex-1 overflow-x-auto" ref={scrollRef}>
                                <div className="relative" style={{ width: totalWidth }}>
                                    {/* Header */}
                                    <div
                                        className="border-b border-slate-200 bg-slate-50 relative"
                                        style={{ height: HEADER_H }}
                                    >
                                        {headerCells.map((c, i) => (
                                            <div
                                                key={i}
                                                className={`absolute top-0 bottom-0 flex items-center justify-center text-sm text-slate-700 border-l ${c.major ? 'border-slate-300 font-semibold' : 'border-slate-100'}`}
                                                style={{ left: c.left, width: c.width }}
                                            >
                                                {c.label}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Body */}
                                    <div className="relative">
                                        {/* Grid columns */}
                                        {headerCells.map((c, i) => (
                                            <div
                                                key={i}
                                                className={`absolute top-0 bottom-0 border-l ${c.major ? 'border-slate-200' : 'border-slate-100'}`}
                                                style={{ left: c.left, width: c.width, height: rows.length * ROW_H }}
                                            />
                                        ))}

                                        {/* Today line */}
                                        {todayLeft >= 0 && todayLeft <= totalWidth && (
                                            <div
                                                className="absolute top-0 w-px bg-red-500 z-10"
                                                style={{ left: todayLeft, height: rows.length * ROW_H }}
                                            >
                                                <div className="absolute -top-0 -left-[20px] bg-red-500 text-white text-[11px] px-2 py-0.5 rounded">
                                                    hoy
                                                </div>
                                            </div>
                                        )}

                                        {/* Rows + bars */}
                                        {rows.map((r, idx) => {
                                            const ini = parseDate(r.fecha_inicio)
                                            const fin = parseDate(r.deadline)
                                            let barLeft = 0, barWidth = 0, hasBar = false
                                            if (ini && fin) {
                                                barLeft = diffDays(rangeStart, ini) * pxPerDay
                                                barWidth = Math.max(diffDays(ini, fin) * pxPerDay, 4)
                                                hasBar = true
                                            } else if (ini && !fin) {
                                                barLeft = diffDays(rangeStart, ini) * pxPerDay
                                                barWidth = 14 * pxPerDay
                                                hasBar = true
                                            } else if (!ini && fin) {
                                                const end = diffDays(rangeStart, fin) * pxPerDay
                                                barLeft = Math.max(end - 14 * pxPerDay, 0)
                                                barWidth = 14 * pxPerDay
                                                hasBar = true
                                            }
                                            const color = r.eje_tematico?.color || '#3b82f6'
                                            return (
                                                <div
                                                    key={r.id}
                                                    className="relative border-b border-slate-100"
                                                    style={{ height: ROW_H }}
                                                    onClick={() => router.push(`/projects/${r.id}`)}
                                                >
                                                    {hasBar && (
                                                        <div
                                                            className="absolute top-1/2 -translate-y-1/2 rounded shadow-sm cursor-pointer hover:brightness-110 overflow-hidden"
                                                            style={{
                                                                left: barLeft,
                                                                width: barWidth,
                                                                height: BAR_H,
                                                                background: color + '40',
                                                                border: `1px solid ${color}`,
                                                            }}
                                                            title={`${r.nombre}\n${formatDate(r.fecha_inicio)} → ${formatDate(r.deadline)}`}
                                                        >
                                                            <div
                                                                className="h-full"
                                                                style={{
                                                                    width: `${r.avance}%`,
                                                                    background: color,
                                                                }}
                                                            />
                                                            <span className="absolute inset-0 flex items-center px-3 text-sm text-slate-800 font-semibold truncate">
                                                                {r.avance}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </div>
    )
}
