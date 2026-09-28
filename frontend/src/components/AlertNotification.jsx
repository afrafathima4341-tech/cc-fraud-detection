import { useEffect } from 'react'
import { useToast } from './Toast'
import { onFraudAlert, offFraudAlert, connectWebSocket, disconnectWebSocket } from '../services/websocket'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/formatters'

export default function AlertNotification() {
  const { token } = useAuthStore()
  const { addToast } = useToast()

  useEffect(() => {
    if (!token) return
    connectWebSocket(token)
    const handleAlert = (alert) => {
      addToast(`Fraud Alert: ${alert.merchant_name || alert.merchant} - ${formatCurrency(alert.amount, alert.currency)}`, 'error')
    }
    onFraudAlert(handleAlert)
    return () => {
      offFraudAlert(handleAlert)
      disconnectWebSocket()
    }
  }, [token, addToast])

  return null
}
