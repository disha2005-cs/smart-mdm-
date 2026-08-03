import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { School, Plus, Search, MapPin, Users, Phone, Mail, X, Edit } from 'lucide-react';
import axios from 'axios';

interface SchoolData {
  id: number;
  school_id: string;
  name: string;
  address: string;
  district: string;
  pincode: string;
  contact_number: string;
  email?: string;
  principal_name?: string;
  total_students: number;
  active_students: number;
  attendance_rate?: number;
  meal_program_status: 'Active' | 'Inactive';
}

const Schools = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<SchoolData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    school_id: '',
    name: '',
    address: '',
    district: 'Bangalore',
    pincode: '',
    contact_number: '',
    email: '',
    principal_name: ''
  });

  const districts = ['All', 'Bangalore', 'Mysuru', 'Hassan', 'Mandya', 'Tumkur', 'Belgaum', 'Hubli'];

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    let filtered = schools;
    
    if (selectedDistrict !== 'All') {
      filtered = filtered.filter(school => school.district === selectedDistrict);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(school =>
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.school_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.district.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredSchools(filtered);
  }, [searchQuery, selectedDistrict, schools]);

  const fetchSchools = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/v1/schools/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data);
      setFilteredSchools(response.data);
    } catch (error) {
      console.log('Using demo schools data');
      const demoSchools: SchoolData[] = [
        { 
          id: 1, 
          school_id: 'SCH001', 
          name: 'Government Higher Primary School, Bangalore North', 
          address: 'MG Road, Bangalore North', 
          district: 'Bangalore', 
          pincode: '560001', 
          contact_number: '080-12345678', 
          email: 'ghps.blrnorth@gov.in',
          principal_name: 'Mrs. Sunitha Rao',
          total_students: 523,
          active_students: 512,
          attendance_rate: 97.9,
          meal_program_status: 'Active'
        },
        { 
          id: 2, 
          school_id: 'SCH002', 
          name: 'Government Primary School, Mysuru Central', 
          address: 'Palace Road, Mysuru', 
          district: 'Mysuru', 
          pincode: '570001', 
          contact_number: '0821-2345678', 
          email: 'gps.mysurucentral@gov.in',
          principal_name: 'Mr. Ramesh Kumar',
          total_students: 412,
          active_students: 398,
          attendance_rate: 96.6,
          meal_program_status: 'Active'
        },
        { 
          id: 3, 
          school_id: 'SCH003', 
          name: 'Government School, Hassan District', 
          address: 'Gandhi Nagar, Hassan', 
          district: 'Hassan', 
          pincode: '573201', 
          contact_number: '08172-234567', 
          email: 'gs.hassan@gov.in',
          principal_name: 'Mrs. Lakshmi Devi',
          total_students: 356,
          active_students: 342,
          attendance_rate: 96.1,
          meal_program_status: 'Active'
        },
        { 
          id: 4, 
          school_id: 'SCH004', 
          name: 'Government Higher Primary School, Mandya', 
          address: 'KR Circle, Mandya', 
          district: 'Mandya', 
          pincode: '571401', 
          contact_number: '08232-123456', 
          email: 'ghps.mandya@gov.in',
          principal_name: 'Mr. Suresh Gowda',
          total_students: 289,
          active_students: 276,
          attendance_rate: 95.5,
          meal_program_status: 'Active'
        },
        { 
          id: 5, 
          school_id: 'SCH005', 
          name: 'Government School, Tumkur', 
          address: 'Main Road, Tumkur', 
          district: 'Tumkur', 
          pincode: '572101', 
          contact_number: '0816-234567', 
          email: 'gs.tumkur@gov.in',
          principal_name: 'Mrs. Manjula Reddy',
          total_students: 445,
          active_students: 421,
          attendance_rate: 94.6,
          meal_program_status: 'Active'
        },
      ];
      setSchools(demoSchools);
      setFilteredSchools(demoSchools);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (editingSchool) {
        await axios.put(
          `http://localhost:8000/api/v1/schools/${editingSchool.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          'http://localhost:8000/api/v1/schools/',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      fetchSchools();
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving school:', error);
      alert('Error saving school. Demo mode active.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (school: SchoolData) => {
    setEditingSchool(school);
    setFormData({
      school_id: school.school_id,
      name: school.name,
      address: school.address,
      district: school.district,
      pincode: school.pincode,
      contact_number: school.contact_number,
      email: school.email || '',
      principal_name: school.principal_name || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      school_id: '',
      name: '',
      address: '',
      district: 'Bangalore',
      pincode: '',
      contact_number: '',
      email: '',
      principal_name: ''
    });
    setEditingSchool(null);
  };

  const stats = {
    total: schools.length,
    active: schools.filter(s => s.meal_program_status === 'Active').length,
    totalStudents: schools.reduce((sum, s) => sum + s.total_students, 0),
    avgAttendance: schools.reduce((sum, s) => sum + (s.attendance_rate || 0), 0) / schools.length
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <School className="w-8 h-8 text-blue-600" />
              Schools Management
            </h1>
            <p className="text-gray-600 mt-1">Manage schools and monitor meal programs</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Add School
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Schools', value: stats.total, color: 'from-blue-500 to-blue-600', icon: <School /> },
            { label: 'Active Programs', value: stats.active, color: 'from-green-500 to-green-600', icon: <School /> },
            { label: 'Total Students', value: stats.totalStudents.toLocaleString(), color: 'from-purple-500 to-purple-600', icon: <Users /> },
            { label: 'Avg Attendance', value: `${stats.avgAttendance.toFixed(1)}%`, color: 'from-orange-500 to-orange-600', icon: <Users /> },
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

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by school name, ID, or district..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 overflow-x-auto">
              {districts.map((district) => (
                <button
                  key={district}
                  onClick={() => setSelectedDistrict(district)}
                  className={`px-6 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                    selectedDistrict === district
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {district}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Schools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => (
            <div key={school.id} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                    <School className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 line-clamp-2 mb-1">{school.name}</h3>
                    <p className="text-sm text-gray-500">{school.school_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(school)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">{school.address}, {school.district} - {school.pincode}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{school.contact_number}</span>
                </div>

                {school.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 truncate">{school.email}</span>
                  </div>
                )}

                {school.principal_name && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Principal</p>
                    <p className="text-sm font-medium text-gray-800">{school.principal_name}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Students</p>
                    <p className="text-xl font-bold text-gray-800">{school.total_students}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Active</p>
                    <p className="text-xl font-bold text-green-600">{school.active_students}</p>
                  </div>
                </div>

                {school.attendance_rate && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Attendance Rate</span>
                      <span className="text-sm font-bold text-gray-800">{school.attendance_rate}%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600"
                        style={{ width: `${school.attendance_rate}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                    school.meal_program_status === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {school.meal_program_status} Meal Program
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredSchools.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md">
            <School className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No schools found</p>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingSchool ? 'Edit School' : 'Add New School'}
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">School ID</label>
                    <input
                      type="text"
                      value={formData.school_id}
                      onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="SCH001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">District</label>
                    <select
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      {districts.filter(d => d !== 'All').map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">School Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="Government Higher Primary School"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    rows={3}
                    placeholder="Enter complete address"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="560001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Number</label>
                    <input
                      type="tel"
                      value={formData.contact_number}
                      onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="080-12345678"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="school@gov.in"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Principal Name</label>
                    <input
                      type="text"
                      value={formData.principal_name}
                      onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Principal's name"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingSchool ? 'Update School' : 'Add School'}
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
      </div>
    </Layout>
  );
};

export default Schools;
