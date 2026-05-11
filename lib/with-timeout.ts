import { supabase } from './supabase'

/**
 * Envuelve una promesa con un timeout. Si tarda más que `ms`, rechaza con un
 * Error indicando timeout.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 10000, label = 'query'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout (${ms}ms) en ${label}`))
        }, ms)
        promise.then(
            (v) => { clearTimeout(timer); resolve(v) },
            (e) => { clearTimeout(timer); reject(e) },
        )
    })
}

/**
 * Hace una query con timeout. Si falla por timeout o por 401/PGRST301,
 * intenta refrescar la sesión y reintenta UNA vez. Si falla de nuevo,
 * propaga el error.
 *
 * Esto cubre el caso típico en producción: el access_token expiró, la
 * librería de Supabase queda colgada intentando refrescar, y nuestro
 * timeout dispara. Hacemos un refresh explícito y reintentamos.
 */
export async function queryWithRetry<T>(
    queryFn: () => Promise<T>,
    label = 'query',
    ms = 10000,
): Promise<T> {
    try {
        return await withTimeout(queryFn(), ms, label)
    } catch (err) {
        const msg = (err as Error).message || ''
        const isTimeoutOrAuth =
            msg.includes('Timeout') || msg.includes('401') || msg.includes('JWT')
        if (!isTimeoutOrAuth) throw err

        console.warn(`[${label}] falló, intentando refresh de sesión:`, msg)
        try {
            await withTimeout(supabase.auth.refreshSession(), 5000, 'refresh')
        } catch (refreshErr) {
            console.warn(`[${label}] refresh también falló:`, (refreshErr as Error).message)
            throw err  // re-throw el original
        }

        console.info(`[${label}] sesión refrescada, reintentando...`)
        return await withTimeout(queryFn(), ms, label)
    }
}
