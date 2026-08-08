import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { School as SchoolIcon, Plus, Search, MapPin, Phone, Mail, X, CreditCard as Edit, Users, UserPlus, Copy, CheckCircle, RefreshCw } from 'lucide-react';
import { schoolsAPI, studentsAPI, usersAPI } from '../lib/api';

interface School {
  id: number;
  udise_code: string;
  school_name: string;
  district: string;
  taluk: string;
  village: string;
  address: string | null;
  pin_code: string | null;
  principal_name: string | null;
  principal_phone: string | null;
  email: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  has_admin: boolean;
  admin_name: string | null;
  admin_employee_id: string | null;
}

const emptyForm = {
  udise_code: '',
  school_name: '',
  district: '',
  taluk: '',
  village: '',
  address: '',
  pin_code: '',
  principal_name: '',
  principal_phone: '',
  email: '',
  phone: '',
  status: 'Active',
};

const emptyAdminForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  school_id: 0,
};

const Schools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [filtered, setFiltered] = useState<School[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [editing, setEditing] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState({ employee_id: '', password: '' });
  const [copied, setCopied] = useState(false);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      schools.filter(
        (s) =>
          s.school_name.toLowerCase().includes(q) ||
          s.udise_code.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          (s.village && s.village.toLowerCase().includes(q))
      )
    );
  }, [search, schools]);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const response = await schoolsAPI.getAll();
      const schoolData = response.data ?? [];
      setSchools(schoolData);
      setFiltered(schoolData);
      
      // Fetch student counts
      try {
        const studentsRes = await studentsAPI.getAll();
        const students = studentsRes.data ?? [];
        const counts: Record<string, number> = {};
        students.forEach((s: any) => {
          counts[s.school_id] = (counts[s.school_id] ?? 0) + 1;
        });
        setStudentCounts(counts);
      } catch (err) {
        console.error('Error fetching student counts:', err);
      }
      
      setError('');
    } catch (err: any) {
      console.error('Error fetching schools:', err);
      setError(err.response?.data?.detail || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editing) {
        await schoolsAPI.update(editing.id, form);
      } else {
        await schoolsAPI.create(form);
      }
      await fetchSchools();
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving school:', err);
      setError(err.response?.data?.detail || 'Failed to save school');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (school: School) => {
    setEditing(school);
    setForm({
      udise_code: school.udise_code,
      school_name: school.school_name,
      district: school.district,
      taluk: school.taluk,
      village: school.village,
      address: school.address ?? '',
      pin_code: school.pin_code ?? '',
      principal_name: school.principal_name ?? '',
      principal_phone: school.principal_phone ?? '',
      email: school.email ?? '',
      phone: school.phone ?? '',
      status: school.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this school and all its data?')) return;
    try {
      await schoolsAPI.delete(id);
      await fetchSchools();
    } catch (err: any) {
      console.error('Error deleting school:', err);
      alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setError('');
  };

  const handleAddAdmin = (school: School) => {
    setEditingAdminId(null);
    setSelectedSchool(school);
    setAdminForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      school_id: school.id,
    });
    setError('');
    setShowAdminModal(true);
  };

  const handleEditAdmin = async (school: School) => {
    try {
      // Fetch the admin details
      const response = await usersAPI.getAll();
      const admin = response.data.find((u: any) => u.school_id === school.id && u.role === 'SCHOOL');
      
      if (admin) {
        setEditingAdminId(admin.id);
        setSelectedSchool(school);
        setAdminForm({
          first_name: admin.first_name,
          last_name: admin.last_name,
          email: admin.email,
          phone: admin.phone || '',
          password: '', // Empty for security - user can change if needed
          school_id: school.id,
        });
        setError('');
        setShowAdminModal(true);
      }
    } catch (err: any) {
      console.error('Error fetching admin:', err);
      setError('Failed to load admin details');
    }
  };

  const handleGeneratePassword = async () => {
    try {
      const response = await usersAPI.generatePassword();
      setAdminForm({ ...adminForm, password: response.data.password });
    } catch (err) {
      console.error('Error generating password:', err);
    }
  };

  const handleSubmitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingAdminId) {
        // Update existing admin
        const updateData: any = {
          first_name: adminForm.first_name,
          last_name: adminForm.last_name,
          email: adminForm.email,
          phone: adminForm.phone,
        };
        
        // Only include password if it's not empty (user wants to change it)
        if (adminForm.password) {
          updateData.password = adminForm.password;
        }
        
        await usersAPI.update(editingAdminId, updateData);
        setShowAdminModal(false);
        setEditingAdminId(null);
        await fetchSchools();
        // Show success message (optional)
      } else {
        // Create new admin
        const response = await usersAPI.create(adminForm);
        setCreatedCredentials({
          employee_id: response.data.employee_id,
          password: response.data.password,
        });
        setShowAdminModal(false);
        setShowCredentialsModal(true);
        await fetchSchools();
      }
    } catch (err: any) {
      console.error('Error saving admin:', err);
      setError(err.response?.data?.detail || 'Failed to save admin');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCredentials = () => {
    const text = `Employee ID: ${createdCredentials.employee_id}\nPassword: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = {
    total: schools.length,
    active: schools.filter((s) => s.status === 'Active').length,
    students: schools.reduce((sum, s) => sum + (studentCounts[s.id] ?? 0), 0),
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <SchoolIcon className="w-8 h-8 text-primary-600" />
              Schools
            </h1>
            <p className="text-slate-500 mt-1">Manage schools and monitor meal programs</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all"
          >
            <Plus className="w-5 h-5" />
            Add School
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Schools', value: stats.total, color: 'from-primary-500 to-primary-700', icon: SchoolIcon },
            { label: 'Active Programs', value: stats.active, color: 'from-success-500 to-success-700', icon: SchoolIcon },
            { label: 'Total Students', value: stats.students, color: 'from-primary-400 to-primary-600', icon: Users },
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

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, UDISE code, or district..."
              className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((school) => (
              <div key={school.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
                      <SchoolIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">{school.school_name}</h3>
                      <p className="text-xs text-slate-400">{school.udise_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(school)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(school.id)} className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{school.address ?? `${school.village}, ${school.taluk}`}, {school.district} - {school.pin_code ?? ''}</span>
                  </div>
                  {school.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{school.phone}</span>
                    </div>
                  )}
                  {school.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 truncate">{school.email}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Students</p>
                    <p className="text-lg font-bold text-slate-800">{studentCounts[school.id] ?? 0}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${school.status === 'Active' ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-600'}`}>
                    {school.status}
                  </span>
                </div>

                {/* Admin Status */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {school.has_admin ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-success-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Administrator</p>
                            <p className="text-sm font-semibold text-slate-800">{school.admin_name}</p>
                            <p className="text-xs text-slate-500">{school.admin_employee_id}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditAdmin(school)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Admin
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddAdmin(school)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg font-semibold transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Admin
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <SchoolIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No schools found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? 'Edit School' : 'Add New School'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">UDISE Code</label>
                  <input type="text" value={form.udise_code} onChange={(e) => setForm({ ...form, udise_code: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">School Name</label>
                <input type="text" value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" required />
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">District</label>
                  <input type="text" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Taluk</label>
                  <input type="text" value={form.taluk} onChange={(e) => setForm({ ...form, taluk: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Village</label>
                  <input type="text" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                  <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pin Code</label>
                  <input type="text" value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Principal Name</label>
                  <input type="text" value={form.principal_name} onChange={(e) => setForm({ ...form, principal_name: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Principal Phone</label>
                  <input type="text" value={form.principal_phone} onChange={(e) => setForm({ ...form, principal_phone: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors" />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update School' : 'Add School'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-8 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAdminModal && selectedSchool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {editingAdminId ? 'Edit School Administrator' : 'Add School Administrator'}
              </h2>
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setSelectedSchool(null);
                  setEditingAdminId(null);
                  setError('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* School Info (Read-Only) */}
            <div className="px-6 pt-4">
              <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white flex-shrink-0">
                    <SchoolIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{selectedSchool.school_name}</p>
                    <p className="text-sm text-slate-600">{selectedSchool.district}</p>
                    <p className="text-xs text-slate-500">UDISE: {selectedSchool.udise_code}</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitAdmin} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={adminForm.first_name}
                    onChange={(e) => setAdminForm({ ...adminForm, first_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={adminForm.last_name}
                    onChange={(e) => setAdminForm({ ...adminForm, last_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={adminForm.phone}
                  onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="+91-9876543210"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                    required={!editingAdminId}
                    placeholder={editingAdminId ? 'Leave blank to keep current password' : ''}
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    title="Generate Password"
                  >
                    <RefreshCw className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {editingAdminId 
                    ? 'Leave blank to keep current password, or enter new password to change it' 
                    : 'Employee ID will be auto-generated'}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  {saving 
                    ? (editingAdminId ? 'Updating...' : 'Creating...') 
                    : (editingAdminId ? 'Update Administrator' : 'Create Administrator')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminModal(false);
                    setSelectedSchool(null);
                    setEditingAdminId(null);
                    setError('');
                  }}
                  className="px-6 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="bg-gradient-to-r from-success-500 to-success-600 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Administrator Created!</h2>
                  <p className="text-sm text-success-100">Credentials generated successfully</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-600">Share these credentials with the school administrator:</p>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Employee ID</p>
                  <p className="text-lg font-mono font-bold text-slate-800">{createdCredentials.employee_id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Password</p>
                  <p className="text-lg font-mono font-bold text-slate-800">{createdCredentials.password}</p>
                </div>
              </div>

              <button
                onClick={handleCopyCredentials}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Credentials
                  </>
                )}
              </button>

              <div className="bg-warning-50 border border-warning-200 rounded-xl p-3">
                <p className="text-xs text-warning-800">
                  ⚠️ <strong>Important:</strong> Password is shown only once for security reasons. Make sure to copy and share it with the administrator.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCreatedCredentials({ employee_id: '', password: '' });
                }}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Schools;
