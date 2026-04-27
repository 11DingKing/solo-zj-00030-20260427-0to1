import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { notificationApi } from '../services/api'
import { UserRole } from '../types'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await notificationApi.getUnreadCount()
        setUnreadCount(res.data.unreadCount)
      } catch (error) {
        console.error('Failed to fetch unread count:', error)
      }
    }

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isTeamLeadOrAdmin = user?.role === 'super_admin' || user?.role === 'team_lead'

  const menuItems = [
    { path: '/dashboard', label: '仪表盘', icon: '📊' },
    { path: '/daily-report', label: '日报', icon: '📝' },
    { path: '/weekly-report', label: '周报', icon: '📋' },
    { path: '/calendar', label: '日历视图', icon: '📅' },
  ]

  const adminMenuItems = [
    { path: '/team-reports', label: '团队报告', icon: '📁' },
    { path: '/team-manage', label: '团队管理', icon: '👥' },
    { path: '/statistics', label: '统计分析', icon: '📈' },
    { path: '/templates', label: '模板管理', icon: '📄' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">📋 日报周报系统</div>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {isTeamLeadOrAdmin && (
            <>
              <div className="divider" style={{ margin: '1rem 1.25rem' }}></div>
              <div style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                管理功能
              </div>
              {adminMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              {menuItems.find((item) => item.path === location.pathname)?.label ||
                adminMenuItems.find((item) => item.path === location.pathname)?.label ||
                '仪表盘'}
            </h2>
          </div>
          <div className="header-right">
            <div className="dropdown">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ position: 'relative' }}
              >
                🔔 通知
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>
              {showNotifications && (
                <div className="dropdown-menu" style={{ minWidth: '300px' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--gray-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>通知</strong>
                      <Link to="/notifications" style={{ fontSize: '0.75rem' }}>查看全部</Link>
                    </div>
                  </div>
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                    {unreadCount === 0 ? '暂无新通知' : `您有 ${unreadCount} 条未读通知`}
                  </div>
                </div>
              )}
            </div>

            <div className="dropdown">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <div className="avatar">{user?.name?.[0] || user?.username?.[0] || 'U'}</div>
                <span>{user?.name || user?.username}</span>
              </button>
              {showUserMenu && (
                <div className="dropdown-menu">
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--gray-200)' }}>
                    <div style={{ fontWeight: 600 }}>{user?.name || user?.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {user?.role === 'super_admin' ? '超级管理员' : 
                       user?.role === 'team_lead' ? '团队负责人' : '普通成员'}
                    </div>
                  </div>
                  <Link to="/notifications" className="dropdown-item">
                    <span>🔔</span>
                    <span>通知</span>
                  </Link>
                  <div className="divider"></div>
                  <button
                    className="dropdown-item"
                    onClick={handleLogout}
                    style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                  >
                    <span>🚪</span>
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}

export default Layout
