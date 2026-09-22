import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">
              🔐 Fraud Detection
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
              Dashboard
            </Link>
            <Link to="/transactions" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
              Transactions
            </Link>
            <span className="text-sm text-gray-600">Hello, {user?.username}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-fraud-600 text-white rounded-md text-sm font-medium hover:bg-fraud-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
