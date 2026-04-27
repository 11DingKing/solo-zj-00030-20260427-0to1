import React, { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import { teamApi, weeklyReportApi, projectApi, templateApi } from '../services/api'
import { Team, WeeklyReport, WorkHourEntry, Project, Template } from '../types'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

const WeeklyReport: React.FC = () => {
  const { user } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 5 })

  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(format(weekStart, 'yyyy-MM-dd'))
  const [summary, setSummary] = useState('')
  const [nextWeekPlan, setNextWeekPlan] = useState('')
  const [coordinationNeeded, setCoordinationNeeded] = useState('')
  const [workHours, setWorkHours] = useState<WorkHourEntry[]>([])

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
  const dayLabels = ['周一', '周二', '周三', '周四', '周五']

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
      fetchProjects()
      fetchReport()
      fetchTemplate()
    }
  }, [selectedTeam, selectedWeekStart])

  const fetchProjects = async () => {
    try {
      const res = await projectApi.get(selectedTeam, { isActive: true })
      setProjects(res.data)
      if (res.data.length > 0) {
        const initialHours: WorkHourEntry[] = res.data.map((p: Project) => ({
          project_id: p.id,
          project_name: p.name,
          hours: {
            monday: 0,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0,
          },
        }))
        setWorkHours(initialHours)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await weeklyReportApi.getByWeek(selectedTeam, selectedWeekStart)
      const data = res.data
      
      if (Array.isArray(data) && data.length === 0) {
        setReport(null)
        setSummary('')
        setNextWeekPlan('')
        setCoordinationNeeded('')
      } else if (Array.isArray(data) && data.length > 0) {
        const myReport = data.find((r: WeeklyReport) => r.user_id === user?.id)
        if (myReport) {
          setReport(myReport)
          setSummary(myReport.summary || '')
          setNextWeekPlan(myReport.next_week_plan || '')
          setCoordinationNeeded(myReport.coordination_needed || '')
          if (myReport.work_hours) {
            setWorkHours(myReport.work_hours)
          }
        } else if (user?.role === 'super_admin' || user?.role === 'team_lead') {
          setReport(data[0])
          setSummary(data[0].summary || '')
          setNextWeekPlan(data[0].next_week_plan || '')
          setCoordinationNeeded(data[0].coordination_needed || '')
          if (data[0].work_hours) {
            setWorkHours(data[0].work_hours)
          }
        }
      } else if (data && typeof data === 'object') {
        setReport(data as WeeklyReport)
        setSummary((data as WeeklyReport).summary || '')
        setNextWeekPlan((data as WeeklyReport).next_week_plan || '')
        setCoordinationNeeded((data as WeeklyReport).coordination_needed || '')
        if ((data as WeeklyReport).work_hours) {
          setWorkHours((data as WeeklyReport).work_hours!)
        }
      } else {
        setReport(null)
        setSummary('')
        setNextWeekPlan('')
        setCoordinationNeeded('')
      }
    } catch (error) {
      console.error('Failed to fetch report:', error)
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplate = async () => {
    try {
      const res = await templateApi.getActive(selectedTeam, 'weekly')
      setTemplate(res.data)
    } catch (error) {
      console.error('Failed to fetch template:', error)
    }
  }

  const handleWorkHourChange = (projectIndex: number, day: string, value: string) => {
    const newWorkHours = [...workHours]
    const numValue = parseFloat(value) || 0
    newWorkHours[projectIndex] = {
      ...newWorkHours[projectIndex],
      hours: {
        ...newWorkHours[projectIndex].hours,
        [day]: numValue,
      },
    }
    setWorkHours(newWorkHours)
  }

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (!selectedTeam) {
      toast.error('请先选择团队')
      return
    }

    setSaving(true)
    try {
      await weeklyReportApi.save({
        teamId: selectedTeam,
        weekStart: selectedWeekStart,
        weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        summary,
        nextWeekPlan,
        coordinationNeeded,
        workHours,
        status,
      })
      toast.success(status === 'submitted' ? '周报已提交' : '草稿已保存')
      fetchReport()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const isOwnReport = report?.user_id === user?.id

  const getTotalHours = () => {
    return workHours.reduce((total, entry) => {
      return total + Object.values(entry.hours).reduce((sum, h) => sum + (h || 0), 0)
    }, 0)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">周报</h1>
        <p className="page-subtitle">填写并提交您的周报</p>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">选择团队</label>
          <select
            className="form-input"
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

        <div className="form-group">
          <label className="form-label">选择周</label>
          <input
            type="date"
            className="form-input"
            value={selectedWeekStart}
            onChange={(e) => setSelectedWeekStart(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 600 }}>
                  周报周期：{format(new Date(selectedWeekStart), 'yyyy年MM月dd日', { locale: zhCN })} - 
                  {format(weekEnd, 'MM月dd日', { locale: zhCN })}
                </h3>
                {report && (
                  <span className={`badge mt-2 ${report.status === 'submitted' ? 'badge-success' : 'badge-warning'}`}>
                    {report.status === 'submitted' ? '已提交' : '草稿'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 style={{ fontWeight: 600 }}>工时统计</h3>
            </div>
            <div className="card-body">
              {projects.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
                  暂无项目，请联系团队负责人添加项目
                </div>
              ) : (
                <>
                  <table className="work-hours-table">
                    <thead>
                      <tr>
                        <th>项目</th>
                        {dayLabels.map((label, index) => (
                          <th key={index}>{label}</th>
                        ))}
                        <th>合计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workHours.map((entry, projectIndex) => (
                        <tr key={entry.project_id}>
                          <td style={{ textAlign: 'left' }}>{entry.project_name}</td>
                          {daysOfWeek.map((day, dayIndex) => (
                            <td key={day}>
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={entry.hours[day] || 0}
                                onChange={(e) => handleWorkHourChange(projectIndex, day, e.target.value)}
                                disabled={!isOwnReport && !!report}
                              />
                            </td>
                          ))}
                          <td style={{ fontWeight: 600 }}>
                            {Object.values(entry.hours).reduce((sum, h) => sum + (h || 0), 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ fontWeight: 600, textAlign: 'left' }}>总计</td>
                        {daysOfWeek.map((day) => (
                          <td key={day} style={{ fontWeight: 600 }}>
                            {workHours.reduce((sum, entry) => sum + (entry.hours[day] || 0), 0)}
                          </td>
                        ))}
                        <td style={{ fontWeight: 600, background: 'var(--gray-100)' }}>
                          {getTotalHours()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 style={{ fontWeight: 600 }}>工作内容</h3>
            </div>
            <div className="card-body">
              {template && (
                <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
                  <strong>使用模板：</strong> {template.name}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  本周总结 <span style={{ color: 'var(--danger-color)' }}>*</span>
                </label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="描述本周完成的工作内容，支持 Markdown 格式..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={!isOwnReport && !!report}
                  style={{ minHeight: '150px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">下周计划</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="描述下周的工作计划..."
                  value={nextWeekPlan}
                  onChange={(e) => setNextWeekPlan(e.target.value)}
                  disabled={!isOwnReport && !!report}
                  style={{ minHeight: '120px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">需要协调的事项</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="描述需要协调或支持的事项..."
                  value={coordinationNeeded}
                  onChange={(e) => setCoordinationNeeded(e.target.value)}
                  disabled={!isOwnReport && !!report}
                  style={{ minHeight: '120px' }}
                />
              </div>

              {summary && (
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">预览</label>
                  <div
                    className="markdown-content"
                    style={{
                      padding: '1rem',
                      background: 'var(--gray-50)',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--gray-200)',
                    }}
                  >
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {isOwnReport && (
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                >
                  {saving ? <span className="loading-spinner"></span> : '保存草稿'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleSave('submitted')}
                  disabled={saving || !summary.trim()}
                >
                  {saving ? <span className="loading-spinner"></span> : '提交'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default WeeklyReport
