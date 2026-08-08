import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Users, UserCheck, Calendar, X, RefreshCw } from 'lucide-react';
import { attendanceAPI } from '../lib/api';
import { useSchool } from '../hooks/useSchool';
import FaceRecognitionCamera from '../components/FaceRecognitionCamera';

interface AttendanceRecord {
  id: number;
  student_id: string;
  student_name: string;
  grade: string;
  section: string;
  time: string;
  status: string;
  confidence_score: number;
}

const Attendance = () => {
  const { schoolId } = useSchool();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0, rate: 0, total: 0 });

  useEffect(() => {
    fetchTodayAttendance();
    fetchStatistics();
  }, [schoolId]);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getToday();
      setRecords(response.data ?? []);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await attendanceAPI.getTodayStatistics();
      setStats({
        present: response.data.present,
        absent: response.data.absent,
        rate: response.data.attendance_percentage,
        total: response.data.total_students
      });
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const handleAttendanceMarked = () => {
    // Refresh data after successful attendance marking
    fetchTodayAttendance();
    fetchStatistics();
  };

  const { present, absent, rate, total } = stats;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary-600" />
              Face Recognition Attendance
            </h1>
            <p className="text-slate-500 mt-1">AI-powered real-time attendance tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchTodayAttendance();
                fetchStatistics();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <div className="text-right">
              <p className="text-sm text-slate-400">Today</p>
              <p className="text-lg font-semibold text-slate-700">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Face Recognition Camera */}
          <div className="lg:col-span-1">
            <FaceRecognitionCamera 
              onAttendanceMarked={handleAttendanceMarked}
              autoMark={false}
            />
          </div>

          {/* Attendance log */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Today's Attendance (Latest 10)</h3>
              <span className="text-sm text-slate-400">{Math.min(records.length, 10)} shown</span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {records.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors animate-slide-in">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {record.student_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-sm">{record.student_name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{record.student_id}</span>
                      <span>&middot;</span>
                      <span>Grade {record.grade} - {record.section}</span>
                      <span>&middot;</span>
                      <span className="text-success-600 font-semibold">{record.confidence_score}% match</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-success-100 text-success-700">
                      {record.status}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{record.time}</p>
                  </div>
                </div>
              ))}

              {records.length === 0 && (
                <div className="text-center py-12">
                  <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 text-sm">No attendance marked yet</p>
                  <p className="text-xs text-slate-400 mt-1">Start the camera and capture to begin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;
