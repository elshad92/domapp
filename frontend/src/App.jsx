import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './i18n'
import Layout from './components/Layout'
import AppToaster from './components/AppToaster'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Buildings from './pages/Buildings'
import Apartments from './pages/Apartments'
import Tenants from './pages/Tenants'
import Employees from './pages/Employees'
import Requests from './pages/Requests'
import RequestDetail from './pages/RequestDetail'
import Payments from './pages/Payments'
import Announcements from './pages/Announcements'
import Reports from './pages/Reports'
import Polls from './pages/Polls'
import ResidentLogin from './pages/resident/ResidentLogin'
import ResidentDashboard from './pages/resident/ResidentDashboard'
import ResidentRequests from './pages/resident/ResidentRequests'
import ResidentRequestDetail from './pages/resident/ResidentRequestDetail'
import ResidentPolls from './pages/resident/ResidentPolls'
import ResidentGuestQR from './pages/resident/ResidentGuestQR'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Layout>{children}</Layout>
}

function ResidentProtectedRoute({ children }) {
  const token = localStorage.getItem('resident_token')
  if (!token) {
    return <Navigate to="/resident" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <AppToaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/buildings" element={<ProtectedRoute><Buildings /></ProtectedRoute>} />
        <Route path="/apartments" element={<ProtectedRoute><Apartments /></ProtectedRoute>} />
        <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
        <Route path="/requests/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/polls" element={<ProtectedRoute><Polls /></ProtectedRoute>} />

        {/* Resident routes */}
        <Route path="/resident" element={<ResidentLogin />} />
        <Route path="/resident/dashboard" element={<ResidentProtectedRoute><ResidentDashboard /></ResidentProtectedRoute>} />
        <Route path="/resident/requests" element={<ResidentProtectedRoute><ResidentRequests /></ResidentProtectedRoute>} />
        <Route path="/resident/requests/:id" element={<ResidentProtectedRoute><ResidentRequestDetail /></ResidentProtectedRoute>} />
        <Route path="/resident/polls" element={<ResidentProtectedRoute><ResidentPolls /></ResidentProtectedRoute>} />
        <Route path="/resident/guest-qr" element={<ResidentProtectedRoute><ResidentGuestQR /></ResidentProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
