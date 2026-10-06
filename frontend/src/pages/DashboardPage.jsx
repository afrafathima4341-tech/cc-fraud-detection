import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  RadialBarChart, RadialBar, ComposedChart,
  AreaChart, Area
} from 'recharts'
import { connectWebSocket, onTransactionUpdate, offTransactionUpdate } from '../services/websocket'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import AxiomaSection from '../components/AxiomaSection'
import AxiomaCard from '../components/AxiomaCard'
import AxiomaReadout from '../components/AxiomaReadout'
import AxiomaBadge from '../components/AxiomaBadge'
import { formatCompactINR, formatCompactNumber, formatCurrency, formatINR, formatNumber } from '../utils/formatters'

const TransactionNetworkGraph = lazy(() => import('../components/TransactionNetworkGraph'))

const timeRanges = [
  {label:'24h', value:'1'},
  {label:'7d', value:'7'},
  {label:'30d', value:'30'},
  {label:'90d', value:'90'},
]

function toStreamEntry(transaction) {
  const fraudScore = Number(transaction.fraud_score) || 0
  const isFraud = Boolean(transaction.is_fraud_predicted)
  return {
    ...transaction,
    timestamp: transaction.timestamp || new Date().toISOString(),
    amount: Number(transaction.amount) || 0,
    currency: transaction.currency || 'INR',
    merchantName: transaction.merchant_name || transaction.merchant_id || 'Unknown merchant',
    cardNetwork: transaction.card_network || '',
    fraudScore,
    isFraud,
    risk: isFraud ? 'high' : fraudScore >= 0.3 ? 'medium' : 'low',
  }
}

