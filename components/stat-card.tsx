import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'brand' | 'teal' | 'amber' | 'red' | 'emerald' | 'slate'

const TONE_STYLES: Record<Tone, { dot: string; ring: string; icon: string; bg: string }> = {
    brand:   { dot: 'bg-[#1f89f6]', ring: 'ring-[#1f89f6]/15', icon: 'text-[#1f89f6] bg-[#1f89f6]/10', bg: 'from-[#1f89f6]/5 to-transparent' },
    teal:    { dot: 'bg-teal-500',  ring: 'ring-teal-500/15',  icon: 'text-teal-600 bg-teal-500/10',   bg: 'from-teal-500/5 to-transparent' },
    amber:   { dot: 'bg-amber-500', ring: 'ring-amber-500/15', icon: 'text-amber-600 bg-amber-500/10', bg: 'from-amber-500/5 to-transparent' },
    red:     { dot: 'bg-red-500',   ring: 'ring-red-500/15',   icon: 'text-red-600 bg-red-500/10',     bg: 'from-red-500/5 to-transparent' },
    emerald: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/15', icon: 'text-emerald-600 bg-emerald-500/10', bg: 'from-emerald-500/5 to-transparent' },
    slate:   { dot: 'bg-slate-400', ring: 'ring-slate-300/30', icon: 'text-slate-600 bg-slate-200/60',  bg: 'from-slate-100 to-transparent' },
}

export function StatCard({
    label,
    value,
    hint,
    icon,
    tone = 'brand',
    loading = false,
    onClick,
}: {
    label: string
    value: number | string
    hint?: ReactNode
    icon?: ReactNode
    tone?: Tone
    loading?: boolean
    onClick?: () => void
}) {
    const t = TONE_STYLES[tone]
    return (
        <div
            onClick={onClick}
            className={cn(
                'relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm',
                'transition-all duration-200',
                onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
            )}
        >
            <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', t.bg)} />
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className={cn('w-1.5 h-6 rounded-full', t.dot)} />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                    </div>
                    {icon && (
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', t.icon)}>
                            {icon}
                        </div>
                    )}
                </div>
                {loading ? (
                    <div className="skeleton h-9 w-20 mb-1" />
                ) : (
                    <div className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{value}</div>
                )}
                {hint && (
                    <div className="text-xs text-slate-500 mt-2">{hint}</div>
                )}
            </div>
        </div>
    )
}
