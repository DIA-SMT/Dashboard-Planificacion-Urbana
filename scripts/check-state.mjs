import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
        .split('\n').filter(l => l.trim() && !l.startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
})

const { data: projects } = await supabase.from('projects').select('id, codigo, nombre, estado')
console.log('\nProjects en DB:', projects?.length ?? 0)
projects?.forEach(p => console.log(' -', p.codigo ?? '(sin código)', '|', p.nombre, '|', p.estado))

const { data: users } = await supabase.auth.admin.listUsers()
console.log('\nUsuarios auth:')
users?.users.forEach(u => console.log(' -', u.email, '| id:', u.id))

const { data: profiles } = await supabase.from('profiles').select('*')
console.log('\nProfiles:')
profiles?.forEach(p => console.log(' - id:', p.id, '| role:', p.role, '| name:', p.full_name))
