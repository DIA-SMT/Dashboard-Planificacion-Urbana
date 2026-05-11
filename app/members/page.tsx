'use client'

import { Fragment, useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Member, Project } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Plus, ChevronDown, ChevronRight, Briefcase } from 'lucide-react'
import { ESTADO_COLORS } from '@/lib/project-ui'
import type { EstadoProyecto } from '@/types'

type ProjectMini = Pick<Project, 'id' | 'nombre' | 'codigo' | 'estado'>

export default function MembersPage() {
    const router = useRouter()
    const { role, loading: authLoading } = useAuth()
    const [members, setMembers] = useState<Member[]>([])
    const [projectsByMember, setProjectsByMember] = useState<Map<string, ProjectMini[]>>(new Map())
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [editing, setEditing] = useState<Member | null>(null)
    const [formData, setFormData] = useState({ full_name: '', email: '', empresa: '' })
    const [saving, setSaving] = useState(false)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    useEffect(() => { fetchAll() }, [])

    async function fetchAll() {
        setLoading(true)
        const [{ data: m }, { data: pe }] = await Promise.all([
            supabase.from('members').select('*').order('full_name'),
            supabase.from('project_empresas')
                .select('member_id, project:project_id(id, nombre, codigo, estado)'),
        ])
        if (m) setMembers(m)
        const map = new Map<string, ProjectMini[]>()
        ;(pe || []).forEach((row: any) => {
            const proj = row.project
            if (!proj) return
            const arr = map.get(row.member_id) || []
            arr.push({ id: proj.id, nombre: proj.nombre, codigo: proj.codigo, estado: proj.estado })
            map.set(row.member_id, arr)
        })
        setProjectsByMember(map)
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                full_name: formData.full_name,
                email: formData.email || null,
                empresa: formData.empresa || null,
            }
            const { error } = editing
                ? await supabase.from('members').update(payload).eq('id', editing.id)
                : await supabase.from('members').insert([payload])
            if (error) throw error
            setIsOpen(false)
            reset()
            fetchAll()
        } catch (err) {
            alert(`Error: ${(err as Error).message}`)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string) {
        const count = projectsByMember.get(id)?.length ?? 0
        const msg = count > 0
            ? `Esta empresa está asignada a ${count} proyecto${count === 1 ? '' : 's'}. Si la eliminás, esos proyectos quedarán sin responsable. ¿Continuar?`
            : '¿Eliminar esta empresa?'
        if (!confirm(msg)) return
        const { error } = await supabase.from('members').delete().eq('id', id)
        if (error) {
            alert(`Error: ${error.message}`)
            return
        }
        fetchAll()
    }

    function reset() {
        setEditing(null)
        setFormData({ full_name: '', email: '', empresa: '' })
    }

    function openEdit(m: Member) {
        setEditing(m)
        setFormData({
            full_name: m.full_name,
            email: m.email || '',
            empresa: m.empresa || '',
        })
        setIsOpen(true)
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        if (!q) return members
        return members.filter(m =>
            m.full_name.toLowerCase().includes(q) ||
            (m.empresa || '').toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q)
        )
    }, [members, search])

    if (!authLoading && role !== 'superadmin') {
        return <div className="p-8 text-slate-500">Acceso denegado</div>
    }

    return (
        <div className="container mx-auto py-10 px-4 max-w-6xl">
            <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </Button>
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold">Empresas / Responsables</h1>
                    <p className="text-sm text-slate-500">Empresas y áreas asignables como responsables de los proyectos</p>
                </div>
                <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) reset() }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Nueva Empresa</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nombre / Razón social *</Label>
                                <Input id="full_name" required value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email de contacto</Label>
                                <Input id="email" type="email" value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="empresa">Empresa (opcional)</Label>
                                <Input id="empresa" value={formData.empresa}
                                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                                    placeholder="Si el responsable es una persona, su empresa" />
                            </div>
                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="my-4">
                <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm bg-white"
                />
            </div>

            <div className="border rounded-lg bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>Nombre / Razón social</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-center w-[120px]">Proyectos</TableHead>
                            <TableHead className="w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((m) => {
                            const projs = projectsByMember.get(m.id) || []
                            const isOpen = expanded === m.id
                            return (
                                <Fragment key={m.id}>
                                    <TableRow
                                        className={projs.length > 0 ? 'cursor-pointer' : ''}
                                        onClick={() => projs.length > 0 && setExpanded(isOpen ? null : m.id)}
                                    >
                                        <TableCell>
                                            {projs.length > 0 ? (
                                                isOpen
                                                    ? <ChevronDown className="w-4 h-4 text-slate-500" />
                                                    : <ChevronRight className="w-4 h-4 text-slate-500" />
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="font-medium">{m.full_name}</TableCell>
                                        <TableCell className="text-slate-600">{m.empresa || '—'}</TableCell>
                                        <TableCell className="text-slate-600 text-sm">{m.email || '—'}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                projs.length > 0
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                <Briefcase className="w-3 h-3" />
                                                {projs.length}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600"
                                                    onClick={() => handleDelete(m.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {isOpen && projs.length > 0 && (
                                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                                            <TableCell></TableCell>
                                            <TableCell colSpan={5} className="py-3">
                                                <div className="space-y-1.5">
                                                    {projs.map(p => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => router.push(`/projects/${p.id}`)}
                                                            className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-white cursor-pointer text-sm"
                                                        >
                                                            {p.codigo && (
                                                                <span className="font-mono text-xs text-slate-400">{p.codigo}</span>
                                                            )}
                                                            <span className="flex-1">{p.nombre}</span>
                                                            <span className={`px-2 py-0.5 rounded text-xs border ${ESTADO_COLORS[p.estado as EstadoProyecto] || ''}`}>
                                                                {p.estado}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            )
                        })}
                        {filtered.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                    {search ? 'Sin resultados' : 'No hay empresas registradas'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
