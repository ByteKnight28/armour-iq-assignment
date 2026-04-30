import React from 'react'
import LogsTable from '../components/LogsTable.jsx'

export default function Logs() {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 h-screen">
      <header>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Audit Logs</h1>
        <p className="text-neutral-400 mt-2">Comprehensive tracking of all agent prompts, tool executions, and security blocks.</p>
      </header>

      <div className="flex-1 overflow-hidden bg-neutral-900/40 border border-neutral-800/60 rounded-2xl shadow-2xl backdrop-blur-sm flex flex-col">
        <LogsTable />
      </div>
    </div>
  )
}
