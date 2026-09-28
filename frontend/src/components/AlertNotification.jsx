import { useEffect, useState } from 'react'
import { useToast } from './Toast'
import { onFraudAlert, connectWebSocket, disconnectWebSocket } from '../services/websocket'
import { useAuthStore } from '../store/authStore'

export default function AlertNotification() {
  const { token } = useAuthStore()
  const { addToast } = useToast()
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    if (!token) return
    connectWebSocket(token)
    const handleAlert = (alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 5))
      addToast(`Fraud Alert: ${alert.merchant_name || alert.merchant} - ${alert.currency || 'USD'} ${alert.amount}`, 'error')
    }
    onFraudAlert(handleAlert)
    return () => {
      disconnectWebSocket()
    }
  }, [token, addToast])

  if (alerts.length === 0) return null

  return (
    <div style={{ position:'fixed', bottom:16, right:16, zIndex:50, width:380 }}>
      {alerts.map((a,i)=>(
        <div key={i} className="card" style={{ marginBottom:12, padding:16, background:'var(--bg-card)', border:'1px solid var(--accent-2)' }}>
          <div style={{ fontFamily:'Fraunces, serif', fontWeight:800, fontSize:18, color:'var(--accent-2)' }}>Fraud Alert</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--fg-dim)', marginTop:4 }}>{new Date(a.timestamp).toLocaleString()}</div>
          <div style={{ marginTop:12, fontSize:14 }}>
            {[
              ['Tx ID', a.transaction_id],
              ['Amount', `${a.currency||'USD'} ${a.amount}`],
              ['Merchant', a.merchant_name||'N/A'],
              ['Bank', a.merchant_bank||'N/A'],
              ['Location', a.merchant_location||'N/A'],
              ['Card', `**** ${a.card_last4||'****'}`],
              ['Channel', a.channel||'N/A'],
              ['IP', a.ip_address||'N/A'],
              ['Device', a.device_id||'N/A'],
              ['Risk', `${a.risk_level} (${a.fraud_score})`],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--fg-dim)', fontFamily:'JetBrains Mono, monospace', fontSize:11 }}>{k}</span>
                <span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
