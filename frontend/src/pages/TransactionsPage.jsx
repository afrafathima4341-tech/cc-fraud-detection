import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [newTx, setNewTx] = useState({
    customer_id: '',
    merchant_id: '',
    card_id: '',
    amount: '',
    merchant_name: '',
    category: '',
  })

  useEffect(() => {
    fetchTransactions()
  }, [page])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/transactions?page=${page}&per_page=10`)
      setTransactions(response.data.transactions)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()
    try {
      await api.post('/transactions', {
        ...newTx,
        amount: parseFloat(newTx.amount),
        timestamp: new Date().toISOString(),
      })
      setNewTx({
        customer_id: '',
        merchant_id: '',
        card_id: '',
        amount: '',
        merchant_name: '',
        category: '',
      })
      fetchTransactions()
    } catch (error) {
      console.error('Failed to create transaction:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Transactions</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Add New Transaction</h2>
        <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Customer ID"
            value={newTx.customer_id}
            onChange={(e) => setNewTx({ ...newTx, customer_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="text"
            placeholder="Merchant ID"
            value={newTx.merchant_id}
            onChange={(e) => setNewTx({ ...newTx, merchant_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="text"
            placeholder="Card ID"
            value={newTx.card_id}
            onChange={(e) => setNewTx({ ...newTx, card_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="number"
            placeholder="Amount"
            value={newTx.amount}
            onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="text"
            placeholder="Merchant Name"
            value={newTx.merchant_name}
            onChange={(e) => setNewTx({ ...newTx, merchant_name: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Category"
            value={newTx.category}
            onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button
            type="submit"
            className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Add Transaction
          </button>
        </form>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Customer</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Merchant</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Fraud Score</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-t hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/transactions/${tx.id}`)}
                >
                  <td className="px-6 py-4 text-sm">{tx.customer_id}</td>
                  <td className="px-6 py-4 text-sm">{tx.merchant_name}</td>
                  <td className="px-6 py-4 text-sm font-medium">${tx.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">{tx.fraud_score.toFixed(3)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tx.is_fraud_predicted
                          ? 'bg-fraud-100 text-fraud-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {tx.is_fraud_predicted ? '⚠️ Fraud' : '✓ Legitimate'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
