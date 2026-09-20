import axios from 'axios';

// Use environment variable or fall back to the local backend.
// In the Docker image this is "/api/v1", i.e. same-origin through nginx.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Origin that serves non-API files (student photos, attendance captures).
 *
 * Derived by stripping the "/api/v1" suffix off the API base. When the API
 * base is relative ("/api/v1") that leaves an empty string, which is exactly
 * right: paths then resolve against the current origin. Treating "" as
 * missing and falling back to localhost is what broke images behind a proxy.
 */
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

/** Absolute URL for a path the backend serves, e.g. "/uploads/students/x.jpg". */
export function serverUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${SERVER_ORIGIN}/${path.replace(/^\/+/, '')}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Without a timeout a dead backend leaves every spinner running forever.
  timeout: 60000,
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
    // Only bounce to login for an expired/invalid session, and never from the
    // login screen itself - otherwise a wrong password reloads the page and
    // the error message is lost before it can be read.
    const isAuthCall = (error.config?.url ?? '').includes('/auth/login');
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Pull a readable message out of an axios error.
 *
 * FastAPI returns `detail` as a string, but validation failures used to come
 * back as an array of objects that rendered as "[object Object]".
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const detail = (error as any)?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        const loc = Array.isArray(item?.loc)
          ? item.loc.filter((p: unknown) => p !== 'body' && p !== 'query').join(' → ')
          : '';
        return loc ? `${loc}: ${item?.msg}` : item?.msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join('; ');
  }

  if ((error as any)?.code === 'ECONNABORTED') {
    return 'The request timed out. Please check your connection and try again.';
  }
  if ((error as any)?.message === 'Network Error') {
    return 'Cannot reach the server. Make sure the backend is running.';
  }
  return (error as any)?.message || fallback;
}

// ==================== API SERVICE FUNCTIONS ====================

// Auth API
export const authAPI = {
  login: (employee_id: string, password: string, role: string) =>
    api.post('/auth/login', { employee_id, password, role }),
  me: () => api.get('/auth/me'),
};

