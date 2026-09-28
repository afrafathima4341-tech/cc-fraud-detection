import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  RadialBarChart, RadialBar, ComposedChart, ScatterChart, Scatter, ZAxis,
  AreaChart, Area
} from 'recharts'
import { connectWebSocket, disconnectWebSocket, onTransactionUpdate, offTransactionUpdate, onFraudAlert, offFraudAlert } from '../services/websocket'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import AxiomaSection from '../components/AxiomaSection'
import AxiomaCard from '../components/AxiomaCard'
import AxiomaReadout from '../components/AxiomaReadout'
import AxiomaBadge from '../components/AxiomaBadge'
import { formatCompactINR, formatCompactNumber, formatINR, formatNumber } from '../utils/formatters'

const timeRanges = [
  {label:'24h', value:'1'},
  {label:'7d', value:'7'},
  {label:'30d', value:'30'},
  {label:'90d', value:'90'},
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState([])
  const [riskCategories, setRiskCategories] = useState([])
  const [fraudDistribution, setFraudDistribution] = useState(null)
  const [merchants, setMerchants] = useState([])
  const [customers, setCustomers] = useState([])
  const [alertSummary, setAlertSummary] = useState(null)
  const [liveAlerts, setLiveAlerts] = useState([])
  const [timeRange, setTimeRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [fraudHistogram, setFraudHistogram] = useState([])
  const [riskRadar, setRiskRadar] = useState([])
  const [geoData, setGeoData] = useState([])
  const [channelData, setChannelData] = useState([])
  const [realTimeStream, setRealTimeStream] = useState([])
  const [websocketConnected, setWebsocketConnected] = useState(false)
  const { token } = useAuthStore()

  useEffect(() => {
    if (token) {
      let mounted = true
      let retryCount = 0
      const maxRetries = 5

      const connectWithRetry = () => {
        connectWebSocket(token)

        // Verify connection is active
        setTimeout(() => {
          if (mounted && retryCount < maxRetries) {
            // Check if socket is still connected
            const socket = getSocket()
            if (!socket) {
              retryCount++
              connectWithRetry()
        setWebsocketConnected(true)
            }
          }
        }, 3000)
      }

      connectWithRetry()

      const handleTransactionUpdate = () => {
        fetchStats()
        setRealTimeStream(prev => {
          const newItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            amount: Math.random() * 1000 + 10,
            risk: Math.random() > 0.8 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low'
          }
          return [newItem, ...prev].slice(0, 50)
        })
      }
      
      const handleFraudAlert = (alert) => {
        setLiveAlerts(prev => {
          const exists = prev.some(a => a.alert_id === alert.alert_id)
          if (!exists) return [alert, ...prev].slice(0, 20)
          return prev
        })
      }

      onTransactionUpdate(handleTransactionUpdate)
      onFraudAlert(handleFraudAlert)

      return () => {
        mounted = false
        offTransactionUpdate(handleTransactionUpdate)
        offFraudAlert(handleFraudAlert)
        disconnectWebSocket()
      }
    }
  }, [token])

  useEffect(() => {
    fetchAll()
  }, [timeRange])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([
      fetchStats(),
      fetchTrends(),
      fetchRiskCategories(),
      fetchFraudDistribution(),
      fetchMerchants(),
      fetchCustomers(),
      fetchAlertSummary(),
      fetchFraudHistogram(),
      fetchRiskRadar(),
      fetchGeoData(),
      fetchChannelData(),
    ])
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }

  const fetchTrends = async () => {
    try {
      const response = await api.get(`/dashboard/trends?days=${timeRange}`)
      setTrends(response.data)
    } catch (e) {
      console.error('Failed to fetch trends:', e)
    }
  }

  const fetchRiskCategories = async () => {
    try {
      const response = await api.get('/dashboard/risk-categories')
      setRiskCategories(response.data)
    } catch (e) {
      console.error('Failed to fetch risk categories:', e)
    }
  }

  const fetchFraudDistribution = async () => {
    try {
      const response = await api.get('/dashboard/fraud-distribution')
      setFraudDistribution(response.data)
    } catch (e) {
      console.error('Failed to fetch fraud distribution:', e)
    }
  }

  const fetchMerchants = async () => {
    try {
      const response = await api.get('/transactions/analytics/merchants')
      setMerchants(response.data.slice(0,10))
    } catch (e) {
      console.error('Failed to fetch merchants:', e)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/transactions/analytics/customers')
      setCustomers(response.data.slice(0,10))
    } catch (e) {
      console.error('Failed to fetch customers:', e)
    }
  }

  const fetchAlertSummary = async () => {
    try {
      const response = await api.get('/fraud-alerts/summary/overview')
      setAlertSummary(response.data)
    } catch (e) {
      console.error('Failed to fetch alert summary:', e)
    }
  }

  const fetchFraudHistogram = async () => {
    try {
      const response = await api.get('/transactions?page=1&per_page=1000')
      const transactions = response.data.transactions
      const bins = Array(10).fill(0)
      transactions.forEach(tx => {
        const score = tx.fraud_score || 0
        const binIndex = Math.min(9, Math.floor(score * 10))
        bins[binIndex]++
      })
      const histogram = bins.map((count, i) => ({
        range: `${(i/10).toFixed(1)}-${((i+1)/10).toFixed(1)}`,
        count
      }))
      setFraudHistogram(histogram)
    } catch (e) {
      console.error('Failed to fetch fraud histogram:', e)
    }
  }

  const fetchRiskRadar = async () => {
    try {
      const response = await api.get('/transactions/analytics/merchants')
      const merchants = response.data.slice(0, 5)
      if (merchants.length === 0) {
        setRiskRadar([])
        return
      }
      const radarData = [
        { metric: 'Fraud Rate', avg: merchants.reduce((sum, m) => sum + m.fraud_rate, 0) / merchants.length },
        { metric: 'Avg Score', avg: merchants.reduce((sum, m) => sum + m.avg_fraud_score, 0) / merchants.length },
        { metric: 'Volume', avg: merchants.reduce((sum, m) => sum + m.transaction_count, 0) / merchants.length },
        { metric: 'Avg Amount', avg: merchants.reduce((sum, m) => sum + m.total_amount / m.transaction_count, 0) / merchants.length },
        { metric: 'Risk Exposure', avg: merchants.reduce((sum, m) => sum + m.fraud_count * m.total_amount / 1000, 0) / merchants.length }
      ]
      setRiskRadar(radarData)
    } catch (e) {
      console.error('Failed to fetch risk radar:', e)
    }
  }

  const fetchGeoData = async () => {
    try {
      const response = await api.get('/transactions?page=1&per_page=1000')
      const transactions = response.data.transactions
      const geoMap = {}
      transactions.forEach(tx => {
        const loc = tx.merchant_location || 'Unknown'
        if (!geoMap[loc]) {
          geoMap[loc] = { location: loc, transactions: 0, fraud: 0, amount: 0 }
        }
        geoMap[loc].transactions++
        geoMap[loc].amount += tx.amount || 0
        if (tx.is_fraud_predicted) geoMap[loc].fraud++
      })
      const geoArray = Object.values(geoMap).map(item => ({
        ...item,
        fraudRate: item.transactions > 0 ? (item.fraud / item.transactions * 100) : 0
      }))
      setGeoData(geoArray)
    } catch (e) {
      console.error('Failed to fetch geo data:', e)
    }
  }

  const fetchChannelData = async () => {
    try {
      const response = await api.get('/transactions?page=1&per_page=1000')
      const transactions = response.data.transactions
      const channelMap = {}
      transactions.forEach(tx => {
        const channel = tx.channel || 'Unknown'
        if (!channelMap[channel]) {
          channelMap[channel] = { channel, transactions: 0, fraud: 0, amount: 0 }
        }
        channelMap[channel].transactions++
        channelMap[channel].amount += tx.amount || 0
        if (tx.is_fraud_predicted) channelMap[channel].fraud++
      })
      const channelArray = Object.values(channelMap).map(item => ({
        ...item,
        fraudRate: item.transactions > 0 ? (item.fraud / item.transactions * 100) : 0
      }))
      setChannelData(channelArray)
    } catch (e) {
      console.error('Failed to fetch channel data:', e)
    }
  }

  const handleFeedback = async (alertId, confirmed) => {
    try {
      await api.post(`/fraud-alerts/${alertId}/feedback`, { 
        is_confirmed: confirmed,
        is_false_positive: !confirmed
      })
      fetchAlertSummary()
      setLiveAlerts(prev => prev.filter(a => a.alert_id !== alertId))
    } catch (e) {
      console.error('Feedback failed', e)
    }
  }

  const exportCSV = async () => {
    try {
      const res = await api.get('/transactions?page=1&per_page=1000')
      const rows = res.data.transactions
      const headers = ['id','customer_id','merchant_id','merchant_name','amount','fraud_score','is_fraud_predicted','created_at']
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
      const blob = new Blob([csv], {type:'text/csv'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions_${timeRange}d.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch(e){
      console.error('Export failed', e)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen" style={{ color: 'var(--fg-dim)' }}>Loading...</div>
  }

  if (!stats) {
    return <div className="flex items-center justify-center h-screen" style={{ color: 'var(--fg-dim)' }}>No data available</div>
  }

  const fraudData = [
    { name: 'Legitimate', value: Math.max(0, stats.total_transactions - stats.fraud_transactions), fill: '#10b981' },
    { name: 'Fraud', value: stats.fraud_transactions, fill: '#ef4444' },
  ]

  const riskBarData = fraudDistribution ? [
    { name:'Risk', high_risk: fraudDistribution.high_risk, medium_risk: fraudDistribution.medium_risk, low_risk: fraudDistribution.low_risk }
  ] : []

  return (
    <div className="bg-grid" style={{ minHeight: '100vh', paddingTop: 100 }}>
      <AxiomaSection
        num="00 — DASHBOARD"
        title="Fraud detection, made tangible."
        kicker={`Last 24h: ${stats.transactions_24h} transactions, ${stats.fraud_24h} frauds`}
      >
        <AxiomaBadge>LIVE · REAL-TIME</AxiomaBadge>

        {/* Time Range Selector */}
        <div style={{ display:'flex', gap:8, margin:'16px 0' }}>
          {timeRanges.map(r => (
            <button key={r.value} onClick={()=>setTimeRange(r.value)} style={{
              padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)',
              background: timeRange===r.value ? 'var(--accent-1)' : 'var(--bg-card-2)',
              color: timeRange===r.value ? 'white' : 'var(--fg)', fontFamily:'JetBrains Mono, monospace', fontSize:12
            }}>{r.label}</button>
          ))}
          <button onClick={exportCSV} style={{
            marginLeft:'auto', padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)',
            background:'var(--bg-card-2)', color:'var(--fg)', fontFamily:'JetBrains Mono, monospace', fontSize:12
          }}>Export CSV</button>
        </div>

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, margin: '32px 0' }}>
          <AxiomaCard>
            <AxiomaReadout
              label="Total Transactions"
              value={formatCompactNumber(stats.total_transactions)}
              title={formatNumber(stats.total_transactions)}
              ariaLabel={`${formatNumber(stats.total_transactions)} total transactions`}
            />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--fg-dim)', marginTop: 8 }}>+{stats.transactions_24h} today</div>
          </AxiomaCard>
          <AxiomaCard>
            <AxiomaReadout label="Fraud Detected" value={stats.fraud_transactions} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-2)', marginTop: 8 }}>+{stats.fraud_24h} today</div>
          </AxiomaCard>
          <AxiomaCard>
            <AxiomaReadout label="Fraud Rate" value={`${stats.fraud_percentage}%`} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--fg-dim)', marginTop: 8 }}>of all transactions</div>
          </AxiomaCard>
          <AxiomaCard>
            <AxiomaReadout
              label="Total Amount"
              value={formatCompactINR(stats.total_amount)}
              title={formatINR(stats.total_amount)}
              ariaLabel={formatINR(stats.total_amount)}
            />
            <div title={formatINR(stats.fraud_amount)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-2)', marginTop: 8 }}>{formatCompactINR(stats.fraud_amount)} fraud</div>
          </AxiomaCard>
        </div>

        {/* Alert Summary */}
        {alertSummary && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16, margin:'16px 0' }}>
            <AxiomaCard title="Alert Summary" subtitle="STATUS OVERVIEW">
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:13, lineHeight:1.8 }}>
                <div>Total Alerts: <b>{alertSummary.total_alerts}</b></div>
                <div>Confirmed: <b style={{color:'var(--accent-3)'}}>{alertSummary.confirmed}</b></div>
                <div>False Positives: <b style={{color:'var(--accent-2)'}}>{alertSummary.false_positives}</b></div>
                <div>Unreviewed: <b>{alertSummary.unreviewed}</b></div>
                <div>Avg Score: <b>{alertSummary.avg_fraud_score.toFixed(3)}</b></div>
              </div>
            </AxiomaCard>

            <AxiomaCard title="Live Alerts" subtitle="REAL-TIME FEED">
              <div style={{ maxHeight:240, overflowY:'auto', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                {liveAlerts.length > 0 && (
                  <div style={{ overflowY: 'auto' }}>
                    {liveAlerts.map((a,i)=>(
                      <div key={i} style={{ borderBottom:'1px solid var(--border)', padding:'8px 0', fontSize:12, display:'flex', alignItems:'center' }}>
                        <span style={{fontFamily:'JetBrains Mono, monospace', cursor:'pointer', color:'var(--accent-1)', flex:1}} onClick={()=>navigate(`/transactions/${a.transaction_id}`)}>{a.transaction_id}</span>
                        <span style={{color:'var(--accent-2)'}}>{a.risk_level}</span>
                        <span style={{marginLeft:8, fontSize:10, background:'var(--bg-card-2)', borderRadius:4, padding:'2px 6px'}}>#{a.alert_id}</span>
                      </div>
                    ))}
                  </div>
                )}
                {liveAlerts.length===0 && !websocketConnected && <div style={{color:'var(--fg-dim)', fontSize:12, textAlign:'center'}}>Not connected</div>}
                {liveAlerts.length===0 && websocketConnected && <div style={{color:'var(--fg-dim)', fontSize:12, textAlign:'center'}}>No live alerts</div>}
                {loading && <div style={{color:'var(--fg-dim)', fontSize:12, textAlign:'center'}}>Connecting...</div>}
              </div>
            </AxiomaCard>
          </div>
        )}

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 32, marginBottom: 32 }}>
          <AxiomaCard title="Transaction Status" subtitle="LEGITIMATE VS FRAUD">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={fraudData} cx="50%" cy="50%" labelLine={false} label>
                  {fraudData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </AxiomaCard>

          <AxiomaCard title="Fraud Risk Distribution" subtitle="RISK LEVELS">
            {riskBarData.length>0 && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={riskBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="high_risk" fill="#ef4444" name="Critical" />
                  <Bar dataKey="medium_risk" fill="#f97316" name="Medium" />
                  <Bar dataKey="low_risk" fill="#eab308" name="Low" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </AxiomaCard>
        </div>

        {/* Trends */}
        {trends.length > 0 && (
          <AxiomaCard title={`Transaction Trends (${timeRanges.find(t=>t.value===timeRange)?.label})`} subtitle="DAILY VOLUME">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="transactions" stroke="#3b82f6" name="All Transactions" />
                <Line yAxisId="left" type="monotone" dataKey="fraud" stroke="#ef4444" name="Fraud Count" />
              </LineChart>
            </ResponsiveContainer>
          </AxiomaCard>
        )}

        {/* Top Merchants & Customers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(420px,1fr))', gap:32, marginTop:32 }}>
          <AxiomaCard title="Top Merchants" subtitle="BY TRANSACTION VOLUME">
            <div className="overflow-x-auto">
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr style={{borderBottom:'1px solid var(--border)', color:'var(--fg-dim)'}}>
                  <th style={{textAlign:'left', padding:'8px'}}>Merchant</th>
                  <th style={{textAlign:'left', padding:'8px'}}>Txns</th>
                  <th style={{textAlign:'left', padding:'8px'}}>Fraud Rate</th>
                </tr></thead>
                <tbody>
                  {merchants.map(m=>(
                    <tr key={m.merchant_id} style={{borderBottom:'1px solid var(--border)', cursor:'pointer'}} onClick={()=>navigate(`/transactions?merchant_id=${encodeURIComponent(m.merchant_id)}`)}>
                      <td style={{padding:'8px', color:'var(--accent-1)'}}>{m.merchant_name || m.merchant_id}</td>
                      <td style={{padding:'8px', fontFamily:'JetBrains Mono, monospace'}}>{m.transaction_count}</td>
                      <td style={{padding:'8px', color:'var(--accent-2)'}}>{m.fraud_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AxiomaCard>

          <AxiomaCard title="High-Risk Customers" subtitle="BY FRAUD COUNT">
            <div className="overflow-x-auto">
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr style={{borderBottom:'1px solid var(--border)', color:'var(--fg-dim)'}}>
                  <th style={{textAlign:'left', padding:'8px'}}>Customer</th>
                  <th style={{textAlign:'left', padding:'8px'}}>Txns</th>
                  <th style={{textAlign:'left', padding:'8px'}}>Fraud Rate</th>
                </tr></thead>
                <tbody>
                  {customers.map(c=>(
                    <tr key={c.customer_id} style={{borderBottom:'1px solid var(--border)', cursor:'pointer'}} onClick={()=>navigate(`/transactions?customer_id=${encodeURIComponent(c.customer_id)}`)}>
                      <td style={{padding:'8px', fontFamily:'JetBrains Mono, monospace', color:'var(--accent-1)'}}>{c.customer_id}</td>
                      <td style={{padding:'8px'}}>{c.transaction_count}</td>
                      <td style={{padding:'8px', color:'var(--accent-2)'}}>{c.fraud_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AxiomaCard>
        </div>

        {/* Risk Categories */}
        {riskCategories.length > 0 && (
          <AxiomaCard title="Fraud by Category" subtitle="MERCHANT TYPE" style={{marginTop:32}}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Transactions</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Fraud Count</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Fraud Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {riskCategories.map((cat, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-fraud-600 font-medium">{cat.category}</td>
                      <td className="px-6 py-4 text-sm font-medium">{cat.transaction_count}</td>
                      <td className="px-6 py-4 text-sm text-fraud-600 font-medium">{cat.fraud_count}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-fraud-600 h-2 rounded-full" style={{ width: `${Math.min(cat.fraud_rate, 100)}%` }}></div>
                        </div>
                        <span className="text-xs">{cat.fraud_rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AxiomaCard>
        )}

      </AxiomaSection>

        {/* Fancy Graphs Section */}
        <AxiomaSection
          num="01 — ADVANCED ANALYTICS"
          title="Deep dive made visual."
          kicker="Advanced ML insights and real-time fraud patterns"
        >
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(420px,1fr))', gap:32, marginBottom:32 }}>
            {/* Fraud Score Histogram */}
            <AxiomaCard title="Fraud Score Distribution" subtitle="HISTOGRAM">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fraudHistogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="range" stroke="var(--fg-dim)" fontSize={11} />
                  <YAxis stroke="var(--fg-dim)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                  <Bar dataKey="count" fill="var(--accent-1)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </AxiomaCard>

            {/* Geographic Risk Heatmap */}
            <AxiomaCard title="Geographic Risk" subtitle="BY LOCATION">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={geoData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="location" stroke="var(--fg-dim)" fontSize={10} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="var(--fg-dim)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                  <Bar dataKey="fraudRate" fill="var(--accent-2)" name="Fraud Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </AxiomaCard>

            {/* Channel Risk Analysis */}
            <AxiomaCard title="Channel Risk Breakdown" subtitle="POS VS ONLINE">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="channel" stroke="var(--fg-dim)" fontSize={11} />
                  <YAxis yAxisId="left" stroke="var(--fg-dim)" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--fg-dim)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                  <Bar yAxisId="left" dataKey="transactions" fill="var(--accent-1)" name="Transactions" />
                  <Line yAxisId="right" type="monotone" dataKey="fraudRate" stroke="var(--accent-2)" name="Fraud Rate %" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </AxiomaCard>

            {/* Real-time Stream Visualization */}
            <AxiomaCard title="Live Transaction Stream" subtitle="REAL-TIME FLOW">
              <div style={{ height: 300, position: 'relative', overflow: 'hidden' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" dataKey="id" hide />
                    <YAxis type="number" dataKey="amount" hide />
                    <ZAxis range={[60, 600]} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                    <Scatter data={realTimeStream.slice(0, 50)} fill="var(--accent-1)">
                      {realTimeStream.slice(0, 50).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          entry.risk === 'high' ? '#ef4444' : 
                          entry.risk === 'medium' ? '#f97316' : '#10b981'
                        } />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 8, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                  LIVE • {realTimeStream.length} events
                </div>
              </div>
            </AxiomaCard>
          </div>

          {/* Risk Radar & Advanced Metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(420px,1fr))', gap:32, marginTop:32 }}>
            {/* Risk Radar Chart */}
            <AxiomaCard title="Merchant Risk Profile" subtitle="MULTI-DIMENSIONAL">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={riskRadar}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" stroke="var(--fg-dim)" fontSize={11} />
                  <PolarRadiusAxis stroke="var(--fg-dim)" fontSize={10} />
                  <Radar name="Risk Profile" dataKey="avg" stroke="var(--accent-1)" fill="var(--accent-1)" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </AxiomaCard>

            {/* Real-time KPI Gauges */}
            <AxiomaCard title="Real-time KPIs" subtitle="LIVE METRICS">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
                {[
                  { label: 'Fraud Rate', value: stats?.fraud_percentage || 0, max: 100, color: 'var(--accent-2)' },
                  { label: 'Transactions/min', value: stats?.transactions_24h || 0, max: 1000, color: 'var(--accent-1)' },
                  { label: 'Avg Risk Score', value: stats?.avg_fraud_score || 0, max: 1, color: 'var(--accent-3)' },
                  { label: 'Alert Queue', value: alertSummary?.unreviewed || 0, max: 50, color: '#f97316' }
                ].map((metric, i) => {
                  const percentage = Math.min(100, (metric.value / metric.max) * 100)
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: 16, background: 'var(--bg-card-2)', borderRadius: 8 }}>
                      <div style={{ fontSize: 32, fontFamily: 'JetBrains Mono, monospace', color: metric.color, marginBottom: 4 }}>
                        {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {metric.label}
                      </div>
                      <div style={{ marginTop: 8, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: metric.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </AxiomaCard>
          </div>

          {/* Transaction Metadata Table */}
          <AxiomaCard title="Transaction Metadata" subtitle="DETAILED ATTRIBUTES" style={{ marginTop: 32 }}>
            <div style={{ overflowX: 'auto', maxHeight: 400 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg-dim)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>TX ID</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Customer</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Merchant</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Location</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>IP</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Device</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Channel</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px' }}>Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Mock data - would be fetched from API */}
                  {Array.from({length: 8}).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-card-2)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace' }}>{i+1}</td>
                      <td style={{ padding: '12px 16px' }}>CUST00{i+1}</td>
                      <td style={{ padding: '12px 16px' }}>Merchant {i+1}</td>
                      <td style={{ padding: '12px 16px' }}>City {i+1}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace' }}>192.168.1.{i+1}</td>
                      <td style={{ padding: '12px 16px' }}>dev-{i+1}</td>
                      <td style={{ padding: '12px 16px' }}>{i % 2 === 0 ? 'POS' : 'Online'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          fontSize: 11, 
                          background: i % 3 === 0 ? 'rgba(239,68,68,0.2)' : i % 3 === 1 ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)',
                          color: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#f97316' : '#10b981'
                        }}>
                          {(Math.random() * 0.9).toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AxiomaCard>
        </AxiomaSection>
      </div>
    )
  }
