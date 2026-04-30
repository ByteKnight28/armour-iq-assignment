import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertTriangle, Loader2 } from 'lucide-react'

export default function ChatWindow() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function sendMessage(e) {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = { role: 'user', content: input, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg.content })
      })
      
      const data = await res.json()
      
      if (res.status === 403) {
        setMessages(prev => [...prev, {
          role: 'system',
          error: true,
          content: data.message,
          id: Date.now()
        }])
      } else if (res.status === 200) {
        setMessages(prev => [...prev, {
          role: 'bot',
          content: data.reply,
          stats: { in: data.inputTokens, out: data.outputTokens, cost: data.costUsd },
          id: Date.now()
        }])
      } else {
        setMessages(prev => [...prev, { role: 'system', error: true, content: data.error || 'Server error', id: Date.now() }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', error: true, content: 'Failed to connect to backend', id: Date.now() }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4 opacity-50">
            <Bot className="w-16 h-16" />
            <p>Ready to securely handle your requests.</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            
            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center shadow-lg ${
              m.role === 'user' ? 'bg-indigo-500/20 text-indigo-400' :
              m.error ? 'bg-rose-500/20 text-rose-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4" /> : m.error ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-5 py-3 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-sm shadow-[0_4px_14px_0_rgba(99,102,241,0.39)]' :
                m.error ? 'bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-tl-sm' :
                'bg-neutral-800 text-neutral-200 border border-neutral-700/50 rounded-tl-sm shadow-xl'
              }`}>
                {m.content}
              </div>
              
              {m.stats && (
                <div className="flex gap-3 text-[10px] text-neutral-500 font-mono mt-1 px-2">
                  <span>In: {m.stats.in}</span>
                  <span>Out: {m.stats.out}</span>
                  <span className="text-emerald-500/70">Cost: ${Number(m.stats.cost).toFixed(5)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="px-5 py-3 rounded-2xl bg-neutral-800 border border-neutral-700/50 rounded-tl-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
              <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-neutral-900 border-t border-neutral-800">
        <form onSubmit={sendMessage} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Instruct the agent..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-3 pl-4 pr-12 text-sm outline-none transition-colors shadow-inner text-neutral-200 placeholder:text-neutral-600"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="absolute right-2 p-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
