import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

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
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!transaction) {
    return <div className="flex items-center justify-center h-screen">Transaction not found</div>
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => navigate('/transactions')}
        className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
      >
        ← Back to Transactions
      </button>

      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Transaction Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b">
          <div>
            <h1 className="text-3xl font-bold mb-2">Transaction #{transaction.id}</h1>
            <p className="text-gray-600">{new Date(transaction.timestamp).toLocaleString()}</p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold ${getRiskColor(transaction.is_fraud_predicted ? 'HIGH' : 'LOW')}`}>
            {transaction.is_fraud_predicted ? '⚠️ FRAUDULENT' : '✓ LEGITIMATE'}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-lg font-bold mb-4">Transaction Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-600 text-sm">Customer ID</p>
                <p className="font-medium">{transaction.customer_id}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Merchant</p>
                <p className="font-medium">{transaction.merchant_name}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Merchant ID</p>
                <p className="font-medium">{transaction.merchant_id}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Card ID</p>
                <p className="font-medium">{transaction.card_id}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4">Amount & Fraud Score</h2>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-600 text-sm">Transaction Amount</p>
                <p className="text-2xl font-bold text-blue-600">${transaction.amount.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-gray-600 text-sm">Fraud Score</p>
                <p className="text-2xl font-bold text-orange-600">{transaction.fraud_score.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Category</p>
                <p className="font-medium">{transaction.category || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fraud Explanation */}
        {explanation && transaction.is_fraud_predicted && (
          <div className="border-t pt-8">
            <h2 className="text-lg font-bold mb-4">Fraud Analysis</h2>

            {/* Risk Level */}
            <div className={`p-4 rounded-lg mb-6 ${getRiskColor(explanation.risk_level)}`}>
              <p className="text-sm font-medium">Risk Level</p>
              <p className="text-2xl font-bold">{explanation.risk_level}</p>
              <p className="text-sm mt-1">Recommendation: {explanation.recommendation}</p>
            </div>

            {/* Risk Factors */}
            {explanation.factors && explanation.factors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold mb-3">Contributing Factors</h3>
                <div className="space-y-3">
                  {explanation.factors.map((factor, idx) => (
                    <div key={idx} className="p-4 bg-red-50 border-l-4 border-red-600 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-red-600">{factor.factor}</p>
                          <p className="text-sm text-gray-700 mt-1">{factor.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-bold ${
                          factor.severity === 'HIGH' ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
                        }`}>
                          {factor.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Profile */}
            {explanation.customer_profile && (
              <div className="mb-6">
                <h3 className="font-bold mb-3">Customer Profile</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Total Transactions</p>
                    <p className="text-xl font-bold">{explanation.customer_profile.transaction_count}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Avg Amount</p>
                    <p className="text-xl font-bold">${explanation.customer_profile.avg_amount}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Fraud Rate</p>
                    <p className="text-xl font-bold text-red-600">{explanation.customer_profile.fraud_rate}%</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Total Spent</p>
                    <p className="text-xl font-bold">${explanation.customer_profile.total_spent}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Merchant Profile */}
            {explanation.merchant_profile && (
              <div className="mb-6">
                <h3 className="font-bold mb-3">Merchant Profile</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Merchant Name</p>
                    <p className="text-lg font-bold">{explanation.merchant_profile.merchant_name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Transactions</p>
                    <p className="text-xl font-bold">{explanation.merchant_profile.transaction_count}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Fraud Count</p>
                    <p className="text-xl font-bold text-red-600">{explanation.merchant_profile.fraud_count}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Fraud Rate</p>
                    <p className="text-xl font-bold text-red-600">{explanation.merchant_profile.fraud_rate}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
