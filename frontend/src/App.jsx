import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AdminRoute } from './components/Guards'
import Layout from './components/Layout'
import Home from './pages/Home'
import Catalogue from './pages/Catalogue'
import ETBDetail from './pages/ETBDetail'
import Vault from './pages/Vault'
import Connexion from './pages/Connexion'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/etb/:id" element={<ETBDetail />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
