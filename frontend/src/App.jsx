import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import TransactionDetailPage from './pages/TransactionDetailPage'
import CasesPage from './pages/CasesPage'
import AxiomaNav from './components/AxiomaNav'
import AlertNotification from './components/AlertNotification'
import ToastContainer from './components/Toast'

function App() {
  const { user, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <Router>
      <div className="atmosphere" />
      <ToastContainer />
      {user && <AxiomaNav />}
      {user && <AlertNotification />}
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
        <Route path="/transactions" element={user ? <TransactionsPage /> : <Navigate to="/login" />} />
        <Route path="/transactions/:transactionId" element={user ? <TransactionDetailPage /> : <Navigate to="/login" />} />
        <Route path="/cases" element={user ? <CasesPage /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
      <style>{`
        html, body, #root { height: 100%; }
        main, nav, footer { position: relative; z-index: 1; }
      `}</style>
    </Router>
  )
}

export default App
