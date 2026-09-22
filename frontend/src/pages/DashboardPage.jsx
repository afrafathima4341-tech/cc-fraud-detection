import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { connectWebSocket, disconnectWebSocket, onTransactionUpdate, offTransactionUpdate } from '../services/websocket'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState([])
  const [riskCategories, setRiskCategories] = useState([])
  const [fraudDistribution, setFraudDistribution] = useState(null)
  const [loading, setLoading] = useState(true)
  const { token } = useAuthStore()

  useEffect(() => {
    // Connect WebSocket
    if (token) {
      connectWebSocket(token)

      const handleTransactionUpdate = () => {
        fetchStats()
      }

      onTransactionUpdate(handleTransactionUpdate)

      return () => {
        offTransactionUpdate(handleTransactionUpdate)
        disconnectWebSocket()
      }
    }
  }, [token])

  useEffect(() => {
    fetchStats()
    fetchTrends()
    fetchRiskCategories()
    fetchFraudDistribution()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchTrends = async () => {
    try {
      const response = await api.get('/dashboard/trends?days=30')
      setTrends(response.data)
    } catch (error) {
      console.error('Failed to fetch trends:', error)
    }
  }

  const fetchRiskCategories = async () => {
    try {
      const response = await api.get('/dashboard/risk-categories')
      setRiskCategories(response.data)
    } catch (error) {
      console.error('Failed to fetch risk categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFraudDistribution = async () => {
    try {
      const response = await api.get('/dashboard/fraud-distribution')
      setFraudDistribution(response.data)
    } catch (error) {
      console.error('Failed to fetch fraud distribution:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!stats) {
    return <div className="flex items-center justify-center h-screen">No data available</div>
  }

  const fraudData = [
    { name: 'Legitimate', value: stats.total_transactions - stats.fraud_transactions, fill: '#10b981' },
    { name: 'Fraud', value: stats.fraud_transactions, fill: '#ef4444' },
  ]

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-600">
          Last 24h: {stats.transactions_24h} transactions, {stats.fraud_24h} frauds
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 text-sm font-medium">Total Transactions</h3>
          <p className="text-3xl font-bold mt-2">{stats.total_transactions}</p>
          <p className="text-xs text-gray-500 mt-1">+{stats.transactions_24h} today</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-fraud-600">
          <h3 className="text-gray-600 text-sm font-medium">Fraud Detected</h3>
          <p className="text-3xl font-bold text-fraud-600 mt-2">{stats.fraud_transactions}</p>
          <p className="text-xs text-gray-500 mt-1">+{stats.fraud_24h} today</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 text-sm font-medium">Fraud Rate</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{stats.fraud_percentage}%</p>
          <p className="text-xs text-gray-500 mt-1">of all transactions</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 text-sm font-medium">Total Amount</h3>
          <p className="text-3xl font-bold mt-2">${stats.total_amount.toFixed(2)}</p>
          <p className="text-xs text-fraud-600 mt-1">${stats.fraud_amount.toFixed(2)} fraud</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Transaction Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Transaction Status</h2>
          {fraudData && (
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
          )}
        </div>

        {/* Fraud Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Fraud Risk Distribution</h2>
          {fraudDistribution && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[fraudDistribution]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="category" dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="high_risk" fill="#ef4444" name="Critical" />
                <Bar dataKey="medium_risk" fill="#f97316" name="Medium" />
                <Bar dataKey="low_risk" fill="#eab308" name="Low" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Trends */}
      {trends.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Transaction Trends (30 Days)</h2>
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
        </div>
      )}

      {/* Risk Categories */}
      {riskCategories.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Fraud by Category</h2>
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
                    <td className="px-6 py-4 text-sm">{cat.category}</td>
                    <td className="px-6 py-4 text-sm font-medium">{cat.transaction_count}</td>
                    <td className="px-6 py-4 text-sm text-fraud-600 font-medium">{cat.fraud_count}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-fraud-600 h-2 rounded-full"
                          style={{ width: `${Math.min(cat.fraud_rate, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">{cat.fraud_rate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
