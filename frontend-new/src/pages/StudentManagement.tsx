import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Users, ChevronRight, Calendar, CheckCircle, XCircle, ArrowLeft, Plus, X, Camera, Edit, Trash2 } from 'lucide-react';
import { studentsAPI, attendanceAPI } from '../lib/api';
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
  school_id: number;
  is_active: boolean;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  time: string;
}

const emptyForm = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'Male',
  grade: '1',
  parent_name: '',
  parent_phone: '',
  photo: null as File | null,
};

const StudentManagement = () => {
  const navigate = useNavigate();
  const { schoolId, loading: schoolLoading } = useSchool();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  useEffect(() => {
    if (schoolLoading) return;
    if (!schoolId) {
      setLoading(false);
      return;
    }
    fetchStudents();
  }, [schoolId, schoolLoading]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentsAPI.getAll();
      setStudents(response.data ?? []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttendance = async (studentId: number) => {
    try {
      const response = await attendanceAPI.getStudentHistory(studentId);
      // Get last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRecords = (response.data ?? []).filter((record: any) => {
        const recordDate = new Date(record.date);
        return recordDate >= thirtyDaysAgo;
      });
      
      setAttendanceRecords(recentRecords);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setAttendanceRecords([]);
    }
  };

  const getStudentsByGrade = (grade: string) => {
    return students.filter(s => s.grade === grade);
  };

  const getGradeStats = (grade: string) => {
    const gradeStudents = getStudentsByGrade(grade);
    return {
      total: gradeStudents.length,
      male: gradeStudents.filter(s => s.gender === 'Male').length,
      female: gradeStudents.filter(s => s.gender === 'Female').length,
    };
  };

  const handleGradeClick = (grade: string) => {
    setSelectedGrade(grade);
    setSelectedStudent(null);
  };

  const handleStudentClick = async (student: Student) => {
    setSelectedStudent(student);
    await fetchStudentAttendance(student.id);
  };

  const handleEditStudent = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setEditing(student);
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: student.date_of_birth || '',
      gender: student.gender || 'Male',
      grade: student.grade || '1',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      photo: null,
    });
    setPhotoPreview(null); // Will show existing photo in modal
    setShowModal(true);
  };

  const handleDeleteStudent = async (student: Student, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}?`)) return;
    
    try {
      await studentsAPI.delete(student.id);
      await fetchStudents();
      // If we're viewing this student's details, go back
      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
      }
    } catch (err: any) {
      console.error('Error deleting student:', err);
      alert('Failed to delete student: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleBack = () => {
    if (selectedStudent) {
      setSelectedStudent(null);
    } else if (selectedGrade) {
      setSelectedGrade(null);
    }
  };

  const getAttendanceRate = () => {
    if (attendanceRecords.length === 0) return 0;
    const presentDays = attendanceRecords.filter(r => r.status === 'Present').length;
    return Math.round((presentDays / attendanceRecords.length) * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('first_name', form.first_name);
      formData.append('last_name', form.last_name);
      formData.append('date_of_birth', form.date_of_birth || '');
      formData.append('gender', form.gender || 'Male');
      formData.append('grade', form.grade || '1');
      formData.append('parent_name', form.parent_name || '');
      formData.append('parent_phone', form.parent_phone || '');
      formData.append('school_id', schoolId.toString());

      if (!editing) {
        const studentId = `STU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        formData.append('student_id', studentId);
      }

      if (form.photo) {
        formData.append('photo', form.photo);
      }

      if (editing) {
        await studentsAPI.update(editing.id, formData);
      } else {
        await studentsAPI.create(formData);
      }

      await fetchStudents();
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving student:', err);
      console.error('Error response:', err.response?.data);
      
      // Handle validation errors (array of error objects)
      if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
        const errorMessages = err.response.data.detail.map((e: any) => 
          `${e.loc?.join(' → ')}: ${e.msg}`
        ).join('\n');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.detail || 'Failed to save student');
      }
    } finally {
      setSaving(false);
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

  // Grade selection view
  if (!selectedGrade) {
    return (
      <>
        <Layout>
          <div className="animate-fade-in space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-800">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
                  <Users className="h-6 w-6" />
                </span>
                Student Management
              </h1>
              <p className="mt-1 text-slate-500">Select a grade to view students</p>
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

          {/* Grade List - Beautiful Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
              <h2 className="text-lg font-semibold text-primary-900">Grades 1 - 10</h2>
              <p className="text-sm text-primary-700">Click on a grade to view students</p>
            </div>
            
            <div className="divide-y divide-slate-100">
              {grades.map((grade) => {
                const stats = getGradeStats(grade);
                return (
                  <button
                    key={grade}
                    onClick={() => handleGradeClick(grade)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      {/* Grade Info */}
                      <div className="text-left">
                        <p className="text-lg font-semibold text-slate-800 mb-1">Grade {grade}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {stats.total} Students
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>♂ {stats.male} Male</span>
                          <span className="text-slate-300">|</span>
                          <span>♀ {stats.female} Female</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats and Arrow */}
                    <div className="flex items-center gap-6">
                      {/* Total Count Badge */}
                      <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-bold text-lg">
                        {stats.total}
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 text-white">
              <p className="text-sm opacity-80 mb-1">Total Students</p>
              <p className="text-4xl font-bold">{students.length}</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Male Students</p>
              <p className="text-4xl font-bold text-slate-800">
                {students.filter(s => s.gender === 'Male').length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Female Students</p>
              <p className="text-4xl font-bold text-slate-800">
                {students.filter(s => s.gender === 'Female').length}
              </p>
            </div>
          </div>
        </div>
      </Layout>

      {/* Add Student Modal - Shared across all views */}
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
                  ) : editing && editing.photo_path ? (
                    <div className="relative">
                      <img 
                        src={`http://localhost:8000/${editing.photo_path}`}
                        alt="Current photo" 
                        className="w-32 h-32 rounded-full object-cover mx-auto mb-3 border-4 border-white shadow-lg"
                      />
                      <p className="text-xs text-slate-500 mb-2">Current photo</p>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-slate-200 mx-auto mb-3 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <span className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                      {editing && editing.photo_path && !photoPreview ? 'Change Photo' : 'Upload Student Photo'}
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
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Name</label>
                  <input
                    type="text"
                    value={form.parent_name}
                    onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Phone</label>
                  <input
                    type="tel"
                    value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  />
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
      </>
    );
  }

  // Student list view
  if (selectedGrade && !selectedStudent) {
    const gradeStudents = getStudentsByGrade(selectedGrade);
    
    return (
      <>
        <Layout>
        <div className="animate-fade-in space-y-6">
          {/* Header with back button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Grade {selectedGrade}</h1>
              <p className="text-slate-500">{gradeStudents.length} students</p>
            </div>
          </div>

          {/* Student List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gradeStudents.map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-xl p-5 border-2 border-slate-100 hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  {/* Student Photo or Avatar */}
                  {student.photo_path ? (
                    <img
                      src={`http://localhost:8000/${student.photo_path}`}
                      alt={`${student.first_name} ${student.last_name}`}
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-lg">
                      {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleStudentClick(student)}
                      className="text-left w-full group"
                    >
                      <p className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors truncate">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-slate-500">{student.student_id}</p>
                    </button>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>{student.gender}</span>
                  <span>Grade {student.grade}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={(e) => handleEditStudent(student, e)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDeleteStudent(student, e)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-danger-600 bg-danger-50 rounded-lg hover:bg-danger-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {gradeStudents.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No students in this grade</p>
            </div>
          )}
        </div>
      </Layout>

      {/* Add Student Modal - Shared across all views */}
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
                  ) : editing && editing.photo_path ? (
                    <div className="relative">
                      <img 
                        src={`http://localhost:8000/${editing.photo_path}`}
                        alt="Current photo" 
                        className="w-32 h-32 rounded-full object-cover mx-auto mb-3 border-4 border-white shadow-lg"
                      />
                      <p className="text-xs text-slate-500 mb-2">Current photo</p>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-slate-200 mx-auto mb-3 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <span className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                      {editing && editing.photo_path && !photoPreview ? 'Change Photo' : 'Upload Student Photo'}
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
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Name</label>
                  <input
                    type="text"
                    value={form.parent_name}
                    onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Phone</label>
                  <input
                    type="tel"
                    value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  />
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
      </>
    );
  }

  // Student detail view with attendance
  if (selectedStudent) {
    const attendanceRate = getAttendanceRate();
    const presentDays = attendanceRecords.filter(r => r.status === 'Present').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'Absent').length;

    return (
      <>
        <Layout>
        <div className="animate-fade-in space-y-6">
          {/* Header with back button and photo */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </h1>
                <p className="text-slate-500">Grade {selectedStudent.grade}</p>
              </div>
            </div>
            
            {/* Student Photo */}
            <div className="flex-shrink-0">
              {selectedStudent.photo_path ? (
                <img
                  src={`http://localhost:8000/${selectedStudent.photo_path}`}
                  alt={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {selectedStudent.first_name.charAt(0)}{selectedStudent.last_name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Student Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Student ID</p>
              <p className="text-lg font-semibold text-slate-800">{selectedStudent.student_id}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Gender</p>
              <p className="text-lg font-semibold text-slate-800">{selectedStudent.gender}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Date of Birth</p>
              <p className="text-lg font-semibold text-slate-800">
                {selectedStudent.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>

          {/* Parent Info */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Parent Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Parent Name</p>
                <p className="text-base font-medium text-slate-800">{selectedStudent.parent_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Parent Phone</p>
                <p className="text-base font-medium text-slate-800">{selectedStudent.parent_phone || '-'}</p>
              </div>
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-5 text-white">
              <Calendar className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{attendanceRate}%</p>
              <p className="text-sm opacity-80">Attendance Rate</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Total Days</p>
              <p className="text-3xl font-bold text-slate-800">{attendanceRecords.length}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-success-200 bg-success-50">
              <p className="text-sm text-success-600 mb-1">Present</p>
              <p className="text-3xl font-bold text-success-700">{presentDays}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-danger-200 bg-danger-50">
              <p className="text-sm text-danger-600 mb-1">Absent</p>
              <p className="text-3xl font-bold text-danger-700">{absentDays}</p>
            </div>
          </div>

          {/* Attendance Records (Last 30 Days) */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Attendance History (Last 30 Days)</h2>
            </div>
            <div className="p-6">
              {attendanceRecords.length > 0 ? (
                <div className="space-y-2">
                  {attendanceRecords.slice(0, 30).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        {record.status === 'Present' ? (
                          <CheckCircle className="w-5 h-5 text-success-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-danger-600" />
                        )}
                        <div>
                          <p className="font-medium text-slate-800">
                            {new Date(record.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-sm text-slate-500">{record.time}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        record.status === 'Present' 
                          ? 'bg-success-100 text-success-700' 
                          : 'bg-danger-100 text-danger-700'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No attendance records found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>

      {/* Add Student Modal - Shared across all views */}
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
                  ) : editing && editing.photo_path ? (
                    <div className="relative">
                      <img 
                        src={`http://localhost:8000/${editing.photo_path}`}
                        alt="Current photo" 
                        className="w-32 h-32 rounded-full object-cover mx-auto mb-3 border-4 border-white shadow-lg"
                      />
                      <p className="text-xs text-slate-500 mb-2">Current photo</p>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-slate-200 mx-auto mb-3 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <span className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                      {editing && editing.photo_path && !photoPreview ? 'Change Photo' : 'Upload Student Photo'}
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
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Name</label>
                  <input
                    type="text"
                    value={form.parent_name}
                    onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Parent Phone</label>
                  <input
                    type="tel"
                    value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition-colors focus:border-primary-500 focus:outline-none"
                  />
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
      </>
    );
  }

  return null;
};

export default StudentManagement;
