import { useState } from 'react';
import Layout from '../components/Layout';
import { FileText, Download, Calendar, Filter, TrendingUp, Users, Package, Apple } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('attendance');
  const [dateRange, setDateRange] = useState('thisMonth');

  const attendanceData = [
    { month: 'Jan', attendance: 92.3, target: 95 },
    { month: 'Feb', attendance: 93.1, target: 95 },
    { month: 'Mar', attendance: 91.8, target: 95 },
    { month: 'Apr', attendance: 94.2, target: 95 },
    { month: 'May', attendance: 92.7, target: 95 },
  ];

  const mealData = [
    { day: 'Mon', served: 22134, planned: 24000 },
    { day: 'Tue', served: 22456, planned: 24000 },
    { day: 'Wed', served: 21897, planned: 24000 },
    { day: 'Thu', served: 22678, planned: 24000 },
    { day: 'Fri', served: 22234, planned: 24000 },
  ];

  const schoolPerformance = [
    { school: 'Bangalore North', score: 95, color: '#10B981' },
    { school: 'Mysuru Central', score: 88, color: '#3B82F6' },
    { school: 'Hassan District', score: 82, color: '#F59E0B' },
    { school: 'Mandya Region', score: 78, color: '#EF4444' },
  ];

  const nutritionCompliance = [
    { name: 'Compliant', value: 85, color: '#10B981' },
    { name: 'Minor Issues', value: 12, color: '#F59E0B' },
    { name: 'Non-Compliant', value: 3, color: '#EF4444' },
  ];

  const reportTypes = [
    { id: 'attendance', label: 'Attendance Report', icon: <Users />, color: 'from-blue-500 to-blue-600' },
    { id: 'meals', label: 'Meal Distribution', icon: <Apple />, color: 'from-green-500 to-green-600' },
    { id: 'inventory', label: 'Inventory Analysis', icon: <Package />, color: 'from-orange-500 to-orange-600' },
    { id: 'performance', label: 'School Performance', icon: <TrendingUp />, color: 'from-purple-500 to-purple-600' },
  ];

  const exportReport = (format: string) => {
    alert(`Exporting ${selectedReport} report as ${format}...`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Reports & Analytics
            </h1>
            <p className="text-gray-600 mt-1">Generate detailed reports and insights</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportReport('PDF')}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
            >
              <Download className="w-5 h-5" />
              Export PDF
            </button>
            <button
              onClick={() => exportReport('Excel')}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
            >
              <Download className="w-5 h-5" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all text-left ${
                selectedReport === type.id ? 'ring-4 ring-blue-500' : ''
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-4`}>
                {type.icon}
              </div>
              <h3 className="font-bold text-gray-800">{type.label}</h3>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-700">Date Range:</span>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            
            <div className="flex items-center gap-2 ml-auto">
              <Filter className="w-5 h-5 text-gray-600" />
              <select className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none">
                <option>All Schools</option>
                <option>Bangalore Region</option>
                <option>Mysuru Region</option>
                <option>Hassan Region</option>
              </select>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {selectedReport === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Attendance Trend */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Monthly Attendance Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" domain={[85, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="attendance" stroke="#3B82F6" strokeWidth={3} name="Actual %" />
                    <Line type="monotone" dataKey="target" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" name="Target %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Stats */}
              <div className="bg-white rounded-2xl p-6 shadow-md space-y-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Summary Statistics</h3>
                {[
                  { label: 'Average Attendance', value: '92.8%', change: '+2.3%', positive: true },
                  { label: 'Total Students', value: '24,532', change: '+145', positive: true },
                  { label: 'Present Today', value: '22,134', change: '-234', positive: false },
                  { label: 'Attendance Rate', value: '90.2%', change: '-1.5%', positive: false },
                ].map((stat, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold text-gray-800">{stat.value}</span>
                      <span className={`text-sm font-semibold ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'meals' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meal Distribution */}
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Weekly Meal Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mealData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="served" fill="#3B82F6" name="Meals Served" />
                    <Bar dataKey="planned" fill="#10B981" name="Meals Planned" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Nutrition Compliance */}
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Nutrition Compliance</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={nutritionCompliance}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {nutritionCompliance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-3">
                  {nutritionCompliance.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'inventory' && (
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Inventory Consumption Analysis</h3>
            <div className="space-y-4">
              {[
                { item: 'Rice', consumed: '8,750 kg', cost: '₹3,93,750', trend: '-12%' },
                { item: 'Wheat', consumed: '6,500 kg', cost: '₹2,60,000', trend: '-8%' },
                { item: 'Toor Dal', consumed: '2,270 kg', cost: '₹2,72,400', trend: '+5%' },
                { item: 'Sunflower Oil', consumed: '1,180 L', cost: '₹2,12,400', trend: '-15%' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{item.item}</p>
                      <p className="text-sm text-gray-600">{item.consumed} consumed this month</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{item.cost}</p>
                    <p className={`text-sm font-semibold ${item.trend.startsWith('-') ? 'text-green-600' : 'text-red-600'}`}>
                      {item.trend} vs last month
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedReport === 'performance' && (
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-6">School Performance Rankings</h3>
            <div className="space-y-4">
              {schoolPerformance.map((school, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                      <span className="font-semibold text-gray-800">{school.school}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-800">{school.score}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${school.score}%`, backgroundColor: school.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Download />, label: 'Download CSV' },
              { icon: <FileText />, label: 'Generate PDF' },
              { icon: <Calendar />, label: 'Schedule Report' },
              { icon: <TrendingUp />, label: 'View Trends' },
            ].map((action, index) => (
              <button
                key={index}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center gap-3 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  {action.icon}
                </div>
                <span className="font-semibold text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
