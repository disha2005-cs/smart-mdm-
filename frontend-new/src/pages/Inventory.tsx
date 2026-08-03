import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Package, Plus, AlertTriangle, TrendingDown, TrendingUp, Cpu, X, Edit } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';

interface InventoryItem {
  id: number;
  item_name: string;
  category: string;
  current_stock: number;
  threshold_level: number;
  unit: string;
  last_updated: string;
  supplier?: string;
  cost_per_unit?: number;
  status: 'Critical' | 'Low' | 'Moderate' | 'Good';
  iot_sensor_id?: string;
}

const Inventory = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    item_name: '',
    category: 'Grains',
    current_stock: '',
    threshold_level: '',
    unit: 'kg',
    supplier: '',
    cost_per_unit: '',
    iot_sensor_id: ''
  });

  const [stockTrend] = useState([
    { date: 'Week 1', rice: 2500, wheat: 1800, dal: 800, oil: 450 },
    { date: 'Week 2', rice: 2200, wheat: 1600, dal: 650, oil: 380 },
    { date: 'Week 3', rice: 1800, wheat: 1350, dal: 450, oil: 280 },
    { date: 'Week 4', rice: 1250, wheat: 850, dal: 230, oil: 120 },
  ]);

  const categories = ['All', 'Grains', 'Pulses', 'Oil', 'Vegetables', 'Spices', 'Other'];

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/v1/inventory/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventoryItems(response.data);
    } catch (error) {
      console.log('Using demo inventory data');
      const demoInventory: InventoryItem[] = [
        { id: 1, item_name: 'Rice', category: 'Grains', current_stock: 1250, threshold_level: 2000, unit: 'kg', last_updated: '2 hours ago', supplier: 'Karnataka Food Supplies', cost_per_unit: 45, status: 'Low', iot_sensor_id: 'IOT-001' },
        { id: 2, item_name: 'Wheat', category: 'Grains', current_stock: 850, threshold_level: 1500, unit: 'kg', last_updated: '2 hours ago', supplier: 'Karnataka Food Supplies', cost_per_unit: 40, status: 'Moderate', iot_sensor_id: 'IOT-002' },
        { id: 3, item_name: 'Toor Dal', category: 'Pulses', current_stock: 230, threshold_level: 500, unit: 'kg', last_updated: '1 hour ago', supplier: 'Mysuru Dal Mill', cost_per_unit: 120, status: 'Critical', iot_sensor_id: 'IOT-003' },
        { id: 4, item_name: 'Moong Dal', category: 'Pulses', current_stock: 180, threshold_level: 400, unit: 'kg', last_updated: '1 hour ago', supplier: 'Mysuru Dal Mill', cost_per_unit: 110, status: 'Critical', iot_sensor_id: 'IOT-004' },
        { id: 5, item_name: 'Sunflower Oil', category: 'Oil', current_stock: 120, threshold_level: 300, unit: 'L', last_updated: '3 hours ago', supplier: 'Karnataka Oils Ltd', cost_per_unit: 180, status: 'Critical', iot_sensor_id: 'IOT-005' },
        { id: 6, item_name: 'Mustard Oil', category: 'Oil', current_stock: 85, threshold_level: 200, unit: 'L', last_updated: '3 hours ago', supplier: 'Karnataka Oils Ltd', cost_per_unit: 200, status: 'Critical', iot_sensor_id: 'IOT-006' },
        { id: 7, item_name: 'Potatoes', category: 'Vegetables', current_stock: 450, threshold_level: 300, unit: 'kg', last_updated: '30 mins ago', supplier: 'Local Farmers Cooperative', cost_per_unit: 25, status: 'Good', iot_sensor_id: 'IOT-007' },
        { id: 8, item_name: 'Onions', category: 'Vegetables', current_stock: 380, threshold_level: 250, unit: 'kg', last_updated: '30 mins ago', supplier: 'Local Farmers Cooperative', cost_per_unit: 30, status: 'Good', iot_sensor_id: 'IOT-008' },
        { id: 9, item_name: 'Turmeric Powder', category: 'Spices', current_stock: 45, threshold_level: 50, unit: 'kg', last_updated: '5 hours ago', supplier: 'Mysuru Spices', cost_per_unit: 350, status: 'Low', iot_sensor_id: 'IOT-009' },
        { id: 10, item_name: 'Salt', category: 'Other', current_stock: 650, threshold_level: 400, unit: 'kg', last_updated: '4 hours ago', supplier: 'Karnataka Salt Works', cost_per_unit: 15, status: 'Good', iot_sensor_id: 'IOT-010' },
      ];
      setInventoryItems(demoInventory);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const data = {
        ...formData,
        current_stock: parseFloat(formData.current_stock),
        threshold_level: parseFloat(formData.threshold_level),
        cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : undefined
      };

      if (editingItem) {
        await axios.put(
          `http://localhost:8000/api/v1/inventory/${editingItem.id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          'http://localhost:8000/api/v1/inventory/',
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      fetchInventory();
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving inventory:', error);
      alert('Error saving inventory item. Demo mode active.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category,
      current_stock: item.current_stock.toString(),
      threshold_level: item.threshold_level.toString(),
      unit: item.unit,
      supplier: item.supplier || '',
      cost_per_unit: item.cost_per_unit?.toString() || '',
      iot_sensor_id: item.iot_sensor_id || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      category: 'Grains',
      current_stock: '',
      threshold_level: '',
      unit: 'kg',
      supplier: '',
      cost_per_unit: '',
      iot_sensor_id: ''
    });
    setEditingItem(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Critical': return 'bg-red-100 text-red-700';
      case 'Low': return 'bg-orange-100 text-orange-700';
      case 'Moderate': return 'bg-yellow-100 text-yellow-700';
      case 'Good': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStockPercentage = (item: InventoryItem) => {
    return (item.current_stock / item.threshold_level) * 100;
  };

  const filteredItems = selectedCategory === 'All' 
    ? inventoryItems 
    : inventoryItems.filter(item => item.category === selectedCategory);

  const stats = {
    total: inventoryItems.length,
    critical: inventoryItems.filter(i => i.status === 'Critical').length,
    low: inventoryItems.filter(i => i.status === 'Low').length,
    good: inventoryItems.filter(i => i.status === 'Good').length
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              Inventory Management
            </h1>
            <p className="text-gray-600 mt-1">IoT-powered stock tracking and alerts</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Items', value: stats.total, color: 'from-blue-500 to-blue-600', icon: <Package /> },
            { label: 'Critical Stock', value: stats.critical, color: 'from-red-500 to-red-600', icon: <AlertTriangle /> },
            { label: 'Low Stock', value: stats.low, color: 'from-orange-500 to-orange-600', icon: <TrendingDown /> },
            { label: 'Good Stock', value: stats.good, color: 'from-green-500 to-green-600', icon: <TrendingUp /> },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-md">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-4`}>
                {stat.icon}
              </div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-3 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Stock Trend Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Stock Consumption Trend</h3>
              <p className="text-sm text-gray-500">Last 4 weeks</p>
            </div>
            <select className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <option>Last 4 Weeks</option>
              <option>Last 3 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stockTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="rice" stroke="#3B82F6" strokeWidth={2} name="Rice (kg)" />
              <Line type="monotone" dataKey="wheat" stroke="#10B981" strokeWidth={2} name="Wheat (kg)" />
              <Line type="monotone" dataKey="dal" stroke="#F59E0B" strokeWidth={2} name="Dal (kg)" />
              <Line type="monotone" dataKey="oil" stroke="#EF4444" strokeWidth={2} name="Oil (L)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const percentage = getStockPercentage(item);
            return (
              <div key={item.id} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{item.item_name}</h3>
                      <p className="text-sm text-gray-500">{item.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Current Stock</span>
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-800">{item.current_stock}</span>
                      <span className="text-sm text-gray-500">/ {item.threshold_level} {item.unit}</span>
                    </div>
                    <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage < 50 ? 'bg-red-500' :
                          percentage < 75 ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {item.iot_sensor_id && (
                    <div className="flex items-center gap-2 text-sm">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-600">IoT: {item.iot_sensor_id}</span>
                      <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Supplier:</span>
                      <span className="font-medium text-gray-800">{item.supplier || 'N/A'}</span>
                    </div>
                    {item.cost_per_unit && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cost/Unit:</span>
                        <span className="font-medium text-gray-800">₹{item.cost_per_unit}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Updated:</span>
                      <span className="font-medium text-gray-800">{item.last_updated}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No inventory items found in this category</p>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingItem ? 'Edit Inventory Item' : 'Add New Item'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                    <input
                      type="text"
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="e.g., Rice"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option>Grains</option>
                      <option>Pulses</option>
                      <option>Oil</option>
                      <option>Vegetables</option>
                      <option>Spices</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Current Stock</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="1250"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Threshold</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.threshold_level}
                      onChange={(e) => setFormData({ ...formData, threshold_level: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="2000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option>kg</option>
                      <option>L</option>
                      <option>g</option>
                      <option>units</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Supplier name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per Unit (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_per_unit}
                      onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="45.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">IoT Sensor ID</label>
                  <input
                    type="text"
                    value={formData.iot_sensor_id}
                    onChange={(e) => setFormData({ ...formData, iot_sensor_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="IOT-001"
                  />
                  <p className="text-sm text-gray-500 mt-2">Link to IoT weight sensor for automatic tracking</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="px-8 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* IoT Status */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Cpu className="w-6 h-6" />
            IoT Sensor Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {inventoryItems.filter(i => i.iot_sensor_id).slice(0, 5).map((item) => (
              <div key={item.id} className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{item.iot_sensor_id}</p>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                </div>
                <p className="text-sm text-purple-100">{item.item_name}</p>
                <p className="text-xs text-purple-200 mt-1">Live tracking</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Inventory;
