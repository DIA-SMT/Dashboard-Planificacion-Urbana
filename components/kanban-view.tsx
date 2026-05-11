'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
    Project, Member, EjeTematico, Hito,
    avancePctFromHitos, ESTADOS_PROYECTO, EstadoProyecto,
} from '@/types'
import { ProjectForm } from '@/components/project-form'
import { ESTADO_DOT, formatDate } from '@/lib/project-ui'
import { useRefreshOnFocus } from '@/lib/use-refresh-on-focus'
import { queryWithRetry } from '@/lib/with-timeout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, User } from 'lucide-react'

type Card = Project & {
    eje_tematico: EjeTematico | null
    empresas: Member[]
    avance: number
}

export function KanbanView() {
    const router = useRouter()
    const { role } = useAuth()
    const [cards, setCards] = useState<Card[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dragId, setDragId] = useState<string | null>(null)
    const [hoverCol, setHoverCol] = useState<string | null>(null)

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        setError(null)
        try {
            const [{ data: projects }, { data: hitos }] = await queryWithRetry(
                () => Promise.all([
                    supabase
                        .from('projects')
                        .select('*, eje_tematico:eje_tematico_id(*), project_empresas(member:member_id(*))')
                        .order('deadline', { ascending: true, nullsFirst: false }),
                    supabase.from('hitos').select('project_id, estado'),
                ]),
                'kanban',
                10000,
            )

            const hitosByProject = new Map<string, Pick<Hito, 'estado'>[]>()
            ;(hitos || []).forEach((h: any) => {
                const list = hitosByProject.get(h.project_id) || []
                list.push({ estado: h.estado })
                hitosByProject.set(h.project_id, list)
            })

            setCards((projects || []).map((p: any) => ({
                ...p,
                empresas: (p.project_empresas || []).map((pe: any) => pe.member).filter(Boolean),
                avance: avancePctFromHitos(hitosByProject.get(p.id) || []),
            })))
        } catch (err) {
            console.error('Error fetching kanban:', err)
            setError((err as Error).message ?? String(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])
    useRefreshOnFocus(useCallback(() => { fetchAll(true) }, [fetchAll]))

    async function moveTo(projectId: string, nuevoEstado: EstadoProyecto) {
        const current = cards.find(c => c.id === projectId)
        if (!current || current.estado === nuevoEstado) return

        // Optimistic
        const prev = cards
        setCards(cards.map(c => c.id === projectId ? { ...c, estado: nuevoEstado } : c))

        const completed_at = nuevoEstado === 'Completado'
            ? (current.completed_at ?? new Date().toISOString())
            : null

        const { error } = await supabase
            .from('projects')
            .update({ estado: nuevoEstado, completed_at })
            .eq('id', projectId)

        if (error) {
            console.error(error)
            alert('No se pudo cambiar el estado')
            setCards(prev)
        }
    }

    const canDrag = role === 'superadmin'

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-[1600px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Kanban</h1>
                        <p className="text-slate-600 text-sm">
                            {canDrag ? 'Arrastrá tarjetas entre columnas para cambiar el estado' : 'Vista por estado'}
                        </p>
                    </div>
                    <ProjectForm onSaved={fetchAll} />
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between gap-3">
                        <div className="flex-1">
                            <div className="font-semibold text-red-800 text-sm">No se pudieron cargar los proyectos</div>
                            <div className="text-xs text-red-700 mt-0.5">{error}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fetchAll()}>Reintentar</Button>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {ESTADOS_PROYECTO.map(estado => (
                            <div key={estado} className="bg-white rounded-lg border p-3 min-h-[400px]">
                                <Skeleton className="h-5 w-32 mb-3" />
                                <div className="space-y-2">
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {ESTADOS_PROYECTO.map(estado => {
                            const colCards = cards.filter(c => c.estado === estado)
                            const isHover = hoverCol === estado && dragId
                            return (
                                <div
                                    key={estado}
                                    onDragOver={(e) => { if (canDrag) { e.preventDefault(); setHoverCol(estado) } }}
                                    onDragLeave={() => setHoverCol(null)}
                                    onDrop={(e) => {
                                        e.preventDefault()
                                        setHoverCol(null)
                                        if (canDrag && dragId) moveTo(dragId, estado)
                                        setDragId(null)
                                    }}
                                    className={`bg-white/70 rounded-lg border ${isHover ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200'} flex flex-col min-h-[500px]`}
                                >
                                    <div className="p-3 border-b border-slate-200 flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${ESTADO_DOT[estado]}`} />
                                        <h2 className="font-semibold text-slate-800">{estado}</h2>
                                        <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {colCards.length}
                                        </span>
                                    </div>
                                    <div className="p-2 flex-1 space-y-2 overflow-y-auto">
                                        {colCards.map(card => (
                                            <div
                                                key={card.id}
                                                draggable={canDrag}
                                                onDragStart={() => setDragId(card.id)}
                                                onDragEnd={() => { setDragId(null); setHoverCol(null) }}
                                                onClick={() => router.push(`/projects/${card.id}`)}
                                                className={`bg-white rounded-md border border-slate-200 p-3 shadow-sm hover:shadow transition cursor-pointer ${dragId === card.id ? 'opacity-40' : ''}`}
                                            >
                                                <div className="flex items-start gap-2 mb-2">
                                                    {card.codigo && (
                                                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">{card.codigo}</span>
                                                    )}
                                                    <h3 className="font-medium text-sm text-slate-900 flex-1 line-clamp-2">{card.nombre}</h3>
                                                </div>
                                                {card.eje_tematico && (
                                                    <div
                                                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded mb-2"
                                                        style={{
                                                            background: (card.eje_tematico.color || '#94a3b8') + '20',
                                                            color: card.eje_tematico.color || '#475569',
                                                        }}
                                                    >
                                                        {card.eje_tematico.nombre}
                                                    </div>
                                                )}
                                                <div className="mb-2">
                                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${card.avance}%` }} />
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 text-right">{card.avance}%</div>
                                                </div>
                                                {card.empresas.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {card.empresas.slice(0, 2).map(emp => (
                                                            <span key={emp.id} className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                                                                {emp.full_name}
                                                            </span>
                                                        ))}
                                                        {card.empresas.length > 2 && (
                                                            <span className="text-[10px] text-slate-500 px-1">+{card.empresas.length - 2}</span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                                    {card.responsable_nombre ? (
                                                        <span className="inline-flex items-center gap-1 truncate max-w-[60%]">
                                                            <User className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{card.responsable_nombre}</span>
                                                        </span>
                                                    ) : <span />}
                                                    {card.deadline && (
                                                        <span className="inline-flex items-center gap-1 shrink-0">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(card.deadline)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {colCards.length === 0 && (
                                            <div className="text-center text-xs text-slate-400 py-8">Vacío</div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
