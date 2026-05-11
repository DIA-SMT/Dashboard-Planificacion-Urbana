/**
 * Envuelve una promesa con un timeout. Si tarda más que `ms`, rechaza con un
 * Error indicando timeout, en vez de quedarse colgada para siempre.
 *
 * Útil para queries de Supabase que ocasionalmente cuelgan en producción
 * (red lenta, sesión que se está refrescando, etc.).
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
