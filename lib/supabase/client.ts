import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Memoizamos a una única instancia por sesión del browser.
// Tener múltiples clientes provoca warnings "Multiple GoTrueClient instances
// detected" y, en producción, puede colgar las queries porque cada cliente
// mantiene su propio timer de refresh de token compitiendo por las cookies.
let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
    if (!_client) {
        _client = createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return _client
}
