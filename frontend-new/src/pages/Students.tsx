import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  Users,
  Plus,
  Search,
  CreditCard as Edit,
  Trash2,
  X,
  Camera,
  Filter,
  UserRound,
} from 'lucide-react';
import { studentsAPI } from '../lib/api';
import { useSchool } from '../hooks/useSchool';

interface Student {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  grade?: string;
  section?: string;
  parent_name?: string;
  parent_phone?: string;
  has_allergies: boolean;
  dietary_preferences?: string;
  school_id: number;
  is_active: boolean;
}

const emptyForm = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'Male',
  grade: '1',
  section: 'A',
  parent_name: '',
  parent_phone: '',
  has_allergies: false,
  photo: null as File | null,
};

// Deterministic avatar tint per student so rows feel distinct but stay on-brand.
const avatarTints = [
  'from-primary-400 to-primary-600',
  'from-success-400 to-success-600',
  'from-warning-400 to-warning-600',
  'from-violet-400 to-violet-600',
  'from-rose-400 to-rose-600',
  'from-cyan-400 to-cyan-600',
];
const tintFor = (id: string | number) => {
  const idStr = String(id);
  let sum = 0;
  for (let i = 0; i < idStr.length; i++) sum += idStr.charCodeAt(i);
  return avatarTints[sum % avatarTints.length];
};

const Students = () => {
  const { schoolId, loading: schoolLoading } = useSchool();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (schoolLoading) return;
    if (!schoolId) {
      setLoading(false);
      return;
    }
    fetchStudents();
  }, [schoolId, schoolLoading]);

  // Auto-open modal when action=add parameter is present
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      resetForm();
      setShowModal(true);
      // Clear the action parameter from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  // Keep the search box in sync when the global top-bar search routes here.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentsAPI.getAll();
      setStudents(response.data ?? []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err.response?.data?.detail || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const grades = useMemo(() => {
    const set = new Set(students.map((s) => s.grade).filter(Boolean) as string[]);
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        (s.grade ?? '').toLowerCase().includes(q);
      const matchesGrade = gradeFilter === 'all' || s.grade === gradeFilter;
      const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
      return matchesSearch && matchesGrade && matchesGender;
    });
  }, [students, search, gradeFilter, genderFilter]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value) setSearchParams({ q: value }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        date_of_birth: form.date_of_birth || null,
        school_id: schoolId,
      };

      if (editing) {
        await studentsAPI.update(editing.id, payload);
      } else {
        const studentId = `STU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await studentsAPI.create({ ...payload, student_id: studentId });
      }

      await fetchStudents();
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving student:', err);
      setError(err.response?.data?.detail || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditing(student);
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: student.date_of_birth ?? '',
      gender: student.gender ?? 'Male',
      grade: student.grade ?? '1',
      section: student.section ?? 'A',
      parent_name: student.parent_name ?? '',
      parent_phone: student.parent_phone ?? '',
      has_allergies: student.has_allergies,
      photo: null,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await studentsAPI.delete(id);
      await fetchStudents();
    } catch (err: any) {
      console.error('Error deleting student:', err);
      alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setError('');
    setPhotoPreview(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, photo: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const stats = {
    total: filtered.length,
    male: filtered.filter((s) => s.gender === 'Male').length,
    female: filtered.filter((s) => s.gender === 'Female').length,
    allergies: filtered.filter((s) => s.has_allergies).length,
  };

  const hasActiveFilters = gradeFilter !== 'all' || genderFilter !== 'all' || search !== '';

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-800">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
                <Users className="h-6 w-6" />
              </span>
              Students
            </h1>
            <p className="mt-1 text-slate-500">Manage student registrations and records</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3 font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:from-primary-700 hover:to-primary-800"
          >
            <Plus className="h-5 w-5" />
            Add Student
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Students', value: stats.total, color: 'from-primary-500 to-primary-700', icon: Users },
            { label: 'Male', value: stats.male, color: 'from-primary-400 to-primary-600', icon: UserRound },
            { label: 'Female', value: stats.female, color: 'from-success-400 to-success-600', icon: UserRound },
            { label: 'With Allergies', value: stats.allergies, color: 'from-warning-400 to-warning-600', icon: Camera },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Search + Filters */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, student ID, or grade..."
                className="w-full rounded-xl border-2 border-slate-200 py-3 pl-12 pr-4 transition-colors focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors focus:border-primary-500 focus:outline-none"
                aria-label="Filter by grade"
              >
                <option value="all">All Grades</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors focus:border-primary-500 focus:outline-none"
                aria-label="Filter by gender"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setGradeFilter('all');
                    setGenderFilter('all');
                    handleSearchChange('');
                  }}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Student ID', 'Name', 'Gender', 'Grade', 'Parent Contact', 'Allergies', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 rounded bg-slate-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-200" />
                          <div className="h-4 w-32 rounded bg-slate-200" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-14 rounded bg-slate-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-16 rounded-full bg-slate-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 rounded bg-slate-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-10 rounded-full bg-slate-200" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map((student) => (
                    <tr key={student.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{student.student_id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${tintFor(
                              student.id
                            )} text-sm font-semibold text-white`}
                          >
                            {student.first_name.charAt(0)}
                            {student.last_name.charAt(0)}
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-slate-800">
                              {student.first_name} {student.last_name}
                            </span>
                            <span className="text-xs text-slate-400">Section {student.section ?? '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.gender}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                          Grade {student.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.parent_phone ?? '-'}</td>
                      <td className="px-6 py-4">
                        {student.has_allergies ? (
                          <span className="rounded-full bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-600">
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(student)}
                            aria-label={`Edit ${student.first_name}`}
                            className="rounded-lg p-2 text-primary-600 transition-colors hover:bg-primary-50"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            aria-label={`Delete ${student.first_name}`}
                            className="rounded-lg p-2 text-danger-600 transition-colors hover:bg-danger-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="flex flex-col items-center gap-3 py-16 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                          <Users className="h-7 w-7 text-slate-300" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-600">No students found</p>
                          <p className="text-sm text-slate-400">
                            {hasActiveFilters
                              ? 'Try adjusting your search or filters'
                              : 'Add your first student to get started'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="animate-scale-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Photo Upload */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                <div className="text-center">
                  {photoPreview ? (
                    <div className="relative">
                      <img 
                        src={photoPreview} 
                        alt="Student preview" 
                        className="w-32 h-32 rounded-full object-cover mx-auto mb-3 border-4 border-white shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setForm({ ...form, photo: null });
                        }}
                        className="absolute top-0 right-1/2 translate-x-16 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-slate-200 mx-auto mb-3 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <span className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                      Upload Student Photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-1">Required for face recognition attendance</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">First Name</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Last Name</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Date of Birth</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Grade</label>
                  <select
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  >
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Section</label>
                  <select
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  >
                    {['A', 'B', 'C', 'D'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Name</label>
                  <input
                    type="text"
                    value={form.parent_name}
                    onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Phone</label>
                  <input
                    type="tel"
                    value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allergies"
                      checked={form.has_allergies}
                      onChange={(e) => setForm({ ...form, has_allergies: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="allergies" className="cursor-pointer text-sm font-medium text-slate-700">
                      Has food allergies
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 font-semibold text-white transition-all hover:from-primary-700 hover:to-primary-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editing ? 'Update Student' : 'Add Student'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="rounded-xl border-2 border-slate-200 px-8 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
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

export default Students;
