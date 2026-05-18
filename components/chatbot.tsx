'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const QUICK_SUGGESTIONS = [
    '¿Cuántos proyectos hay en total?',
    '¿Qué proyectos están en riesgo?',
    '¿Qué proyectos están completados?',
    '¿Cuál es el proyecto con más avance?',
    'Resumí el estado general del tablero',
    '¿Qué proyectos están pendientes?',
]

export function Chatbot() {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [showScrollBtn, setShowScrollBtn] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
            setTimeout(() => inputRef.current?.focus(), 150)
        }
    }, [isOpen, messages, scrollToBottom])

    const handleScroll = () => {
        const el = scrollAreaRef.current
        if (!el) return
        setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80)
    }

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim()
        if (!trimmed || loading) return

        const userMsg: Message = { role: 'user', content: trimmed }
        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error al obtener respuesta')
            }

            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: '⚠️ Ocurrió un error al procesar tu consulta. Por favor, intentá de nuevo.',
                },
            ])
        } finally {
            setLoading(false)
        }
    }, [messages, loading])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    const handleSuggestion = (s: string) => sendMessage(s)

    const handleClear = () => {
        setMessages([])
        setInput('')
    }

    // Format assistant message — basic markdown-like rendering
    const renderContent = (content: string) => {
        const lines = content.split('\n')
        return lines.map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-semibold text-slate-900 mt-2 mb-0.5">{line.slice(2, -2)}</p>
            }
            if (line.startsWith('• ') || line.startsWith('- ')) {
                return <p key={i} className="flex gap-1.5 text-slate-700"><span className="text-[#1f89f6] mt-0.5 shrink-0">•</span><span>{line.slice(2)}</span></p>
            }
            if (line === '') return <div key={i} className="h-1" />
            return <p key={i} className="text-slate-700 leading-relaxed">{line}</p>
        })
    }

    if (!user) return null

    return (
        <>
            {/* ── Floating button ─────────────────────────────────────────── */}
            <button
                id="chatbot-toggle"
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={isOpen ? 'Cerrar asistente' : 'Abrir asistente virtual'}
                className={`
                    fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl
                    flex items-center justify-center transition-all duration-300
                    ${isOpen
                        ? 'bg-slate-700 scale-90 rotate-90'
                        : 'bg-[#1f89f6] hover:bg-[#1a76d9] scale-100 hover:scale-110'
                    }
                `}
                style={{ boxShadow: isOpen ? undefined : '0 8px 32px rgba(31,137,246,0.45)' }}
            >
                {isOpen
                    ? <X className="w-6 h-6 text-white" />
                    : <MessageCircle className="w-6 h-6 text-white" />
                }
                {/* Pulse ring when closed */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-[#1f89f6] animate-ping opacity-20 pointer-events-none" />
                )}
            </button>

            {/* ── Chat panel ──────────────────────────────────────────────── */}
            <div
                className={`
                    fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]
                    transition-all duration-300 ease-in-out
                    ${isOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }
                `}
            >
                <div
                    className="rounded-2xl overflow-hidden flex flex-col"
                    style={{
                        height: '520px',
                        background: 'rgba(255,255,255,0.97)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(31,137,246,0.12)',
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center gap-3 px-4 py-3 shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1f89f6 0%, #1565c0 100%)' }}
                    >
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white leading-tight">Asistente de Proyectos</div>
                            <div className="text-[11px] text-white/70 leading-tight">Planificación Urbana · SMT</div>
                        </div>
                        {messages.length > 0 && (
                            <button
                                onClick={handleClear}
                                className="text-white/60 hover:text-white/90 text-[11px] px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>

                    {/* Messages area */}
                    <div
                        ref={scrollAreaRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                    >
                        {/* Welcome / empty state */}
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center text-center pt-4 pb-2 px-2">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1f89f6]/15 to-[#1f89f6]/5 flex items-center justify-center mb-3">
                                    <Bot className="w-8 h-8 text-[#1f89f6]" />
                                </div>
                                <p className="text-sm font-semibold text-slate-800 mb-1">¡Hola! Soy tu asistente</p>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-[260px]">
                                    Puedo responder preguntas sobre proyectos, estados, responsables, avances y más.
                                </p>

                                {/* Quick suggestions */}
                                <div className="mt-4 w-full flex flex-col gap-1.5">
                                    {QUICK_SUGGESTIONS.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => handleSuggestion(s)}
                                            className="text-left text-xs px-3 py-2 rounded-xl border border-[#1f89f6]/20 bg-[#1f89f6]/5 text-[#1565c0] hover:bg-[#1f89f6]/10 hover:border-[#1f89f6]/40 transition-all font-medium"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Message bubbles */}
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1f89f6] to-[#1565c0] flex items-center justify-center shrink-0 mt-0.5">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`
                                        max-w-[82%] px-3 py-2.5 rounded-2xl text-xs
                                        ${msg.role === 'user'
                                            ? 'bg-[#1f89f6] text-white rounded-tr-sm'
                                            : 'bg-slate-100 rounded-tl-sm'
                                        }
                                    `}
                                >
                                    {msg.role === 'assistant'
                                        ? <div className="space-y-0.5">{renderContent(msg.content)}</div>
                                        : <p className="leading-relaxed">{msg.content}</p>
                                    }
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <User className="w-4 h-4 text-slate-600" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {loading && (
                            <div className="flex gap-2 justify-start">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1f89f6] to-[#1565c0] flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-[#1f89f6] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-[#1f89f6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-[#1f89f6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Scroll to bottom button */}
                    {showScrollBtn && (
                        <div className="absolute bottom-[72px] right-6 z-10">
                            <button
                                onClick={scrollToBottom}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:text-[#1f89f6] transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Input area */}
                    <div className="shrink-0 border-t border-slate-100 px-3 py-2.5 bg-white">
                        <div className="flex gap-2 items-end">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribí tu consulta... (Enter para enviar)"
                                disabled={loading}
                                rows={1}
                                className="
                                    flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50
                                    px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400
                                    focus:outline-none focus:ring-2 focus:ring-[#1f89f6]/30 focus:border-[#1f89f6]/50
                                    disabled:opacity-50 transition-all leading-relaxed
                                "
                                style={{ maxHeight: '100px', overflowY: 'auto' }}
                                onInput={e => {
                                    const t = e.currentTarget
                                    t.style.height = 'auto'
                                    t.style.height = `${Math.min(t.scrollHeight, 100)}px`
                                }}
                            />
                            <button
                                id="chatbot-send"
                                onClick={() => sendMessage(input)}
                                disabled={loading || !input.trim()}
                                className="
                                    w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                                    bg-[#1f89f6] hover:bg-[#1a76d9] disabled:opacity-40
                                    transition-all duration-200 disabled:cursor-not-allowed
                                    hover:scale-105 active:scale-95
                                "
                            >
                                {loading
                                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                                    : <Send className="w-4 h-4 text-white" />
                                }
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                            Shift+Enter para nueva línea
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
