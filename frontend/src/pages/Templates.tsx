import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { teamApi, templateApi } from '../services/api'
import { Team, Template, TemplateField } from '../types'
import toast from 'react-hot-toast'

const Templates: React.FC = () => {
  const { user } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  const [templateName, setTemplateName] = useState('')
  const [templateType, setTemplateType] = useState<'daily' | 'weekly'>('daily')
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([])

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
      fetchTemplates()
    }
  }, [selectedTeam])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await templateApi.get(selectedTeam)
      setTemplates(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTemplateName('')
    setTemplateType('daily')
    setTemplateFields([
      {
        id: Date.now().toString(),
        name: '今日完成',
        placeholder: '描述今天完成的工作内容...',
        type: 'markdown',
        required: true,
      },
      {
        id: (Date.now() + 1).toString(),
        name: '明日计划',
        placeholder: '描述明天的工作计划...',
        type: 'textarea',
        required: false,
      },
      {
        id: (Date.now() + 2).toString(),
        name: '遇到的问题',
        placeholder: '描述遇到的问题或需要的支持...',
        type: 'textarea',
        required: false,
      },
    ])
  }

  const handleAddTemplate = () => {
    resetForm()
    setEditingTemplate(null)
    setShowAddTemplate(true)
  }

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateType(template.type)
    setTemplateFields(template.fields.map((f) => ({ ...f, id: f.id || Date.now().toString() + Math.random() })))
    setShowAddTemplate(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('请输入模板名称')
      return
    }
    if (templateFields.length === 0) {
      toast.error('请至少添加一个字段')
      return
    }

    setSaving(true)
    try {
      if (editingTemplate) {
        await templateApi.update(editingTemplate.id, {
          name: templateName,
          fields: templateFields,
        })
        toast.success('模板已更新')
      } else {
        await templateApi.create({
          teamId: selectedTeam,
          type: templateType,
          name: templateName,
          fields: templateFields,
        })
        toast.success('模板已创建')
      }
      setShowAddTemplate(false)
      fetchTemplates()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (template: Template) => {
    try {
      await templateApi.update(template.id, {
        isActive: !template.is_active,
      })
      toast.success(template.is_active ? '模板已停用' : '模板已设为活动模板')
      fetchTemplates()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '操作失败')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('确定要删除该模板吗？')) return

    try {
      await templateApi.delete(templateId)
      toast.success('模板已删除')
      fetchTemplates()
    } catch (error: any) {
      toast.error(error.response?.data?.error || '删除失败')
    }
  }

  const addField = () => {
    const newField: TemplateField = {
      id: Date.now().toString(),
      name: '',
      placeholder: '',
      type: 'textarea',
      required: false,
    }
    setTemplateFields([...templateFields, newField])
  }

  const updateField = (fieldId: string, key: keyof TemplateField, value: any) => {
    setTemplateFields(
      templateFields.map((f) => (f.id === fieldId ? { ...f, [key]: value } : f))
    )
  }

  const removeField = (fieldId: string) => {
    setTemplateFields(templateFields.filter((f) => f.id !== fieldId))
  }

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = templateFields.findIndex((f) => f.id === fieldId)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === templateFields.length - 1)
    ) {
      return
    }
    const newFields = [...templateFields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]
    setTemplateFields(newFields)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">模板管理</h1>
        <p className="page-subtitle">创建和管理报告模板</p>
      </div>

      {isTeamLeadOrAdmin ? (
        <>
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
                <button className="btn btn-primary" onClick={handleAddTemplate}>
                  + 新建模板
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="loading-spinner"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</p>
              <h3 style={{ marginBottom: '0.5rem' }}>暂无模板</h3>
              <p style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
                您还没有创建任何报告模板
              </p>
              <button className="btn btn-primary" onClick={handleAddTemplate}>
                创建第一个模板
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontWeight: 600 }}>{template.name}</h3>
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                        <span className={`badge ${template.type === 'daily' ? 'badge-info' : 'badge-success'}`}>
                          {template.type === 'daily' ? '日报模板' : '周报模板'}
                        </span>
                        {template.is_active ? (
                          <span className="badge badge-success">活动中</span>
                        ) : (
                          <span className="badge badge-secondary">已停用</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <p style={{ marginBottom: '0.75rem', color: 'var(--gray-500)' }}>
                      包含 {template.fields.length} 个字段
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {template.fields.slice(0, 3).map((field, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: field.required ? 'var(--danger-color)' : 'var(--gray-300)',
                            }}
                          ></div>
                          <span className="text-sm">{field.name}</span>
                          <span className="text-sm text-muted">({field.type === 'markdown' ? 'Markdown' : '文本'})</span>
                        </div>
                      ))}
                      {template.fields.length > 3 && (
                        <p className="text-sm text-muted">...还有 {template.fields.length - 3} 个字段</p>
                      )}
                    </div>
                  </div>
                  <div className="card-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      ✏️ 编辑
                    </button>
                    <button
                      className={`btn btn-sm ${template.is_active ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggleActive(template)}
                    >
                      {template.is_active ? '停用' : '设为活动'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddTemplate && (
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
                overflowY: 'auto',
                padding: '2rem',
              }}
              onClick={() => setShowAddTemplate(false)}
            >
              <div
                className="card"
                style={{ width: '100%', maxWidth: '700px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="card-header">
                  <h3 style={{ fontWeight: 600 }}>
                    {editingTemplate ? '编辑模板' : '新建模板'}
                  </h3>
                </div>
                <div className="card-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">
                        模板名称 <span style={{ color: 'var(--danger-color)' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        placeholder="请输入模板名称"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        模板类型 <span style={{ color: 'var(--danger-color)' }}>*</span>
                      </label>
                      <select
                        className="form-input"
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value as 'daily' | 'weekly')}
                        disabled={!!editingTemplate}
                      >
                        <option value="daily">日报</option>
                        <option value="weekly">周报</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontWeight: 600 }}>模板字段</h4>
                    <button className="btn btn-secondary btn-sm" onClick={addField}>
                      + 添加字段
                    </button>
                  </div>

                  {templateFields.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)', border: '1px dashed var(--gray-300)', borderRadius: 'var(--border-radius)' }}>
                      点击上方"添加字段"按钮添加模板字段
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {templateFields.map((field, index) => (
                        <div
                          key={field.id}
                          style={{
                            padding: '1rem',
                            background: 'var(--gray-50)',
                            borderRadius: 'var(--border-radius)',
                            border: '1px solid var(--gray-200)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontWeight: 600 }}>字段 {index + 1}</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => moveField(field.id, 'up')}
                                disabled={index === 0}
                              >
                                ↑
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => moveField(field.id, 'down')}
                                disabled={index === templateFields.length - 1}
                              >
                                ↓
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => removeField(field.id)}
                              >
                                删除
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">字段名称</label>
                              <input
                                className="form-input"
                                placeholder="例如：今日完成"
                                value={field.name}
                                onChange={(e) => updateField(field.id, 'name', e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">字段类型</label>
                              <select
                                className="form-input"
                                value={field.type}
                                onChange={(e) =>
                                  updateField(field.id, 'type', e.target.value as 'text' | 'textarea' | 'markdown')
                                }
                              >
                                <option value="text">单行文本</option>
                                <option value="textarea">多行文本</option>
                                <option value="markdown">Markdown</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                            <label className="form-label">提示语</label>
                            <input
                              className="form-input"
                              placeholder="输入框的占位提示文字..."
                              value={field.placeholder}
                              onChange={(e) => updateField(field.id, 'placeholder', e.target.value)}
                            />
                          </div>

                          <div style={{ marginTop: '0.75rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                              />
                              <span>必填字段</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" onClick={() => setShowAddTemplate(false)}>
                    取消
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={saving}>
                    {saving ? <span className="loading-spinner"></span> : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</p>
          <h3 style={{ marginBottom: '0.5rem' }}>无权限访问</h3>
          <p style={{ color: 'var(--gray-500)' }}>
            只有超级管理员和团队负责人可以管理模板
          </p>
        </div>
      )}
    </div>
  )
}

export default Templates
