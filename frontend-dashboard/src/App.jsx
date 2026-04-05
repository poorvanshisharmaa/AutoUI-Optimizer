import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import SessionDetail from './pages/SessionDetail'
import Compare from './pages/Compare'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:sessionId" element={<SessionDetail />} />
        <Route path="/compare" element={<Compare />} />
      </Routes>
    </Layout>
  )
}
