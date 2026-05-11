import type { EstadoProyecto, Prioridad } from '@/types'

export const ESTADO_COLORS: Record<EstadoProyecto, string> = {
    'Pendiente':  'bg-slate-100 text-slate-700 border-slate-300',
    'En curso':   'bg-blue-100 text-blue-800 border-blue-300',
    'En riesgo':  'bg-red-100 text-red-800 border-red-300',
    'Completado': 'bg-emerald-100 text-emerald-800 border-emerald-300',
}

export const ESTADO_DOT: Record<EstadoProyecto, string> = {
    'Pendiente':  'bg-slate-400',
    'En curso':   'bg-blue-500',
    'En riesgo':  'bg-red-500',
    'Completado': 'bg-emerald-500',
}

export const PRIORIDAD_COLORS: Record<Prioridad, string> = {
    'Baja':    'bg-slate-100 text-slate-700',
    'Media':   'bg-yellow-100 text-yellow-800',
    'Alta':    'bg-orange-100 text-orange-800',
    'Crítica': 'bg-red-100 text-red-800',
}

export function formatMonto(v: number | null | undefined): string {
    if (v == null) return '—'
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(v)
}

export function formatDate(v: string | null | undefined): string {
    if (!v) return '—'
    const d = new Date(v + (v.length === 10 ? 'T00:00:00' : ''))
    return d.toLocaleDateString('es-AR')
}
