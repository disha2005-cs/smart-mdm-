import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { School as SchoolIcon, Plus, Search, MapPin, Phone, Mail, X, CreditCard as Edit, Users } from 'lucide-react';
import { schoolsAPI, studentsAPI } from '../lib/api';

interface School {
  id: number;
  school_id: string;
  school_name: string;
  district: string;
  block: string;
  address: string;
  principal_name: string;
  contact_number: string;
  email: string;
  total_students: number;
  is_active: boolean;
}

const emptyForm = {
  school_id: '',
  school_name: '',
  district: '',
  block: '',
  address: '',
  principal_name: '',
  contact_number: '',
  email: '',
  total_students: 0,
};

const Schools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [filtered, setFiltered] = useState<School[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
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
          s.school_id.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q)
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this school and all its data?')) return;
    try {
      await schoolsAPI.delete(Number(id));
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
    </Layout>
  );
};

export default Schools;
