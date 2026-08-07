import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import KPICard from '../components/KPICard';
import {
  Building2,
  Users,
  UserCheck,
  Utensils,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Bell,
  FileText,
  Cpu,
  Wifi,
  School,
  Wheat,
  IndianRupee,
  PackageCheck,
  FilePlus,
  Radio,
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { dashboardAPI } from '../lib/api';

interface GovernmentDashboardData {
  kpis: {
    [key: string]: {
      value: number;
      label: string;
      trend: string;
      icon: string;
    };
  };
  districts: Array<{
    name: string;
    schools: number;
    attendance: number;
    alerts: number;
  }>;
  recent_activities: Array<{
    activity: string;
    time: string;
    type: string;
    school?: string;
    district?: string;
    amount?: string;
  }>;
  alerts: Array<{
    id: number;
    message: string;
    severity: string;
    school_id: number;
  }>;
  summary: {
    total_schools: number;
    total_students: number;
    attendance_today: number;
    attendance_percentage: number;
  };
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function GovernmentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<GovernmentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.government();
      setData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: School, label: 'Register School', color: 'primary', onClick: () => navigate('/schools') },
    { icon: Wheat, label: 'Allocate Food', color: 'success', onClick: () => {} },
    { icon: IndianRupee, label: 'Allocate Budget', color: 'warning', onClick: () => {} },
    { icon: PackageCheck, label: 'Verify Inventory', color: 'info', onClick: () => navigate('/inventory') },
    { icon: FilePlus, label: 'Generate Reports', color: 'purple', onClick: () => navigate('/reports') },
    { icon: Radio, label: 'Send Circular', color: 'danger', onClick: () => {} },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading government dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Failed to load dashboard data</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">PM POSHAN - Government Dashboard</h1>
              <p className="text-primary-100 mt-1">Department of Public Instruction, Karnataka</p>
              <p className="text-primary-100">State-wide Monitoring & Administration</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold">{currentTime.toLocaleDateString('en-IN')}</p>
              <p className="text-primary-100">{currentTime.toLocaleTimeString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Top 4 Primary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Building2}
            label={data.kpis.total_schools.label}
            value={data.kpis.total_schools.value}
            trend={data.kpis.total_schools.trend}
            color="primary"
            onClick={() => navigate('/schools')}
          />
          <KPICard
            icon={Users}
            label={data.kpis.total_students.label}
            value={data.kpis.total_students.value}
            trend={data.kpis.total_students.trend}
            color="info"
          />
          <KPICard
            icon={UserCheck}
            label={data.kpis.students_present_today.label}
            value={data.kpis.students_present_today.value}
            trend={data.kpis.students_present_today.trend}
            color="success"
          />
          <KPICard
            icon={Utensils}
            label={data.kpis.meals_served_today.label}
            value={data.kpis.meals_served_today.value}
            trend={data.kpis.meals_served_today.trend}
            color="warning"
          />
        </div>

        {/* Secondary KPIs - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Package}
            label={data.kpis.food_allocated.label}
            value={data.kpis.food_allocated.value}
            trend={data.kpis.food_allocated.trend}
            color="success"
          />
          <KPICard
            icon={DollarSign}
            label={data.kpis.budget_allocated.label}
            value={`₹${(data.kpis.budget_allocated.value / 100000).toFixed(1)}L`}
            trend={data.kpis.budget_allocated.trend}
            color="warning"
          />
          <KPICard
            icon={TrendingUp}
            label={data.kpis.attendance_percentage.label}
            value={`${data.kpis.attendance_percentage.value}%`}
            trend={data.kpis.attendance_percentage.trend}
            color="success"
          />
          <KPICard
            icon={AlertCircle}
            label={data.kpis.pending_requests.label}
            value={data.kpis.pending_requests.value}
            trend={data.kpis.pending_requests.trend}
            color="danger"
          />
        </div>

        {/* Tertiary KPIs - Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <KPICard
            icon={Bell}
            label={data.kpis.notifications.label}
            value={data.kpis.notifications.value}
            trend={data.kpis.notifications.trend}
            color="info"
          />
          <KPICard
            icon={FileText}
            label={data.kpis.reports_generated.label}
            value={data.kpis.reports_generated.value}
            trend={data.kpis.reports_generated.trend}
            color="primary"
            onClick={() => navigate('/reports')}
          />
        </div>

        {/* Karnataka Map & District Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* District Performance */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary-600" />
              District-wise School Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.districts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="schools" fill="#2563eb" name="Schools" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* District Summary Cards */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Districts Overview</h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.districts.map((district, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-800">{district.name}</p>
                    {district.alerts > 0 && (
                      <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded">
                        {district.alerts} alerts
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{district.schools} Schools</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Attendance & Budget Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Budget & Food Allocation */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="w-6 h-6 text-warning-600" />
              Food & Budget Allocation
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Total Food Allocated</span>
                  <span className="text-xs text-slate-500">This Month</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">{data.kpis.food_allocated.value} kg</p>
                <div className="mt-3 bg-white rounded-full h-2 overflow-hidden">
                  <div className="bg-orange-500 h-full" style={{ width: '75%' }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">75% of monthly target</p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Budget Allocated</span>
                  <span className="text-xs text-slate-500">FY 2026-27</span>
                </div>
                <p className="text-3xl font-bold text-green-600">₹{(data.kpis.budget_allocated.value / 100000).toFixed(1)}L</p>
                <div className="mt-3 bg-white rounded-full h-2 overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">60% of annual budget</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-600">Schools Covered</p>
                  <p className="text-xl font-bold text-blue-600">{data.kpis.total_schools.value}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-600">Meals Served</p>
                  <p className="text-xl font-bold text-purple-600">{data.kpis.meals_served_today.value}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-danger-600" />
              System Alerts & Notifications
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.alerts.length > 0 ? (
                data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'HIGH'
                        ? 'bg-red-50 border-red-500'
                        : alert.severity === 'MEDIUM'
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-slate-700 flex-1">{alert.message}</p>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          alert.severity === 'HIGH'
                            ? 'bg-red-200 text-red-800'
                            : alert.severity === 'MEDIUM'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-blue-200 text-blue-800'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">School ID: {alert.school_id}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium">All systems operational</p>
                  <p className="text-slate-500 text-sm mt-1">No pending alerts</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-600" />
              Recent Activities
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.recent_activities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.type === 'success'
                        ? 'bg-green-500'
                        : activity.type === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{activity.activity}</p>
                    {activity.school && (
                      <p className="text-xs text-slate-600 mt-1">School: {activity.school}</p>
                    )}
                    {activity.district && (
                      <p className="text-xs text-slate-600 mt-1">District: {activity.district}</p>
                    )}
                    {activity.amount && (
                      <p className="text-xs text-green-600 font-medium mt-1">{activity.amount}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
