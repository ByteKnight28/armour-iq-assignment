import React from 'react'
import PolicyToggle from '../components/PolicyToggle.jsx'
import ChatWindow from '../components/ChatWindow.jsx'
import ApprovalQueue from '../components/ApprovalQueue.jsx'

export default function Dashboard({ chatMessages, setChatMessages }) {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Header */}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-[14px] text-[#71717a] mt-1">manage policies, approve requests, chat with the agent</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Tool Policies */}
          <section className="card-blocky">
            <h2 className="text-[16px] font-bold text-white mb-4 flex items-center gap-2.5">
              <span className="w-2 h-5 rounded-sm bg-[#7c3aed]"></span>
              Tool Policies
            </h2>
            <PolicyToggle />
          </section>

          {/* Approval Queue */}
          <section className="card-blocky flex-1">
            <h2 className="text-[16px] font-bold text-white mb-4 flex items-center gap-2.5">
              <span className="w-2 h-5 rounded-sm bg-amber-400"></span>
              Approval Queue
            </h2>
            <ApprovalQueue />
          </section>
        </div>

        {/* Right column — Chat */}
        <div className="lg:col-span-2">
          <section className="card-blocky !p-0 h-[calc(100vh-11rem)] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b-[2.5px] border-[#2a2a2e] flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
              <h2 className="text-[16px] font-bold text-white">Chat</h2>
            </div>
            <ChatWindow messages={chatMessages} setMessages={setChatMessages} />
          </section>
        </div>
      </div>
    </div>
  )
}
