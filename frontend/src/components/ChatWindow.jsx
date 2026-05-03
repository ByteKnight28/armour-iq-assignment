import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertTriangle, Loader2 } from 'lucide-react'
import API_BASE from '../lib/api'

export default function ChatWindow({ messages, setMessages }) {
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
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input, id: Date.now() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    // Build history from past user/bot messages (skip system errors)
    const history = updatedMessages
      .filter(m => m.role === 'user' || m.role === 'bot')
      .slice(0, -1) // exclude the current message (sent as prompt)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg.content, history })
      })
      
      const data = await res.json()
      
      if (res.status === 403) {
        setMessages(prev => [...prev, {
          role: 'system',
          error: true,
          content: data.message || 'Request blocked by security policy.',
          id: Date.now()
        }])
      } else if (res.ok) {
        setMessages(prev => [...prev, {
          role: 'bot',
          content: data.reply || 'No response from agent.',
          stats: { in: data.inputTokens, out: data.outputTokens, cost: data.costUsd },
          id: Date.now()
        }])
      } else {
        setMessages(prev => [...prev, { role: 'system', error: true, content: data.error || `Server error (${res.status})`, id: Date.now() }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', error: true, content: `Failed to connect to backend at ${API_BASE}`, id: Date.now() }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden relative">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ opacity: 0.35 }}>
            <Bot className="w-14 h-14 text-[#52525b]" strokeWidth={1.5} />
            <p className="text-[14px] text-[#52525b] font-medium">send a message to get started</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 max-w-[82%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            
            {/* Avatar */}
            <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
              m.role === 'user' ? 'bg-[#7c3aed] text-white' :
              m.error ? 'bg-[#dc2626] text-white' :
              'bg-[#27272a] text-[#a1a1aa]'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4" strokeWidth={2.5} /> : m.error ? <AlertTriangle className="w-4 h-4" strokeWidth={2.5} /> : <Bot className="w-4 h-4" strokeWidth={2.5} />}
            </div>

            {/* Bubble */}
            <div className={`flex flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#7c3aed] text-white rounded-2xl rounded-tr-md shadow-[0_2px_10px_rgba(124,58,237,0.3)]'
                  : m.error
                    ? 'bg-[#2a1215] text-[#fca5a5] border-[2px] border-[#dc2626]/30 rounded-2xl rounded-tl-md'
                    : 'bg-[#1a1a1e] text-[#d4d4d8] border-[2px] border-[#27272a] rounded-2xl rounded-tl-md'
              }`}>
                {m.content}
              </div>
              
              {m.stats && (
                <div className="flex gap-3 text-[11px] text-[#52525b] font-mono px-1">
                  <span>↑ {m.stats.in}</span>
                  <span>↓ {m.stats.out}</span>
                  <span className="text-emerald-500/70">${Number(m.stats.cost).toFixed(5)}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-[#27272a] flex items-center justify-center text-[#71717a]">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-[#1a1a1e] border-[2px] border-[#27272a] flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#52525b] rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-[#52525b] rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
              <span className="w-2 h-2 bg-[#52525b] rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-4 bg-[#111113] border-t-[2.5px] border-[#1e1e22]">
        <form onSubmit={sendMessage} className="relative flex items-center">
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="type a message..."
            className="w-full bg-[#0e0e10] border-[2.5px] border-[#27272a] focus:border-[#7c3aed] rounded-xl py-3 pl-4 pr-14 text-[14px] outline-none transition-colors text-[#e4e4e7] placeholder:text-[#3f3f46] font-medium"
            disabled={loading}
          />
          <button 
            id="chat-send"
            type="submit" 
            disabled={loading || !input.trim()}
            className="absolute right-2.5 w-9 h-9 flex items-center justify-center bg-[#7c3aed] hover:bg-[#6d28d9] disabled:bg-[#27272a] disabled:text-[#52525b] text-white rounded-lg transition-all duration-150 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
