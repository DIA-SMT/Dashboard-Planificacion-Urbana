'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Project, Hito, Member, EjeTematico, avancePctFromHitos, ESTADOS_HITO } from '@/types'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProjectForm } from '@/components/project-form'
import { HitoForm } from '@/components/hito-form'
import { ESTADO_COLORS, PRIORIDAD_COLORS, formatDate, formatMonto } from '@/lib/project-ui'
import type { EstadoProyecto, Prioridad } from '@/types'
import { ArrowLeft, CheckCircle2, Circle, Clock, AlertTriangle, Calendar, User, FileText, DollarSign, Hash, Building2 } from 'lucide-react'

type ProjectFull = Project & {
    eje_tematico: EjeTematico | null
    empresas: Member[]
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
    const router = useRouter()
    const { role } = useAuth()
    const [project, setProject] = useState<ProjectFull | null>(null)
    const [hitos, setHitos] = useState<Hito[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const [{ data: p }, { data: h }] = await Promise.all([
                supabase
                    .from('projects')
                    .select('*, eje_tematico:eje_tematico_id(*), project_empresas(member:member_id(*))')
                    .eq('id', projectId)
                    .single(),
                supabase
                    .from('hitos')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('orden', { ascending: true })
                    .order('created_at', { ascending: true }),
            ])
            if (p) {
                const empresas = ((p as any).project_empresas || [])
                    .map((pe: any) => pe.member).filter(Boolean) as Member[]
                setProject({ ...(p as any), empresas })
            }
            if (h) setHitos(h)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => { fetchData() }, [fetchData])

    async function updateHitoStatus(hitoId: string, nuevo: string) {
        const prev = hitos
        setHitos(hitos.map(h => h.id === hitoId ? { ...h, estado: nuevo } : h))
        const { error } = await supabase.from('hitos').update({ estado: nuevo }).eq('id', hitoId)
        if (error) {
            console.error(error)
            setHitos(prev)
            alert('No se pudo actualizar')
        }
    }

    if (loading) return <div className="p-8">Cargando proyecto...</div>
    if (!project) return <div className="p-8">Proyecto no encontrado</div>

    const avance = avancePctFromHitos(hitos)
    const canEdit = role === 'superadmin'

    const iconForEstado = (e: string) => {
        if (e === 'Terminado') return <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        if (e === 'En desarrollo') return <Clock className="w-5 h-5 text-blue-600" />
        return <Circle className="w-5 h-5 text-slate-400" />
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" onClick={() => router.push('/')}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                    </Button>
                    {canEdit && <ProjectForm project={project} onSaved={fetchData} />}
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                {project.codigo && (
                                    <div className="font-mono text-xs text-slate-500 mb-1">{project.codigo}</div>
                                )}
                                <CardTitle className="text-2xl">{project.nombre}</CardTitle>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={`px-2.5 py-1 rounded text-xs border ${ESTADO_COLORS[project.estado as EstadoProyecto] || ''}`}>
                                    {project.estado}
                                </span>
                                {project.prioridad && (
                                    <span className={`px-2.5 py-1 rounded text-xs ${PRIORIDAD_COLORS[project.prioridad as Prioridad] || ''}`}>
                                        {project.prioridad}
                                    </span>
                                )}
                                {project.eje_tematico && (
                                    <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border"
                                        style={{
                                            borderColor: project.eje_tematico.color || '#cbd5e1',
                                            color: project.eje_tematico.color || '#475569',
                                        }}
                                    >
                                        <span className="w-2 h-2 rounded-full" style={{ background: project.eje_tematico.color || '#94a3b8' }} />
                                        {project.eje_tematico.nombre}
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {project.descripcion_tecnica && (
                            <div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Descripción técnica</h3>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{project.descripcion_tecnica}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <InfoRow icon={<User className="w-4 h-4" />} label="Responsable"
                                value={project.responsable_nombre || '—'} />
                            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Inicio" value={formatDate(project.fecha_inicio)} />
                            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Deadline" value={formatDate(project.deadline)} />
                            <InfoRow icon={<DollarSign className="w-4 h-4" />} label="Monto" value={formatMonto(project.monto)} />
                            <InfoRow icon={<Hash className="w-4 h-4" />} label="Expediente" value={project.n_expediente || '—'} />
                        </div>

                        {project.empresas.length > 0 && (
                            <div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                    <Building2 className="w-3.5 h-3.5" /> Empresas a cargo
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {project.empresas.map(emp => (
                                        <Link
                                            key={emp.id}
                                            href="/members"
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                                        >
                                            <Building2 className="w-3 h-3" />
                                            {emp.full_name}
                                            {emp.empresa && <span className="text-slate-500"> · {emp.empresa}</span>}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {project.observaciones && (
                            <div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5" /> Observaciones / Vínculos
                                </h3>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{project.observaciones}</p>
                            </div>
                        )}

                        {/* Avance */}
                        <div>
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-semibold text-slate-700">Avance del proyecto</span>
                                <span className="font-bold text-lg">{avance}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all" style={{ width: `${avance}%` }} />
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {hitos.filter(h => h.estado === 'Terminado').length} terminados · {hitos.filter(h => h.estado === 'En desarrollo').length} en desarrollo · {hitos.filter(h => h.estado === 'Sin empezar').length} sin empezar
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Hitos */}
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold text-slate-900">Hitos</h2>
                    {canEdit && <HitoForm mode="create" projectId={projectId} onSaved={fetchData} />}
                </div>

                {hitos.length === 0 ? (
                    <Card className="p-8 text-center text-slate-500">
                        Sin hitos. {canEdit && 'Creá el primero para empezar a medir el avance.'}
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {hitos.map(h => (
                            <Card key={h.id} className="hover:shadow-sm">
                                <CardContent className="p-3 flex items-start gap-3">
                                    <div className="mt-0.5">{iconForEstado(h.estado)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-medium">{h.titulo}</h3>
                                            {h.es_critico && (
                                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                                    <AlertTriangle className="w-3 h-3" /> Crítico
                                                </span>
                                            )}
                                        </div>
                                        {h.notas && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{h.notas}</p>}
                                        {h.link && (
                                            <a href={h.link} target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                                onClick={(e) => e.stopPropagation()}>
                                                Ver enlace →
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Select
                                            value={h.estado}
                                            onValueChange={(v) => updateHitoStatus(h.id, v)}
                                            disabled={!canEdit}
                                        >
                                            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {ESTADOS_HITO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {canEdit && <HitoForm mode="edit" projectId={projectId} hito={h} onSaved={fetchData} />}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-0.5 flex items-center gap-1">
                {icon} {label}
            </div>
            <div className="text-sm text-slate-800">{value}</div>
        </div>
    )
}
