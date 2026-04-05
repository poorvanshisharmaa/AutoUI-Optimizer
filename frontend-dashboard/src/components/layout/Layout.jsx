import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

const NAV = [
  { path: '/', label: 'Dashboard' },
  { path: '/compare', label: 'Compare' },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        gap: 24,
      }}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
          AutoUI Optimizer
        </span>
        <nav style={{ display: 'flex', gap: 4 }}>
          {NAV.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              style={{
                padding: '4px 14px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                color: 'white',
                textDecoration: 'none',
                background: pathname === path ? 'rgba(255,255,255,0.2)' : 'transparent',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7 }}>
          Powered by Groq + Llama 3
        </div>
      </header>
      <main style={{ flex: 1, padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  )
}
