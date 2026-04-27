import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { authApi } from './services/api'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DailyReport from './pages/DailyReport'
import WeeklyReport from './pages/WeeklyReport'
import Calendar from './pages/Calendar'
import TeamReports from './pages/TeamReports'
import TeamManage from './pages/TeamManage'
import Statistics from './pages/Statistics'
import Templates from './pages/Templates'
import Notifications from './pages/Notifications'
import Layout from './components/Layout'
import { User } from './types'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isLoading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    if (token && !user) {
      authApi.getMe()
        .then(res => {
          setUser(res.data as User)
          setLoading(false)
        })
        .catch(() => {
          useAuthStore.getState().logout()
          setLoading(false)
        })
    } else if (!token) {
      setLoading(false)
    }
  }, [token, user, setUser, setLoading])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/daily-report" element={<DailyReport />} />
                  <Route path="/weekly-report" element={<WeeklyReport />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/team-reports" element={<TeamReports />} />
                  <Route path="/team-manage" element={<TeamManage />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/notifications" element={<Notifications />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
