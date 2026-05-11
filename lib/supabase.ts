import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. ' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your env.'
    )
}

// Cliente único del browser. Comparte cookies con el middleware SSR y con
// el cliente de AuthContext, así las consultas viajan autenticadas y RLS
// las admite.
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
