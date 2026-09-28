export default function AxiomaReadout({ label, value, unit, className = '' }) {
  return (
    <div className={`readout ${className}`}>
      <div className="readout-label">{label}</div>
      <div className="readout-value">
        {value}
        {unit && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--fg-dim)', marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  )
}
