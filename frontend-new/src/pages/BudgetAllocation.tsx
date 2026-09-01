import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { IndianRupee, Calendar, TrendingUp, Plus, X, Building2 } from 'lucide-react';
import { budgetsAPI, schoolsAPI } from '../lib/api';

interface School {
  id: number;
  school_name: string;
  district: string;
}

interface Budget {
  id: number;
  school_id: number;
  financial_year: string;
  allocated_amount: number;
  utilized_amount: number;
  created_at: string;
}

interface BudgetSummary {
  financial_year: string;
  total_allocated: number;
  total_utilized: number;
  remaining: number;
  utilization_percentage: number;
  schools_covered: number;
  district_breakdown: Array<{
    district: string;
    allocated: number;
    utilized: number;
    schools: number;
  }>;
}

export default function BudgetAllocation() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    school_id: '',
    financial_year: '2026-27',
    allocated_amount: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, schoolsRes, summaryRes] = await Promise.all([
        budgetsAPI.getAll('2026-27'),
        schoolsAPI.getAll(),
        budgetsAPI.getSummary('2026-27')
      ]);
      setBudgets(budgetsRes.data);
      setSchools(schoolsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await budgetsAPI.allocate({
        school_id: parseInt(form.school_id),
        financial_year: form.financial_year,
        allocated_amount: parseFloat(form.allocated_amount)
      });
      await fetchData();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Error allocating budget:', err);
      alert(err.response?.data?.detail || 'Failed to allocate budget');
    }
  };

  const resetForm = () => {
    setForm({
      school_id: '',
      financial_year: '2026-27',
      allocated_amount: ''
    });
  };

  const getSchoolName = (schoolId: number) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.school_name : `School #${schoolId}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Budget Allocation</h1>
            <p className="mt-1 text-slate-500">Manage financial resources for PM POSHAN program</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-2.5 font-semibold text-white shadow-md transition-colors hover:from-primary-700 hover:to-primary-800"
          >
            <Plus className="h-4 w-4" />
            Allocate Budget
          </button>
        </div>

        {/* Summary Stats */}
        {summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Total Budget (FY {summary.financial_year})</h3>
                <p className="text-3xl font-bold text-slate-800">{formatCurrency(summary.total_allocated)}</p>
                <p className="text-sm text-green-600 mt-2">{summary.schools_covered} schools covered</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Utilized</h3>
                <p className="text-3xl font-bold text-slate-800">{formatCurrency(summary.total_utilized)}</p>
                <p className="text-sm text-slate-500 mt-2">{summary.utilization_percentage.toFixed(1)}% of total budget</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-medium text-slate-600 mb-2">Remaining</h3>
                <p className="text-3xl font-bold text-slate-800">{formatCurrency(summary.remaining)}</p>
                <p className="text-sm text-blue-600 mt-2">{(100 - summary.utilization_percentage).toFixed(1)}% available</p>
              </div>
            </div>

            {/* District Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">District-wise Budget Distribution</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summary.district_breakdown.map((district) => (
                  <div key={district.district} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-5 w-5 text-primary-600" />
                      <h3 className="font-semibold text-slate-800">{district.district}</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Schools:</span>
                        <span className="font-medium">{district.schools}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Allocated:</span>
                        <span className="font-medium text-green-600">{formatCurrency(district.allocated)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Utilized:</span>
                        <span className="font-medium text-orange-600">{formatCurrency(district.utilized)}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Utilization</span>
                          <span>{district.allocated > 0 ? ((district.utilized / district.allocated) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <div className="mt-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                            style={{ width: `${district.allocated > 0 ? Math.min((district.utilized / district.allocated) * 100, 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Budgets Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">School Budget Allocations</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : budgets.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No budget allocations found. Create your first allocation.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">School</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">FY</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Allocated</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Utilized</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Remaining</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Utilization %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {budgets.map((budget) => {
                    const remaining = budget.allocated_amount - budget.utilized_amount;
                    const utilizationPct = (budget.utilized_amount / budget.allocated_amount) * 100;
                    
                    return (
                      <tr key={budget.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{getSchoolName(budget.school_id)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{budget.financial_year}</td>
                        <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">
                          {formatCurrency(budget.allocated_amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-orange-600 font-medium">
                          {formatCurrency(budget.utilized_amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-blue-600 font-medium">
                          {formatCurrency(remaining)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm font-medium">{utilizationPct.toFixed(1)}%</span>
                            <div className="w-16 bg-slate-100 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                                style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">Allocate Budget</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">School</label>
                <select
                  value={form.school_id}
                  onChange={(e) => setForm({ ...form, school_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  required
                >
                  <option value="">Select School</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.school_name} - {school.district}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Financial Year</label>
                <select
                  value={form.financial_year}
                  onChange={(e) => setForm({ ...form, financial_year: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  required
                >
                  <option value="2026-27">2026-27</option>
                  <option value="2027-28">2027-28</option>
                  <option value="2028-29">2028-29</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Budget Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  value={form.allocated_amount}
                  onChange={(e) => setForm({ ...form, allocated_amount: e.target.value })}
                  placeholder="Enter amount in rupees"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
                >
                  Allocate Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
