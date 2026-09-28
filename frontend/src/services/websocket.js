import { io } from 'socket.io-client'

let socket = null
let socketToken = null

export const connectWebSocket = (token) => {
  if (socket && socketToken === token) return socket
  if (socket) disconnectWebSocket()

  const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000'
  socket = io(wsUrl, {
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  })
  socketToken = token

  socket.on('connect', () => {
    console.log('WebSocket connected')
    // Join alerts room
    socket.emit('join_alerts')
  })

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected')
  })

  socket.on('connection', (data) => {
    console.log('Connection status:', data)
  })

  socket.on('pong', (data) => {
    console.log('Pong received:', data)
  })

  return socket
}

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    socketToken = null
  }
}

export const getSocket = () => socket

export const onFraudAlert = (callback) => {
  if (socket) {
    socket.on('fraud_alert', callback)
  }
}

export const onTransactionUpdate = (callback) => {
  if (socket) {
    socket.on('transaction_update', callback)
  }
}

export const offFraudAlert = (callback) => {
  if (socket) {
    socket.off('fraud_alert', callback)
  }
}

export const offTransactionUpdate = (callback) => {
  if (socket) {
    socket.off('transaction_update', callback)
  }
}
