'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { EjeTematico } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react'

const DEFAULT_COLOR = '#3b82f6'

export default function EjesPage() {
    const router = useRouter()
    const { role, loading: authLoading } = useAuth()
    const [ejes, setEjes] = useState<EjeTematico[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [editing, setEditing] = useState<EjeTematico | null>(null)
    const [formData, setFormData] = useState({ nombre: '', color: DEFAULT_COLOR })
    const [saving, setSaving] = useState(false)

    useEffect(() => { fetchEjes() }, [])

    async function fetchEjes() {
        const { data } = await supabase.from('eje_tematico').select('*').order('nombre')
        if (data) setEjes(data)
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                nombre: formData.nombre,
                color: formData.color || null,
            }
            const { error } = editing
                ? await supabase.from('eje_tematico').update(payload).eq('id', editing.id)
                : await supabase.from('eje_tematico').insert([payload])
            if (error) throw error
            setIsOpen(false)
            reset()
            fetchEjes()
        } catch (err) {
            alert(`Error: ${(err as Error).message}`)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este eje temático? Los proyectos asociados quedarán sin eje.')) return
        const { error } = await supabase.from('eje_tematico').delete().eq('id', id)
        if (error) {
            alert(`Error: ${error.message}`)
            return
        }
        fetchEjes()
    }

    function reset() {
        setEditing(null)
        setFormData({ nombre: '', color: DEFAULT_COLOR })
    }

    function openEdit(e: EjeTematico) {
        setEditing(e)
        setFormData({ nombre: e.nombre, color: e.color || DEFAULT_COLOR })
        setIsOpen(true)
    }

    if (!authLoading && role !== 'superadmin') {
        return <div className="p-8 text-slate-500">Acceso denegado</div>
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </Button>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Ejes Temáticos</h1>
                <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) reset() }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Nuevo Eje</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing ? 'Editar Eje' : 'Nuevo Eje'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre *</Label>
                                <Input id="nombre" required value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Espacio Público" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="color">Color</Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        id="color"
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-12 h-10 rounded cursor-pointer border"
                                    />
                                    <Input value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        placeholder="#3b82f6" className="font-mono" />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">Color</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ejes.map((e) => (
                            <TableRow key={e.id}>
                                <TableCell>
                                    <div className="w-6 h-6 rounded border" style={{ background: e.color || '#cbd5e1' }} />
                                </TableCell>
                                <TableCell className="font-medium">{e.nombre}</TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDelete(e.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {ejes.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                    No hay ejes temáticos
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
