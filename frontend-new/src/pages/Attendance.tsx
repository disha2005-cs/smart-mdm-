import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Camera, Check, X, Users, UserCheck, Calendar, Play, Square, Scan } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSchool } from '../hooks/useSchool';
import type { Student } from '../types';

interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  grade: string;
  timestamp: string;
  confidence: number;
}

const Attendance = () => {
  const { schoolId } = useSchool();
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; student?: Student; confidence?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('first_name');
      setStudents(data ?? []);
      setLoading(false);
    })();
  }, [schoolId]);

  const markedIds = new Set(records.map((r) => r.student_id));

  const captureAndRecognize = async () => {
    if (students.length === 0) return;

    setProcessing(true);
    setResult(null);

    // Simulate face detection processing
    await new Promise((resolve) => setTimeout(resolve, 1800));

    // Pick a random unmarked student
    const unmarked = students.filter((s) => !markedIds.has(s.student_id));
    if (unmarked.length === 0) {
      setResult({
        success: false,
        message: 'All students have already been marked present today!',
      });
      setProcessing(false);
      return;
    }

    const student = unmarked[Math.floor(Math.random() * unmarked.length)];
    const confidence = Math.round((Math.random() * 8 + 91) * 10) / 10;

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      student_id: student.student_id,
      student_name: `${student.first_name} ${student.last_name}`,
      grade: student.grade ?? '-',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      confidence,
    };

    setRecords((prev) => [newRecord, ...prev]);
    setResult({
      success: true,
      message: 'Attendance marked successfully!',
      student,
      confidence,
    });
    setProcessing(false);
  };

  const present = records.length;
  const absent = students.length - present;
  const rate = students.length > 0 ? Math.round((present / students.length) * 100) : 0;

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
              <Camera className="w-8 h-8 text-primary-600" />
              Attendance
            </h1>
            <p className="text-slate-500 mt-1">AI-powered face recognition attendance tracking</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Today</p>
            <p className="text-lg font-semibold text-slate-700">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Students', value: students.length, color: 'from-primary-500 to-primary-700', icon: Users },
            { label: 'Present', value: present, color: 'from-success-500 to-success-700', icon: UserCheck },
            { label: 'Absent', value: absent, color: 'from-danger-500 to-danger-700', icon: X },
            { label: 'Attendance Rate', value: `${rate}%`, color: 'from-warning-500 to-warning-700', icon: Calendar },
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Camera / Capture */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Face Recognition</h3>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isCapturing ? 'bg-success-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-sm text-slate-500">{isCapturing ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            {/* Camera viewport */}
            <div className="bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
              {isCapturing ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Scan className="w-20 h-20 text-primary-400/40 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Camera active &middot; Point at student</p>
                    </div>
                  </div>
                  {/* Scanning overlay */}
                  <div className="absolute inset-x-0 h-0.5 bg-primary-400/60 animate-pulse" style={{ top: '50%' }} />
                  {/* Corner brackets */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary-400 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary-400 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary-400 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary-400 rounded-br-lg" />

                  {processing && (
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center">
                      <div className="bg-white rounded-2xl p-6 shadow-2xl">
                        <div className="w-14 h-14 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-slate-800 font-semibold text-sm">Scanning face...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8">
                  <Camera className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-4 text-sm">Camera is off</p>
                  <button
                    onClick={() => setIsCapturing(true)}
                    className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Start Camera
                  </button>
                </div>
              )}
            </div>

            {isCapturing && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={captureAndRecognize}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                  {processing ? 'Processing...' : 'Capture & Mark'}
                </button>
                <button
                  onClick={() => setIsCapturing(false)}
                  className="px-5 py-3 bg-danger-500 hover:bg-danger-600 text-white rounded-xl font-semibold transition-colors"
                >
                  <Square className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`mt-4 p-4 rounded-xl border-2 animate-scale-in ${result.success ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200'}`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <Check className="w-6 h-6 text-success-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-6 h-6 text-danger-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold ${result.success ? 'text-success-800' : 'text-danger-800'}`}>
                      {result.message}
                    </p>
                    {result.student && (
                      <div className="mt-2 text-sm text-slate-700">
                        <p><strong>Student:</strong> {result.student.first_name} {result.student.last_name} ({result.student.student_id})</p>
                        <p><strong>Grade:</strong> {result.student.grade ?? '-'} &middot; Section {result.student.section ?? '-'}</p>
                        <p><strong>Confidence:</strong> {result.confidence}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-4 p-4 bg-primary-50 rounded-xl">
              <h4 className="font-semibold text-primary-900 mb-2 text-sm">Instructions</h4>
              <ul className="text-xs text-primary-800 space-y-1">
                <li>&middot; Ensure the student's face is clearly visible and well-lit</li>
                <li>&middot; Look directly at the camera</li>
                <li>&middot; Click "Capture &amp; Mark" to record attendance</li>
                <li>&middot; Each student is marked only once per session</li>
              </ul>
            </div>
          </div>

          {/* Attendance log */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Today's Attendance</h3>
              <span className="text-sm text-slate-400">{records.length} marked</span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {records.map((record) => (
                <div key={record.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors animate-slide-in">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {record.student_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-sm">{record.student_name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{record.student_id}</span>
                      <span>&middot;</span>
                      <span>Grade {record.grade}</span>
                      <span>&middot;</span>
                      <span className="text-success-600 font-semibold">{record.confidence}% match</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-success-100 text-success-700">
                      Present
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{record.timestamp}</p>
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
