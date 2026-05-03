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
      <div className="flex flex-col items-center justify-center py-10 text-[#3f3f46] border-[2px] border-dashed border-[#27272a] rounded-xl">
        <Clock className="w-7 h-7 mb-2" strokeWidth={1.5} />
        <p className="text-[13px] font-medium">nothing pending</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pr-1 max-h-[300px]">
      {queue.map((req) => (
        <div key={req.id} className="p-4 rounded-xl bg-[#0e0e10] border-[2px] border-amber-500/20 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              {req.tool_name}
            </span>
            <span className="text-[11px] text-[#52525b] font-mono">
              {new Date(req.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="bg-[#141416] rounded-lg p-2.5 text-[12px] font-mono text-[#a1a1aa] break-all border-[2px] border-[#1e1e22]">
            {JSON.stringify(req.tool_args, null, 2)}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => handleDecision(req.id, 'APPROVED')}
              className="btn-chunky flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white text-[12px] border-[2px] border-emerald-500/20"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} /> Approve
            </button>
            <button 
              onClick={() => handleDecision(req.id, 'DENIED')}
              className="btn-chunky flex-1 flex items-center justify-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-[12px] border-[2px] border-red-500/20"
            >
              <X className="w-3.5 h-3.5" strokeWidth={3} /> Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
