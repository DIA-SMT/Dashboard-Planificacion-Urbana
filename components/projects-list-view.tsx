'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Project, Member, EjeTematico, Hito, avancePctFromHitos, ESTADOS_PROYECTO } from '@/types'
import { Input } from '@/components/ui/input'
import { ProjectForm } from '@/components/project-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, FolderKanban } from 'lucide-react'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ESTADO_COLORS, PRIORIDAD_COLORS, formatMonto, formatDate } from '@/lib/project-ui'
import { useRefreshOnFocus } from '@/lib/use-refresh-on-focus'
import type { EstadoProyecto, Prioridad } from '@/types'

type Row = Project & {
    eje_tematico: EjeTematico | null
    empresas: Member[]
    avance: number
}

const ALL = '__all__'

export function ProjectsListView() {
    const router = useRouter()
    const [rows, setRows] = useState<Row[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [estadoFilter, setEstadoFilter] = useState<string>(ALL)
    const [ejeFilter, setEjeFilter] = useState<string>(ALL)
    const [ejes, setEjes] = useState<EjeTematico[]>([])

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [{ data: projects }, { data: hitos }, { data: ejesData }] = await Promise.all([
                supabase
                    .from('projects')
                    .select('*, eje_tematico:eje_tematico_id(*), project_empresas(member:member_id(*))')
                    .order('deadline', { ascending: true, nullsFirst: false }),
                supabase.from('hitos').select('project_id, estado'),
                supabase.from('eje_tematico').select('*').order('nombre'),
            ])

            const hitosByProject = new Map<string, Pick<Hito, 'estado'>[]>()
            ;(hitos || []).forEach((h: any) => {
                const list = hitosByProject.get(h.project_id) || []
                list.push({ estado: h.estado })
                hitosByProject.set(h.project_id, list)
            })

            const data: Row[] = (projects || []).map((p: any) => ({
                ...p,
                empresas: (p.project_empresas || []).map((pe: any) => pe.member).filter(Boolean),
                avance: avancePctFromHitos(hitosByProject.get(p.id) || []),
            }))

            setRows(data)
            if (ejesData) setEjes(ejesData)
        } catch (err) {
            console.error('Error fetching projects:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])
    useRefreshOnFocus(fetchAll)

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        return rows.filter(r => {
            if (estadoFilter !== ALL && r.estado !== estadoFilter) return false
            if (ejeFilter !== ALL && r.eje_tematico_id !== ejeFilter) return false
            if (!q) return true
            return (
                r.nombre.toLowerCase().includes(q) ||
                (r.codigo || '').toLowerCase().includes(q) ||
                (r.descripcion_tecnica || '').toLowerCase().includes(q) ||
                (r.responsable_nombre || '').toLowerCase().includes(q) ||
                (r.n_expediente || '').toLowerCase().includes(q) ||
                r.empresas.some(e => e.full_name.toLowerCase().includes(q))
            )
        })
    }, [rows, search, estadoFilter, ejeFilter])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Proyectos</h1>
                        <p className="text-slate-600 text-sm">Planificación Urbana — tablero general</p>
                    </div>
                    <ProjectForm onSaved={fetchAll} />
                </div>

                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Buscar por nombre, código, expediente, responsable, empresa..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-white"
                        />
                    </div>
                    <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                        <SelectTrigger className="w-full md:w-[180px] bg-white"><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Todos los estados</SelectItem>
                            {ESTADOS_PROYECTO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={ejeFilter} onValueChange={setEjeFilter}>
                        <SelectTrigger className="w-full md:w-[200px] bg-white"><SelectValue placeholder="Eje temático" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Todos los ejes</SelectItem>
                            {ejes.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-slate-500">Cargando proyectos...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <FolderKanban className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-1">No hay proyectos</h3>
                            <p className="text-slate-500 text-sm">
                                {search || estadoFilter !== ALL || ejeFilter !== ALL
                                    ? 'Probá ajustar los filtros'
                                    : 'Comenzá creando tu primer proyecto'}
                            </p>
                        </div>
                    ) : (
                        <Table className="[&_th]:py-3 [&_th]:text-sm [&_td]:py-4 [&_td]:px-4 [&_th]:px-4">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[110px]">Código</TableHead>
                                    <TableHead className="min-w-[420px]">Nombre</TableHead>
                                    <TableHead className="min-w-[180px]">Eje</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Responsable</TableHead>
                                    <TableHead className="min-w-[220px]">Empresas</TableHead>
                                    <TableHead className="w-[160px]">Avance</TableHead>
                                    <TableHead>Inicio</TableHead>
                                    <TableHead>Deadline</TableHead>
                                    <TableHead>Prioridad</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead>Expte.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((p) => (
                                    <TableRow
                                        key={p.id}
                                        className="cursor-pointer hover:bg-slate-50"
                                        onClick={() => router.push(`/projects/${p.id}`)}
                                    >
                                        <TableCell className="font-mono text-sm text-slate-500">{p.codigo || '—'}</TableCell>
                                        <TableCell className="font-semibold text-base text-slate-900 min-w-[420px] leading-snug">{p.nombre}</TableCell>
                                        <TableCell>
                                            {p.eje_tematico ? (
                                                <span
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm border"
                                                    style={{
                                                        borderColor: p.eje_tematico.color || '#cbd5e1',
                                                        color: p.eje_tematico.color || '#475569',
                                                    }}
                                                >
                                                    <span className="w-2 h-2 rounded-full" style={{ background: p.eje_tematico.color || '#94a3b8' }} />
                                                    {p.eje_tematico.nombre}
                                                </span>
                                            ) : <span className="text-slate-400 text-sm">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-block px-2.5 py-1 rounded text-sm border ${ESTADO_COLORS[p.estado as EstadoProyecto] || ''}`}>
                                                {p.estado}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-700">
                                            {p.responsable_nombre || <span className="text-slate-400">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            {p.empresas.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {p.empresas.slice(0, 3).map(emp => (
                                                        <span key={emp.id} className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                                                            {emp.full_name}
                                                        </span>
                                                    ))}
                                                    {p.empresas.length > 3 && (
                                                        <span className="text-xs text-slate-500">+{p.empresas.length - 3}</span>
                                                    )}
                                                </div>
                                            ) : <span className="text-slate-400 text-sm">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-slate-200 rounded-full h-2.5 min-w-[70px]">
                                                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${p.avance}%` }} />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 w-10 text-right">{p.avance}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">{formatDate(p.fecha_inicio)}</TableCell>
                                        <TableCell className="text-sm text-slate-600">{formatDate(p.deadline)}</TableCell>
                                        <TableCell>
                                            {p.prioridad ? (
                                                <span className={`px-2.5 py-1 rounded text-sm ${PRIORIDAD_COLORS[p.prioridad as Prioridad] || ''}`}>
                                                    {p.prioridad}
                                                </span>
                                            ) : <span className="text-slate-400 text-sm">—</span>}
                                        </TableCell>
                                        <TableCell className="text-right text-sm tabular-nums text-slate-700">{formatMonto(p.monto)}</TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500">{p.n_expediente || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <div className="mt-3 text-xs text-slate-500">
                    {!loading && `${filtered.length} ${filtered.length === 1 ? 'proyecto' : 'proyectos'}`}
                </div>
            </div>
        </div>
    )
}
