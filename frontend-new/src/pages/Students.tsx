import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Users, Plus, Search, Edit, Trash2, X, Camera, Upload } from 'lucide-react';
import axios from 'axios';

interface Student {
  id: number;
  student_id: string;
  name: string;
  age: number;
  gender: string;
  grade: string;
  school_id?: number;
  school_name?: string;
  parent_contact: string;
  address: string;
  photo_url?: string;
  has_face_encoding: boolean;
}

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    age: '',
    gender: 'Male',
    grade: '1',
    school_id: '',
    parent_contact: '',
    address: '',
    photo_url: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.grade.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/v1/students/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
      setFilteredStudents(response.data);
    } catch (error) {
      console.log('Using demo data');
      // Demo data
      const demoStudents: Student[] = [
        { id: 1, student_id: 'STU001', name: 'Rajesh Kumar', age: 10, gender: 'Male', grade: '5', school_name: 'Govt School Bangalore', parent_contact: '9876543210', address: 'Bangalore', has_face_encoding: true },
        { id: 2, student_id: 'STU002', name: 'Priya Sharma', age: 9, gender: 'Female', grade: '4', school_name: 'Govt School Mysuru', parent_contact: '9876543211', address: 'Mysuru', has_face_encoding: true },
        { id: 3, student_id: 'STU003', name: 'Arjun Reddy', age: 11, gender: 'Male', grade: '6', school_name: 'Govt School Hassan', parent_contact: '9876543212', address: 'Hassan', has_face_encoding: false },
        { id: 4, student_id: 'STU004', name: 'Lakshmi Devi', age: 8, gender: 'Female', grade: '3', school_name: 'Govt School Mandya', parent_contact: '9876543213', address: 'Mandya', has_face_encoding: true },
        { id: 5, student_id: 'STU005', name: 'Kiran Kumar', age: 12, gender: 'Male', grade: '7', school_name: 'Govt School Bangalore', parent_contact: '9876543214', address: 'Bangalore', has_face_encoding: false },
      ];
      setStudents(demoStudents);
      setFilteredStudents(demoStudents);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (editingStudent) {
        // Update existing student
        await axios.put(
          `http://localhost:8000/api/v1/students/${editingStudent.id}`,
          { ...formData, age: parseInt(formData.age) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new student
        await axios.post(
          'http://localhost:8000/api/v1/students/',
          { ...formData, age: parseInt(formData.age), school_id: parseInt(formData.school_id) || 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      fetchStudents();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student. Using demo mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/api/v1/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Error deleting student. Using demo mode.');
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      student_id: student.student_id,
      name: student.name,
      age: student.age.toString(),
      gender: student.gender,
      grade: student.grade,
      school_id: student.school_id?.toString() || '',
      parent_contact: student.parent_contact,
      address: student.address,
      photo_url: student.photo_url || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      name: '',
      age: '',
      gender: 'Male',
      grade: '1',
      school_id: '',
      parent_contact: '',
      address: '',
      photo_url: ''
    });
    setEditingStudent(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Students Management
            </h1>
            <p className="text-gray-600 mt-1">Manage student registrations and records</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Student
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Students', value: filteredStudents.length, color: 'from-blue-500 to-blue-600', icon: <Users /> },
            { label: 'With Face Data', value: filteredStudents.filter(s => s.has_face_encoding).length, color: 'from-green-500 to-green-600', icon: <Camera /> },
            { label: 'Male', value: filteredStudents.filter(s => s.gender === 'Male').length, color: 'from-purple-500 to-purple-600', icon: <Users /> },
            { label: 'Female', value: filteredStudents.filter(s => s.gender === 'Female').length, color: 'from-pink-500 to-pink-600', icon: <Users /> },
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
                placeholder="Search by name, student ID, or grade..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none">
              <option>All Grades</option>
              <option>Grade 1-5</option>
              <option>Grade 6-8</option>
              <option>Grade 9-10</option>
            </select>
            <select className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none">
              <option>All Schools</option>
              <option>Bangalore</option>
              <option>Mysuru</option>
              <option>Hassan</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Student ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Age</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Gender</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Grade</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">School</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Face Data</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{student.student_id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                          {student.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.age}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.gender}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                        Grade {student.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.school_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.parent_contact}</td>
                    <td className="px-6 py-4">
                      {student.has_face_encoding ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                          <Camera className="w-4 h-4" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No students found</p>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
                    <input
                      type="text"
                      value={formData.student_id}
                      onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="STU001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="10"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Grade</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Contact</label>
                  <input
                    type="tel"
                    value={formData.parent_contact}
                    onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="9876543210"
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
                    placeholder="Enter full address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student Photo (Optional)</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-500 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Photo
                    </button>
                    <span className="text-sm text-gray-500">For face recognition enrollment</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingStudent ? 'Update Student' : 'Add Student'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
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

export default Students;
