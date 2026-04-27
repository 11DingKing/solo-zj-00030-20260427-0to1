import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import { teamApi, statsApi } from '../services/api'
import { Team, SubmissionRateItem, WordTrendItem, WorkHoursStats, UnsubmittedList, TeamMember } from '../types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const Statistics: React.FC = () => {
  const { user } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const [submissionRateData, setSubmissionRateData] = useState<SubmissionRateItem[]>([])
  const [wordTrendData, setWordTrendData] = useState<WordTrendItem[]>([])
  const [workHoursData, setWorkHoursData] = useState<WorkHoursStats | null>(null)
  const [unsubmittedList, setUnsubmittedList] = useState<UnsubmittedList | null>(null)

  const isTeamLeadOrAdmin = user?.role === 'super_admin' || user?.role === 'team_lead'

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
      }
    }

    fetchTeams()
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      fetchAllStats()
    }
  }, [selectedTeam])

  const fetchAllStats = async () => {
    setLoading(true)
    try {
      const [submissionRes, wordTrendRes, workHoursRes, unsubmittedRes] = await Promise.all([
        statsApi.getSubmissionRate(selectedTeam, { days: 30 }),
        statsApi.getWordTrend(selectedTeam, { days: 30 }),
        statsApi.getWorkHours(selectedTeam),
        statsApi.getUnsubmitted(selectedTeam),
      ])

      setSubmissionRateData(Array.isArray(submissionRes.data) ? submissionRes.data : [])
      setWordTrendData(Array.isArray(wordTrendRes.data) ? wordTrendRes.data : [])
      setWorkHoursData(workHoursRes.data || null)
      setUnsubmittedList(unsubmittedRes.data || null)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const submissionChartData = submissionRateData.map((item) => ({
    name: item.name || item.username,
    提交率: Math.round(item.submission_rate * 100),
    已提交: item.submitted_count,
    总天数: item.total_days,
  }))

  const wordTrendChartData = wordTrendData.map((item) => ({
    日期: format(new Date(item.report_date), 'MM/dd', { locale: zhCN }),
    平均字数: item.avg_word_count,
  }))

  const workHoursChartData = workHoursData?.labels
    ? workHoursData.labels.map((label, index) => {
        const dataPoint: Record<string, any> = { 日期: label }
        workHoursData.datasets.forEach((ds) => {
          dataPoint[ds.label] = ds.data[index] || 0
        })
        return dataPoint
      })
    : []

  const submissionPieData = submissionRateData.length > 0
    ? [
        { name: '已提交', value: submissionRateData.reduce((sum, item) => sum + item.submitted_count, 0) },
        { name: '未提交', value: submissionRateData.reduce((sum, item) => sum + (item.total_days - item.submitted_count), 0) },
      ]
    : []

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">统计分析</h1>
        <p className="page-subtitle">查看团队报告的统计数据和趋势</p>
      </div>

      {isTeamLeadOrAdmin && (
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">选择团队</label>
          <select
            className="form-input"
            style={{ maxWidth: '300px' }}
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <option value="">请选择团队</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          {unsubmittedList && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3 style={{ fontWeight: 600 }}>未提交提醒</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-danger">未提交: {unsubmittedList.unsubmittedCount}</span>
                    <span className="badge badge-warning">草稿: {unsubmittedList.draftCount}</span>
                    <span className="badge badge-success">已提交: {unsubmittedList.submittedCount}</span>
                  </div>
                </div>

                {unsubmittedList.unsubmitted && unsubmittedList.unsubmitted.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--danger-color)' }}>
                      未提交成员:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {unsubmittedList.unsubmitted.map((member) => (
                        <span key={member.id} className="badge badge-danger">
                          {member.name || member.username}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {unsubmittedList.draft && unsubmittedList.draft.length > 0 && (
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--warning-color)' }}>
                      草稿状态成员:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {unsubmittedList.draft.map((member) => (
                        <span key={member.id} className="badge badge-warning">
                          {member.name || member.username}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!unsubmittedList.unsubmitted?.length && !unsubmittedList.draft?.length && (
                  <div style={{ textAlign: 'center', color: 'var(--success-color)', padding: '1rem' }}>
                    ✅ 所有成员都已提交报告！
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontWeight: 600 }}>近 30 天提交率排行</h3>
              </div>
              <div className="card-body" style={{ height: '350px' }}>
                {submissionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={submissionChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === '提交率') return [`${value}%`, name]
                          return [value, name]
                        }}
                      />
                      <Bar dataKey="提交率" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '3rem' }}>
                    暂无数据
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 style={{ fontWeight: 600 }}>近 30 天平均字数趋势</h3>
              </div>
              <div className="card-body" style={{ height: '350px' }}>
                {wordTrendChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={wordTrendChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="日期" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="平均字数" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '3rem' }}>
                    暂无数据
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontWeight: 600 }}>工时统计（按项目堆叠）</h3>
              </div>
              <div className="card-body" style={{ height: '350px' }}>
                {workHoursChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workHoursChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="日期" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {workHoursData?.datasets.map((ds, index) => (
                        <Bar
                          key={index}
                          dataKey={ds.label}
                          stackId="a"
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '3rem' }}>
                    暂无数据
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 style={{ fontWeight: 600 }}>提交状态分布</h3>
              </div>
              <div className="card-body" style={{ height: '350px' }}>
                {submissionPieData[0]?.value > 0 || submissionPieData[1]?.value > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={submissionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '3rem' }}>
                    暂无数据
                  </div>
                )}
              </div>
            </div>
          </div>

          {submissionRateData.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontWeight: 600 }}>成员提交率详情</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>成员</th>
                      <th>已提交天数</th>
                      <th>总天数</th>
                      <th>提交率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionRateData
                      .sort((a, b) => b.submission_rate - a.submission_rate)
                      .map((item, index) => (
                        <tr key={item.id}>
                          <td>
                            <span
                              className={`badge ${
                                index === 0 ? 'badge-success' : index === 1 ? 'badge-warning' : index === 2 ? 'badge-info' : 'badge-secondary'
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="avatar">
                                {(item.name || item.username)?.[0] || 'U'}
                              </div>
                              {item.name || item.username}
                            </div>
                          </td>
                          <td>{item.submitted_count}</td>
                          <td>{item.total_days}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div
                                style={{
                                  width: '100px',
                                  height: '8px',
                                  background: 'var(--gray-200)',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${item.submission_rate * 100}%`,
                                    height: '100%',
                                    background:
                                      item.submission_rate >= 0.8
                                        ? 'var(--success-color)'
                                        : item.submission_rate >= 0.5
                                        ? 'var(--warning-color)'
                                        : 'var(--danger-color)',
                                    borderRadius: '4px',
                                  }}
                                ></div>
                              </div>
                              <span style={{ fontWeight: 600 }}>
                                {Math.round(item.submission_rate * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Statistics
