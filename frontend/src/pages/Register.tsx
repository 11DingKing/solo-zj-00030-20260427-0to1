import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authApi } from '../services/api'

interface RegisterFormData {
  username: string
  email: string
  name: string
  password: string
  confirmPassword: string
}

const Register: React.FC = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>()

  const password = watch('password')

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      await authApi.register({
        username: data.username,
        email: data.email,
        password: data.password,
        name: data.name,
      })
      toast.success('注册成功！请登录')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.response?.data?.error || '注册失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            📋 注册账号
          </h1>
          <p style={{ color: 'var(--gray-500)' }}>创建您的账号以开始使用</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              {...register('username', {
                required: '请输入用户名',
                minLength: { value: 3, message: '用户名至少3个字符' },
              })}
              className="form-input"
              placeholder="请输入用户名"
            />
            {errors.username && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">姓名</label>
            <input
              {...register('name', { required: '请输入姓名' })}
              className="form-input"
              placeholder="请输入您的姓名"
            />
            {errors.name && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              type="email"
              {...register('email', {
                required: '请输入邮箱',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: '请输入有效的邮箱地址',
                },
              })}
              className="form-input"
              placeholder="请输入邮箱地址"
            />
            {errors.email && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              {...register('password', {
                required: '请输入密码',
                minLength: { value: 6, message: '密码至少6个字符' },
              })}
              className="form-input"
              placeholder="请输入密码"
            />
            {errors.password && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input
              type="password"
              {...register('confirmPassword', {
                required: '请确认密码',
                validate: (value) => value === password || '两次输入的密码不一致',
              })}
              className="form-input"
              placeholder="请再次输入密码"
            />
            {errors.confirmPassword && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? <span className="loading-spinner"></span> : '注册'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-500)' }}>
            已有账号？{' '}
            <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 500 }}>
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
