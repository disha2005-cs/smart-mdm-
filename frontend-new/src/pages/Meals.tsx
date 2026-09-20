import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Download,
  Info,
  Package,
  PackageCheck,
  Printer,
  Save,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react';
import KPICard from '../components/KPICard';
import { getErrorMessage, mealsAPI } from '../lib/api';
import type { MealPlan } from '../types';

const todayISO = () => new Date().toISOString().split('T')[0];

const Meals = () => {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [riceShare, setRiceShare] = useState(1);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const generatePlan = useCallback(
    async (options?: { silent?: boolean }) => {
      setLoading(true);
      setError('');
      if (!options?.silent) setNotice('');

      try {
        const response = await mealsAPI.generatePlan(selectedDate, riceShare);
        setMealPlan(response.data);
      } catch (err) {
        setMealPlan(null);
        setError(getErrorMessage(err, 'Failed to generate the meal plan'));
      } finally {
        setLoading(false);
      }
    },
    [selectedDate, riceShare]
  );

  // Load today's plan on arrival so the page is never blank for no reason.
  useEffect(() => {
    void generatePlan({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveRecord = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await mealsAPI.recordFromPlan(selectedDate, riceShare);
      setNotice('Meal record saved. You can now deduct the ingredients from stock.');
      await generatePlan({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save the meal record'));
    } finally {
      setSaving(false);
    }
  };

  const handleConsume = async () => {
    if (!mealPlan?.daily_record) return;
    if (
      !confirm(
        'Deduct these ingredients from inventory? This reduces your stock and can only be undone by deleting the meal record.'
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await mealsAPI.consumeInventory(mealPlan.daily_record.id);
      const deductions = response.data?.deductions ?? [];
      setNotice(
        deductions.length
          ? `Stock updated: ${deductions
              .map((d: any) => `${d.item} −${d.deducted} ${d.unit}`)
              .join(', ')}`
          : 'Stock updated.'
      );
      await generatePlan({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to deduct stock'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReport = () => {
    if (!mealPlan) return;
    const blob = new Blob([JSON.stringify(mealPlan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `meal-plan-${selectedDate}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const record = mealPlan?.daily_record;
  const requirements = mealPlan?.requirements;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Meal Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Government PM POSHAN norms &mdash; Primary 100g grains, Upper Primary 150g grains
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
              onClick={() => window.print()}
              disabled={!mealPlan}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              <label className="text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={selectedDate}
                max={todayISO()}
                onChange={(event) => setSelectedDate(event.target.value || todayISO())}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700" title="Share of the grain requirement served as rice">
                Rice share
              </label>
              <select
                value={riceShare}
                onChange={(event) => setRiceShare(Number(event.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={1}>All rice</option>
                <option value={0.75}>75% rice / 25% wheat</option>
                <option value={0.5}>50% rice / 50% wheat</option>
                <option value={0.25}>25% rice / 75% wheat</option>
                <option value={0}>All wheat</option>
              </select>
            </div>

            <button
              onClick={() => void generatePlan()}
              disabled={loading}
              className="ml-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate Meal Plan'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Could not build the plan</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {notice && (
          <div className="bg-success-50 border border-success-200 text-success-800 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{notice}</p>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
            <p className="text-slate-600">Calculating requirements from the day's attendance…</p>
          </div>
        )}

        {mealPlan && requirements && !loading && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard
                label="Students Present"
                value={mealPlan.students.total_students}
                icon={Users}
                trend={`${mealPlan.students.primary_students} primary · ${mealPlan.students.upper_primary_students} upper${
                  mealPlan.students.secondary_students
                    ? ` · ${mealPlan.students.secondary_students} class IX-X`
                    : ''
                }`}
                color="info"
              />
              <KPICard
                label="Total Calories"
                value={requirements.total_calories.toLocaleString('en-IN')}
                icon={Utensils}
                trend={`${mealPlan.students.per_student_averages.calories} kcal/student`}
                color="purple"
              />
              <KPICard
                label="Total Protein"
                value={`${requirements.total_protein_gms} g`}
                icon={TrendingUp}
                trend={`${mealPlan.students.per_student_averages.protein_gms} g/student`}
                color="success"
              />
              <KPICard
                label="Estimated Cost"
                value={`₹${mealPlan.cost_estimate.total_cost.toLocaleString('en-IN')}`}
                icon={Package}
                trend={
                  mealPlan.cost_estimate.is_complete
                    ? `₹${mealPlan.cost_estimate.per_student_cost}/student`
                    : `Partial — no price for ${mealPlan.cost_estimate.missing_prices.join(', ')}`
                }
                color="warning"
              />
              <KPICard
                label="Grains Required"
                value={`${requirements.grains_kg} kg`}
                icon={Package}
                trend={`${requirements.rice_kg} kg rice · ${requirements.wheat_kg} kg wheat`}
                color="primary"
              />
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSaveRecord}
                disabled={saving || record?.inventory_consumed}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {record ? 'Update Meal Record' : 'Save Meal Record'}
              </button>
              <button
                onClick={handleConsume}
                disabled={saving || !record || record.inventory_consumed || !mealPlan.can_serve}
                className="flex items-center gap-2 px-5 py-2.5 bg-success-600 text-white rounded-lg font-semibold hover:bg-success-700 transition disabled:opacity-50"
                title={
                  !record
                    ? 'Save the meal record first'
                    : record.inventory_consumed
                      ? 'Stock has already been deducted for this date'
                      : !mealPlan.can_serve
                        ? 'Not enough stock for every ingredient'
                        : 'Deduct these ingredients from inventory'
                }
              >
                <PackageCheck className="h-4 w-4" />
                Deduct From Stock
              </button>

              {record?.inventory_consumed && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-success-700">
                  <CheckCircle className="h-4 w-4" />
                  Stock already deducted for {mealPlan.date}
                </span>
              )}
              {record && !record.inventory_consumed && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Info className="h-4 w-4" />
                  Record saved &mdash; stock not yet deducted
                </span>
              )}
            </div>

            {/* Ingredient requirements */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Ingredient Requirements</h2>
              <p className="text-sm text-slate-500 mb-4">
                Calculated from each present student's grade against the PM POSHAN norms
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mealPlan.inventory_status.map((item) => (
                  <div
                    key={item.ingredient}
                    className={`border-2 rounded-lg p-4 transition-colors ${
                      item.sufficient ? 'border-success-200 bg-success-50' : 'border-danger-200 bg-danger-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-800 capitalize truncate">{item.ingredient}</h3>
                        <p className="text-xs text-slate-500 truncate">
                          {item.tracked ? item.item_name : 'Not in inventory'}
                        </p>
                      </div>
                      {item.sufficient ? (
                        <CheckCircle className="h-5 w-5 text-success-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Required</span>
                        <span className="font-medium">
                          {item.required.toFixed(3)} {item.unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Available</span>
                        <span className="font-medium">
                          {item.available.toFixed(2)} {item.unit}
                        </span>
                      </div>
                      {!item.sufficient && (
                        <div className="flex justify-between text-danger-600">
                          <span>Shortage</span>
                          <span className="font-bold">
                            {item.shortage.toFixed(3)} {item.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {mealPlan.shortages.length > 0 && (
                <div className="mt-4 rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800">
                  <p className="font-semibold mb-1">
                    {mealPlan.shortages.length} ingredient(s) short of the requirement
                  </p>
                  <p>
                    Add the missing stock in Inventory Management, or request an allocation, before
                    deducting this meal.
                  </p>
                </div>
              )}
            </div>

            {/* Norms reference */}
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
              <h3 className="font-semibold text-primary-900 mb-2">Government PM POSHAN Norms Applied</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-primary-800">
                <div>
                  <p className="font-medium mb-1">Primary (Class I-V):</p>
                  <ul className="space-y-0.5 ml-4">
                    <li>• Food Grains: 100g</li>
                    <li>• Pulses: 20g</li>
                    <li>• Vegetables: 50g</li>
                    <li>• Oil &amp; Fat: 5g</li>
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
                    <li>• Oil &amp; Fat: 7.5g</li>
                    <li>• Calories: 700</li>
                    <li>• Protein: 20g</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-primary-700 mt-3">
                Classes IX-X fall outside the scheme and are budgeted at the Upper Primary rate; they
                are counted separately above.
              </p>
            </div>
          </>
        )}

        {!mealPlan && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Utensils className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Meal Plan Yet</h3>
            <p className="text-slate-600 mb-1">
              Pick a date and generate a plan to see the requirements for that day.
            </p>
            <p className="text-sm text-slate-500">
              Attendance must be marked for the selected date first &mdash; the plan is built from who
              was actually present.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Meals;
