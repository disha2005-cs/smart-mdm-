import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { FileText, Users, Package, TrendingUp, Utensils } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useSchool } from '../hooks/useSchool';
import type { DailyMeal, InventoryItem, Student } from '../types';

const reportTypes = [
  { id: 'attendance', label: 'Attendance', icon: Users, color: 'from-primary-500 to-primary-700' },
  { id: 'meals', label: 'Meal Distribution', icon: Utensils, color: 'from-success-500 to-success-700' },
  { id: 'inventory', label: 'Inventory', icon: Package, color: 'from-warning-500 to-warning-700' },
  { id: 'performance', label: 'Performance', icon: TrendingUp, color: 'from-primary-400 to-primary-600' },
];

const Reports = () => {
  const { schoolId } = useSchool();
  const [selected, setSelected] = useState('attendance');
  const [meals, setMeals] = useState<DailyMeal[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const [m, inv, stu] = await Promise.all([
          supabase.from('daily_meals').select('*').eq('school_id', schoolId).order('date', { ascending: true }).limit(30),
          supabase.from('inventory_items').select('*').eq('school_id', schoolId),
          supabase.from('students').select('*').eq('school_id', schoolId).eq('is_active', true),
        ]);
        setMeals(m.data ?? []);
        setInventory(inv.data ?? []);
        setStudents(stu.data ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  const attendanceData = meals.map((m) => ({
    date: new Date(m.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    attendance: m.total_students_present,
  }));

  const mealData = meals.map((m) => ({
    date: new Date(m.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    rice: m.rice_consumed,
    wheat: m.wheat_consumed,
    dal: m.dal_consumed,
  }));

  const inventoryData = inventory.map((i) => ({
    name: i.item_name,
    stock: i.quantity,
    threshold: i.threshold,
  }));

  const nutritionCompliance = [
    { name: 'Compliant', value: 85, color: '#10b981' },
    { name: 'Minor Issues', value: 12, color: '#f59e0b' },
    { name: 'Non-Compliant', value: 3, color: '#ef4444' },
  ];

  const avgAttendance = meals.length > 0 ? Math.round(meals.reduce((s, m) => s + m.total_students_present, 0) / meals.length) : 0;
  const totalMeals = meals.reduce((s, m) => s + m.total_students_present, 0);
  const totalRice = meals.reduce((s, m) => s + m.rice_consumed, 0);
  const totalWheat = meals.reduce((s, m) => s + m.wheat_consumed, 0);
  const totalDal = meals.reduce((s, m) => s + m.dal_consumed, 0);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary-600" />
            Reports &amp; Analytics
          </h1>
          <p className="text-slate-500 mt-1">Generate detailed insights and track performance</p>
        </div>

        {/* Report type selection */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelected(type.id)}
                className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all text-left ${
                  selected === type.id ? 'border-primary-500 ring-2 ring-primary-100' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{type.label}</h3>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Attendance report */}
            {selected === 'attendance' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Avg Attendance', value: avgAttendance, sub: 'students/day' },
                    { label: 'Total Students', value: students.length, sub: 'enrolled' },
                    { label: 'Total Meals', value: totalMeals, sub: 'served' },
                    { label: 'Records', value: meals.length, sub: 'days tracked' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                      <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                      <p className="text-sm text-slate-500">{s.label}</p>
                      <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Attendance Trend</h3>
                  <p className="text-sm text-slate-400 mb-4">Students present per day</p>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={attendanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={3} name="Students Present" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Meals report */}
            {selected === 'meals' && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Rice Consumed', value: `${totalRice.toFixed(1)} kg`, color: 'text-primary-600' },
                    { label: 'Wheat Consumed', value: `${totalWheat.toFixed(1)} kg`, color: 'text-success-600' },
                    { label: 'Dal Consumed', value: `${totalDal.toFixed(1)} kg`, color: 'text-warning-600' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-sm text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Meal Consumption Trend</h3>
                  <p className="text-sm text-slate-400 mb-4">Daily consumption by ingredient (kg)</p>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={mealData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Legend />
                      <Bar dataKey="rice" fill="#2563eb" name="Rice" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="wheat" fill="#10b981" name="Wheat" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="dal" fill="#f59e0b" name="Dal" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Inventory report */}
            {selected === 'inventory' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Stock vs Threshold</h3>
                  <p className="text-sm text-slate-400 mb-4">Current stock levels compared to reorder thresholds</p>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={inventoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Legend />
                      <Bar dataKey="stock" fill="#2563eb" name="Current Stock" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="threshold" fill="#ef4444" name="Threshold" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Inventory Breakdown</h3>
                  <div className="space-y-3">
                    {inventory.map((item) => {
                      const ratio = item.quantity / (item.threshold || 1);
                      const status = ratio <= 0.5 ? 'Critical' : ratio <= 1 ? 'Low' : ratio <= 2 ? 'Moderate' : 'Good';
                      const color = ratio <= 0.5 ? 'text-danger-600 bg-danger-50' : ratio <= 1 ? 'text-warning-600 bg-warning-50' : 'text-success-600 bg-success-50';
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-semibold text-slate-800">{item.item_name}</p>
                            <p className="text-sm text-slate-500">{item.category} &middot; {item.supplier ?? 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{item.quantity} {item.unit}</p>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${color}`}>{status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Performance report */}
            {selected === 'performance' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Nutrition Compliance</h3>
                    <p className="text-sm text-slate-400 mb-4">Meal program compliance overview</p>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={nutritionCompliance} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                          {nutritionCompliance.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-4">
                      {nutritionCompliance.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-slate-600">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Key Metrics</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Average Daily Attendance', value: avgAttendance, max: students.length, unit: 'students' },
                        { label: 'Total Meals Served', value: totalMeals, max: totalMeals, unit: 'meals' },
                        { label: 'Inventory Items Tracked', value: inventory.length, max: inventory.length, unit: 'items' },
                        { label: 'Active Students', value: students.length, max: students.length, unit: 'students' },
                      ].map((m, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-600">{m.label}</span>
                            <span className="text-sm font-bold text-slate-800">{m.value} {m.unit}</span>
                          </div>
                          <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary-500 to-success-500 rounded-full" style={{ width: `${m.max > 0 ? (m.value / m.max) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
