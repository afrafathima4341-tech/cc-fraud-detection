export default function AxiomaSection({ num, title, kicker, children, id }) {
  return (
    <section id={id} style={{ padding: '100px 40px', position: 'relative' }}>
      <div className="section-header">
        <div>
          <div className="section-num">{num}</div>
          <h2 className="section-title font-display">{title}</h2>
        </div>
        <div></div>
        <p className="section-kicker">{kicker}</p>
      </div>
      {children}
    </section>
  )
}
