import { useEffect, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import api from '../services/api'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats')
        setStats(response.data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

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
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Total Transactions</h3>
          <p className="text-3xl font-bold mt-2">{stats.total_transactions}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Fraud Detected</h3>
          <p className="text-3xl font-bold text-fraud-600 mt-2">{stats.fraud_transactions}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Fraud Rate</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{stats.fraud_percentage}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">Total Amount</h3>
          <p className="text-3xl font-bold mt-2">${stats.total_amount.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Transaction Status</h2>
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
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Statistics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Avg Fraud Score</span>
              <span className="font-bold">{stats.avg_fraud_score.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">False Positives</span>
              <span className="font-bold">{stats.false_positives}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Fraud Amount</span>
              <span className="font-bold text-fraud-600">${stats.fraud_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
