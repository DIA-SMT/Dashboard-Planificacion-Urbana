'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
type Toast = { id: number; kind: ToastKind; title: string; description?: string }

type Ctx = {
    show: (t: Omit<Toast, 'id'>) => void
    success: (title: string, description?: string) => void
    error: (title: string, description?: string) => void
    info: (title: string, description?: string) => void
}

const ToastCtx = createContext<Ctx | null>(null)

export function useToast(): Ctx {
    const ctx = useContext(ToastCtx)
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
    return ctx
}

const ICON: Record<ToastKind, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error:   <AlertTriangle className="w-5 h-5 text-red-600" />,
    info:    <Info className="w-5 h-5 text-[#1f89f6]" />,
}

const STYLES: Record<ToastKind, string> = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error:   'bg-red-50 border-red-200 text-red-900',
    info:    'bg-blue-50 border-blue-200 text-blue-900',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const remove = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const show = useCallback((t: Omit<Toast, 'id'>) => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev, { ...t, id }])
        setTimeout(() => remove(id), 4000)
    }, [remove])

    const api: Ctx = {
        show,
        success: (title, description) => show({ kind: 'success', title, description }),
        error:   (title, description) => show({ kind: 'error',   title, description }),
        info:    (title, description) => show({ kind: 'info',    title, description }),
    }

    return (
        <ToastCtx.Provider value={api}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-md border rounded-lg shadow-lg p-3.5 pr-9 animate-in slide-in-from-right-4 fade-in ${STYLES[t.kind]}`}
                    >
                        <div className="shrink-0 mt-0.5">{ICON[t.kind]}</div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{t.title}</div>
                            {t.description && <div className="text-xs mt-0.5 opacity-90">{t.description}</div>}
                        </div>
                        <button
                            onClick={() => remove(t.id)}
                            className="absolute top-2 right-2 p-1 rounded hover:bg-black/5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastCtx.Provider>
    )
}
