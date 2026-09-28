import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function AxiomaNav() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  if (!user) return null

  return (
    <div className="flex">
      {/* Mobile hamburger menu */}
      <button
        onClick={toggleSidebar}
        style={{
          display: sidebarOpen ? 'none' : 'block',
          background: 'transparent',
          border: 'none',
          color: 'var(--fg)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 20,
          cursor: 'pointer',
          padding: '8px',
        }}
      >
        ☰
      </button>

      {/* Desktop sidebar (visible on wide screens) */}
      {sidebarOpen ? (
        <nav
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '250px',
            height: '100%',
            background: 'var(--bg-card)',
            borderRight: '1px solid var(--border)',
            zIndex: 100,
            padding: '20px',
            overflowY: 'auto',
          }}>
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: 18, color: 'var(--accent)' }}>
              AXIOMA
            </span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '12px' }}>
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li style={{ marginBottom: '12px' }}>
              <Link to="/transactions">Transactions</Link>
            </li>
          </ul>
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <button
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 12,
                textAlign: 'left',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
              }}
              onClick={logout}
            >
              Sign out
            </button>
          </div>
        </nav>
      ) : null}

      {/* Top navigation bar (visible on mobile & as fallback) */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: sidebarOpen ? '250px' : 0,
          right: 0,
          zIndex: 100,
          height: 64,
          padding: '0 40px',
          backdropFilter: 'blur(20px)',
          background: 'rgba(13,14,20,0.8)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <div className="logo" style={{
          fontFamily: 'Fraunces, serif',
          fontWeight: 900,
          fontSize: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 26,
            height: 26,
            background: 'var(--accent)',
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--bg)',
            fontWeight: 900,
            transform: 'rotate(-8deg)',
          }}>∠</span>
          AXIOMA
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--fg-dim)' }}>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/transactions">Transactions</Link>
        </div>
        {user && (
          <button style={{ padding: '6px 12px', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--fg)', onClick: logout }}>
            Sign out
          </button>
        )}
      </nav>
    </div>
  )
}