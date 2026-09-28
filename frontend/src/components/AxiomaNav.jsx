import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function AxiomaNav() {
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeMenu = () => setSidebarOpen(false)

  useEffect(() => {
    if (!sidebarOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  const renderLinks = (onNavigate) => (
    <>
      <NavLink to="/dashboard" onClick={onNavigate} className={({ isActive }) => `axioma-nav__link${isActive ? ' is-active' : ''}`}>
        Dashboard
      </NavLink>
      <NavLink to="/transactions" onClick={onNavigate} className={({ isActive }) => `axioma-nav__link${isActive ? ' is-active' : ''}`}>
        Transactions
      </NavLink>
    </>
  )

  if (!user) return null

  return (
    <>
      <header className="axioma-nav">
        <Link to="/dashboard" className="axioma-nav__brand" onClick={closeMenu} aria-label="AXIOMA home">
          <span className="axioma-nav__mark" aria-hidden="true">∠</span>
          <span>AXIOMA</span>
        </Link>

        <nav className="axioma-nav__links" aria-label="Primary navigation">
          {renderLinks()}
        </nav>

        <div className="axioma-nav__account">
          <span className="axioma-nav__username">{user.username}</span>
          <button className="axioma-nav__signout" onClick={logout}>Sign out</button>
        </div>

        <button
          className="axioma-nav__toggle"
          type="button"
          aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={sidebarOpen}
          aria-controls="axioma-mobile-menu"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <span aria-hidden="true">{sidebarOpen ? '×' : '☰'}</span>
        </button>
      </header>

      {sidebarOpen && (
        <div className="axioma-nav__mobile-menu" id="axioma-mobile-menu">
          <button className="axioma-nav__backdrop" type="button" aria-label="Close navigation menu" onClick={closeMenu} />
          <div className="axioma-nav__mobile-panel">
            <nav className="axioma-nav__mobile-links" aria-label="Mobile primary navigation">
              {renderLinks(closeMenu)}
            </nav>
            <div className="axioma-nav__mobile-account">
              <span className="axioma-nav__username">{user.username}</span>
              <button className="axioma-nav__signout" onClick={logout}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}