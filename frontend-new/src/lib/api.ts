import axios from 'axios';

// Use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== API SERVICE FUNCTIONS ====================

// Auth API
export const authAPI = {
  login: (employee_id: string, password: string, role: string) =>
    api.post('/auth/login', { employee_id, password, role }),
  me: () => api.get('/auth/me'),
};

// Students API
export const studentsAPI = {
  getAll: () => api.get('/students'),
  getById: (id: number) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students/', data),
  update: (id: number, data: any) => api.put(`/students/${id}`, data),
  delete: (id: number) => api.delete(`/students/${id}`),
};

// Schools API
export const schoolsAPI = {
  getAll: () => api.get('/schools'),
  getById: (id: number) => api.get(`/schools/${id}`),
  create: (data: any) => api.post('/schools/', data),
  update: (id: number, data: any) => api.put(`/schools/${id}`, data),
  delete: (id: number) => api.delete(`/schools/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  create: (data: any) => api.post('/inventory/', data),
  update: (id: number, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`),
};

// Attendance API
export const attendanceAPI = {
  capture: (formData: FormData) => api.post('/attendance/capture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getToday: () => api.get('/attendance/today'),
  getByDate: (date: string) => api.get(`/attendance/date/${date}`),
  getStudentHistory: (studentId: number) => api.get(`/attendance/student/${studentId}/history`),
};

// Dashboard API
export const dashboardAPI = {
  government: () => api.get('/dashboard/government'),
  school: () => api.get('/dashboard/school'),
};

// Reports API
export const reportsAPI = {
  daily: (startDate: string, endDate: string) =>
    api.get('/reports/daily', { params: { start_date: startDate, end_date: endDate }}),
  weekly: (startDate: string, endDate: string) =>
    api.get('/reports/weekly', { params: { start_date: startDate, end_date: endDate }}),
  monthly: (startDate: string, endDate: string) =>
    api.get('/reports/monthly', { params: { start_date: startDate, end_date: endDate }}),
};

// Alerts API
export const alertsAPI = {
  getAll: () => api.get('/alerts'),
  markRead: (id: number) => api.put(`/alerts/${id}/read`),
};

export default api;
