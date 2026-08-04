import { useState } from 'react';
import Layout from '../components/Layout';
import { Utensils, Users, TrendingUp, Package, Calendar, Download, Printer } from 'lucide-react';
import KPICard from '../components/KPICard';

const Meals = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Mock data for meal management
  const mealData = {
    mealsRequired: 450,
    mealsPrepared: 450,
    mealsServed: 432,
    remaining: 18,
    attendance: 450,
  };

  const ingredientRequirements = [
    { name: 'Rice', required: '45 kg', available: '50 kg', status: 'sufficient' },
    { name: 'Dal', required: '15 kg', available: '20 kg', status: 'sufficient' },
    { name: 'Oil', required: '5 L', available: '3 L', status: 'low' },
    { name: 'Vegetables', required: '30 kg', available: '35 kg', status: 'sufficient' },
    { name: 'Eggs', required: '450 pcs', available: '500 pcs', status: 'sufficient' },
    { name: 'Milk', required: '50 L', available: '45 L', status: 'low' },
  ];

  const weeklyMeals = [
    { day: 'Monday', meals: 445, attendance: 450 },
    { day: 'Tuesday', meals: 438, attendance: 445 },
    { day: 'Wednesday', meals: 452, attendance: 455 },
    { day: 'Thursday', meals: 441, attendance: 448 },
    { day: 'Friday', meals: 432, attendance: 450 },
  ];

  const handleGenerateMeals = () => {
    alert('Meal calculation generated based on today\'s attendance!');
  };

  const handleDownloadReport = () => {
    alert('Downloading meal report...');
  };

  const handlePrintReport = () => {
    alert('Printing meal report...');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Meal Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Automatic meal calculation and ingredient tracking
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-slate-400" />
            <label className="text-sm font-medium text-slate-700">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleGenerateMeals}
              className="ml-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Generate Meal Plan
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Students Present"
            value={mealData.attendance}
            icon={Users}
            trend={{ value: 2.5, isPositive: true }}
            color="blue"
          />
          <KPICard
            title="Meals Required"
            value={mealData.mealsRequired}
            icon={Utensils}
            trend={{ value: 0, isPositive: true }}
            color="purple"
          />
          <KPICard
            title="Meals Prepared"
            value={mealData.mealsPrepared}
            icon={Package}
            trend={{ value: 0, isPositive: true }}
            color="green"
          />
          <KPICard
            title="Meals Served"
            value={mealData.mealsServed}
            icon={TrendingUp}
            trend={{ value: 4.0, isPositive: true }}
            color="orange"
          />
          <KPICard
            title="Remaining"
            value={mealData.remaining}
            icon={Utensils}
            trend={{ value: 0, isPositive: true }}
            color="slate"
          />
        </div>

        {/* Ingredient Requirements */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Ingredient Requirements for Today
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ingredientRequirements.map((ingredient) => (
              <div
                key={ingredient.name}
                className="border border-slate-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-800">{ingredient.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      ingredient.status === 'sufficient'
                        ? 'bg-success-100 text-success-700'
                        : 'bg-warning-100 text-warning-700'
                    }`}
                  >
                    {ingredient.status === 'sufficient' ? 'Sufficient' : 'Low Stock'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Required:</span>
                    <span className="font-medium text-slate-700">{ingredient.required}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Available:</span>
                    <span className="font-medium text-slate-700">{ingredient.available}</span>
                  </div>
                </div>
                {ingredient.status === 'low' && (
                  <div className="mt-3 p-2 bg-warning-50 rounded text-xs text-warning-700">
                    ⚠️ Stock is running low. Please reorder.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Meal Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">This Week's Meals</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Day</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    Attendance
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    Meals Served
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                    Efficiency
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeklyMeals.map((day) => {
                  const efficiency = ((day.meals / day.attendance) * 100).toFixed(1);
                  return (
                    <tr key={day.day} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-medium text-slate-800">{day.day}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{day.attendance}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{day.meals}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                          {efficiency}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Meal requirements are automatically calculated based on daily attendance</li>
            <li>• Ingredient quantities are computed per meal standards (Rice: 100g, Dal: 30g, etc.)</li>
            <li>• Low stock alerts are triggered when available quantity falls below requirements</li>
            <li>• Weekly trends help optimize procurement and reduce wastage</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Meals;
