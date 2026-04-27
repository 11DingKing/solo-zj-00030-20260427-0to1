import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { User } from '../types'

interface LoginFormData {
  username: string
  password: string
}

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const res = await authApi.login(data)
      setToken(res.data.token)
      setUser(res.data.user as User)
      toast.success('登录成功！')
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || '登录失败')
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
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            📋 团队日报周报系统
          </h1>
          <p style={{ color: 'var(--gray-500)' }}>请登录以继续</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">用户名 / 邮箱</label>
            <input
              {...register('username', { required: '请输入用户名或邮箱' })}
              className="form-input"
              placeholder="请输入用户名或邮箱"
            />
            {errors.username && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              {...register('password', { required: '请输入密码' })}
              className="form-input"
              placeholder="请输入密码"
            />
            {errors.password && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? <span className="loading-spinner"></span> : '登录'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-500)' }}>
            还没有账号？{' '}
            <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 500 }}>
              立即注册
            </Link>
          </p>
        </div>

        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'var(--gray-50)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.875rem',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>演示账号：</p>
          <p>超级管理员：superadmin / admin123</p>
        </div>
      </div>
    </div>
  )
}

export default Login
