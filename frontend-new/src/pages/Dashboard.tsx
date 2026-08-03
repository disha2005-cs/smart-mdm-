import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, Utensils, Bell, School as SchoolIcon, TriangleAlert as AlertTriangle, Package, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSchool } from '../hooks/useSchool';
import type { Student, InventoryItem, Alert, DailyMeal } from '../types';

const Dashboard = () => {
  const navigate = useNavigate();
  const { school, schoolId } = useSchool();
  const [students, setStudents] = useState<Student[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [meals, setMeals] = useState<DailyMeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const [studentsRes, inventoryRes, alertsRes, mealsRes] = await Promise.all([
          supabase.from('students').select('*').eq('school_id', schoolId).eq('is_active', true),
          supabase.from('inventory_items').select('*').eq('school_id', schoolId),
          supabase.from('alerts').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
          supabase.from('daily_meals').select('*').eq('school_id', schoolId).order('date', { ascending: true }).limit(7),
        ]);

        setStudents(studentsRes.data ?? []);
        setInventory(inventoryRes.data ?? []);
        setAlerts(alertsRes.data ?? []);
        setMeals(mealsRes.data ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  const todayMeal = meals[meals.length - 1];
  const mealsServedToday = todayMeal?.total_students_present ?? 0;
  const unreadAlerts = alerts.filter((a) => a.status === 'UNREAD').length;
  const lowStockItems = inventory.filter((i) => i.quantity <= i.threshold);

  const chartData = meals.map((m) => ({
    date: new Date(m.date).toLocaleDateString('en-US', { weekday: 'short' }),
    attendance: m.total_students_present,
  }));

  const mealDistribution = [
    { name: 'Rice', value: todayMeal?.rice_consumed ?? 0, color: '#2563eb' },
    { name: 'Wheat', value: todayMeal?.wheat_consumed ?? 0, color: '#10b981' },
    { name: 'Dal', value: todayMeal?.dal_consumed ?? 0, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  const kpis = [
    {
      label: 'Students Enrolled',
      value: students.length,
      trend: 'Roster synced',
      icon: Users,
      color: 'from-primary-500 to-primary-700',
    },
    {
      label: 'Meals Served Today',
      value: mealsServedToday,
      trend: 'Kitchen ready',
      icon: Utensils,
      color: 'from-success-500 to-success-700',
    },
    {
      label: 'Active Alerts',
      value: unreadAlerts,
      trend: unreadAlerts > 0 ? 'Needs review' : 'All clear',
      icon: Bell,
      color: 'from-warning-500 to-warning-700',
    },
    {
      label: 'Low Stock Items',
      value: lowStockItems.length,
      trend: lowStockItems.length > 0 ? 'Monitor closely' : 'Stock healthy',
      icon: Package,
      color: 'from-danger-500 to-danger-700',
    },
  ];

  const alertTypeColors: Record<string, string> = {
    LOW_STOCK: 'bg-danger-50 text-danger-700 border-danger-200',
    INSPECTION: 'bg-warning-50 text-warning-700 border-warning-200',
    HEALTH: 'bg-primary-50 text-primary-700 border-primary-200',
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 mt-1">
              {school?.school_name ?? 'School'} &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/attendance')}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              <Users className="w-4 h-4" />
              Mark Attendance
            </button>
            <button
              onClick={() => navigate('/students')}
              className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-primary-300 text-slate-700 px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              <SchoolIcon className="w-4 h-4" />
              View Students
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{kpi.value}</p>
                <p className="text-xs text-slate-400 mt-2">{kpi.trend}</p>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Attendance trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Weekly Attendance Trend</h3>
            <p className="text-sm text-slate-400 mb-4">Students present per day</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Area type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={3} fill="url(#attendanceGrad)" name="Students Present" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Meal distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Meal Distribution</h3>
            <p className="text-sm text-slate-400 mb-4">Today's consumption (kg)</p>
            {mealDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={mealDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                      {mealDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {mealDistribution.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-slate-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{item.value} kg</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                No meal data for today
              </div>
            )}
          </div>
        </div>

        {/* Inventory + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Inventory status */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Inventory Status</h3>
              <button
                onClick={() => navigate('/inventory')}
                className="text-sm text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {inventory.slice(0, 5).map((item) => {
                const pct = Math.min((item.quantity / (item.threshold * 2)) * 100, 100);
                const isLow = item.quantity <= item.threshold;
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{item.item_name}</span>
                      <span className={`text-sm font-semibold ${isLow ? 'text-danger-600' : 'text-slate-600'}`}>
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isLow ? 'bg-danger-500' : pct < 75 ? 'bg-warning-500' : 'bg-success-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {inventory.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">No inventory items</p>
              )}
            </div>
          </div>

          {/* Recent alerts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Recent Alerts</h3>
              <span className="flex items-center gap-1 text-xs text-warning-600 font-semibold bg-warning-50 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {unreadAlerts} unread
              </span>
            </div>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border ${alertTypeColors[alert.alert_type] ?? 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{alert.alert_type.replace('_', ' ')}</p>
                      <p className="text-sm opacity-80 mt-0.5">{alert.message}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${alert.status === 'UNREAD' ? 'bg-white/60' : 'bg-white/30'}`}>
                      {alert.status}
                    </span>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">No alerts</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
