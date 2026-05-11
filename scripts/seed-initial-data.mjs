// Seed inicial de datos para Planificación Urbana.
// Uso: node scripts/seed-initial-data.mjs
// Lee credenciales de .env.local (service role key).
// Idempotente: chequea por nombre/código antes de insertar.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// --- Cargar variables de .env.local ---
const env = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
        .split('\n')
        .filter(l => l.trim() && !l.startsWith('#'))
        .map(l => {
            const i = l.indexOf('=')
            return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
        })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
})

// --- Helpers ---
async function getOrCreateMember(full_name, empresa = null) {
    const { data: existing } = await supabase
        .from('members').select('*').eq('full_name', full_name).maybeSingle()
    if (existing) return existing
    const { data, error } = await supabase
        .from('members').insert([{ full_name, empresa }]).select().single()
    if (error) throw error
    console.log(`  + member: ${full_name}`)
    return data
}

async function getEje(nombre) {
    const { data, error } = await supabase
        .from('eje_tematico').select('*').eq('nombre', nombre).single()
    if (error) throw new Error(`Eje "${nombre}" no encontrado: ${error.message}`)
    return data
}

async function upsertProject(p) {
    const matchField = p.codigo ? 'codigo' : 'nombre'
    const matchValue = p.codigo ?? p.nombre
    const { data: existing } = await supabase
        .from('projects').select('*').eq(matchField, matchValue).maybeSingle()
    if (existing) {
        console.log(`  ~ project ya existe: ${p.nombre} (skip)`)
        return existing
    }
    const { data, error } = await supabase
        .from('projects').insert([p]).select().single()
    if (error) throw error
    console.log(`  + project: ${p.nombre}`)
    return data
}

async function insertHitos(project_id, hitos) {
    // Borrar hitos previos para que el seed sea repetible sin duplicar
    await supabase.from('hitos').delete().eq('project_id', project_id)
    const rows = hitos.map((h, i) => ({ ...h, project_id, orden: i }))
    const { error } = await supabase.from('hitos').insert(rows)
    if (error) throw error
    console.log(`  + ${rows.length} hitos`)
}

async function setEmpresas(project_id, member_ids) {
    await supabase.from('project_empresas').delete().eq('project_id', project_id)
    if (member_ids.length === 0) return
    const rows = member_ids.map(member_id => ({ project_id, member_id }))
    const { error } = await supabase.from('project_empresas').insert(rows)
    if (error) throw error
    console.log(`  + ${rows.length} empresa(s) asignada(s)`)
}

// --- Data ---
async function main() {
    console.log('🌱 Seeding initial data...\n')

    console.log('→ Members')
    const antonelli   = await getOrCreateMember('Antonelli Hnos.')
    const druky       = await getOrCreateMember('Druky')
    const lesko       = await getOrCreateMember('Lesko')
    const dirPatrim   = await getOrCreateMember('Dir. Patrimonio')
    const costrucci   = await getOrCreateMember('Costrucci SRL')
    console.log('\n→ Ejes temáticos')
    const ejeEsp = await getEje('Espacio Público')
    const ejePat = await getEje('Patrimonio Histórico')

    console.log('\n→ Proyecto 1: Plaza Urquiza')
    const p1 = await upsertProject({
        codigo: null,
        nombre: 'Renovación Plaza Urquiza',
        descripcion_tecnica: 'Intervención integral para la puesta en valor y jerarquización de Plaza Urquiza.',
        eje_tematico_id: ejeEsp.id,
        estado: 'En curso',
        prioridad: 'Alta',
        fecha_inicio: '2026-05-15',
        deadline: '2026-12-15',
        monto: null,
        n_expediente: null,
        observaciones: null,
        responsable_nombre: null,
    })
    await setEmpresas(p1.id, [antonelli.id, druky.id, lesko.id])
    await insertHitos(p1.id, [
        { titulo: 'Publicación resultados licitación pública', estado: 'Sin empezar', es_critico: true },
    ])

    console.log('\n→ Proyecto 2: Mercado del Norte')
    const p2 = await upsertProject({
        codigo: 'PU-2025-001',
        nombre: 'Restauración Fachada Mercado del Norte',
        descripcion_tecnica: 'Puesta en valor de fachada y accesos principales. Relevamiento fotogramétrico, consolidación estructural y recuperación de revoques históricos según criterios ICOMOS.',
        eje_tematico_id: ejePat.id,
        estado: 'En curso',
        prioridad: 'Media',
        fecha_inicio: '2026-03-01',
        deadline: '2026-08-15',
        monto: 48500000,
        n_expediente: '0123-EXP-2025-MP',
        observaciones: 'Informe fotográfico abril disponible. Coordinar con Sec. Cultura para inauguración.',
        responsable_nombre: null,
    })
    await setEmpresas(p2.id, [dirPatrim.id, costrucci.id])
    await insertHitos(p2.id, [
        { titulo: 'Relevamiento aprobado',    estado: 'Terminado',     es_critico: true  },
        { titulo: 'Licitación adjudicada',    estado: 'Terminado',     es_critico: true  },
        { titulo: 'Aprobación Etapa 2',       estado: 'En desarrollo', es_critico: true  },
        { titulo: 'Recepción definitiva',     estado: 'Sin empezar',   es_critico: true  },
    ])

    console.log('\n✓ Done.')
}

main().catch(err => {
    console.error('\n✗ Error:', err.message ?? err)
    process.exit(1)
})
