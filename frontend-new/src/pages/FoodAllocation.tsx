import Layout from '../components/Layout';
import { Wheat, TrendingUp, Package, Calendar } from 'lucide-react';

export default function FoodAllocation() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Food Allocation</h1>
            <p className="mt-1 text-slate-500">Manage state-wide food distribution to schools</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-2.5 font-semibold text-white shadow-md transition-colors hover:from-primary-700 hover:to-primary-800">
            <Package className="h-4 w-4" />
            New Allocation
          </button>
        </div>

        {/* Coming Soon Message */}
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600">
            <Wheat className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Food Allocation Module</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            This feature is under development. You'll be able to allocate rice, dal, oil, vegetables, and other food items to schools across Karnataka.
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
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total Allocation This Month</h3>
            <p className="text-3xl font-bold text-slate-800">50,000 kg</p>
            <p className="text-sm text-green-600 mt-2">↑ 12% from last month</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Schools Covered</h3>
            <p className="text-3xl font-bold text-slate-800">5 Schools</p>
            <p className="text-sm text-slate-500 mt-2">Across Karnataka</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Pending Requests</h3>
            <p className="text-3xl font-bold text-slate-800">0</p>
            <p className="text-sm text-slate-500 mt-2">All requests processed</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
