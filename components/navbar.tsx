'use client'

import Image from 'next/image'
import './navbar.css'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon, Table2, Columns3, GanttChart, Users, Tags, Menu } from 'lucide-react'

const NAV_LINKS = [
    { href: '/', label: 'Proyectos', Icon: Table2 },
    { href: '/kanban', label: 'Kanban', Icon: Columns3 },
    { href: '/cronograma', label: 'Cronograma', Icon: GanttChart },
]

const ADMIN_LINKS = [
    { href: '/members', label: 'Empresas', Icon: Users },
    { href: '/ejes', label: 'Ejes', Icon: Tags },
]

export function Navbar() {
    const { user, role, signOut } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const handleSignOut = async () => {
        await signOut()
        // Reload completo para asegurar estado limpio (algunos cuelgues quedan
        // pegados con router.push porque no remountea AuthProvider).
        if (typeof window !== 'undefined') {
            window.location.href = '/login'
        } else {
            router.push('/login')
        }
    }

    const isActive = (href: string) =>
        href === '/' ? pathname === '/' : pathname?.startsWith(href)

    const renderLink = ({ href, label, Icon }: typeof NAV_LINKS[number]) => {
        const active = isActive(href)
        return (
            <Link
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    active
                        ? 'bg-white text-[#1f89f6] shadow-sm'
                        : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
            >
                <Icon className="h-4 w-4" />
                {label}
            </Link>
        )
    }

    return (
        <nav className="navbar relative">
            <div className="navbar-container flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <div className="navbar-logo">
                        <Image
                            src="/Logo_SMT_neg_4.png"
                            alt="Logo Municipalidad de San Miguel de Tucumán"
                            width={200}
                            height={200}
                            className="logo-muni"
                            priority
                            quality={100}
                            unoptimized
                        />
                    </div>
                    <div className="hidden md:block border-l border-white/25 pl-3">
                        <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium leading-tight">
                            Dirección
                        </div>
                        <div className="text-sm font-semibold text-white leading-tight">
                            Planificación Urbana
                        </div>
                    </div>
                </div>
                {user && (
                    <>
                        {/* Desktop */}
                        <div className="hidden lg:flex items-center gap-1">
                            {NAV_LINKS.map(renderLink)}
                            {role === 'superadmin' && (
                                <>
                                    <div className="w-px h-6 bg-white/20 mx-2" />
                                    {ADMIN_LINKS.map(renderLink)}
                                </>
                            )}
                        </div>

                        <div className="hidden lg:flex items-center gap-4">
                            <div className="flex items-center gap-2 text-white">
                                <UserIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">{user.email}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSignOut}
                                className="text-white hover:text-white/80 hover:bg-white/10"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Salir
                            </Button>
                        </div>

                        {/* Mobile */}
                        <div className="lg:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="text-white hover:text-white/80 hover:bg-white/10"
                            >
                                <Menu className="h-6 w-6" />
                            </Button>
                        </div>

                        {isMobileMenuOpen && (
                            <div className="absolute top-[80px] right-0 left-0 bg-[#1f89f6] border-t border-white/20 p-4 lg:hidden shadow-lg z-50 flex flex-col items-stretch gap-2 animate-in slide-in-from-top-2">
                                {NAV_LINKS.map(renderLink)}
                                {role === 'superadmin' && ADMIN_LINKS.map(renderLink)}
                                <div className="border-t border-white/20 mt-2 pt-2 flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-2 text-white">
                                        <UserIcon className="h-4 w-4" />
                                        <span className="text-sm font-medium">{user.email}</span>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleSignOut}
                                        className="w-full max-w-xs"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Salir
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </nav>
    )
}
