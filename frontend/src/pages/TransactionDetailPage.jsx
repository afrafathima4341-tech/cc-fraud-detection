import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../components/Toast'
import AxiomaSection from '../components/AxiomaSection'
import AxiomaCard from '../components/AxiomaCard'
import { formatCurrency } from '../utils/formatters'

export default function TransactionDetailPage() {
  const { transactionId } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [transaction, setTransaction] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creatingCase, setCreatingCase] = useState(false)

  useEffect(() => {
    fetchTransaction()
  }, [transactionId])

  const fetchTransaction = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/transactions/${transactionId}`)
      setTransaction(response.data)

      // Fetch fraud explanation if fraud was predicted or if alert exists
      if (response.data.is_fraud_predicted || response.data.fraud_score > 0.3) {
        try {
          const alertResponse = await api.get(`/fraud-alerts/${response.data.fraud_alert_id || response.data.id}/explanation`)
          setExplanation(alertResponse.data)
        } catch {
          // Fallback explanation if endpoint is indexed by alert
        }
      }
    } catch (error) {
      console.error('Failed to fetch transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCase = async () => {
    try {
      setCreatingCase(true)
      const res = await api.post('/cases', {
        transaction_id: transaction.id,
        priority: transaction.fraud_score > 0.7 ? 'CRITICAL' : 'HIGH',
        notes: `Escalated from transaction analysis page. Risk score: ${transaction.fraud_score}`
      })
      addToast(`Opened Case ${res.data.case.case_number}`)
      navigate('/cases')
    } catch (err) {
      console.error('Failed to open investigation case:', err)
      addToast('Error opening investigation case')
    } finally {
      setCreatingCase(false)
    }
  }

  if (loading) {
    return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-dim)' }}>Loading...</div>
  }

  if (!transaction) {
    return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-dim)' }}>Transaction not found</div>
  }

  const riskBadge = transaction.is_fraud_predicted ? '⚠️ FRAUDULENT' : '✓ LEGITIMATE'
  const riskColor = transaction.is_fraud_predicted ? 'var(--accent-2)' : 'var(--accent-3)'

  return (
    <div className="bg-grid" style={{ minHeight:'100vh', paddingTop:100, paddingBottom:60 }}>
      <AxiomaSection num="02 — TRANSACTION" title={`Transaction #${transaction.id}`} kicker={new Date(transaction.timestamp).toLocaleString()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <button onClick={()=>navigate('/transactions')} className="btn-secondary" style={{ padding:'8px 16px', fontSize:13 }}>← Back</button>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <button
              onClick={handleOpenCase}
              disabled={creatingCase}
              className="btn-primary"
              style={{ padding:'8px 16px', fontSize:13, fontWeight:600 }}
            >
              ⚡ Open Investigation Case
            </button>
            <div style={{ padding:'8px 16px', borderRadius:8, background:'rgba(255,94,98,0.1)', color:riskColor, fontWeight:700, border:'1px solid var(--border)' }}>
              {riskBadge}
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:24, marginBottom:32 }}>
          <AxiomaCard title="Transaction Details" subtitle="METADATA">
            {[
              ['Customer ID', transaction.customer_id],
              ['Merchant', transaction.merchant_name],
              ['Merchant Bank', transaction.merchant_bank || 'N/A'],
              ['Payer Bank', transaction.payer_bank || 'N/A'],
              ['Merchant Location', transaction.merchant_location || 'N/A'],
              ['Merchant ID', transaction.merchant_id],
              ['UPI ID', transaction.upi_id || 'N/A'],
              ['Card Network', transaction.card_network || 'N/A'],
              ['Card', transaction.card_id ? `${transaction.card_id} ****${transaction.card_last4 || '****'}` : 'N/A'],
              ['Channel', transaction.channel || 'N/A'],
              ['Device ID', transaction.device_id || 'N/A'],
              ['IP Address', transaction.ip_address || 'N/A'],
              ['Category', transaction.category || 'N/A'],
            ].map(([k,v])=>(
              <div key={k} style={{ marginBottom:12 }}>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{k}</div>
                <div style={{ fontSize:15 }}>{v}</div>
              </div>
            ))}
          </AxiomaCard>

          <AxiomaCard title="Amount & Risk" subtitle="SCORE">
            <div style={{ fontSize:36, fontFamily:'Fraunces, serif', fontWeight:700, color:'var(--accent)', overflowWrap:'anywhere' }}>
              {formatCurrency(transaction.amount, transaction.currency)}
            </div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--fg-dim)', marginTop:4 }}>Transaction Amount</div>
            <div style={{ marginTop:24, fontSize:36, fontFamily:'Fraunces, serif', fontWeight:700, color:riskColor }}>
              {transaction.fraud_score.toFixed(3)}
            </div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--fg-dim)', marginTop:4 }}>Fraud Score (GNN Blended)</div>
          </AxiomaCard>
        </div>

        {explanation && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:24, marginBottom:32 }}>
            {/* GNN Subgraph Pathways Attribution */}
            {explanation.subgraph_attribution?.length > 0 && (
              <AxiomaCard title="GNN Subgraph Attribution" subtitle="EXPLAINABLE GRAPH AI">
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {explanation.subgraph_attribution.map((path, idx) => (
                    <div key={idx} style={{ padding:14, borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>
                          {path.source} ➔ {path.target}
                        </span>
                        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, padding:'2px 6px', borderRadius:4, background:'rgba(255,94,98,0.15)', color:'var(--accent-2)' }}>
                          Attribution: {(path.attribution_weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--fg-dim)' }}>{path.explanation}</div>
                    </div>
                  ))}
                </div>
              </AxiomaCard>
            )}

            {/* Feature Importance Attribution */}
            {explanation.feature_importance?.length > 0 && (
              <AxiomaCard title="Predictive Feature Weights" subtitle="SHAP / GNN RANKING">
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {explanation.feature_importance.map((f, idx) => (
                    <div key={idx}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                        <span>{f.feature}</span>
                        <span style={{ fontFamily:'JetBrains Mono, monospace' }}>{(f.contribution * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ height:6, width:'100%', background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${f.contribution * 100}%`, background:'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius:3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </AxiomaCard>
            )}
          </div>
        )}

        {explanation && (
          <AxiomaCard title="Fraud Analysis & Triage Recommendation" subtitle="EXPLANATION">
            <div style={{ padding:'16px', borderRadius:12, background:'var(--bg-card-2)', border:'1px solid var(--border)', marginBottom:24 }}>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Risk Level</div>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:32, fontWeight:700, marginTop:8 }}>{explanation.risk_level}</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--fg-dim)', marginTop:4 }}>
                Recommended Action: <strong>{explanation.recommendation}</strong>
              </div>
            </div>
            {explanation.factors?.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{ fontFamily:'Fraunces, serif', fontWeight:600, marginBottom:12 }}>Contributing Behavioral Factors</div>
                <div style={{ display:'grid', gap:12 }}>
                  {explanation.factors.map((f,i)=>(
                    <div key={i} style={{ padding:16, background:'var(--bg-card-2)', borderLeft:'3px solid var(--accent-2)', borderRadius:8 }}>
                      <div style={{ fontWeight:700, color:'var(--accent-2)' }}>{f.factor}</div>
                      <div style={{ color:'var(--fg-dim)', fontSize:14, marginTop:4 }}>{f.description}</div>
                      <div style={{ marginTop:8, fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--accent-2)' }}>Severity: {f.severity}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AxiomaCard>
        )}
      </AxiomaSection>
    </div>
  )
}
