import { useEffect, useState } from 'react'
import { onFraudAlert, offFraudAlert } from '../services/websocket'

export default function AlertNotification() {
  const [alerts, setAlerts] = useState([])
  const [showNotifications, setShowNotifications] = useState(true)

  useEffect(() => {
    const handleFraudAlert = (data) => {
      console.log('Fraud alert received:', data)

      const notification = {
        id: data.alert_id,
        timestamp: new Date(),
        ...data,
      }

      setAlerts((prev) => [notification, ...prev].slice(0, 10))

      // Auto-remove after 10 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== notification.id))
      }, 10000)

      // Play sound if available
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj==')
        audio.play()
      } catch (e) {
        console.log('Could not play alert sound')
      }
    }

    onFraudAlert(handleFraudAlert)

    return () => {
      offFraudAlert(handleFraudAlert)
    }
  }, [])

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'bg-red-600'
      case 'HIGH':
        return 'bg-red-500'
      case 'MEDIUM':
        return 'bg-orange-500'
      case 'LOW':
        return 'bg-yellow-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`${getRiskColor(alert.risk_level)} text-white p-4 rounded-lg shadow-lg transform transition-all duration-300 animate-pulse`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-lg">🚨 Fraud Alert Detected</h3>
              <p className="text-sm mt-1">
                <strong>Merchant:</strong> {alert.merchant}
              </p>
              <p className="text-sm">
                <strong>Amount:</strong> ${alert.amount.toFixed(2)}
              </p>
              <p className="text-sm">
                <strong>Risk Level:</strong> {alert.risk_level}
              </p>
              <p className="text-xs text-gray-100 mt-1">
                Fraud Score: {alert.fraud_score.toFixed(3)}
              </p>
            </div>
            <button
              onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
              className="ml-2 text-white hover:text-gray-200 font-bold text-xl"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
