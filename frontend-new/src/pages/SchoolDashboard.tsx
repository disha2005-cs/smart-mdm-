import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import KPICard from '../components/KPICard';
import {
  Users,
  UserCheck,
  Utensils,
  Package,
  AlertTriangle,
  TrendingUp,
  Camera,
  Bell,
  UserPlus,
  ScanFace,
  ClipboardCheck,
  Calculator,
  PackageCheck,
  FileText,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { dashboardAPI } from '../lib/api';

interface DashboardData {
  school: {
    name: string;
    principal: string;
    district: string;
  };
  kpis: {
    [key: string]: {
      value: number;
      label: string;
      trend: string;
      icon: string;
    };
  };
  attendance_data: Array<{ date: string; count: number }>;
  meal_summary: {
    required: number;
    prepared: number;
    served: number;
    remaining: number;
    ingredients: {
      [key: string]: { required: number; unit: string };
    };
  };
  inventory_status: Array<{
    item: string;
    quantity: number;
    unit: string;
    threshold: number;
    status: string;
  }>;
  alerts: Array<{
    id: number;
    type: string;
    severity: string;
    message: string;
  }>;
  recent_activities: Array<{
    activity: string;
    time: string;
    type: string;
  }>;
}

export default function SchoolDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
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
      const response = await dashboardAPI.school();
      setData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: UserPlus, label: 'Register Student', color: 'primary', onClick: () => navigate('/students') },
    { icon: ScanFace, label: 'Register Face', color: 'success', onClick: () => navigate('/students') },
    { icon: ClipboardCheck, label: 'Take Attendance', color: 'info', onClick: () => navigate('/attendance') },
    { icon: Calculator, label: 'Generate Meals', color: 'warning', onClick: () => {} },
    { icon: PackageCheck, label: 'Verify Inventory', color: 'purple', onClick: () => navigate('/inventory') },
    { icon: FileText, label: 'Generate Report', color: 'danger', onClick: () => navigate('/reports') },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading dashboard...</p>
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
              <h1 className="text-3xl font-bold">{data.school.name}</h1>
              <p className="text-primary-100 mt-1">Principal: {data.school.principal}</p>
              <p className="text-primary-100">District: {data.school.district}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold">{currentTime.toLocaleDateString('en-IN')}</p>
              <p className="text-primary-100">{currentTime.toLocaleTimeString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Users}
            label={data.kpis.total_students.label}
            value={data.kpis.total_students.value}
            trend={data.kpis.total_students.trend}
            color="primary"
            onClick={() => navigate('/students')}
          />
          <KPICard
            icon={UserCheck}
            label={data.kpis.students_present_today.label}
            value={data.kpis.students_present_today.value}
            trend={data.kpis.students_present_today.trend}
            color="success"
            onClick={() => navigate('/attendance')}
          />
          <KPICard
            icon={Utensils}
            label={data.kpis.meals_required_today.label}
            value={data.kpis.meals_required_today.value}
            trend={data.kpis.meals_required_today.trend}
            color="warning"
          />
          <KPICard
            icon={Package}
            label={data.kpis.current_food_stock.label}
            value={data.kpis.current_food_stock.value}
            trend={data.kpis.current_food_stock.trend}
            color="info"
            onClick={() => navigate('/inventory')}
          />
          <KPICard
            icon={AlertTriangle}
            label={data.kpis.low_stock_items.label}
            value={data.kpis.low_stock_items.value}
            trend={data.kpis.low_stock_items.trend}
            color="danger"
            onClick={() => navigate('/inventory')}
          />
          <KPICard
            icon={TrendingUp}
            label={data.kpis.attendance_percentage.label}
            value={`${data.kpis.attendance_percentage.value}%`}
            trend={data.kpis.attendance_percentage.trend}
            color="success"
          />
          <KPICard
            icon={Camera}
            label={data.kpis.ai_accuracy.label}
            value={`${data.kpis.ai_accuracy.value}%`}
            trend={data.kpis.ai_accuracy.trend}
            color="purple"
          />
          <KPICard
            icon={Bell}
            label={data.kpis.government_alerts.label}
            value={data.kpis.government_alerts.value}
            trend={data.kpis.government_alerts.trend}
            color="warning"
          />
        </div>

        {/* Attendance Analytics */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            Weekly Attendance Analytics
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.attendance_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} name="Students Present" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meal Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Utensils className="w-6 h-6 text-warning-600" />
              Today's Meal Summary
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Meals Required</p>
                  <p className="text-2xl font-bold text-blue-600">{data.meal_summary.required}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600">Meals Served</p>
                  <p className="text-2xl font-bold text-green-600">{data.meal_summary.served}</p>
                </div>
              </div>
              
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Ingredients Required:</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(data.meal_summary.ingredients).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                      <span className="text-sm font-medium text-slate-700 capitalize">{key}</span>
                      <span className="text-sm font-bold text-slate-900">
                        {val.required} {val.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Status */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="w-6 h-6 text-info-600" />
              Inventory Status
            </h2>
            <div className="space-y-3">
              {data.inventory_status.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">{item.item}</p>
                    <div className="mt-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${item.status === 'critical' ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((item.quantity / item.threshold) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-slate-900">
                      {item.quantity} {item.unit}
                    </p>
                    {item.status === 'critical' && (
                      <span className="text-xs text-red-600 font-medium">⚠ Low Stock</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Government Alerts & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Government Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Bell className="w-6 h-6 text-warning-600" />
              Government Alerts
            </h2>
            <div className="space-y-3">
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
                    <p className="text-sm font-medium text-slate-700">{alert.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">No pending alerts</p>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-600" />
              Recent Activities
            </h2>
            <div className="space-y-3">
              {data.recent_activities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'success'
                        ? 'bg-green-500'
                        : activity.type === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{activity.activity}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all group"
              >
                <action.icon className="w-8 h-8 text-slate-600 group-hover:text-primary-600 mb-2" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-primary-700 text-center">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
