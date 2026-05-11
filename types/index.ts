import { Tables } from './supabase'

export type Project = Tables<'projects'>
export type Hito = Tables<'hitos'>
export type Member = Tables<'members'>
export type EjeTematico = Tables<'eje_tematico'>
export type Profile = Tables<'profiles'>

export const ESTADOS_PROYECTO = ['Pendiente', 'En curso', 'En riesgo', 'Completado'] as const
export type EstadoProyecto = typeof ESTADOS_PROYECTO[number]

export const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Crítica'] as const
export type Prioridad = typeof PRIORIDADES[number]

export const ESTADOS_HITO = ['Sin empezar', 'En desarrollo', 'Terminado'] as const
export type EstadoHito = typeof ESTADOS_HITO[number]

export type ProjectWithRelations = Project & {
    eje_tematico: EjeTematico | null
    empresas: Member[]
    hitos: Hito[]
}

export function avancePctFromHitos(hitos: Pick<Hito, 'estado'>[]): number {
    if (hitos.length === 0) return 0
    const score = hitos.reduce((sum, h) => {
        if (h.estado === 'Terminado') return sum + 100
        if (h.estado === 'En desarrollo') return sum + 50
        return sum
    }, 0)
    return Math.round(score / hitos.length)
}
