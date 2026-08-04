import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Package, Plus, TriangleAlert as AlertTriangle, TrendingDown, TrendingUp, X, CreditCard as Edit } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { inventoryAPI } from '../lib/api';
import { useSchool } from '../hooks/useSchool';

interface InventoryItem {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  threshold: number;
  supplier?: string;
  cost_per_unit?: number;
  school_id: number;
}

const emptyForm = {
  item_name: '',
  category: 'Grains',
  quantity: '',
  unit: 'kg',
  threshold: '',
  supplier: '',
  cost_per_unit: '',
};

const categories = ['All', 'Grains', 'Pulses', 'Oil', 'Vegetables', 'Spices', 'Other'];

const Inventory = () => {
  const { schoolId } = useSchool();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!schoolId) return;
    fetchItems();
  }, [schoolId]);

  useEffect(() => {
    setFiltered(selectedCategory === 'All' ? items : items.filter((i) => i.category === selectedCategory));
  }, [selectedCategory, items]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await inventoryAPI.getAll();
      const itemsData = response.data ?? [];
      setItems(itemsData);
      setFiltered(itemsData);
      setError('');
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      setError(err.response?.data?.detail || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    setError('');

    try {
      const payload = {
        item_name: form.item_name,
        category: form.category,
        quantity: parseFloat(form.quantity) || 0,
        unit: form.unit,
        threshold: parseFloat(form.threshold) || 0,
        supplier: form.supplier || null,
        cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
        school_id: schoolId,
      };

      if (editing) {
        await inventoryAPI.update(editing.id, payload);
      } else {
        await inventoryAPI.create(payload);
      }

      await fetchItems();
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving inventory item:', err);
      setError(err.response?.data?.detail || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity.toString(),
      unit: item.unit,
      threshold: item.threshold.toString(),
      supplier: item.supplier ?? '',
      cost_per_unit: item.cost_per_unit?.toString() ?? '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inventory item?')) return;
    try {
      await inventoryAPI.delete(Number(id));
      await fetchItems();
    } catch (err: any) {
      console.error('Error deleting inventory item:', err);
      alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setError('');
  };

  const getStatus = (item: InventoryItem) => {
    const ratio = item.quantity / (item.threshold || 1);
    if (ratio <= 0.5) return { label: 'Critical', color: 'bg-danger-100 text-danger-700', bar: 'bg-danger-500' };
    if (ratio <= 1) return { label: 'Low', color: 'bg-warning-100 text-warning-700', bar: 'bg-warning-500' };
    if (ratio <= 2) return { label: 'Moderate', color: 'bg-primary-100 text-primary-700', bar: 'bg-primary-500' };
    return { label: 'Good', color: 'bg-success-100 text-success-700', bar: 'bg-success-500' };
  };

  const stats = {
    total: items.length,
    critical: items.filter((i) => i.quantity / (i.threshold || 1) <= 0.5).length,
    low: items.filter((i) => {
      const r = i.quantity / (i.threshold || 1);
      return r > 0.5 && r <= 1;
    }).length,
    good: items.filter((i) => i.quantity / (i.threshold || 1) > 1).length,
  };

  // Chart data from items
  const chartData = items.slice(0, 6).map((i) => ({
    name: i.item_name,
    stock: i.quantity,
    threshold: i.threshold,
  }));

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Package className="w-8 h-8 text-primary-600" />
              Inventory
            </h1>
            <p className="text-slate-500 mt-1">Track kitchen stock and manage supplies</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Items', value: stats.total, color: 'from-primary-500 to-primary-700', icon: Package },
            { label: 'Critical', value: stats.critical, color: 'from-danger-500 to-danger-700', icon: AlertTriangle },
            { label: 'Low Stock', value: stats.low, color: 'from-warning-500 to-warning-700', icon: TrendingDown },
            { label: 'Good Stock', value: stats.good, color: 'from-success-500 to-success-700', icon: TrendingUp },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Stock vs Threshold</h3>
            <p className="text-sm text-slate-400 mb-4">Current stock levels across items</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Line type="monotone" dataKey="stock" stroke="#2563eb" strokeWidth={2} name="Stock" />
                <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Threshold" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all text-sm ${
                  selectedCategory === cat
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => {
              const status = getStatus(item);
              const pct = Math.min((item.quantity / (item.threshold * 2 || 1)) * 100, 100);
              return (
                <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{item.item_name}</h3>
                        <p className="text-xs text-slate-400">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Current Stock</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-slate-800">{item.quantity}</span>
                      <span className="text-sm text-slate-400">/ {item.threshold} {item.unit}</span>
                    </div>
                    <div className="mt-2 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${status.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Supplier</span>
                      <span className="font-medium text-slate-700">{item.supplier ?? 'N/A'}</span>
                    </div>
                    {item.cost_per_unit != null && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cost/Unit</span>
                        <span className="font-medium text-slate-700">&#8377;{item.cost_per_unit}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No inventory items found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Item Name</label>
                  <input
                    type="text"
                    value={form.item_name}
                    onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Threshold</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.threshold}
                    onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  >
                    <option>kg</option>
                    <option>litres</option>
                    <option>g</option>
                    <option>units</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Supplier</label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Cost per Unit (&#8377;)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cost_per_unit}
                    onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editing ? 'Update Item' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-8 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Inventory;