function mergeRecentTransactions(current, incoming, limit) {
  const byId = new Map(current.filter((transaction) => transaction?.id).map((transaction) => [transaction.id, transaction]))
  incoming.forEach((transaction) => {
    if (transaction?.id) byId.set(transaction.id, transaction)
  })
  return [...byId.values()]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, limit)
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState([])
  const [riskCategories, setRiskCategories] = useState([])
  const [fraudDistribution, setFraudDistribution] = useState(null)
  const [merchants, setMerchants] = useState([])
  const [customers, setCustomers] = useState([])
  const [alertSummary, setAlertSummary] = useState(null)
  const [timeRange, setTimeRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [fraudHistogram, setFraudHistogram] = useState([])
  const [riskRadar, setRiskRadar] = useState([])
  const [geoData, setGeoData] = useState([])
  const [channelData, setChannelData] = useState([])
  const [realTimeStream, setRealTimeStream] = useState([])
  const [networkTransactions, setNetworkTransactions] = useState([])
  const [websocketConnected, setWebsocketConnected] = useState(false)
  const { token } = useAuthStore()

  useEffect(() => {
    if (token) {
      const socket = connectWebSocket(token)
      const handleSocketConnect = () => setWebsocketConnected(true)
      const handleSocketDisconnect = () => setWebsocketConnected(false)
      const handleTransactionUpdate = (transaction) => {
        if (!transaction) return
        fetchStats()
        setNetworkTransactions((previous) => mergeRecentTransactions(previous, [transaction], 40))
        setRealTimeStream((previous) => mergeRecentTransactions(previous, [toStreamEntry(transaction)], 50))
      }

      socket.on('connect', handleSocketConnect)
      socket.on('disconnect', handleSocketDisconnect)
      socket.on('connect_error', handleSocketDisconnect)
      if (socket.connected) handleSocketConnect()
      onTransactionUpdate(handleTransactionUpdate)

      return () => {
        socket.off('connect', handleSocketConnect)
        socket.off('disconnect', handleSocketDisconnect)
        socket.off('connect_error', handleSocketDisconnect)
        offTransactionUpdate(handleTransactionUpdate)
        setWebsocketConnected(false)
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
      fetchNetworkTransactions(),
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

  const fetchNetworkTransactions = async () => {
    try {
      const response = await api.get('/transactions?page=1&per_page=40')
      const recent = response.data.transactions || []
      setNetworkTransactions((previous) => mergeRecentTransactions(previous, recent, 40))
      setRealTimeStream((previous) => mergeRecentTransactions(previous, recent.map(toStreamEntry), 50))
    } catch (e) {
      console.error('Failed to fetch transaction network:', e)
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
  const hasCurrencyBreakdown = Boolean(stats.amount_by_currency)
  const currencyAmounts = stats.amount_by_currency || {}
  const fraudCurrencyAmounts = stats.fraud_amount_by_currency || {}
  const inrTotalAmount = currencyAmounts.INR || 0
  const inrFraudAmount = fraudCurrencyAmounts.INR || 0
  const otherCurrencyAmounts = Object.entries(currencyAmounts).filter(([currency, amount]) => currency !== 'INR' && amount > 0)

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
              color: timeRange===r.value ? 'var(--bg)' : 'var(--fg)', fontFamily:'JetBrains Mono, monospace', fontSize:12
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
              label="Total Amount (INR)"
              value={hasCurrencyBreakdown ? formatCompactINR(inrTotalAmount) : '—'}
              title={hasCurrencyBreakdown ? formatINR(inrTotalAmount) : 'Currency breakdown unavailable'}
              ariaLabel={hasCurrencyBreakdown ? formatINR(inrTotalAmount) : 'Currency breakdown unavailable'}
            />
            <div title={hasCurrencyBreakdown ? formatINR(inrFraudAmount) : undefined} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-2)', marginTop: 8 }}>{hasCurrencyBreakdown ? formatCompactINR(inrFraudAmount) : '—'} fraud</div>
            {!hasCurrencyBreakdown && (
              <div style={{ marginTop: 8, color: 'var(--fg-dim)', fontSize: 11 }}>Restart the backend to load currency-separated totals.</div>
            )}
            {hasCurrencyBreakdown && inrTotalAmount === 0 && stats.total_transactions > 0 && (
              <div style={{ marginTop: 8, color: 'var(--fg-dim)', fontSize: 11 }}>No INR transactions yet.</div>
            )}
            {otherCurrencyAmounts.length > 0 && (
              <div style={{ marginTop: 8, color: 'var(--fg-dim)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                {otherCurrencyAmounts.map(([currency, amount]) => (
                  <div key={currency}>{currency} recorded separately: {formatCurrency(amount, currency)}</div>
                ))}
              </div>
            )}
          </AxiomaCard>
        </div>

        {/* Live linked activity */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,420px),1fr))', alignItems:'start', gap:16, margin:'16px 0' }}>
            <AxiomaCard title="Linked Transaction Network" subtitle="CUSTOMER · PAYMENT · MERCHANT">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--fg-dim)' }}>
                <span><span className={websocketConnected ? 'live-dot' : ''} style={!websocketConnected ? { display:'inline-block', width:7, height:7, borderRadius:'50%', background:'var(--muted)', marginRight:8 } : undefined} />{websocketConnected ? 'LIVE' : 'OFFLINE'}</span>
                <span>{networkTransactions.length} linked transactions</span>
              </div>
              <Suspense fallback={<div style={{ height:380, display:'grid', placeItems:'center', color:'var(--fg-dim)', fontSize:13 }}>Loading network…</div>}>
                <TransactionNetworkGraph
                  transactions={networkTransactions}
                  onNodeSelect={(node) => {
                    if (node.queryKey && node.queryValue) {
                      navigate(`/transactions?${node.queryKey}=${encodeURIComponent(node.queryValue)}`)
                    }
                  }}
                />
              </Suspense>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 14px', marginTop:10, color:'var(--fg-dim)', fontFamily:'JetBrains Mono, monospace', fontSize:10 }}>
                {[
                  ['Customer', '#4dd4ac'], ['Merchant', '#d4ff3a'], ['Card', '#ffb627'],
                  ['UPI', '#75c7e7'], ['Bank', '#ff936d'], ['Device', '#ff7bf0'], ['IP', '#38ef7d'], ['Flagged', '#ff5e62'],
                ].map(([label, color]) => (
                  <span key={label} style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:color }} />{label}
                  </span>
                ))}
              </div>
            </AxiomaCard>

            <AxiomaCard title="Live Transaction Stream" subtitle="REAL-TIME FLOW">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--fg-dim)' }}>
                <span><span className={websocketConnected ? 'live-dot' : ''} style={!websocketConnected ? { display:'inline-block', width:7, height:7, borderRadius:'50%', background:'var(--muted)', marginRight:8 } : undefined} />{websocketConnected ? 'LIVE' : 'OFFLINE'}</span>
                <span>{realTimeStream.length} recent</span>
              </div>
              <div aria-live="polite" aria-label="Recent live transactions" style={{ display:'grid', gap:6, maxHeight:260, overflowY:'auto' }}>
                {realTimeStream.length === 0 ? (
                  <div style={{ padding:'16px 8px', color:'var(--fg-dim)', fontSize:13 }}>
                    {websocketConnected ? 'Waiting for the next transaction…' : 'Waiting for a live connection…'}
                  </div>
                ) : realTimeStream.slice(0, 5).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => navigate(`/transactions/${entry.id}`)}
                    style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto', alignItems:'center', gap:12, width:'100%', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg-card-2)', color:'var(--fg)', textAlign:'left', cursor:'pointer' }}
                  >
                    <span style={{ minWidth:0 }}>
                      <span style={{ display:'block', overflow:'hidden', color:'var(--fg)', fontSize:13, textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.merchantName}</span>
                      <span style={{ color:'var(--fg-dim)', fontFamily:'JetBrains Mono, monospace', fontSize:10 }}>{[`#${entry.id}`, entry.channel, entry.cardNetwork].filter(Boolean).join(' · ')} · {new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </span>
                    <span style={{ textAlign:'right' }}>
                      <span style={{ display:'block', fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>{formatCurrency(entry.amount, entry.currency)}</span>
                      <span style={{ color:entry.isFraud ? 'var(--accent-2)' : entry.risk === 'medium' ? 'var(--accent-4)' : 'var(--accent-3)', fontSize:10 }}>{entry.isFraud ? 'FLAGGED' : `RISK ${entry.fraudScore.toFixed(2)}`}</span>
                    </span>
                  </button>
                ))}
              </div>
            </AxiomaCard>
          </div>

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
              <table className="w-full category-risk-table">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Transactions</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Fraud Count</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Fraud Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {riskCategories.map((cat, idx) => (
                    <tr key={idx}>
                      <td className="category-risk-name">{cat.category}</td>
                      <td>{cat.transaction_count}</td>
                      <td className="category-risk-count">{cat.fraud_count}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="category-risk-meter">
                          <div className="category-risk-meter__value" style={{ width: `${Math.min(cat.fraud_rate, 100)}%` }}></div>
                        </div>
                        <span className="category-risk-rate">{cat.fraud_rate}%</span>
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
