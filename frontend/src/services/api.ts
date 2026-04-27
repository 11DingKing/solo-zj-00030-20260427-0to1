import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: { username: string; email: string; password: string; name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const teamApi = {
  getTeams: () => api.get('/teams'),
  getTeam: (teamId: string) => api.get(`/teams/${teamId}`),
  createTeam: (data: { name: string; description?: string; dailyDeadline?: string; weeklySubmitDay?: number }) =>
    api.post('/teams', data),
  updateTeam: (teamId: string, data: { name?: string; description?: string; dailyDeadline?: string; weeklySubmitDay?: number }) =>
    api.put(`/teams/${teamId}`, data),
  addMember: (teamId: string, data: { userId: string; isLead?: boolean }) =>
    api.post(`/teams/${teamId}/members`, data),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
  setLead: (teamId: string, userId: string, isLead: boolean) =>
    api.put(`/teams/${teamId}/members/${userId}/lead`, { isLead }),
  searchUsers: (q: string) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
};

export const dailyReportApi = {
  save: (data: { teamId: string; reportDate: string; todayCompleted?: string; tomorrowPlan?: string; problems?: string; status?: 'draft' | 'submitted' }) =>
    api.post('/daily-reports', data),
  getByDate: (teamId: string, date: string) =>
    api.get(`/daily-reports/${teamId}/date/${date}`),
  getTeamReports: (teamId: string, params?: { startDate?: string; endDate?: string; userId?: string; status?: string }) =>
    api.get(`/daily-reports/${teamId}`, { params }),
  getById: (reportId: string) =>
    api.get(`/daily-reports/id/${reportId}`),
  getCalendar: (teamId: string, params?: { year?: number; month?: number }) =>
    api.get(`/daily-reports/${teamId}/calendar`, { params }),
};

export const weeklyReportApi = {
  save: (data: { teamId: string; weekStart: string; weekEnd: string; summary?: string; nextWeekPlan?: string; coordinationNeeded?: string; workHours?: any[]; status?: 'draft' | 'submitted' }) =>
    api.post('/weekly-reports', data),
  getByWeek: (teamId: string, weekStart: string) =>
    api.get(`/weekly-reports/${teamId}/week/${weekStart}`),
  getTeamReports: (teamId: string, params?: { startDate?: string; endDate?: string; userId?: string; status?: string }) =>
    api.get(`/weekly-reports/${teamId}`, { params }),
  getById: (reportId: string) =>
    api.get(`/weekly-reports/id/${reportId}`),
};

export const commentApi = {
  get: (reportType: 'daily' | 'weekly', reportId: string) =>
    api.get(`/comments/${reportType}/${reportId}`),
  create: (data: { reportId: string; reportType: 'daily' | 'weekly'; content: string; mentions?: string[] }) =>
    api.post('/comments', data),
  update: (commentId: string, data: { content: string; mentions?: string[] }) =>
    api.put(`/comments/${commentId}`, data),
  delete: (commentId: string) =>
    api.delete(`/comments/${commentId}`),
};

export const notificationApi = {
  get: (params?: { isRead?: boolean; limit?: number; offset?: number }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId: string) =>
    api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (notificationId: string) =>
    api.delete(`/notifications/${notificationId}`),
};

export const templateApi = {
  get: (teamId: string, params?: { type?: string; isActive?: boolean }) =>
    api.get(`/templates/${teamId}`, { params }),
  getActive: (teamId: string, type: 'daily' | 'weekly') =>
    api.get(`/templates/${teamId}/active/${type}`),
  getById: (templateId: string) =>
    api.get(`/templates/id/${templateId}`),
  create: (data: { teamId: string; type: 'daily' | 'weekly'; name: string; fields: any[] }) =>
    api.post('/templates', data),
  update: (templateId: string, data: { name?: string; fields?: any[]; isActive?: boolean }) =>
    api.put(`/templates/${templateId}`, data),
  delete: (templateId: string) =>
    api.delete(`/templates/${templateId}`),
};

export const projectApi = {
  get: (teamId: string, params?: { isActive?: boolean }) =>
    api.get(`/projects/${teamId}`, { params }),
  getById: (projectId: string) =>
    api.get(`/projects/id/${projectId}`),
  create: (data: { teamId: string; name: string; description?: string; color?: string }) =>
    api.post('/projects', data),
  update: (projectId: string, data: { name?: string; description?: string; color?: string; isActive?: boolean }) =>
    api.put(`/projects/${projectId}`, data),
  delete: (projectId: string) =>
    api.delete(`/projects/${projectId}`),
};

export const statsApi = {
  getOverview: (teamId: string) => api.get(`/stats/${teamId}/overview`),
  getSubmissionRate: (teamId: string, params?: { days?: number }) =>
    api.get(`/stats/${teamId}/submission-rate`, { params }),
  getWordTrend: (teamId: string, params?: { days?: number }) =>
    api.get(`/stats/${teamId}/word-trend`, { params }),
  getWorkHours: (teamId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/stats/${teamId}/work-hours`, { params }),
  getUnsubmitted: (teamId: string, params?: { date?: string }) =>
    api.get(`/stats/${teamId}/unsubmitted`, { params }),
};
