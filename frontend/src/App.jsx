import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { MessageSquare, Activity, Zap } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Logs from './pages/Logs.jsx'

function App() {
  const location = useLocation();
  const [chatMessages, setChatMessages] = useState([]);

  const navItems = [
    { to: '/', label: 'Chat', icon: MessageSquare },
    { to: '/logs', label: 'Logs', icon: Activity },
  ];

  return (
    <div className="min-h-screen flex font-sans">
      
      {/* Sidebar */}
      <aside className="w-60 bg-[#111113] border-r-[2.5px] border-[#1e1e22] flex flex-col">
        
        {/* Logo */}
        <div className="px-5 py-6 border-b-[2.5px] border-[#1e1e22]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7c3aed] flex items-center justify-center shadow-[0_4px_12px_rgba(124,58,237,0.35)]">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight text-white leading-none">MCP Chatbot</h1>
              <p className="text-[11px] text-[#71717a] mt-0.5 tracking-wide">control panel</p>
            </div>
          </div>
        </div>
        
        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#7c3aed]/12 text-[#a78bfa] border-[2px] border-[#7c3aed]/25'
                    : 'text-[#a1a1aa] hover:text-white hover:bg-[#1a1a1e] border-[2px] border-transparent'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        <div className="mt-auto p-4">
          <div className="card-blocky !p-3.5 !border-[#27272a]">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
              <span className="text-[13px] font-semibold text-[#a1a1aa]">Agent Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-[#0e0e10]">
        <Routes>
          <Route path="/" element={<Dashboard chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
