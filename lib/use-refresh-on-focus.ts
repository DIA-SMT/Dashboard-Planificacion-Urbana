import { useEffect } from 'react'

/**
 * Ejecuta `onFocus` cuando la pestaña vuelve a estar visible o la ventana
 * recupera el foco. Útil para refrescar datos que pudieron quedar viejos
 * mientras el usuario tenía otra pestaña activa.
 */
export function useRefreshOnFocus(onFocus: () => void) {
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') onFocus()
        }
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', handleVisibility)
        return () => {
            window.removeEventListener('focus', onFocus)
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [onFocus])
}
