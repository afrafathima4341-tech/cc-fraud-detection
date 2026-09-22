import { io } from 'socket.io-client'

let socket = null

export const connectWebSocket = (token) => {
  socket = io('http://localhost:5000', {
    query: {
      token: token,
    },
    transports: ['websocket', 'polling'],
  })

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
