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
  create: (data: any) => api.post('/students/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id: number, data: any) => api.put(`/students/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
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
  // Face recognition endpoints
  detectFaces: (frame: string) => api.post('/attendance/detect-faces', { frame }),
  markAttendance: (frame: string, studentId?: number) => 
    api.post('/attendance/mark-attendance', { frame, student_id: studentId }),
  
  // Legacy capture endpoint
  capture: (formData: FormData) => api.post('/attendance/capture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // Data retrieval
  getToday: () => api.get('/attendance/today'),
  getByDate: (date: string) => api.get(`/attendance/date/${date}`),
  getStudentHistory: (studentId: number, days: number = 30) => 
    api.get(`/attendance/student/${studentId}/history`, { params: { days } }),
  getTodayStatistics: () => api.get('/attendance/statistics/today'),
  
  // Management
  delete: (attendanceId: number) => api.delete(`/attendance/${attendanceId}`),
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
  markRead: (id: number) => api.put(`/alerts/${id}`, { status: 'READ' }),
};

// Users API
export const usersAPI = {
  getAll: (role?: string) => api.get('/users', { params: { role } }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users/', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  generatePassword: () => api.post('/users/generate-password'),
  resetPassword: (id: number, newPassword: string) => 
    api.post(`/users/${id}/reset-password`, null, { params: { new_password: newPassword } }),
};

// Meals API
export const mealsAPI = {
  generatePlan: (date?: string) => api.post('/meals/plan', null, { params: { date } }),
  createDaily: (data: any) => api.post('/meals/daily', data),
  consumeInventory: (id: number) => api.post(`/meals/${id}/consume`),
  getAll: (skip?: number, limit?: number) => api.get('/meals', { params: { skip, limit } }),
};

// Food Allocations API
export const allocationsAPI = {
  getAll: (schoolId?: number, status?: string) => 
    api.get('/allocations', { params: { school_id: schoolId, status_filter: status } }),
  create: (data: any) => api.post('/allocations/', data),
  update: (id: number, data: any) => api.put(`/allocations/${id}`, data),
  approve: (id: number) => api.post(`/allocations/${id}/approve`),
  getSummary: () => api.get('/allocations/summary'),
};

// Budgets API
export const budgetsAPI = {
  getAll: (financialYear?: string) => 
    api.get('/budgets', { params: { financial_year: financialYear } }),
  getById: (id: number) => api.get(`/budgets/${id}`),
  allocate: (data: any) => api.post('/budgets/', data),
  update: (id: number, data: any) => api.put(`/budgets/${id}`, data),
  utilize: (id: number, amount: number) => api.post(`/budgets/${id}/utilize`, null, { params: { amount } }),
  getSummary: (financialYear: string = '2026-27') => 
    api.get('/budgets/summary/government', { params: { financial_year: financialYear } }),
};

export default api;
