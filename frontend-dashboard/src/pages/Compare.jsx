import { useState } from 'react'
import { compareSessions } from '../services/api'

export default function Compare() {
  const [before, setBefore] = useState('')
  const [after, setAfter] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function compare() {
    if (!before.trim() || !after.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await compareSessions(before.trim(), after.trim())
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Comparison failed.')
    } finally {
      setLoading(false)
    }
  }

  const improvement = result ? result.improvement_percent : 0
  const improved = improvement > 0

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Compare Sessions</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>
        Measure the performance improvement after applying optimizations.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {[['Before Session ID', before, setBefore], ['After Session ID', after, setAfter]].map(([label, val, set]) => (
          <div key={label}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{label}</label>
            <input
              value={val}
              onChange={e => set(e.target.value)}
              placeholder="Session ID..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: '#1a1a2e', border: '1px solid #2d2d44',
                color: '#e2e8f0', fontSize: 14, outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={compare}
        disabled={loading}
        style={{
          padding: '10px 28px', borderRadius: 8, border: 'none',
          background: '#6366f1', color: 'white', fontSize: 14,
          fontWeight: 600, cursor: 'pointer', marginBottom: 24,
        }}
      >
        {loading ? 'Comparing...' : 'Compare'}
      </button>

      {error && <div style={{ color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}

      {result && (
        <div style={{
          background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 12, padding: 24,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center', marginBottom: 24 }}>
            <ScoreBox label="Before" score={result.before_score} />
            <div style={{
              fontSize: 32, fontWeight: 900,
              color: improved ? '#22c55e' : '#ef4444',
              textAlign: 'center',
            }}>
              {improved ? '+' : ''}{improvement}%
            </div>
            <ScoreBox label="After" score={result.after_score} />
          </div>

          {result.improved_metrics.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>
                Improved Metrics
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {result.improved_metrics.map(m => (
                  <span key={m} style={{
                    padding: '4px 12px', borderRadius: 20,
                    background: '#22c55e22', border: '1px solid #22c55e44',
                    color: '#22c55e', fontSize: 12, fontWeight: 700,
                  }}>{m}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreBox({ label, score }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ textAlign: 'center', padding: '16px', background: '#0f0f1a', borderRadius: 10 }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 48, fontWeight: 900, color }}>{score}</div>
    </div>
  )
}
