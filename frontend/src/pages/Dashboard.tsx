import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { teamApi, statsApi } from '../services/api'
import { Team, TeamOverview } from '../types'
import toast from 'react-hot-toast'

const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [overview, setOverview] = useState<TeamOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await teamApi.getTeams()
        setTeams(res.data)
        if (res.data.length > 0) {
          setSelectedTeam(res.data[0].id)
        }
      } catch (error) {
        toast.error('获取团队列表失败')
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      const fetchOverview = async () => {
        try {
          const res = await statsApi.getOverview(selectedTeam)
          setOverview(res.data)
        } catch (error) {
          console.error('Failed to fetch overview:', error)
        }
      }

      fetchOverview()
    }
  }, [selectedTeam])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">仪表盘</h1>
        <p className="page-subtitle">欢迎回来，{user?.name || user?.username}</p>
      </div>

      {teams.length > 0 && (
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">选择团队</label>
          <select
            className="form-input"
            style={{ maxWidth: '300px' }}
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</p>
          <h3 style={{ marginBottom: '0.5rem' }}>暂无团队</h3>
          <p style={{ color: 'var(--gray-500)' }}>您还没有加入任何团队</p>
        </div>
      ) : (
        <>
          {overview && (
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>团队成员</p>
                    <p style={{ fontSize: '2rem', fontWeight: 700 }}>{overview.membersCount}</p>
                  </div>
                  <div style={{ fontSize: '2.5rem' }}>👥</div>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>今日已提交日报</p>
                    <p style={{ fontSize: '2rem', fontWeight: 700 }}>
                      {overview.todaySubmitted}
                      <span style={{ fontSize: '1rem', color: 'var(--gray-500)' }}>/{overview.membersCount}</span>
                    </p>
                  </div>
                  <div style={{ fontSize: '2.5rem' }}>📝</div>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>本周已提交周报</p>
                    <p style={{ fontSize: '2rem', fontWeight: 700 }}>
                      {overview.weekSubmitted}
                      <span style={{ fontSize: '1rem', color: 'var(--gray-500)' }}>/{overview.membersCount}</span>
                    </p>
                  </div>
                  <div style={{ fontSize: '2.5rem' }}>📋</div>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>今日草稿</p>
                    <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning-color)' }}>
                      {overview.todayDraft}
                    </p>
                  </div>
                  <div style={{ fontSize: '2.5rem' }}>📄</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontWeight: 600 }}>快捷操作</h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a href="/daily-report" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>
                  📝 填写今日日报
                </a>
                <a href="/weekly-report" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                  📋 填写本周周报
                </a>
                <a href="/calendar" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                  📅 查看日历视图
                </a>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 style={{ fontWeight: 600 }}>我的角色</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="avatar avatar-lg">{user?.name?.[0] || user?.username?.[0]}</div>
                  <div>
                    <p style={{ fontWeight: 600 }}>{user?.name || user?.username}</p>
                    <span className={`badge ${
                      user?.role === 'super_admin' ? 'badge-info' :
                      user?.role === 'team_lead' ? 'badge-success' : 'badge-secondary'
                    }`}>
                      {user?.role === 'super_admin' ? '超级管理员' :
                       user?.role === 'team_lead' ? '团队负责人' : '普通成员'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
