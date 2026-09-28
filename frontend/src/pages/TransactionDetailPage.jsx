import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import AxiomaSection from '../components/AxiomaSection'
import AxiomaCard from '../components/AxiomaCard'

export default function TransactionDetailPage() {
  const { transactionId } = useParams()
  const navigate = useNavigate()
  const [transaction, setTransaction] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransaction()
  }, [transactionId])

  const fetchTransaction = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/transactions/${transactionId}`)
      setTransaction(response.data)

      // Fetch fraud explanation if fraud was detected
      if (response.data.is_fraud_predicted) {
        const alertResponse = await api.get(`/fraud-alerts/${response.data.fraud_alert_id}/explanation`)
        setExplanation(alertResponse.data)
      }
    } catch (error) {
      console.error('Failed to fetch transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-dim)' }}>Loading...</div>
  }

  if (!transaction) {
    return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-dim)' }}>Transaction not found</div>
  }

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50'
      case 'HIGH':
        return 'text-red-500 bg-red-50'
      case 'MEDIUM':
        return 'text-orange-600 bg-orange-50'
      case 'LOW':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  const riskBadge = transaction.is_fraud_predicted ? '⚠️ FRAUDULENT' : '✓ LEGITIMATE'
  const riskColor = transaction.is_fraud_predicted ? 'var(--accent-2)' : 'var(--accent-3)'

  return (
    <div className="bg-grid" style={{ minHeight:'100vh', paddingTop:100 }}>
      <AxiomaSection num="02 — TRANSACTION" title={`Transaction #${transaction.id}`} kicker={new Date(transaction.timestamp).toLocaleString()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <button onClick={()=>navigate('/transactions')} className="btn-secondary" style={{ padding:'8px 16px', fontSize:13 }}>← Back</button>
          <div style={{ padding:'8px 16px', borderRadius:8, background:'rgba(255,94,98,0.1)', color:riskColor, fontWeight:700, border:'1px solid var(--border)' }}>{riskBadge}</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:24, marginBottom:32 }}>
          <AxiomaCard title="Transaction Details" subtitle="METADATA">
            {[
              ['Customer ID', transaction.customer_id],
              ['Merchant', transaction.merchant_name],
              ['Merchant Bank', transaction.merchant_bank || 'N/A'],
              ['Merchant Location', transaction.merchant_location || 'N/A'],
              ['Merchant ID', transaction.merchant_id],
              ['Card', `${transaction.card_id} ****${transaction.card_last4 || '****'}`],
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
            <div style={{ fontSize:36, fontFamily:'Fraunces, serif', fontWeight:700, color:'var(--accent)' }}>{transaction.currency || 'USD'} {transaction.amount.toFixed(2)}</div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--fg-dim)', marginTop:4 }}>Transaction Amount</div>
            <div style={{ marginTop:24, fontSize:36, fontFamily:'Fraunces, serif', fontWeight:700, color:riskColor }}>{transaction.fraud_score.toFixed(3)}</div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--fg-dim)', marginTop:4 }}>Fraud Score</div>
          </AxiomaCard>
        </div>

        {explanation && transaction.is_fraud_predicted && (
          <AxiomaCard title="Fraud Analysis" subtitle="EXPLANATION">
            <div style={{ padding:'16px', borderRadius:12, background:'var(--bg-card-2)', border:'1px solid var(--border)', marginBottom:24 }}>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Risk Level</div>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:32, fontWeight:700, marginTop:8 }}>{explanation.risk_level}</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--fg-dim)', marginTop:4 }}>Recommendation: {explanation.recommendation}</div>
            </div>
            {explanation.factors?.length>0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{ fontFamily:'Fraunces, serif', fontWeight:600, marginBottom:12 }}>Contributing Factors</div>
                <div style={{ display:'grid', gap:12 }}>
                  {explanation.factors.map((f,i)=>(
                    <div key={i} style={{ padding:16, background:'var(--bg-card-2)', borderLeft:'3px solid var(--accent-2)', borderRadius:8 }}>
                      <div style={{ fontWeight:700, color:'var(--accent-2)' }}>{f.factor}</div>
                      <div style={{ color:'var(--fg-dim)', fontSize:14, marginTop:4 }}>{f.description}</div>
                      <div style={{ marginTop:8, fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--accent-2)' }}>{f.severity}</div>
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
