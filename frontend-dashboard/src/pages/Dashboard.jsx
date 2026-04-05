import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAnalysis } from '../services/api'

const CATEGORY_COLOR = {
  vitals: '#6366f1',
  render: '#f59e0b',
  bundle: '#ef4444',
  network: '#22c55e',
  architecture: '#8b5cf6',
}

export default function Dashboard() {
  const [sessionId, setSessionId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function load() {
    if (!sessionId.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await getAnalysis(sessionId.trim())
      setData(result)
    } catch (e) {
      setError(e.response?.data?.detail || 'Session not found. Make sure the extension uploaded data first.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Performance Dashboard</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>
          Enter a session ID from the Chrome extension to view analysis results.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <input
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Paste session ID from Chrome extension..."
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 8,
            background: '#1a1a2e', border: '1px solid #2d2d44',
            color: '#e2e8f0', fontSize: 14, outline: 'none',
          }}
        />
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: '#6366f1', color: 'white', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Analyze'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', background: '#1a0a0a', border: '1px solid #ef4444',
          borderRadius: 8, color: '#ef4444', fontSize: 14, marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      {data && <AnalysisView data={data} onCompare={() => navigate(`/compare?a=${sessionId}`)} />}

      {!data && !error && (
        <HowItWorks />
      )}
    </div>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor'
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 72, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{label} Performance</div>
    </div>
  )
}

function AnalysisView({ data, onCompare }) {
  const [expandedFix, setExpandedFix] = useState(null)

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '200px 1fr',
        gap: 24, marginBottom: 32,
        background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 12, padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #2d2d44' }}>
          <ScoreBadge score={data.score || 0} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Session: {data.sessionId}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['vitals', 'render', 'bundle', 'network'].map(cat => {
              const count = data.suggestions?.filter(s => s.category === cat).length || 0
              return (
                <div key={cat} style={{
                  padding: '4px 12px', borderRadius: 20,
                  background: `${CATEGORY_COLOR[cat]}22`,
                  border: `1px solid ${CATEGORY_COLOR[cat]}44`,
                  color: CATEGORY_COLOR[cat], fontSize: 12, fontWeight: 600,
                }}>
                  {count} {cat}
                </div>
              )
            })}
          </div>
          <button
            onClick={onCompare}
            style={{
              marginTop: 16, padding: '6px 16px', borderRadius: 6,
              background: 'transparent', border: '1px solid #2d2d44',
              color: '#94a3b8', fontSize: 12, cursor: 'pointer',
            }}
          >
            Compare with another session
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
        {data.suggestions?.length || 0} Optimization Opportunities
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(data.suggestions || []).map((s, i) => (
          <SuggestionCard
            key={s.id || i}
            suggestion={s}
            expanded={expandedFix === i}
            onToggle={() => setExpandedFix(expandedFix === i ? null : i)}
          />
        ))}
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion: s, expanded, onToggle }) {
  return (
    <div style={{
      background: '#1a1a2e', border: `1px solid ${CATEGORY_COLOR[s.category] || '#2d2d44'}44`,
      borderLeft: `3px solid ${CATEGORY_COLOR[s.category] || '#6366f1'}`,
      borderRadius: 8, padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 4,
              background: `${CATEGORY_COLOR[s.category]}22`,
              color: CATEGORY_COLOR[s.category] || '#6366f1',
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            }}>
              {s.category}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 4, background: '#2d2d44',
              color: '#94a3b8', fontSize: 11,
            }}>
              +{Math.round(s.impact_score * 100)}% impact
            </span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#e2e8f0' }}>{s.issue}</p>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{s.fix}</p>
        </div>
        {s.code_snippet && (
          <button
            onClick={onToggle}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #2d2d44',
              background: expanded ? '#6366f1' : 'transparent',
              color: expanded ? 'white' : '#94a3b8', fontSize: 12, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {expanded ? 'Hide Code' : 'View Fix'}
          </button>
        )}
      </div>
      {expanded && s.code_snippet && (
        <div style={{ marginTop: 12 }}>
          <pre className="code-block">{s.code_snippet}</pre>
        </div>
      )}
    </div>
  )
}

function HowItWorks() {
  const steps = [
    { n: 1, title: 'Install Extension', desc: 'Load the Chrome extension from the extension/ folder' },
    { n: 2, title: 'Browse Any Site', desc: 'Extension auto-collects Core Web Vitals + React profiling data' },
    { n: 3, title: 'Copy Session ID', desc: 'Click the extension popup to get your session ID' },
    { n: 4, title: 'View Analysis', desc: 'Paste the session ID above to see AI-powered fixes' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {steps.map(s => (
        <div key={s.n} style={{
          background: '#1a1a2e', border: '1px solid #2d2d44', borderRadius: 10, padding: 20,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, marginBottom: 12,
          }}>{s.n}</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{s.title}</div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{s.desc}</div>
        </div>
      ))}
    </div>
  )
}
