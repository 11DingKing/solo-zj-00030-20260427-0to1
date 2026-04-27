import React, { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import { teamApi, dailyReportApi } from '../services/api'
import { Team, DailyReport, CalendarDayData } from '../types'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

const Calendar: React.FC = () => {
  const { user } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState<Record<string, CalendarDayData>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDateReports, setSelectedDateReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(false)
  const [showDayDetail, setShowDayDetail] = useState(false)

  const dayNames = ['日', '一', '二', '三', '四', '五', '六']

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
      fetchCalendarData()
    }
  }, [selectedTeam, currentMonth])

  const fetchCalendarData = async () => {
    setLoading(true)
    try {
      const res = await dailyReportApi.getCalendar(selectedTeam, {
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth() + 1,
      })
      setCalendarData(res.data || {})
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDayClick = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    setSelectedDate(dateStr)

    try {
      const res = await dailyReportApi.getByDate(selectedTeam, dateStr)
      if (Array.isArray(res.data)) {
        setSelectedDateReports(res.data)
      } else if (res.data) {
        setSelectedDateReports([res.data])
      } else {
        setSelectedDateReports([])
      }
      setShowDayDetail(true)
    } catch (error) {
      console.error('Failed to fetch day reports:', error)
      setSelectedDateReports([])
      setShowDayDetail(true)
    }
  }

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const data = calendarData[dateStr]

    if (date.getDay() === 0 || date.getDay() === 6) {
      return 'weekend'
    }

    if (!data) {
      return 'none'
    }

    if (data.submitted === data.total) {
      return 'submitted'
    }

    if (data.submitted > 0 || data.draft > 0) {
      return 'partial'
    }

    return 'none'
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'status-submitted'
      case 'partial':
        return 'status-partial'
      case 'weekend':
        return 'status-weekend'
      default:
        return 'status-none'
    }
  }

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day
        const status = getDayStatus(cloneDay)
        const dateStr = format(cloneDay, 'yyyy-MM-dd')
        const dayData = calendarData[dateStr]

        days.push(
          <div
            key={day.toString()}
            className={`calendar-day ${!isSameMonth(day, monthStart) ? 'other-month' : ''} ${day.getDay() === 0 || day.getDay() === 6 ? 'weekend' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => isSameMonth(day, monthStart) && handleDayClick(cloneDay)}
          >
            <div className="calendar-day-number" style={{ color: isToday(cloneDay) ? 'var(--primary-color)' : undefined, fontWeight: isToday(cloneDay) ? 700 : undefined }}>
              {format(day, 'd')}
            </div>
            {dayData && (
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                {dayData.submitted}/{dayData.total}
              </div>
            )}
            <div className={`calendar-status-indicator ${getStatusClass(status)}`}></div>
          </div>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className="calendar">
          {days}
        </div>
      )
      days = []
    }
    return rows
  }

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">日历视图</h1>
        <p className="page-subtitle">查看团队成员的日报提交情况</p>
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
          <label className="form-label">图例说明</label>
          <div className="card" style={{ padding: '0.75rem', border: 'none', background: 'none', boxShadow: 'none' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '6px', background: 'var(--success-color)', borderRadius: '3px' }}></div>
                <span className="text-sm text-muted">已全部提交</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '6px', background: 'var(--warning-color)', borderRadius: '3px' }}></div>
                <span className="text-sm text-muted">部分提交</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '6px', background: 'var(--danger-color)', borderRadius: '3px' }}></div>
                <span className="text-sm text-muted">未提交</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '6px', background: 'var(--gray-300)', borderRadius: '3px' }}></div>
                <span className="text-sm text-muted">周末</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 600 }}>
            {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={goToPrevMonth}>
              ← 上月
            </button>
            <button className="btn btn-secondary btn-sm" onClick={goToNextMonth}>
              下月 →
            </button>
          </div>
        </div>

        <div className="card-body">
          <div className="calendar-header">
            {dayNames.map((name, index) => (
              <div
                key={name}
                className="calendar-header-day"
                style={{ color: index === 0 || index === 6 ? 'var(--danger-color)' : undefined }}
              >
                {name}
              </div>
            ))}
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="loading-spinner"></div>
            </div>
          ) : (
            renderCalendar()
          )}
        </div>
      </div>

      {showDayDetail && selectedDate && (
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
          onClick={() => setShowDayDetail(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '800px', maxHeight: '80vh', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 600 }}>
                {format(new Date(selectedDate), 'yyyy年MM月dd日 EEEE', { locale: zhCN })} 的日报
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDayDetail(false)}>
                ✕
              </button>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {selectedDateReports.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                  该日期暂无日报
                </div>
              ) : (
                selectedDateReports.map((report) => (
                  <div key={report.id} style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="avatar">{report.user_name?.[0] || report.username?.[0] || 'U'}</div>
                        <div>
                          <p style={{ fontWeight: 600 }}>{report.user_name || report.username}</p>
                          <span className={`badge ${report.status === 'submitted' ? 'badge-success' : 'badge-warning'}`}>
                            {report.status === 'submitted' ? '已提交' : '草稿'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {report.today_completed && (
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>今日完成：</p>
                        <div className="markdown-content" style={{ padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--border-radius)' }}>
                          <ReactMarkdown>{report.today_completed}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {report.tomorrow_plan && (
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>明日计划：</p>
                        <div className="markdown-content" style={{ padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--border-radius)' }}>
                          <ReactMarkdown>{report.tomorrow_plan}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {report.problems && (
                      <div>
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>遇到的问题：</p>
                        <div className="markdown-content" style={{ padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--border-radius)' }}>
                          <ReactMarkdown>{report.problems}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
