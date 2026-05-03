import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function PolicyToggle() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPolicies()

    const subscription = supabase
      .channel('policy_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'policies' }, () => {
        fetchPolicies()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  async function fetchPolicies() {
    const { data, error } = await supabase.from('policies').select('*').order('tool_name')
    if (error) {
      console.error('[PolicyToggle] Failed to fetch policies:', error.message)
      return
    }
    if (data) setPolicies(data)
    setLoading(false)
  }

  async function updatePolicy(tool_name, action) {
    const { error } = await supabase.from('policies').upsert({ tool_name, action })
    if (error) {
      console.error('[PolicyToggle] Failed to update policy:', error.message)
    }
  }

  if (loading) return <div className="text-[#52525b] text-[13px] font-medium animate-pulse py-4">loading policies...</div>

  const actionStyles = {
    ALLOW: 'bg-emerald-500/10 text-emerald-400 border-[2px] border-emerald-500/25',
    BLOCK: 'bg-red-500/10 text-red-400 border-[2px] border-red-500/25',
    APPROVAL: 'bg-amber-500/10 text-amber-400 border-[2px] border-amber-500/25',
  }

  return (
    <div className="flex flex-col gap-2.5">
      {policies.map((p) => (
        <div key={p.tool_name} className="flex items-center justify-between p-3 rounded-xl bg-[#0e0e10] border-[2px] border-[#1e1e22] hover:border-[#2a2a2e] transition-colors">
          <span className="font-mono text-[13px] text-[#a1a1aa] font-medium">{p.tool_name}</span>
          <select
            id={`policy-${p.tool_name}`}
            value={p.action}
            onChange={(e) => updatePolicy(p.tool_name, e.target.value)}
            className={`text-[12px] font-bold py-1.5 px-2.5 rounded-lg outline-none cursor-pointer appearance-none ${actionStyles[p.action] || actionStyles.APPROVAL}`}
          >
            <option value="ALLOW" className="bg-[#141416] text-emerald-400">ALLOW</option>
            <option value="APPROVAL" className="bg-[#141416] text-amber-400">APPROVAL</option>
            <option value="BLOCK" className="bg-[#141416] text-red-400">BLOCK</option>
          </select>
        </div>
      ))}
    </div>
  )
}