// Students API
export const studentsAPI = {
  getAll: (params?: { grade?: string; search?: string; include_inactive?: boolean }) =>
    api.get('/students/', { params }),
  getById: (id: number) => api.get(`/students/${id}`),
  create: (data: FormData) =>
    api.post('/students/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: FormData) =>
    api.put(`/students/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  regenerateEncoding: (id: number) => api.post(`/students/${id}/regenerate-encoding`),
  delete: (id: number) => api.delete(`/students/${id}`),
};

// Schools API
export const schoolsAPI = {
  getAll: (params?: { district?: string; search?: string }) => api.get('/schools/', { params }),
  getById: (id: number) => api.get(`/schools/${id}`),
  getDistricts: () => api.get('/schools/districts'),
  create: (data: unknown) => api.post('/schools/', data),
  update: (id: number, data: unknown) => api.put(`/schools/${id}`, data),
  delete: (id: number, confirm = false) => api.delete(`/schools/${id}`, { params: { confirm } }),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params?: { school_id?: number; low_stock_only?: boolean }) =>
    api.get('/inventory/', { params }),
  getSummary: () => api.get('/inventory/summary'),
  create: (data: unknown) => api.post('/inventory/', data),
  update: (id: number, data: unknown) => api.put(`/inventory/${id}`, data),
  /** Atomic +/- change; safer than writing an absolute quantity. */
  adjust: (id: number, delta: number, reason?: string) =>
    api.post(`/inventory/${id}/adjust`, null, { params: { delta, reason } }),
  delete: (id: number) => api.delete(`/inventory/${id}`),
};

// Attendance API
export const attendanceAPI = {
  /** Live preview: returns every face in the frame with its match. */
  detectFaces: (frame: string) => api.post('/attendance/detect-faces', { frame }),
  /** Marks every recognised student in the frame, not just one. */
  markAttendance: (frame: string, studentId?: number) =>
    api.post('/attendance/mark-attendance', { frame, student_id: studentId ?? null }),
  /** Closes the register: everyone not marked present becomes absent. */
  markRemainingAbsent: (targetDate?: string) =>
    api.post('/attendance/mark-absent', null, { params: { target_date: targetDate } }),

  getToday: () => api.get('/attendance/today'),
  getByDate: (date: string) => api.get(`/attendance/date/${date}`),
  getStudentHistory: (studentId: number, days = 30) =>
    api.get(`/attendance/student/${studentId}/history`, { params: { days } }),
  getTodayStatistics: () => api.get('/attendance/statistics/today'),
  getStatistics: (targetDate?: string) =>
    api.get('/attendance/statistics', { params: { target_date: targetDate } }),

  delete: (attendanceId: number) => api.delete(`/attendance/${attendanceId}`),
};

// Dashboard API
export const dashboardAPI = {
  government: () => api.get('/dashboard/government'),
  school: () => api.get('/dashboard/school'),
};

// Reports API
export const reportsAPI = {
  summary: (limit = 30) => api.get('/reports/summary', { params: { limit } }),
  daily: (startDate?: string, endDate?: string, schoolId?: number) =>
    api.get('/reports/daily', {
      params: { start_date: startDate, end_date: endDate, school_id: schoolId },
    }),
  weekly: (startDate?: string, endDate?: string, schoolId?: number) =>
    api.get('/reports/weekly', {
      params: { start_date: startDate, end_date: endDate, school_id: schoolId },
    }),
  monthly: (startDate?: string, endDate?: string, schoolId?: number) =>
    api.get('/reports/monthly', {
      params: { start_date: startDate, end_date: endDate, school_id: schoolId },
    }),
  inventory: (schoolId?: number) => api.get('/reports/inventory', { params: { school_id: schoolId } }),
  schools: () => api.get('/reports/schools'),
};

// Alerts API
export const alertsAPI = {
  getAll: (statusFilter?: string) => api.get('/alerts/', { params: { status_filter: statusFilter } }),
  create: (data: { alert_type: string; message: string; severity?: string }, schoolId?: number) =>
    api.post('/alerts/', data, { params: { school_id: schoolId } }),
  markRead: (id: number) => api.put(`/alerts/${id}`, { status: 'READ' }),
  markAllRead: () => api.put('/alerts/read-all/bulk'),
  scanLowStock: () => api.post('/alerts/scan-low-stock'),
  delete: (id: number) => api.delete(`/alerts/${id}`),
};

// Users API
export const usersAPI = {
  getAll: (role?: string, search?: string) => api.get('/users/', { params: { role, search } }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users/', data),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  generatePassword: () => api.post('/users/generate-password'),
  // Credentials go in the body - query strings end up in access logs.
  resetPassword: (id: number, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { new_password: newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
  changeEmail: (newEmail: string, password: string) =>
    api.post('/users/change-email', { new_email: newEmail, password }),
};

// Meals API
export const mealsAPI = {
  generatePlan: (date?: string, riceShare?: number) =>
    api.post('/meals/plan', null, { params: { date, rice_share: riceShare } }),
  createDaily: (data: unknown) => api.post('/meals/daily', data),
  /** Saves the computed plan as the day's record in one step. */
  recordFromPlan: (targetDate?: string, riceShare?: number) =>
    api.post('/meals/record-from-plan', null, {
      params: { target_date: targetDate, rice_share: riceShare },
    }),
  consumeInventory: (id: number) => api.post(`/meals/${id}/consume`),
  getAll: (skip?: number, limit?: number) => api.get('/meals/', { params: { skip, limit } }),
  delete: (id: number) => api.delete(`/meals/${id}`),
};

// Food Allocations API
export const allocationsAPI = {
  getAll: (schoolId?: number, status?: string) =>
    api.get('/allocations/', { params: { school_id: schoolId, status_filter: status } }),
  getById: (id: number) => api.get(`/allocations/${id}`),
  create: (data: unknown) => api.post('/allocations/', data),
  update: (id: number, data: unknown) => api.put(`/allocations/${id}`, data),
  approve: (id: number) => api.post(`/allocations/${id}/approve`),
  reject: (id: number, reason?: string) => api.post(`/allocations/${id}/reject`, { reason }),
  delete: (id: number) => api.delete(`/allocations/${id}`),
  getSummary: () => api.get('/allocations/summary'),
};

// Budgets API
export const budgetsAPI = {
  getAll: (financialYear?: string) =>
    api.get('/budgets/', { params: { financial_year: financialYear } }),
  getById: (id: number) => api.get(`/budgets/${id}`),
  allocate: (data: unknown) => api.post('/budgets/', data),
  update: (id: number, data: unknown) => api.put(`/budgets/${id}`, data),
  utilize: (id: number, amount: number, note?: string) =>
    api.post(`/budgets/${id}/utilize`, { amount, note }),
  delete: (id: number) => api.delete(`/budgets/${id}`),
  getSummary: (financialYear?: string) =>
    api.get('/budgets/summary/government', { params: { financial_year: financialYear } }),
  getSchoolSummary: (financialYear?: string) =>
    api.get('/budgets/summary/school', { params: { financial_year: financialYear } }),
};

/** Indian financial year for a date: April-March, so 2026-09-20 -> "2026-27". */
export function currentFinancialYear(date = new Date()): string {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export default api;
