export default function AxiomaBadge({ children }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 16px',
      border: '1px solid var(--border-strong)',
      borderRadius: 999,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      color: 'var(--fg-dim)',
      letterSpacing: '0.05em',
    }}>
      <span className="live-dot" />
      {children}
    </div>
  )
}
