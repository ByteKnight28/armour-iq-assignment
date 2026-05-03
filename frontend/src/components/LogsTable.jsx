import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'

export default function LogsTable() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()

    const sub = supabase
      .channel('logs_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 100))
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [])

  async function fetchLogs() {
    const { data } = await supabase
      .from('agent_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100)
    
    if (data) setLogs(data)
    setLoading(false)
  }

  const badgeStyles = {
    ALLOWED: { className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle, label: 'ALLOWED' },
    BLOCKED: { className: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: XCircle, label: 'BLOCKED' },
    INJECTION: { className: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertTriangle, label: 'INJECTION' },
  }

  const getStatusBadge = (log) => {
    const style = badgeStyles[log.policy_result] || { className: 'bg-[#27272a] text-[#71717a] border-[#3f3f46]', icon: Clock, label: 'PENDING' }
    const Icon = style.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold border-[2px] ${style.className}`}>
        <Icon className="w-3 h-3" strokeWidth={2.5} />
        {style.label}
      </span>
    )
  }

  if (loading) return <div className="p-8 text-[#52525b] text-[13px] font-medium animate-pulse">loading logs...</div>

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-left border-collapse text-[13px]">
        <thead className="bg-[#111113] sticky top-0 z-10">
          <tr>
            <th className="p-4 text-[#71717a] font-bold text-[12px] uppercase tracking-wider border-b-[2.5px] border-[#1e1e22]">Time</th>
            <th className="p-4 text-[#71717a] font-bold text-[12px] uppercase tracking-wider border-b-[2.5px] border-[#1e1e22]">Prompt</th>
            <th className="p-4 text-[#71717a] font-bold text-[12px] uppercase tracking-wider border-b-[2.5px] border-[#1e1e22]">Tool</th>
            <th className="p-4 text-[#71717a] font-bold text-[12px] uppercase tracking-wider border-b-[2.5px] border-[#1e1e22]">Status</th>
            <th className="p-4 text-[#71717a] font-bold text-[12px] uppercase tracking-wider border-b-[2.5px] border-[#1e1e22] text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-[#141416] transition-colors border-b border-[#1e1e22]">
              <td className="p-4 font-mono text-[12px] text-[#52525b] whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="p-4 max-w-xs truncate text-[#a1a1aa]" title={log.prompt}>
                {log.prompt || <span className="text-[#3f3f46] italic">internal</span>}
              </td>
              <td className="p-4">
                {log.tool_called ? (
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[12px] text-[#a78bfa] bg-[#7c3aed]/10 px-2.5 py-1 rounded-lg w-fit border-[2px] border-[#7c3aed]/15 font-bold">
                      {log.tool_called}
                    </span>
                    {log.block_reason && <span className="text-[11px] text-amber-500/80 line-clamp-1">{log.block_reason}</span>}
                  </div>
                ) : (
                  <span className="text-[#3f3f46] text-[12px]">—</span>
                )}
              </td>
              <td className="p-4 whitespace-nowrap">
                {getStatusBadge(log)}
              </td>
              <td className="p-4 font-mono text-[12px] text-right text-emerald-500/70">
                {log.cost_usd ? `$${Number(log.cost_usd).toFixed(6)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
