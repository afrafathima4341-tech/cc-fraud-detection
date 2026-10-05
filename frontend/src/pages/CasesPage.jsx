import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../components/Toast'
import AxiomaSection from '../components/AxiomaSection'
import AxiomaCard from '../components/AxiomaCard'
import AxiomaReadout from '../components/AxiomaReadout'
import { formatCurrency, formatINR } from '../utils/formatters'

export default function CasesPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCase, setSelectedCase] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editAction, setEditAction] = useState('NONE')
  const [editStatus, setEditStatus] = useState('OPEN')

  useEffect(() => {
    fetchCases()
  }, [statusFilter, priorityFilter])

  const fetchCases = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (priorityFilter) params.append('priority', priorityFilter)
      const res = await api.get(`/cases?${params.toString()}`)
      setCases(res.data.cases || [])
      if (res.data.cases && res.data.cases.length > 0 && !selectedCase) {
        setSelectedCase(res.data.cases[0])
        setEditNotes(res.data.cases[0].notes || '')
        setEditAction(res.data.cases[0].action_taken || 'NONE')
        setEditStatus(res.data.cases[0].status || 'OPEN')
      }
    } catch (err) {
      console.error('Failed to load cases:', err)
      addToast('Error loading investigation cases')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCase = (c) => {
    setSelectedCase(c)
    setEditNotes(c.notes || '')
    setEditAction(c.action_taken || 'NONE')
    setEditStatus(c.status || 'OPEN')
  }

  const handleUpdateCase = async () => {
    if (!selectedCase) return
    try {
      const res = await api.patch(`/cases/${selectedCase.id}`, {
        status: editStatus,
        action_taken: editAction,
        notes: editNotes,
      })
      addToast(`Case ${selectedCase.case_number} updated`)
      setSelectedCase(res.data.case)
      fetchCases()
    } catch (err) {
      console.error('Failed to update case:', err)
      addToast('Failed to update case')
    }
  }

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/cases/export/csv', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fraud_incident_cases_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      addToast('Audit CSV report downloaded')
    } catch (err) {
      console.error('Export failed:', err)
      addToast('Export failed')
    }
  }

  const getStatusBadge = (st) => {
    switch (st) {
      case 'OPEN': return { color: '#ff5e62', bg: 'rgba(255,94,98,0.1)' }
      case 'IN_TRIAGE': return { color: '#ffb347', bg: 'rgba(255,179,71,0.1)' }
      case 'ESCALATED': return { color: '#ff3b30', bg: 'rgba(255,59,48,0.2)' }
      case 'RESOLVED_FRAUD': return { color: '#ff453a', bg: 'rgba(255,69,58,0.15)' }
      case 'RESOLVED_BENIGN': return { color: '#30d158', bg: 'rgba(48,209,88,0.15)' }
      default: return { color: 'var(--muted)', bg: 'rgba(255,255,255,0.05)' }
    }
  }

  return (
    <div className="bg-grid" style={{ minHeight: '100vh', paddingTop: 90, paddingBottom: 60 }}>
      <AxiomaSection
        num="03 — INVESTIGATIONS"
        title="Fraud Case Management & Incident Triage"
        kicker="Audit Log & Resolution Workflow"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="axioma-select"
              style={{ background: 'var(--card-bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px' }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_TRIAGE">In Triage</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED_FRAUD">Resolved (Fraud Confirmed)</option>
              <option value="RESOLVED_BENIGN">Resolved (False Positive)</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="axioma-select"
              style={{ background: 'var(--card-bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px' }}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleExportCSV}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ⬇ Export Audit CSV
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.3fr)', gap: 24 }}>
          {/* Case List */}
          <AxiomaCard title="Active Incident Queue" subtitle={`TOTAL: ${cases.length}`}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading cases...</div>
            ) : cases.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No investigation cases found matching filter.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
                {cases.map((c) => {
                  const badge = getStatusBadge(c.status)
                  const isSelected = selectedCase?.id === c.id
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCase(c)}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        background: isSelected ? 'rgba(255, 94, 98, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>
                          {c.case_number}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg }}>
                          {c.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-dim)', marginBottom: 4 }}>
                        Tx #{c.transaction_id} — {c.transaction ? formatCurrency(c.transaction.amount, c.transaction.currency) : 'INR'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        <span>Priority: {c.priority}</span>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </AxiomaCard>

          {/* Case Detail & Workflow Resolution */}
          <AxiomaCard title={selectedCase ? `Case Details: ${selectedCase.case_number}` : 'Select a Case'} subtitle="TRIAGE WORKFLOW">
            {selectedCase ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
                  <AxiomaReadout label="Target Transaction" value={`#${selectedCase.transaction_id}`} />
                  <AxiomaReadout label="Assigned Analyst" value={selectedCase.assigned_analyst || 'Lead Risk Officer'} />
                  <AxiomaReadout label="Priority" value={selectedCase.priority} />
                  <AxiomaReadout label="Action Taken" value={selectedCase.action_taken || 'NONE'} />
                </div>

                {selectedCase.transaction && (
                  <div style={{ padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 20 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                      ATTACHED TRANSACTION METRICS
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>Customer: {selectedCase.transaction.customer_id}</span>
                      <span>Merchant: {selectedCase.transaction.merchant_name || selectedCase.transaction.merchant_id}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>Amount: <strong>{formatCurrency(selectedCase.transaction.amount, selectedCase.transaction.currency)}</strong></span>
                      <span style={{ color: 'var(--accent-2)' }}>Fraud Score: {selectedCase.transaction.fraud_score}</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                      UPDATE CASE STATUS
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', background: 'var(--card-bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 6 }}
                    >
                      <option value="OPEN">OPEN (Under Review)</option>
                      <option value="IN_TRIAGE">IN_TRIAGE (Contacting Customer/Bank)</option>
                      <option value="ESCALATED">ESCALATED (Forwarded to Cyber Crime / Compliance)</option>
                      <option value="RESOLVED_FRAUD">RESOLVED_FRAUD (Confirmed Fraudulent)</option>
                      <option value="RESOLVED_BENIGN">RESOLVED_BENIGN (Confirmed Legitimate / False Positive)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                      ENFORCE TRIAGE ACTION
                    </label>
                    <select
                      value={editAction}
                      onChange={(e) => setEditAction(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', background: 'var(--card-bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 6 }}
                    >
                      <option value="NONE">None</option>
                      <option value="CARD_FROZEN">Freeze Payment Card / Instrument</option>
                      <option value="MERCHANT_BLOCKED">Block Merchant Terminal</option>
                      <option value="USER_NOTIFIED">Notify Customer via SMS / Push</option>
                      <option value="WHITELISTED">Whitelist Entity</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                      INVESTIGATOR NOTES & FINDINGS
                    </label>
                    <textarea
                      rows={4}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add investigation logs, phone verification notes, or evidence..."
                      style={{ width: '100%', padding: '10px 12px', background: 'var(--card-bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                    <button
                      onClick={handleUpdateCase}
                      className="btn-primary"
                      style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, borderRadius: 6 }}
                    >
                      Save Case Resolution
                    </button>
                    <button
                      onClick={() => navigate(`/transactions/${selectedCase.transaction_id}`)}
                      className="btn-secondary"
                      style={{ padding: '10px 16px', fontSize: 13, borderRadius: 6 }}
                    >
                      View Full Tx Graph
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                Select an investigation case from the queue to review or triage.
              </div>
            )}
          </AxiomaCard>
        </div>
      </AxiomaSection>
    </div>
  )
}
