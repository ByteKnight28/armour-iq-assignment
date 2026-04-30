import React from 'react'
import PolicyToggle from '../components/PolicyToggle.jsx'
import ChatWindow from '../components/ChatWindow.jsx'
import ApprovalQueue from '../components/ApprovalQueue.jsx'

export default function Dashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Agent Control Center</h1>
        <p className="text-neutral-400 mt-2">Manage MCP tool policies, approve requests, and interact with the guarded agent.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Policies & Queue */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <section className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
            <h2 className="text-xl font-bold text-neutral-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
              Tool Policies
            </h2>
            <PolicyToggle />
          </section>

          <section className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 shadow-2xl backdrop-blur-sm flex-1">
            <h2 className="text-xl font-bold text-neutral-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
              Approval Queue
            </h2>
            <ApprovalQueue />
          </section>
        </div>

        {/* Right Column - Chat */}
        <div className="lg:col-span-2">
          <section className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl shadow-2xl backdrop-blur-sm h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-800/60 bg-neutral-900/80">
              <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Secure Terminal
              </h2>
            </div>
            <ChatWindow />
          </section>
        </div>
      </div>
    </div>
  )
}
