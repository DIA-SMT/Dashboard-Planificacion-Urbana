'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Hito, ESTADOS_HITO } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/toaster'

type Props =
    | { mode: 'create'; projectId: string; onSaved: () => void; hito?: undefined }
    | { mode: 'edit'; projectId: string; hito: Hito; onSaved: () => void }

export function HitoForm(props: Props) {
    const { mode, projectId, onSaved } = props
    const hito = mode === 'edit' ? props.hito : undefined
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const { role } = useAuth()
    const toast = useToast()

    const empty = {
        titulo: '',
        estado: 'Sin empezar',
        notas: '',
        link: '',
        es_critico: false,
    }

    const [formData, setFormData] = useState(empty)

    useEffect(() => {
        if (!open) return
        if (hito) {
            setFormData({
                titulo: hito.titulo,
                estado: hito.estado,
                notas: hito.notas ?? '',
                link: hito.link ?? '',
                es_critico: hito.es_critico ?? false,
            })
        } else {
            setFormData(empty)
        }
    }, [open, hito])

    if (role !== 'superadmin') return null

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const payload = {
                project_id: projectId,
                titulo: formData.titulo,
                estado: formData.estado,
                notas: formData.notas || null,
                link: formData.link || null,
                es_critico: formData.es_critico,
            }
            const { error } = mode === 'edit' && hito
                ? await supabase.from('hitos').update(payload).eq('id', hito.id)
                : await supabase.from('hitos').insert([payload])
            if (error) throw error
            setOpen(false)
            if (mode === 'create') setFormData(empty)
            toast.success(mode === 'edit' ? 'Hito actualizado' : 'Hito creado', formData.titulo)
            onSaved()
        } catch (err) {
            console.error(err)
            toast.error('No se pudo guardar el hito', (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        if (!hito) return
        if (!confirm('¿Eliminar este hito?')) return
        setDeleting(true)
        try {
            const { error } = await supabase.from('hitos').delete().eq('id', hito.id)
            if (error) throw error
            setOpen(false)
            toast.success('Hito eliminado')
            onSaved()
        } catch (err) {
            toast.error('No se pudo eliminar', (err as Error).message)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {mode === 'edit' ? (
                    <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
                ) : (
                    <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nuevo Hito</Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Editar Hito' : 'Nuevo Hito'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="titulo">Título *</Label>
                        <Input id="titulo" required value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="estado">Estado</Label>
                            <Select value={formData.estado}
                                onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ESTADOS_HITO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input
                                id="es_critico"
                                type="checkbox"
                                checked={formData.es_critico}
                                onChange={(e) => setFormData({ ...formData, es_critico: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <Label htmlFor="es_critico" className="cursor-pointer">Hito crítico</Label>
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="notas">Notas</Label>
                        <Textarea id="notas" rows={3} value={formData.notas}
                            onChange={(e) => setFormData({ ...formData, notas: e.target.value })} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="link">Link / Archivo</Label>
                        <Input id="link" value={formData.link}
                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                            placeholder="https://..." />
                    </div>
                    <div className="flex justify-between pt-2">
                        {mode === 'edit' ? (
                            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                                <Trash2 className="w-4 h-4 mr-1" /> {deleting ? 'Eliminando...' : 'Eliminar'}
                            </Button>
                        ) : <span />}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
