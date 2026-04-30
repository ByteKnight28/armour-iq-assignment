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

  const getStatusBadge = (log) => {
    switch (log.policy_result) {
      case 'ALLOWED':
        return <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs"><CheckCircle className="w-3 h-3"/> ALLOWED</span>
      case 'BLOCKED':
        return <span className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-1 rounded text-xs"><XCircle className="w-3 h-3"/> BLOCKED</span>
      case 'INJECTION':
        return <span className="flex items-center gap-1 text-rose-400 bg-rose-400/10 px-2 py-1 rounded text-xs"><AlertTriangle className="w-3 h-3"/> INJECTION</span>
      default:
        return <span className="flex items-center gap-1 text-neutral-400 bg-neutral-400/10 px-2 py-1 rounded text-xs"><Clock className="w-3 h-3"/> PENDING</span>
    }
  }

  if (loading) return <div className="p-8 text-neutral-400">Loading logs...</div>

  return (
    <div className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-neutral-800">
      <table className="w-full text-left border-collapse text-sm">
        <thead className="bg-neutral-900 sticky top-0 z-10 shadow-md">
          <tr>
            <th className="p-4 text-neutral-400 font-semibold border-b border-neutral-800">Time</th>
            <th className="p-4 text-neutral-400 font-semibold border-b border-neutral-800">Prompt / Action</th>
            <th className="p-4 text-neutral-400 font-semibold border-b border-neutral-800">Tool Executed</th>
            <th className="p-4 text-neutral-400 font-semibold border-b border-neutral-800">Status</th>
            <th className="p-4 text-neutral-400 font-semibold border-b border-neutral-800 text-right">Cost ($)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/50">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-neutral-800/20 transition-colors group">
              <td className="p-4 font-mono text-xs text-neutral-500 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="p-4 max-w-xs truncate text-neutral-300" title={log.prompt}>
                {log.prompt || <span className="text-neutral-600 italic">Internal reasoning</span>}
              </td>
              <td className="p-4">
                {log.tool_called ? (
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded w-fit">
                      {log.tool_called}
                    </span>
                    {log.block_reason && <span className="text-[10px] text-amber-500/80 line-clamp-1">{log.block_reason}</span>}
                  </div>
                ) : (
                  <span className="text-neutral-600 text-xs italic">—</span>
                )}
              </td>
              <td className="p-4 whitespace-nowrap">
                {getStatusBadge(log)}
              </td>
              <td className="p-4 font-mono text-xs text-right text-emerald-500/70">
                {log.cost_usd ? `$${Number(log.cost_usd).toFixed(6)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
