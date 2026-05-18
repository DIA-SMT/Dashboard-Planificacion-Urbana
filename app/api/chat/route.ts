import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ─── Supabase admin client (bypasses RLS) ────────────────────────────────────
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    return createClient(url, key)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
    if (!d) return 'sin fecha'
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function avancePct(hitos: { estado: string }[]): number {
    if (!hitos.length) return 0
    const score = hitos.reduce((s, h) => {
        if (h.estado === 'Terminado') return s + 100
        if (h.estado === 'En desarrollo') return s + 50
        return s
    }, 0)
    return Math.round(score / hitos.length)
}

// ─── Build system prompt ──────────────────────────────────────────────────────
async function buildSystemPrompt(): Promise<string> {
    const supabase = getSupabaseAdmin()

    const [
        { data: projects },
        { data: hitos },
        { data: ejes },
    ] = await Promise.all([
        supabase
            .from('projects')
            .select('*, eje_tematico:eje_tematico_id(*), project_empresas(member:member_id(*))')
            .order('nombre'),
        supabase.from('hitos').select('project_id, estado, titulo, es_critico'),
        supabase.from('eje_tematico').select('*'),
    ])

    // Group hitos by project
    const hitosByProject = new Map<string, { estado: string; titulo: string; es_critico: boolean | null }[]>()
    ;(hitos || []).forEach((h: any) => {
        const list = hitosByProject.get(h.project_id) || []
        list.push({ estado: h.estado, titulo: h.titulo, es_critico: h.es_critico })
        hitosByProject.set(h.project_id, list)
    })

    const total = projects?.length ?? 0
    const byEstado: Record<string, number> = {}
    projects?.forEach((p: any) => {
        byEstado[p.estado] = (byEstado[p.estado] || 0) + 1
    })

    const statsText = Object.entries(byEstado)
        .map(([estado, count]) => `  - ${estado}: ${count}`)
        .join('\n')

    // Per-project detail
    const projectsText = (projects || []).map((p: any) => {
        const empresas = (p.project_empresas || [])
            .map((pe: any) => pe.member?.full_name)
            .filter(Boolean)
            .join(', ') || 'sin empresa asignada'

        const hitosProject = hitosByProject.get(p.id) || []
        const avance = avancePct(hitosProject)
        const hitosText = hitosProject.length > 0
            ? hitosProject.map(h => `    • ${h.titulo} [${h.estado}]${h.es_critico ? ' ⚠ crítico' : ''}`).join('\n')
            : '    (sin hitos registrados)'

        return `
Proyecto: ${p.nombre}
  Código: ${p.codigo || 'sin código'}
  Estado: ${p.estado}
  Avance: ${avance}%
  Prioridad: ${p.prioridad || 'no definida'}
  Eje temático: ${(p.eje_tematico as any)?.nombre || 'sin eje'}
  Responsable: ${p.responsable_nombre || 'sin responsable asignado'}
  Empresas contratistas: ${empresas}
  Inicio: ${formatDate(p.fecha_inicio)} — Deadline: ${formatDate(p.deadline)}
  Monto: ${p.monto != null ? `$${p.monto.toLocaleString('es-AR')}` : 'no informado'}
  Expediente: ${p.n_expediente || 'sin expediente'}
  Descripción: ${p.descripcion_tecnica || 'sin descripción'}
  Observaciones: ${p.observaciones || 'sin observaciones'}
  Hitos:
${hitosText}`
    }).join('\n\n---\n')

    return `Eres un asistente virtual del sistema de gestión de proyectos de la Dirección de Planificación Urbana de la Municipalidad de San Miguel de Tucumán (Argentina).

Tu rol es responder preguntas sobre los proyectos urbanísticos del municipio de manera clara, precisa y profesional. Responde siempre en español argentino. Sé conciso pero completo.

=== RESUMEN GENERAL ===
Total de proyectos: ${total}
${statsText}

=== DETALLE DE PROYECTOS ===
${projectsText}

=== INSTRUCCIONES ===
- Basate ÚNICAMENTE en la información provista arriba.
- Si no encontrás el dato, decilo claramente en lugar de inventarlo.
- Podés hacer comparaciones, listar proyectos por estado, buscar por responsable, etc.
- Cuando menciones montos, usá el formato argentino (ej: $1.500.000).
- Cuando el usuario pregunta por un proyecto por su nombre, hacé una búsqueda aproximada (puede haber errores tipográficos o nombres parciales).
- Sé amable y profesional.`
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json()

        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'messages requerido' }, { status: 400 })
        }

        const systemPrompt = await buildSystemPrompt()

        const apiKey = process.env.OPENROUTER_API_KEY
        const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

        if (!apiKey) {
            return NextResponse.json({ error: 'OPENROUTER_API_KEY no configurada' }, { status: 500 })
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://planificacion-urbana.smt.gob.ar',
                'X-Title': 'Dashboard Planificación Urbana SMT',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                ],
                temperature: 0.3,
                max_tokens: 1000,
            }),
        })

        if (!response.ok) {
            const err = await response.text()
            console.error('OpenRouter error:', err)
            return NextResponse.json({ error: 'Error al llamar al modelo de IA' }, { status: 500 })
        }

        const data = await response.json()
        const reply = data.choices?.[0]?.message?.content ?? 'No pude generar una respuesta.'

        return NextResponse.json({ reply })
    } catch (error) {
        console.error('Chat API error:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
