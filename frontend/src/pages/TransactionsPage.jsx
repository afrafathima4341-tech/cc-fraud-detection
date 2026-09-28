import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../components/Toast'
import AxiomaSection from '../components/AxiomaSection'
import AxiomaCard from '../components/AxiomaCard'
import { formatCurrency } from '../utils/formatters'

const paymentChannels = ['UPI', 'Card', 'Net Banking', 'Wallet', 'POS']
const cardNetworks = ['Visa', 'RuPay', 'Mastercard', 'American Express']
const indianBanks = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
  'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
  'Bank of India', 'Indian Bank', 'IDFC FIRST Bank', 'IndusInd Bank', 'Yes Bank',
  'Federal Bank', 'AU Small Finance Bank',
]

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addToast } = useToast()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [newTx, setNewTx] = useState({
    customer_id: '',
    merchant_id: '',
    card_id: '',
    card_last4: '',
    card_network: '',
    upi_id: '',
    payer_bank: '',
    amount: '',
    merchant_name: '',
    merchant_bank: '',
    merchant_location: '',
    category: '',
    channel: 'UPI',
    currency: 'INR',
    ip_address: '',
    device_id: '',
  })
  const cardPayment = ['Card', 'POS'].includes(newTx.channel)
  const upiPayment = newTx.channel === 'UPI'
  const fields = [
    { key: 'customer_id', label: 'Customer ID', type: 'text', required: true },
    { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true },
    { key: 'amount', label: 'Amount (INR)', type: 'number', required: true, min: '0', step: '0.01' },
    { key: 'channel', label: 'Payment Method', type: 'options', required: true, options: paymentChannels },
    ...(upiPayment ? [
      { key: 'upi_id', label: 'UPI ID', type: 'text', required: true, placeholder: 'name@bank' },
      { key: 'payer_bank', label: 'Payer Bank', type: 'bank', required: true },
    ] : []),
    ...(cardPayment ? [
      { key: 'card_id', label: 'Card ID', type: 'text', required: true },
      { key: 'card_last4', label: 'Card Last 4', type: 'text', placeholder: '1234' },
      { key: 'card_network', label: 'Card Network', type: 'network', required: true, options: cardNetworks },
    ] : []),
    { key: 'merchant_name', label: 'Merchant Name', type: 'text' },
    { key: 'merchant_bank', label: 'Merchant Bank', type: 'bank' },
    { key: 'merchant_location', label: 'Merchant Location', type: 'text' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'ip_address', label: 'IP Address', type: 'text' },
    { key: 'device_id', label: 'Device ID', type: 'text' },
    { key: 'currency', label: 'Settlement Currency', type: 'static', value: 'INR' },
  ]

  useEffect(() => {
    fetchTransactions()
  }, [page, searchParams])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '10',
      })
      const merchant_id = searchParams.get('merchant_id')
      const customer_id = searchParams.get('customer_id')
      if (merchant_id) params.append('merchant_id', merchant_id)
      if (customer_id) params.append('customer_id', customer_id)
      const response = await api.get(`/transactions?${params.toString()}`)
      setTransactions(response.data.transactions)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      addToast('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()
    try {
      await api.post('/transactions', {
        ...newTx,
        card_id: cardPayment ? newTx.card_id : '',
        card_last4: cardPayment ? newTx.card_last4 : '',
        card_network: cardPayment ? newTx.card_network : '',
        upi_id: upiPayment ? newTx.upi_id : '',
        payer_bank: upiPayment ? newTx.payer_bank : '',
        amount: parseFloat(newTx.amount),
        currency: 'INR',
        timestamp: new Date().toISOString(),
      })
      setNewTx({
        customer_id: '',
        merchant_id: '',
        card_id: '',
        card_last4: '',
        card_network: '',
        upi_id: '',
        payer_bank: '',
        amount: '',
        merchant_name: '',
        merchant_bank: '',
        merchant_location: '',
        category: '',
        channel: 'UPI',
        currency: 'INR',
        ip_address: '',
        device_id: '',
      })
      fetchTransactions()
    } catch (error) {
      console.error('Failed to create transaction:', error)
      const msg = error.response?.data?.message || 'Failed to create transaction'
      addToast(msg)
    }
  }

  return (
    <div className="bg-grid" style={{ minHeight: '100vh', paddingTop: 100 }}>
      <AxiomaSection
        id="transactions"
        num="01 — TRANSACTIONS"
        title="Create and inspect."
        kicker="Submit a transaction and watch the fraud engine score it in real time."
      >
        {(searchParams.has('merchant_id') || searchParams.has('customer_id')) && (
          <div style={{
            background:'var(--bg-card-2)', border:'1px solid var(--border)', borderRadius:8, padding:12, marginBottom:16, fontFamily:'JetBrains Mono, monospace'
          }}>
            {searchParams.has('merchant_id') && (
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span>Merchant: {searchParams.get('merchant_id')}</span>
                <button
                  onClick={()=>window.location.search=''}
                  style={{ background:'transparent', border:'none', color:'var(--accent-2)', fontSize:11, cursor:'pointer' }}>Clear</button>
              </div>
            )}
            {searchParams.has('customer_id') && (
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span>Customer: {searchParams.get('customer_id')}</span>
                <button
                  onClick={()=>window.location.search=''}
                  style={{ background:'transparent', border:'none', color:'var(--accent-2)', fontSize:11, cursor:'pointer' }}>Clear</button>
              </div>
            )}
          </div>
        )}
        <AxiomaCard title="Add New Transaction" subtitle="LIVE INPUT">
          <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {fields.map((field) => (
            <div key={field.key}>
              <label htmlFor={`newtx-${field.key}`} style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6, display:'block' }}>{field.label}</label>
              {field.type === 'options' || field.type === 'bank' || field.type === 'network' ? (
                <select
                  id={`newtx-${field.key}`}
                  value={newTx[field.key]}
                  required={field.required}
                  onChange={(event) => setNewTx((current) => ({ ...current, [field.key]: event.target.value }))}
                  style={{ width:'100%', padding:'10px 12px', background:'var(--bg-card-2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--fg)' }}
                >
                  <option value="">{field.type === 'bank' ? 'Select a bank' : field.type === 'network' ? 'Select a card network' : 'Select a payment method'}</option>
                  {(field.type === 'bank' ? indianBanks : field.options).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : field.type === 'static' ? (
                <div id={`newtx-${field.key}`} style={{ padding:'10px 12px', color:'var(--fg)', background:'var(--bg-card-2)', border:'1px solid var(--border)', borderRadius:8 }}>{field.value}</div>
              ) : (
                <input
                  id={`newtx-${field.key}`}
                  type={field.type}
                  placeholder={field.placeholder || field.label}
                  value={newTx[field.key]}
                  onChange={(event) => setNewTx((current) => ({ ...current, [field.key]: event.target.value }))}
                  required={field.required}
                  min={field.min}
                  step={field.step}
                  style={{ width:'100%', padding:'10px 12px', background:'var(--bg-card-2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--fg)' }}
                />
              )}
            </div>
          ))}
          <button type="submit" className="btn-primary" style={{ gridColumn:'1/-1', justifyContent:'center' }}>Add Transaction</button>
        </form>
      </AxiomaCard>

      {loading ? (
        <div style={{ color:'var(--fg-dim)', padding:40, textAlign:'center' }}>Loading...</div>
      ) : (
        <AxiomaCard title="Recent Transactions" subtitle="LIVE STREAM">
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)', color:'var(--fg-dim)', fontFamily:'JetBrains Mono, monospace', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  <th style={{ textAlign:'left', padding:'12px 16px' }}>Customer</th>
                  <th style={{ textAlign:'left', padding:'12px 16px' }}>Merchant</th>
                  <th style={{ textAlign:'left', padding:'12px 16px' }}>Amount</th>
                  <th style={{ textAlign:'left', padding:'12px 16px' }}>Score</th>
                  <th style={{ textAlign:'left', padding:'12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} onClick={()=>navigate(`/transactions/${tx.id}`)} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }} onMouseOver={e=>e.currentTarget.style.background='var(--bg-card-2)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'14px 16px', fontFamily:'JetBrains Mono, monospace', fontSize:13 }}>{tx.customer_id}</td>
                    <td style={{ padding:'14px 16px' }}>{tx.merchant_name}</td>
                    <td style={{ padding:'14px 16px', fontWeight:600 }}>{formatCurrency(tx.amount, tx.currency)}</td>
                    <td style={{ padding:'14px 16px', fontFamily:'JetBrains Mono, monospace' }}>{tx.fraud_score.toFixed(3)}</td>
                    <td style={{ padding:'14px 16px' }}>
                      <span style={{ padding:'4px 10px', borderRadius:999, fontSize:12, background: tx.is_fraud_predicted ? 'rgba(255,94,98,0.15)' : 'rgba(77,212,172,0.15)', color: tx.is_fraud_predicted ? 'var(--accent-2)' : 'var(--accent-3)', fontWeight:600 }}>
                        {tx.is_fraud_predicted ? '⚠️ Fraud' : '✓ Legitimate'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AxiomaCard>
      )}
      </AxiomaSection>
    </div>
  )
}
