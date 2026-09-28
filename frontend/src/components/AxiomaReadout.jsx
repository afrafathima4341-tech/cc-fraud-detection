export default function AxiomaReadout({ label, value, unit, className = '', title, ariaLabel }) {
  return (
    <div className={`readout ${className}`}>
      <div className="readout-label">{label}</div>
      <div className="readout-value" title={title} aria-label={ariaLabel}>
        {value}
        {unit && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--fg-dim)', marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  )
}
