import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Package, Wheat, Calendar, TrendingUp, Plus, Check, X, Clock } from 'lucide-react';
import { allocationsAPI, schoolsAPI } from '../lib/api';

interface School {
  id: number;
  school_name: string;
  district: string;
}

interface Allocation {
  id: number;
  school_id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  allocation_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELIVERED';
  notes?: string;
  created_at: string;
}

export default function FoodAllocation() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    school_id: '',
    item_name: '',
    category: 'Grains',
    quantity: '',
    unit: 'kg',
    notes: ''
  });

  const categories = ['Grains', 'Pulses', 'Oil', 'Vegetables', 'Spices', 'Other'];
  const units = ['kg', 'liters', 'units'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allocRes, schoolsRes, summaryRes] = await Promise.all([
        allocationsAPI.getAll(),
        schoolsAPI.getAll(),
        allocationsAPI.getSummary()
      ]);
      setAllocations(allocRes.data);
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
      await allocationsAPI.create({
        school_id: parseInt(form.school_id),
        item_name: form.item_name,
        category: form.category,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        notes: form.notes || null
      });
      await fetchData();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Error creating allocation:', err);
      alert(err.response?.data?.detail || 'Failed to create allocation');
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this allocation and add to school inventory?')) return;
    try {
      await allocationsAPI.approve(id);
      await fetchData();
    } catch (err: any) {
      console.error('Error approving allocation:', err);
      alert(err.response?.data?.detail || 'Failed to approve allocation');
    }
  };

  const resetForm = () => {
    setForm({
      school_id: '',
      item_name: '',
      category: 'Grains',
      quantity: '',
      unit: 'kg',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      DELIVERED: 'bg-blue-100 text-blue-800'
    };
    const icons = {
      PENDING: Clock,
      APPROVED: Check,
      REJECTED: X,
      DELIVERED: Package
    };
    const Icon = icons[status as keyof typeof icons];
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const getSchoolName = (schoolId: number) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.school_name : `School #${schoolId}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Food Allocation</h1>
            <p className="mt-1 text-slate-500">Manage state-wide food distribution to schools</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-2.5 font-semibold text-white shadow-md transition-colors hover:from-primary-700 hover:to-primary-800"
          >
            <Plus className="h-4 w-4" />
            New Allocation
          </button>
        </div>

        {/* Quick Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-600 mb-2">Total Allocations</h3>
              <p className="text-3xl font-bold text-slate-800">{allocations.length}</p>
              <p className="text-sm text-slate-500 mt-2">
                {summary.status_summary.find((s: any) => s.status === 'APPROVED')?.count || 0} Approved
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-600 mb-2">Schools Covered</h3>
              <p className="text-3xl font-bold text-slate-800">{schools.length}</p>
              <p className="text-sm text-slate-500 mt-2">Across Karnataka</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-600 mb-2">Pending Approvals</h3>
              <p className="text-3xl font-bold text-slate-800">
                {summary.status_summary.find((s: any) => s.status === 'PENDING')?.count || 0}
              </p>
              <p className="text-sm text-orange-600 mt-2">Requires action</p>
            </div>
          </div>
        )}

        {/* Allocations Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Recent Allocations</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : allocations.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No allocations found. Create your first allocation.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">School</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allocations.map((allocation) => (
                    <tr key={allocation.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">{getSchoolName(allocation.school_id)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{allocation.item_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{allocation.category}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{allocation.quantity} {allocation.unit}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(allocation.allocation_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(allocation.status)}</td>
                      <td className="px-6 py-4">
                        {allocation.status === 'PENDING' && (
                          <button
                            onClick={() => handleApprove(allocation.id)}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">New Food Allocation</h2>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">Item Name</label>
                <input
                  type="text"
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  placeholder="e.g., Rice, Dal, Cooking Oil"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  >
                    {units.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="Enter quantity"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
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
                  Allocate Food
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
