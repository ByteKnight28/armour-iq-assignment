import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Shield, Activity } from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import Logs from './pages/Logs.jsx'

function App() {
  const location = useLocation();
  const [chatMessages, setChatMessages] = useState([]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex font-sans selection:bg-indigo-500/30">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3 text-indigo-400 font-bold text-xl tracking-tight">
          <Shield className="w-6 h-6" />
          <span>Armour IQ</span>
        </div>
        
        <nav className="flex flex-col gap-2 mt-4">
          <Link 
            to="/" 
            className={`px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${location.pathname === '/' ? 'bg-indigo-500/10 text-indigo-400' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'}`}
          >
            <Shield className="w-4 h-4" />
            Dashboard
          </Link>
          <Link 
            to="/logs" 
            className={`px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${location.pathname === '/logs' ? 'bg-indigo-500/10 text-indigo-400' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'}`}
          >
            <Activity className="w-4 h-4" />
            Audit Logs
          </Link>
        </nav>

        <div className="mt-auto">
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Agent Status</h4>
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
              Online & Guarded
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-neutral-950 to-neutral-900">
        <Routes>
          <Route path="/" element={<Dashboard chatMessages={chatMessages} setChatMessages={setChatMessages} />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
