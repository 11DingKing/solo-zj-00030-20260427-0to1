import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { teamApi, projectApi } from '../services/api'
import { Team, TeamMember, Project } from '../types'
import toast from 'react-hot-toast'

const TeamManage: React.FC = () => {
  const { user } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showEditTeam, setShowEditTeam] = useState(false)

  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [newTeamDeadline, setNewTeamDeadline] = useState('18:00')
  const [newTeamWeeklyDay, setNewTeamWeeklyDay] = useState(5)

  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [searchUserResults, setSearchUserResults] = useState<any[]>([])

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6')

  const isSuperAdmin = user?.role === 'super_admin'
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
      fetchTeamDetails()
      fetchProjects()
    }
  }, [selectedTeam])

  const fetchTeamDetails = async () => {
    try {
      const res = await teamApi.getTeam(selectedTeam)
      if (res.data.members) {
        setMembers(res.data.members)
      }
    } catch (error) {
      console.error('Failed to fetch team details:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await projectApi.get(selectedTeam)
      setProjects(res.data || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('请输入团队名称')
      return
    }

    setSaving(true)
    try {
      await teamApi.createTeam({
        name: newTeamName,
        description: newTeamDesc,
        dailyDeadline: newTeamDeadline,
        weeklySubmitDay: newTeamWeeklyDay,
      })
      toast.success('团队创建成功')
      setShowAddTeam(false)
      setNewTeamName('')
      setNewTeamDesc('')

      const res = await teamApi.getTeams()
      setTeams(res.data)
      if (res.data.length > 0) {
        setSelectedTeam(res.data[res.data.length - 1].id)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '创建失败')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTeam = async () => {
    const team = teams.find((t) => t.id === selectedTeam)
    if (!team) return

    setSaving(true)
    try {
      await teamApi.updateTeam(selectedTeam, {
        name: team.name,
        description: team.description,
        dailyDeadline: team.daily_deadline,
        weeklySubmitDay: team.weekly_submit_day,
      })
      toast.success('团队设置已更新')
      setShowEditTeam(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || '更新失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSearchUsers = async () => {
    if (!searchUserQuery.trim()) return

    try {
      const res = await teamApi.searchUsers(searchUserQuery)
      setSearchUserResults(res.data || [])
    } catch (error) {
      console.error('Failed to search users:', error)
      setSearchUserResults([])
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchUserQuery.trim()) {
        handleSearchUsers()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchUserQuery])

  const handleAddMember = async (userId: string, isLead: boolean = false) => {
    setSaving(true)
    try {
      await teamApi.addMember(selectedTeam, { userId, isLead })
      toast.success('成员添加成功')
      setShowAddMember(false)
      setSearchUserQuery('')
      setSearchUserResults([])
      fetchTeamDetails()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '添加失败')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('确定要移除该成员吗？')) return

    try {
      await teamApi.removeMember(selectedTeam, userId)
      toast.success('成员已移除')
      fetchTeamDetails()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '移除失败')
    }
  }

  const handleSetLead = async (userId: string, isLead: boolean) => {
    try {
      await teamApi.setLead(selectedTeam, userId, isLead)
      toast.success(isLead ? '已设为负责人' : '已取消负责人')
      fetchTeamDetails()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '操作失败')
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('请输入项目名称')
      return
    }

    setSaving(true)
    try {
      await projectApi.create({
        teamId: selectedTeam,
        name: newProjectName,
        description: newProjectDesc,
        color: newProjectColor,
      })
      toast.success('项目创建成功')
      setShowAddProject(false)
      setNewProjectName('')
      setNewProjectDesc('')
      fetchProjects()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '创建失败')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleProjectActive = async (projectId: string, currentActive: boolean) => {
    try {
      await projectApi.update(projectId, { isActive: !currentActive })
      toast.success(currentActive ? '项目已停用' : '项目已启用')
      fetchProjects()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '操作失败')
    }
  }

  const currentTeam = teams.find((t) => t.id === selectedTeam)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">团队管理</h1>
        <p className="page-subtitle">管理团队、成员和项目</p>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">选择团队</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            {isSuperAdmin && (
              <button className="btn btn-primary" onClick={() => setShowAddTeam(true)}>
                + 新建团队
              </button>
            )}
          </div>
        </div>
      </div>

      {currentTeam && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600 }}>团队信息</h3>
            {isTeamLeadOrAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEditTeam(true)}>
                ✏️ 编辑
              </button>
            )}
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>团队名称</p>
                <p style={{ fontWeight: 600 }}>{currentTeam.name}</p>
              </div>
              <div>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>成员数量</p>
                <p style={{ fontWeight: 600 }}>{members.length} 人</p>
              </div>
              <div>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>日报截止时间</p>
                <p style={{ fontWeight: 600 }}>{currentTeam.daily_deadline}</p>
              </div>
              <div>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>周报提交日</p>
                <p style={{ fontWeight: 600 }}>
                  周{['日', '一', '二', '三', '四', '五', '六'][currentTeam.weekly_submit_day]}
                </p>
              </div>
              {currentTeam.description && (
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>团队描述</p>
                  <p>{currentTeam.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentTeam && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600 }}>成员列表 ({members.length})</h3>
            {isTeamLeadOrAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>
                + 添加成员
              </button>
            )}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {members.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                暂无成员
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>成员</th>
                    <th>用户名</th>
                    <th>角色</th>
                    <th>加入时间</th>
                    {isTeamLeadOrAdmin && <th style={{ width: '150px' }}>操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="avatar">{member.name?.[0] || member.username?.[0] || 'U'}</div>
                          <span style={{ fontWeight: 600 }}>{member.name || member.username}</span>
                        </div>
                      </td>
                      <td>{member.username}</td>
                      <td>
                        {member.is_lead ? (
                          <span className="badge badge-success">负责人</span>
                        ) : (
                          <span className="badge badge-secondary">成员</span>
                        )}
                      </td>
                      <td>{member.joined_at ? new Date(member.joined_at).toLocaleDateString('zh-CN') : '-'}</td>
                      {isTeamLeadOrAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSetLead(member.id, !member.is_lead)}
                            >
                              {member.is_lead ? '取消负责' : '设为负责'}
                            </button>
                            {user?.id !== member.id && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                移除
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {currentTeam && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600 }}>项目列表 ({projects.length})</h3>
            {isTeamLeadOrAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddProject(true)}>
                + 添加项目
              </button>
            )}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {projects.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                暂无项目
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>项目名称</th>
                    <th>描述</th>
                    <th>状态</th>
                    {isTeamLeadOrAdmin && <th style={{ width: '100px' }}>操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '2px',
                              background: project.color || '#3b82f6',
                            }}
                          ></div>
                          <span style={{ fontWeight: 600 }}>{project.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--gray-500)' }}>{project.description || '-'}</td>
                      <td>
                        {project.is_active ? (
                          <span className="badge badge-success">启用中</span>
                        ) : (
                          <span className="badge badge-secondary">已停用</span>
                        )}
                      </td>
                      {isTeamLeadOrAdmin && (
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleProjectActive(project.id, project.is_active)}
                          >
                            {project.is_active ? '停用' : '启用'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showAddTeam && (
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
          onClick={() => setShowAddTeam(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h3 style={{ fontWeight: 600 }}>新建团队</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">团队名称 <span style={{ color: 'var(--danger-color)' }}>*</span></label>
                <input
                  className="form-input"
                  placeholder="请输入团队名称"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">团队描述</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="请输入团队描述"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">日报截止时间</label>
                  <input
                    type="time"
                    className="form-input"
                    value={newTeamDeadline}
                    onChange={(e) => setNewTeamDeadline(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">周报提交日</label>
                  <select
                    className="form-input"
                    value={newTeamWeeklyDay}
                    onChange={(e) => setNewTeamWeeklyDay(Number(e.target.value))}
                  >
                    {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, index) => (
                      <option key={index} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddTeam(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateTeam} disabled={saving || !newTeamName.trim()}>
                {saving ? <span className="loading-spinner"></span> : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMember && (
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
          onClick={() => setShowAddMember(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h3 style={{ fontWeight: 600 }}>添加成员</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">搜索用户</label>
                <input
                  className="form-input"
                  placeholder="输入用户名或姓名搜索..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                />
              </div>
              {searchUserResults.length > 0 && (
                <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', maxHeight: '300px', overflowY: 'auto' }}>
                  {searchUserResults.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--gray-100)',
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: 600 }}>{u.name || u.username}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>@{u.username}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddMember(u.id, false)}
                        >
                          添加为成员
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddMember(u.id, true)}
                        >
                          添加为负责人
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddMember(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddProject && (
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
          onClick={() => setShowAddProject(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h3 style={{ fontWeight: 600 }}>添加项目</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">项目名称 <span style={{ color: 'var(--danger-color)' }}>*</span></label>
                <input
                  className="form-input"
                  placeholder="请输入项目名称"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">项目描述</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="请输入项目描述"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">项目颜色</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="color"
                    value={newProjectColor}
                    onChange={(e) => setNewProjectColor(e.target.value)}
                    style={{ width: '50px', height: '36px', cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'monospace' }}>{newProjectColor}</span>
                </div>
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddProject(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateProject} disabled={saving || !newProjectName.trim()}>
                {saving ? <span className="loading-spinner"></span> : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditTeam && currentTeam && (
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
          onClick={() => setShowEditTeam(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h3 style={{ fontWeight: 600 }}>编辑团队</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">团队名称</label>
                <input
                  className="form-input"
                  value={currentTeam.name}
                  onChange={(e) => {
                    const updatedTeams = teams.map((t) =>
                      t.id === selectedTeam ? { ...t, name: e.target.value } : t
                    )
                    setTeams(updatedTeams)
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">团队描述</label>
                <textarea
                  className="form-input form-textarea"
                  value={currentTeam.description || ''}
                  onChange={(e) => {
                    const updatedTeams = teams.map((t) =>
                      t.id === selectedTeam ? { ...t, description: e.target.value } : t
                    )
                    setTeams(updatedTeams)
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">日报截止时间</label>
                  <input
                    type="time"
                    className="form-input"
                    value={currentTeam.daily_deadline}
                    onChange={(e) => {
                      const updatedTeams = teams.map((t) =>
                        t.id === selectedTeam ? { ...t, daily_deadline: e.target.value } : t
                      )
                      setTeams(updatedTeams)
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">周报提交日</label>
                  <select
                    className="form-input"
                    value={currentTeam.weekly_submit_day}
                    onChange={(e) => {
                      const updatedTeams = teams.map((t) =>
                        t.id === selectedTeam ? { ...t, weekly_submit_day: Number(e.target.value) } : t
                      )
                      setTeams(updatedTeams)
                    }}
                  >
                    {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, index) => (
                      <option key={index} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowEditTeam(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleUpdateTeam} disabled={saving}>
                {saving ? <span className="loading-spinner"></span> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamManage
