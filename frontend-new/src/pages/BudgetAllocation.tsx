import Layout from '../components/Layout';
import { IndianRupee, TrendingUp, PieChart, Calendar } from 'lucide-react';

export default function BudgetAllocation() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Budget Allocation</h1>
            <p className="mt-1 text-slate-500">Manage financial resources for PM POSHAN program</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-2.5 font-semibold text-white shadow-md transition-colors hover:from-primary-700 hover:to-primary-800">
            <IndianRupee className="h-4 w-4" />
            Allocate Budget
          </button>
        </div>

        {/* Coming Soon Message */}
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600">
            <IndianRupee className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Budget Allocation Module</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            This feature is under development. You'll be able to allocate and track budget for food, infrastructure, and operational expenses.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Coming Soon</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>In Development</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total Budget (FY 2026-27)</h3>
            <p className="text-3xl font-bold text-slate-800">₹50,00,000</p>
            <p className="text-sm text-green-600 mt-2">Allocated this year</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Utilized</h3>
            <p className="text-3xl font-bold text-slate-800">₹30,00,000</p>
            <p className="text-sm text-slate-500 mt-2">60% of total budget</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Remaining</h3>
            <p className="text-3xl font-bold text-slate-800">₹20,00,000</p>
            <p className="text-sm text-blue-600 mt-2">40% available</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
