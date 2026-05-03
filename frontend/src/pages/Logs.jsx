import React from 'react'
import LogsTable from '../components/LogsTable.jsx'

export default function Logs() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6 h-screen">
      <header>
        <h1 className="text-[28px] font-bold tracking-tight text-white">Audit Logs</h1>
        <p className="text-[14px] text-[#71717a] mt-1">every prompt, tool call, and security event</p>
      </header>

      <div className="flex-1 overflow-hidden card-blocky !p-0 flex flex-col">
        <LogsTable />
      </div>
    </div>
  )
}
