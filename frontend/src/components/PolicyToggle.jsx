import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ShieldAlert, ShieldCheck, Clock } from 'lucide-react'

export default function PolicyToggle() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPolicies()

    const subscription = supabase
      .channel('policy_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'policies' }, (payload) => {
        fetchPolicies()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  async function fetchPolicies() {
    const { data, error } = await supabase.from('policies').select('*').order('tool_name')
    if (!error && data) setPolicies(data)
    setLoading(false)
  }

  async function updatePolicy(tool_name, action) {
    await supabase.from('policies').upsert({ tool_name, action })
  }

  if (loading) return <div className="text-neutral-500 animate-pulse text-sm">Loading policies...</div>

  return (
    <div className="flex flex-col gap-3">
      {policies.map((p) => (
        <div key={p.tool_name} className="flex flex-col gap-2 p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/50 hover:border-neutral-700/50 transition-colors group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-neutral-300 group-hover:text-indigo-300 transition-colors">{p.tool_name}</span>
            <select
              value={p.action}
              onChange={(e) => updatePolicy(p.tool_name, e.target.value)}
              className={`text-xs font-bold py-1 px-2 rounded outline-none cursor-pointer appearance-none ${
                p.action === 'ALLOW' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                p.action === 'BLOCK' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <option value="ALLOW" className="bg-neutral-900 text-emerald-400">ALLOW</option>
              <option value="APPROVAL" className="bg-neutral-900 text-amber-400">APPROVAL</option>
              <option value="BLOCK" className="bg-neutral-900 text-rose-400">BLOCK</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}
