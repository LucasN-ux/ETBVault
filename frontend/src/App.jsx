import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ETBDetail from './pages/ETBDetail'
import Home from './pages/Home'
import Catalogue from './pages/Catalogue'
import Vault from './pages/Vault'

function ETBLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barre mobile */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <span className="text-pokemon-yellow font-bold text-base">ETBVault</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <ETBDetail />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/etb/:id" element={<ETBLayout />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/portfolio" element={<Vault />} />
      </Routes>
    </BrowserRouter>
  )
}
