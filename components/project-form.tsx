'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Project, Member, EjeTematico, ESTADOS_PROYECTO, PRIORIDADES } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, X } from 'lucide-react'
import { useToast } from '@/components/ui/toaster'

const UNASSIGNED = '__none__'

type Mode = 'create' | 'edit'

type Props = {
    onSaved: () => void
    project?: Project
}

export function ProjectForm({ onSaved, project }: Props) {
    const mode: Mode = project ? 'edit' : 'create'
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [members, setMembers] = useState<Member[]>([])
    const [ejes, setEjes] = useState<EjeTematico[]>([])
    const [selectedEmpresas, setSelectedEmpresas] = useState<Member[]>([])
    const [empresaInput, setEmpresaInput] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const { role } = useAuth()
    const toast = useToast()

    const emptyForm = {
        codigo: '',
        nombre: '',
        descripcion_tecnica: '',
        eje_tematico_id: UNASSIGNED,
        estado: 'Pendiente',
        prioridad: 'Media',
        fecha_inicio: '',
        deadline: '',
        monto: '',
        n_expediente: '',
        observaciones: '',
        responsable_nombre: '',
    }

    const [formData, setFormData] = useState(emptyForm)

    const loadProject = useCallback(async () => {
        if (!project) {
            setFormData(emptyForm)
            setSelectedEmpresas([])
            return
        }
        setFormData({
            codigo: project.codigo ?? '',
            nombre: project.nombre,
            descripcion_tecnica: project.descripcion_tecnica ?? '',
            eje_tematico_id: project.eje_tematico_id ?? UNASSIGNED,
            estado: project.estado,
            prioridad: project.prioridad ?? 'Media',
            fecha_inicio: project.fecha_inicio ?? '',
            deadline: project.deadline ?? '',
            monto: project.monto != null ? String(project.monto) : '',
            n_expediente: project.n_expediente ?? '',
            observaciones: project.observaciones ?? '',
            responsable_nombre: project.responsable_nombre ?? '',
        })
        // Cargar empresas asignadas al proyecto
        const { data } = await supabase
            .from('project_empresas')
            .select('member:member_id(*)')
            .eq('project_id', project.id)
        if (data) {
            setSelectedEmpresas((data as any).map((r: any) => r.member).filter(Boolean))
        }
    }, [project])

    useEffect(() => {
        if (!open) return
        loadProject()
        ;(async () => {
            const [{ data: m }, { data: e }] = await Promise.all([
                supabase.from('members').select('*').order('full_name'),
                supabase.from('eje_tematico').select('*').order('nombre'),
            ])
            if (m) setMembers(m)
            if (e) setEjes(e)
        })()
    }, [open, loadProject])

    if (role !== 'superadmin') return null

    function addEmpresa(m: Member) {
        if (!selectedEmpresas.find(s => s.id === m.id)) {
            setSelectedEmpresas([...selectedEmpresas, m])
        }
        setEmpresaInput('')
        setShowSuggestions(false)
    }

    function removeEmpresa(id: string) {
        setSelectedEmpresas(selectedEmpresas.filter(s => s.id !== id))
    }

    const filteredEmpresas = members.filter(
        m =>
            m.full_name.toLowerCase().includes(empresaInput.toLowerCase()) &&
            !selectedEmpresas.find(s => s.id === m.id)
    )

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const payload = {
                codigo: formData.codigo || null,
                nombre: formData.nombre,
                descripcion_tecnica: formData.descripcion_tecnica || null,
                eje_tematico_id: formData.eje_tematico_id === UNASSIGNED ? null : formData.eje_tematico_id,
                estado: formData.estado,
                prioridad: formData.prioridad || null,
                fecha_inicio: formData.fecha_inicio || null,
                deadline: formData.deadline || null,
                monto: formData.monto ? Number(formData.monto) : null,
                n_expediente: formData.n_expediente || null,
                observaciones: formData.observaciones || null,
                responsable_nombre: formData.responsable_nombre || null,
                completed_at: formData.estado === 'Completado'
                    ? (project?.completed_at ?? new Date().toISOString())
                    : null,
            }

            let projectId: string
            if (mode === 'edit' && project) {
                const { error } = await supabase.from('projects').update(payload).eq('id', project.id)
                if (error) throw error
                projectId = project.id
            } else {
                const { data, error } = await supabase.from('projects').insert([payload]).select().single()
                if (error) throw error
                projectId = data.id
            }

            // Sincronizar empresas: borrar todas las viejas e insertar las actuales
            const { error: delErr } = await supabase
                .from('project_empresas').delete().eq('project_id', projectId)
            if (delErr) throw delErr

            if (selectedEmpresas.length > 0) {
                const rows = selectedEmpresas.map(emp => ({
                    project_id: projectId,
                    member_id: emp.id,
                }))
                const { error: insErr } = await supabase.from('project_empresas').insert(rows)
                if (insErr) throw insErr
            }

            setOpen(false)
            if (mode === 'create') {
                setFormData(emptyForm)
                setSelectedEmpresas([])
            }
            toast.success(
                mode === 'edit' ? 'Proyecto actualizado' : 'Proyecto creado',
                payload.nombre
            )
            onSaved()
        } catch (err) {
            console.error('Error guardando proyecto:', err)
            toast.error('No se pudo guardar el proyecto', (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {mode === 'edit' ? (
                    <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                        <Pencil className="w-4 h-4 mr-1" /> Editar
                    </Button>
                ) : (
                    <Button>
                        <Plus className="w-4 h-4 mr-1" /> Nuevo Proyecto
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-2">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="grid gap-1.5 col-span-1">
                            <Label htmlFor="codigo">ID / Código</Label>
                            <Input id="codigo" value={formData.codigo}
                                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                placeholder="Ej: PU-001" />
                        </div>
                        <div className="grid gap-1.5 col-span-2">
                            <Label htmlFor="nombre">Nombre del Proyecto *</Label>
                            <Input id="nombre" required value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="descripcion_tecnica">Descripción Técnica</Label>
                        <Textarea id="descripcion_tecnica" rows={3} value={formData.descripcion_tecnica}
                            onChange={(e) => setFormData({ ...formData, descripcion_tecnica: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="eje">Eje Temático</Label>
                            <Select value={formData.eje_tematico_id}
                                onValueChange={(v) => setFormData({ ...formData, eje_tematico_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Sin eje" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={UNASSIGNED}>Sin eje</SelectItem>
                                    {ejes.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="responsable_nombre">Responsable</Label>
                            <Input
                                id="responsable_nombre"
                                value={formData.responsable_nombre}
                                onChange={(e) => setFormData({ ...formData, responsable_nombre: e.target.value })}
                                placeholder="Nombre de la persona a cargo"
                            />
                        </div>
                    </div>

                    {/* Empresas a cargo (multi-select) */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="empresas">Empresas a cargo</Label>
                        <div className="relative">
                            <Input
                                id="empresas"
                                value={empresaInput}
                                onChange={(e) => { setEmpresaInput(e.target.value); setShowSuggestions(true) }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                placeholder="Buscar empresa..."
                                autoComplete="off"
                            />
                            {showSuggestions && filteredEmpresas.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    {filteredEmpresas.map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                                            onClick={() => addEmpresa(m)}
                                        >
                                            {m.full_name}
                                            {m.empresa && <span className="text-slate-500"> — {m.empresa}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedEmpresas.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {selectedEmpresas.map((m) => (
                                    <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
                                        {m.full_name}
                                        <button
                                            type="button"
                                            onClick={() => removeEmpresa(m.id)}
                                            className="ml-0.5 hover:bg-slate-300 rounded p-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-slate-500">
                            Las empresas deben existir antes en <a href="/members" className="text-blue-600 underline" target="_blank">Empresas</a>.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="estado">Estado</Label>
                            <Select value={formData.estado}
                                onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ESTADOS_PROYECTO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="prioridad">Prioridad</Label>
                            <Select value={formData.prioridad}
                                onValueChange={(v) => setFormData({ ...formData, prioridad: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                            <Input id="fecha_inicio" type="date" value={formData.fecha_inicio}
                                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="deadline">Fecha Límite</Label>
                            <Input id="deadline" type="date" value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="monto">Monto del Proyecto</Label>
                            <Input id="monto" type="number" step="0.01" value={formData.monto}
                                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                                placeholder="0.00" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="n_expediente">Nº de Expediente</Label>
                            <Input id="n_expediente" value={formData.n_expediente}
                                onChange={(e) => setFormData({ ...formData, n_expediente: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="observaciones">Observaciones / Vínculos</Label>
                        <Textarea id="observaciones" rows={2} value={formData.observaciones}
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : mode === 'edit' ? 'Guardar Cambios' : 'Crear Proyecto'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
