import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Utensils, Users, TrendingUp, Package, Calendar, Download, Printer, AlertCircle, CheckCircle } from 'lucide-react';
import KPICard from '../components/KPICard';
import { mealsAPI } from '../lib/api';
import { useSchool } from '../hooks/useSchool';

interface MealPlan {
  date: string;
  students: {
    total_students: number;
    primary_students: number;
    upper_primary_students: number;
  };
  requirements: {
    rice_kg: number;
    dal_kg: number;
    vegetables_kg: number;
    oil_liters: number;
    total_calories: number;
    total_protein_gms: number;
  };
  cost_estimate: {
    total_cost: number;
    per_student_cost: number;
    item_costs: any;
  };
  inventory_status: Array<{
    item_name: string;
    required: number;
    available: number;
    unit: string;
    sufficient: boolean;
    shortage: number;
  }>;
}

const Meals = () => {
  const { schoolId } = useSchool();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateMeals = async () => {
    if (!schoolId) {
      setError('School ID not found');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await mealsAPI.generatePlan(selectedDate);
      setMealPlan(response.data);
    } catch (err: any) {
      console.error('Error generating meal plan:', err);
      setError(err.response?.data?.detail || 'Failed to generate meal plan. Please mark attendance first.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate plan on load for today
  useEffect(() => {
    if (schoolId && selectedDate === new Date().toISOString().split('T')[0]) {
      handleGenerateMeals();
    }
  }, [schoolId]);

  const handleDownloadReport = () => {
    if (!mealPlan) return;
    
    const reportData = JSON.stringify(mealPlan, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meal-plan-${selectedDate}.json`;
    a.click();
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Meal Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Government norms-based meal calculation (Primary: 100g grains, Upper Primary: 150g grains)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadReport}
              disabled={!mealPlan}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handlePrintReport}
              disabled={!mealPlan}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
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
              disabled={loading}
              className="ml-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Meal Plan'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Calculating meal requirements based on attendance...</p>
          </div>
        )}

        {/* Meal Plan Results */}
        {mealPlan && !loading && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard
                label="Students Present"
                value={mealPlan.students.total_students}
                icon={Users}
                trend={`${mealPlan.students.primary_students} Primary, ${mealPlan.students.upper_primary_students} Upper`}
                color="info"
              />
              <KPICard
                label="Total Calories"
                value={mealPlan.requirements.total_calories}
                icon={Utensils}
                trend="As per MDMS norms"
                color="purple"
              />
              <KPICard
                label="Total Protein (g)"
                value={mealPlan.requirements.total_protein_gms}
                icon={TrendingUp}
                trend="Nutritional target"
                color="success"
              />
              <KPICard
                label="Total Cost"
                value={`₹${mealPlan.cost_estimate.total_cost}`}
                icon={Package}
                trend={`₹${mealPlan.cost_estimate.per_student_cost}/student`}
                color="warning"
              />
              <KPICard
                label="Grains Required"
                value={`${mealPlan.requirements.rice_kg} kg`}
                icon={Package}
                trend="Rice/Wheat"
                color="primary"
              />
            </div>

            {/* Ingredient Requirements */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Ingredient Requirements (Government MDMS Norms)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mealPlan.inventory_status.map((item) => (
                  <div
                    key={item.item_name}
                    className={`border-2 rounded-lg p-4 transition-colors ${
                      item.sufficient 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-slate-800">{item.item_name}</h3>
                      {item.sufficient ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Required:</span>
                        <span className="font-medium">{item.required.toFixed(2)} {item.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Available:</span>
                        <span className="font-medium">{item.available.toFixed(2)} {item.unit}</span>
                      </div>
                      {!item.sufficient && (
                        <div className="flex justify-between text-red-600">
                          <span>Shortage:</span>
                          <span className="font-bold">{item.shortage.toFixed(2)} {item.unit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Government Norms Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Government MDMS Norms Applied</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <p className="font-medium mb-1">Primary (Class I-V):</p>
                  <ul className="space-y-0.5 ml-4">
                    <li>• Food Grains: 100g</li>
                    <li>• Pulses: 20g</li>
                    <li>• Vegetables: 50g</li>
                    <li>• Oil & Fat: 5g</li>
                    <li>• Calories: 450</li>
                    <li>• Protein: 12g</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">Upper Primary (Class VI-VIII):</p>
                  <ul className="space-y-0.5 ml-4">
                    <li>• Food Grains: 150g</li>
                    <li>• Pulses: 30g</li>
                    <li>• Vegetables: 75g</li>
                    <li>• Oil & Fat: 7.5g</li>
                    <li>• Calories: 700</li>
                    <li>• Protein: 20g</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-3">
                * Calculations are based on actual student grade distribution from today's attendance
              </p>
            </div>
          </>
        )}

        {/* No Data State */}
        {!mealPlan && !loading && !error && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Utensils className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Meal Plan Generated</h3>
            <p className="text-slate-600 mb-4">
              Select a date and click "Generate Meal Plan" to calculate meal requirements based on attendance.
            </p>
            <p className="text-sm text-slate-500">
              Make sure attendance has been marked for the selected date.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Meals;
