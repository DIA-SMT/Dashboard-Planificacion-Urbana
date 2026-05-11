'use client'

import { createClient } from '@/lib/supabase/client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'

export type Role = 'superadmin' | 'responsable'

type AuthContextType = {
    user: User | null
    session: Session | null
    role: Role | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    role: null,
    loading: true,
    signOut: async () => { }
})

/**
 * Limpia toda evidencia de sesión Supabase en el browser. Se usa como
 * fallback cuando supabase.auth.signOut() no responde (típico cuando hay
 * un refresh de token colgado).
 */
function clearLocalSupabaseState() {
    if (typeof window === 'undefined') return
    // Cookies
    document.cookie.split(';').forEach(c => {
        const name = c.split('=')[0].trim()
        if (name.startsWith('sb-')) {
            document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
    })
    // localStorage
    try {
        Object.keys(window.localStorage).forEach(k => {
            if (k.startsWith('sb-') || k.includes('supabase')) {
                window.localStorage.removeItem(k)
            }
        })
    } catch { /* ignore */ }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [role, setRole] = useState<Role | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const loadRole = async (userId: string): Promise<Role> => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single()
            return (profile?.role as Role) || 'responsable'
        }

        const initializeAuth = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession()
                setSession(currentSession)
                setUser(currentSession?.user ?? null)
                if (currentSession?.user) {
                    setRole(await loadRole(currentSession.user.id))
                }
            } catch (error) {
                console.error('Error initializing auth:', error)
            } finally {
                setLoading(false)
            }
        }

        initializeAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            setSession(newSession)
            setUser(newSession?.user ?? null)
            if (newSession?.user) {
                setRole(await loadRole(newSession.user.id))
            } else {
                setRole(null)
            }
            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase])

    const signOut = async () => {
        // Intentar el signOut normal con timeout de 3s. Si tarda más
        // (típicamente porque el cliente está colgado refrescando token),
        // forzamos limpieza local.
        try {
            await Promise.race([
                supabase.auth.signOut(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('signOut timeout')), 3000)
                ),
            ])
        } catch (e) {
            console.warn('signOut falló o tardó, forzando limpieza local:', e)
        }
        clearLocalSupabaseState()
        setUser(null)
        setSession(null)
        setRole(null)
    }

    return (
        <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
