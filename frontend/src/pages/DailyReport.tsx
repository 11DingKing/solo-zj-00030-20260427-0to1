import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import { teamApi, dailyReportApi, templateApi, commentApi } from '../services/api'
import { Team, DailyReport, Template, Comment } from '../types'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

const DailyReport: React.FC = () => {
  const { user } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [report, setReport] = useState<DailyReport | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showComments, setShowComments] = useState(false)

  const [todayCompleted, setTodayCompleted] = useState('')
  const [tomorrowPlan, setTomorrowPlan] = useState('')
  const [problems, setProblems] = useState('')
  const [newComment, setNewComment] = useState('')

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
    if (selectedTeam && selectedDate) {
      fetchReport()
      fetchTemplate()
    }
  }, [selectedTeam, selectedDate])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await dailyReportApi.getByDate(selectedTeam, selectedDate)
      const data = res.data
      
      if (Array.isArray(data) && data.length === 0) {
        setReport(null)
        setTodayCompleted('')
        setTomorrowPlan('')
        setProblems('')
      } else if (Array.isArray(data) && data.length > 0) {
        const myReport = data.find((r: DailyReport) => r.user_id === user?.id)
        if (myReport) {
          setReport(myReport)
          setTodayCompleted(myReport.today_completed || '')
          setTomorrowPlan(myReport.tomorrow_plan || '')
          setProblems(myReport.problems || '')
        } else if (user?.role === 'super_admin' || user?.role === 'team_lead') {
          setReport(data[0])
          setTodayCompleted(data[0].today_completed || '')
          setTomorrowPlan(data[0].tomorrow_plan || '')
          setProblems(data[0].problems || '')
        }
      } else if (data && typeof data === 'object') {
        setReport(data as DailyReport)
        setTodayCompleted((data as DailyReport).today_completed || '')
        setTomorrowPlan((data as DailyReport).tomorrow_plan || '')
        setProblems((data as DailyReport).problems || '')
      } else {
        setReport(null)
        setTodayCompleted('')
        setTomorrowPlan('')
        setProblems('')
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
      const res = await templateApi.getActive(selectedTeam, 'daily')
      setTemplate(res.data)
    } catch (error) {
      console.error('Failed to fetch template:', error)
    }
  }

  const fetchComments = async () => {
    if (!report?.id) return
    try {
      const res = await commentApi.get('daily', report.id)
      setComments(res.data)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    }
  }

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (!selectedTeam) {
      toast.error('请先选择团队')
      return
    }

    setSaving(true)
    try {
      await dailyReportApi.save({
        teamId: selectedTeam,
        reportDate: selectedDate,
        todayCompleted,
        tomorrowPlan,
        problems,
        status,
      })
      toast.success(status === 'submitted' ? '日报已提交' : '草稿已保存')
      fetchReport()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!report?.id || !newComment.trim()) return

    try {
      await commentApi.create({
        reportId: report.id,
        reportType: 'daily',
        content: newComment,
      })
      setNewComment('')
      toast.success('评论已添加')
      fetchComments()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '添加评论失败')
    }
  }

  const isOwnReport = report?.user_id === user?.id

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">日报</h1>
        <p className="page-subtitle">填写并提交您的日报</p>
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
          <label className="form-label">选择日期</label>
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 600 }}>
                {format(new Date(selectedDate), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
              </h3>
              {report && (
                <span className={`badge mt-2 ${report.status === 'submitted' ? 'badge-success' : 'badge-warning'}`}>
                  {report.status === 'submitted' ? '已提交' : '草稿'}
                </span>
              )}
            </div>
            {report && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowComments(true)
                  fetchComments()
                }}
              >
                💬 查看评论
              </button>
            )}
          </div>

          <div className="card-body">
            {template && (
              <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
                <strong>使用模板：</strong> {template.name}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                今日完成 <span style={{ color: 'var(--danger-color)' }}>*</span>
              </label>
              <textarea
                className="form-input form-textarea"
                placeholder="描述今天完成的工作内容，支持 Markdown 格式..."
                value={todayCompleted}
                onChange={(e) => setTodayCompleted(e.target.value)}
                disabled={!isOwnReport && !!report}
              />
            </div>

            <div className="form-group">
              <label className="form-label">明日计划</label>
              <textarea
                className="form-input form-textarea"
                placeholder="描述明天的工作计划..."
                value={tomorrowPlan}
                onChange={(e) => setTomorrowPlan(e.target.value)}
                disabled={!isOwnReport && !!report}
              />
            </div>

            <div className="form-group">
              <label className="form-label">遇到的问题 / 需要的支持</label>
              <textarea
                className="form-input form-textarea"
                placeholder="描述遇到的问题或需要的支持..."
                value={problems}
                onChange={(e) => setProblems(e.target.value)}
                disabled={!isOwnReport && !!report}
              />
            </div>

            {todayCompleted && (
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
                  <ReactMarkdown>{todayCompleted}</ReactMarkdown>
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
                disabled={saving || !todayCompleted.trim()}
              >
                {saving ? <span className="loading-spinner"></span> : '提交'}
              </button>
            </div>
          )}
        </div>
      )}

      {showComments && report && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowComments(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 600 }}>评论 ({comments.length})</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowComments(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                  暂无评论
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment">
                    <div className="comment-header">
                      <div className="avatar">{comment.user_name?.[0] || 'U'}</div>
                      <div>
                        <span className="comment-author">{comment.user_name}</span>
                        <span className="comment-time" style={{ marginLeft: '0.5rem' }}>
                          {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm')}
                        </span>
                      </div>
                    </div>
                    <div className="comment-content">{comment.content}</div>
                  </div>
                ))
              )}
            </div>

            <div className="card-footer">
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <textarea
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="添加评论..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                >
                  发送
                </button>
              </div>
              <p className="text-sm text-muted mt-2">
                提示：输入 @ 可以提及其他成员
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyReport
