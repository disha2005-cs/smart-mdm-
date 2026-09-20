import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { Download, FileText, Package, TrendingUp, Users, Utensils } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getErrorMessage, reportsAPI } from '../lib/api';

interface DailyRow {
  date: string;
  attendance: number;
  attendance_percentage: number;
  meals_served: number;
  rice: number;
  wheat: number;
  dal: number;
}

interface DailyReport {
  start_date: string;
  end_date: string;
  total_students: number;
  rows: DailyRow[];
  totals: {
    school_days: number;
    total_meals_served: number;
    total_rice: number;
    total_wheat: number;
    total_dal: number;
    average_attendance: number;
    average_attendance_percentage: number;
  };
}

interface InventoryRow {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  threshold: number;
  supplier: string | null;
  cost_per_unit: number | null;
  stock_value: number;
  status: 'out' | 'critical' | 'low' | 'healthy';
}

interface InventoryReport {
  rows: InventoryRow[];
  totals: { items: number; stock_value: number; low_or_out: number };
}

interface MonthlyRow {
  period: string;
  unique_students: number;
  attendance_records: number;
  school_days: number;
  average_daily_attendance: number;
  meals_served: number;
  rice: number;
  wheat: number;
  dal: number;
}

const reportTypes = [
  { id: 'attendance', label: 'Attendance', icon: Users, color: 'from-primary-500 to-primary-700' },
  { id: 'meals', label: 'Meal Distribution', icon: Utensils, color: 'from-success-500 to-success-700' },
  { id: 'inventory', label: 'Inventory', icon: Package, color: 'from-warning-500 to-warning-700' },
  { id: 'performance', label: 'Performance', icon: TrendingUp, color: 'from-primary-400 to-primary-600' },
];

const RANGES = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
];

const STATUS_STYLES: Record<InventoryRow['status'], { label: string; className: string }> = {
  out: { label: 'Out of stock', className: 'text-danger-700 bg-danger-100' },
  critical: { label: 'Critical', className: 'text-danger-600 bg-danger-50' },
  low: { label: 'Low', className: 'text-warning-600 bg-warning-50' },
  healthy: { label: 'Healthy', className: 'text-success-600 bg-success-50' },
};

const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const Reports = () => {
  const [selected, setSelected] = useState('attendance');
  const [rangeDays, setRangeDays] = useState('30');

  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const start = isoDaysAgo(Number(rangeDays) - 1);
      const end = new Date().toISOString().split('T')[0];

      const [dailyRes, monthlyRes, inventoryRes] = await Promise.all([
        reportsAPI.daily(start, end),
        reportsAPI.monthly(isoDaysAgo(364), end),
        reportsAPI.inventory(),
      ]);

      setDaily(dailyRes.data);
      setMonthly(monthlyRes.data?.rows ?? []);
      setInventory(inventoryRes.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load report data'));
      setDaily(null);
      setMonthly([]);
      setInventory(null);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  // Memoised so the charts below are not rebuilt on every unrelated render.
  const rows = useMemo(() => daily?.rows ?? [], [daily]);
  const totals = daily?.totals;

  const attendanceData = useMemo(
    () =>
      rows.map((row) => ({
        date: shortDate(row.date),
        attendance: row.attendance,
        percentage: row.attendance_percentage,
      })),
    [rows]
  );

  const mealData = useMemo(
    () =>
      rows
        // Days with no meal recorded add nothing but noise to the chart.
        .filter((row) => row.rice + row.wheat + row.dal > 0)
        .map((row) => ({
          date: shortDate(row.date),
          rice: Number(row.rice.toFixed(2)),
          wheat: Number(row.wheat.toFixed(2)),
          dal: Number(row.dal.toFixed(2)),
        })),
    [rows]
  );

  const inventoryChartData = useMemo(
    () =>
      (inventory?.rows ?? []).map((item) => ({
        name: item.item_name,
        stock: item.quantity,
        threshold: item.threshold,
      })),
    [inventory]
  );

  // Stock health, computed from real rows rather than fixed percentages.
  const stockHealth = useMemo(() => {
    const items = inventory?.rows ?? [];
    if (!items.length) return [];
    const buckets = [
      { name: 'Healthy', value: items.filter((i) => i.status === 'healthy').length, color: '#10b981' },
      { name: 'Low', value: items.filter((i) => i.status === 'low').length, color: '#f59e0b' },
      {
        name: 'Critical / Out',
        value: items.filter((i) => i.status === 'critical' || i.status === 'out').length,
        color: '#ef4444',
      },
    ];
    return buckets.filter((bucket) => bucket.value > 0);
  }, [inventory]);

  const exportCsv = () => {
    if (!rows.length) return;
    const header = ['Date', 'Students Present', 'Attendance %', 'Meals Served', 'Rice (kg)', 'Wheat (kg)', 'Dal (kg)'];
    const lines = rows.map((row) =>
      [row.date, row.attendance, row.attendance_percentage, row.meals_served, row.rice, row.wheat, row.dal].join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `report-${daily?.start_date}-to-${daily?.end_date}.csv`;
    anchor.click();
    // Revoking prevents the blob leaking for the life of the tab.
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary-600" />
              Reports &amp; Analytics
            </h1>
            <p className="text-slate-500 mt-1">
              Live figures from attendance, meal and inventory records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={rangeDays}
              onChange={(event) => setRangeDays(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {RANGES.map((range) => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </select>
            <button
              onClick={exportCsv}
              disabled={!rows.length}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        {/* Report type selection */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelected(type.id)}
                className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all text-left ${
                  selected === type.id
                    ? 'border-primary-500 ring-2 ring-primary-100'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-3`}
                >
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
                    { label: 'Avg Attendance', value: totals?.average_attendance ?? 0, sub: 'students/day' },
                    {
                      label: 'Avg Attendance %',
                      value: `${totals?.average_attendance_percentage ?? 0}%`,
                      sub: 'of enrolment',
                    },
                    { label: 'Enrolled Students', value: daily?.total_students ?? 0, sub: 'active' },
                    { label: 'School Days', value: totals?.school_days ?? 0, sub: 'with attendance' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                      <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Attendance Trend</h3>
                  <p className="text-sm text-slate-400 mb-4">Students present per day</p>
                  {attendanceData.length ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={attendanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="attendance"
                          stroke="#2563eb"
                          strokeWidth={3}
                          name="Students Present"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="No attendance recorded in this period" />
                  )}
                </div>
              </div>
            )}

            {/* Meals report */}
            {selected === 'meals' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Meals Served', value: totals?.total_meals_served ?? 0, color: 'text-slate-800' },
                    { label: 'Rice Consumed', value: `${(totals?.total_rice ?? 0).toFixed(2)} kg`, color: 'text-primary-600' },
                    { label: 'Wheat Consumed', value: `${(totals?.total_wheat ?? 0).toFixed(2)} kg`, color: 'text-success-600' },
                    { label: 'Dal Consumed', value: `${(totals?.total_dal ?? 0).toFixed(2)} kg`, color: 'text-warning-600' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Meal Consumption</h3>
                  <p className="text-sm text-slate-400 mb-4">Recorded consumption by ingredient (kg)</p>
                  {mealData.length ? (
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
                  ) : (
                    <EmptyChart message="No meal consumption recorded in this period. Save a meal plan on the Meal Management page." />
                  )}
                </div>
              </div>
            )}

            {/* Inventory report */}
            {selected === 'inventory' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard label="Items Tracked" value={inventory?.totals.items ?? 0} />
                  <StatCard
                    label="Total Stock Value"
                    value={`₹${(inventory?.totals.stock_value ?? 0).toLocaleString('en-IN')}`}
                  />
                  <StatCard label="Need Reordering" value={inventory?.totals.low_or_out ?? 0} />
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Stock vs Threshold</h3>
                  <p className="text-sm text-slate-400 mb-4">Current levels against reorder points</p>
                  {inventoryChartData.length ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={inventoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                        <Legend />
                        <Bar dataKey="stock" fill="#2563eb" name="Current Stock" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="threshold" fill="#ef4444" name="Threshold" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="No inventory items recorded" />
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Inventory Breakdown</h3>
                  <div className="space-y-3">
                    {(inventory?.rows ?? []).map((item) => {
                      const style = STATUS_STYLES[item.status];
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{item.item_name}</p>
                            <p className="text-sm text-slate-500">
                              {item.category} &middot; {item.supplier ?? 'No supplier'}
                              {item.cost_per_unit != null && ` · ₹${item.cost_per_unit}/${item.unit}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-slate-800">
                              {item.quantity} {item.unit}
                            </p>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.className}`}>
                              {style.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {!inventory?.rows.length && (
                      <p className="text-sm text-slate-500 text-center py-6">No inventory items yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Performance report */}
            {selected === 'performance' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Stock Health</h3>
                    <p className="text-sm text-slate-400 mb-4">Distribution of items by stock status</p>
                    {stockHealth.length ? (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={stockHealth}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {stockHealth.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 mt-4">
                          {stockHealth.map((entry) => (
                            <div key={entry.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-sm text-slate-600">{entry.name}</span>
                              </div>
                              <span className="text-sm font-semibold text-slate-800">{entry.value} items</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <EmptyChart message="No inventory items to analyse" />
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Monthly Summary</h3>
                    {monthly.length ? (
                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {monthly
                          .slice()
                          .reverse()
                          .map((row) => (
                            <div key={row.period} className="p-4 bg-slate-50 rounded-xl">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-slate-800">
                                  {new Date(`${row.period}T00:00:00`).toLocaleDateString('en-IN', {
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="text-sm font-bold text-primary-600">
                                  {row.average_daily_attendance} avg/day
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span>{row.school_days} school days</span>
                                <span>{row.unique_students} unique students</span>
                                <span>{row.meals_served} meals served</span>
                                <span>
                                  {(row.rice + row.wheat).toFixed(1)} kg grains · {row.dal.toFixed(1)} kg dal
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <EmptyChart message="No monthly data yet" />
                    )}
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-6">
      <p className="text-sm text-slate-400 text-center">{message}</p>
    </div>
  );
}

export default Reports;
