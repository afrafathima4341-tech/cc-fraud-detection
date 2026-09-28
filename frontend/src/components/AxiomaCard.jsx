import { forwardRef } from 'react'

const AxiomaCard = forwardRef(({ title, subtitle, children, className = '', ...props }, ref) => {
  return (
    <div ref={ref} className={`card ${className}`} {...props} style={{ padding: 32 }}>
      {(title || subtitle) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            {title && <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700 }}>{title}</div>}
            {subtitle && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{subtitle}</div>}
          </div>
        </div>
      )}
      {children}
    </div>
  )
})

export default AxiomaCard
