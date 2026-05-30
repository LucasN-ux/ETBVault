import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Catalogue from './pages/Catalogue'
import ETBDetail from './pages/ETBDetail'
import Vault from './pages/Vault'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/etb/:id" element={<ETBDetail />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/portfolio" element={<Vault />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
