import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getAnalysis, generateFix } from '../services/api'

export default function SessionDetail() {
  const { sessionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnalysis(sessionId).then(setData).finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading...</div>
  if (!data) return <div style={{ color: '#ef4444' }}>Session not found.</div>

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>
        Session: <span style={{ color: '#6366f1', fontFamily: 'monospace' }}>{sessionId.slice(0, 8)}...</span>
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {(data.suggestions || []).map((s, i) => (
          <DetailCard key={i} suggestion={s} sessionId={sessionId} />
        ))}
      </div>
    </div>
  )
}

function DetailCard({ suggestion: s, sessionId }) {
  const [fix, setFix] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleGetFix() {
    setLoading(true)
    try {
      const result = await generateFix(sessionId, s.issue.split(' ')[0], s.issue)
      setFix(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 10, padding: 20,
    }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>{s.issue}</p>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>{s.fix}</p>
      {!fix && (
        <button onClick={handleGetFix} disabled={loading} style={{
          padding: '6px 16px', borderRadius: 6, background: '#6366f1',
          border: 'none', color: 'white', fontSize: 13, cursor: 'pointer',
        }}>
          {loading ? 'Generating fix...' : 'Generate AI Fix'}
        </button>
      )}
      {fix && fix.optimized_code && (
        <div>
          <p style={{ fontSize: 13, color: '#22c55e', marginBottom: 8 }}>{fix.explanation}</p>
          <pre className="code-block">{fix.optimized_code}</pre>
        </div>
      )}
    </div>
  )
}
