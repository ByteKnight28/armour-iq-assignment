import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Check, X, Clock } from 'lucide-react'

export default function ApprovalQueue() {
  const [queue, setQueue] = useState([])

  useEffect(() => {
    fetchQueue()

    const subscription = supabase
      .channel('approval_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_queue' }, () => {
        fetchQueue()
      })
      .subscribe()

    return () => supabase.removeChannel(subscription)
  }, [])

  async function fetchQueue() {
    const { data } = await supabase
      .from('approval_queue')
      .select('*')
      .eq('status', 'PENDING')
      .order('timestamp', { ascending: false })
    
    if (data) setQueue(data)
  }

  async function handleDecision(id, status) {
    await supabase
      .from('approval_queue')
      .update({ status, decided_at: new Date().toISOString() })
      .eq('id', id)
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
        <Clock className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Queue is empty</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pr-2 max-h-[300px] scrollbar-thin scrollbar-thumb-neutral-800">
      {queue.map((req) => (
        <div key={req.id} className="p-4 rounded-xl bg-neutral-950/80 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              {req.tool_name}
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {new Date(req.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="bg-neutral-900 rounded p-2 text-xs font-mono text-neutral-300 break-all border border-neutral-800">
            {JSON.stringify(req.tool_args, null, 2)}
          </div>

          <div className="flex gap-2 mt-1">
            <button 
              onClick={() => handleDecision(req.id, 'APPROVED')}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold border border-emerald-500/20"
            >
              <Check className="w-3 h-3" /> Approve
            </button>
            <button 
              onClick={() => handleDecision(req.id, 'DENIED')}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold border border-rose-500/20"
            >
              <X className="w-3 h-3" /> Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
