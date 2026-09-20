import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  CalendarDays,
  ClipboardCheck,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { attendanceAPI, getErrorMessage } from '../lib/api';
import FaceRecognitionCamera from '../components/FaceRecognitionCamera';
import type { AttendanceRecord, AttendanceStatistics } from '../types';

const todayISO = () => new Date().toISOString().split('T')[0];

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);

  const isToday = selectedDate === todayISO();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [recordsRes, statsRes] = await Promise.all([
        isToday ? attendanceAPI.getToday() : attendanceAPI.getByDate(selectedDate),
        attendanceAPI.getStatistics(selectedDate),
      ]);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      setStats(statsRes.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load attendance'));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isToday]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCloseRegister = async () => {
    const remaining = stats ? stats.absent : 0;
    if (remaining <= 0) {
      setError('Everyone already has a record for this date.');
      return;
    }
    if (
      !confirm(
        `Mark the remaining ${remaining} student(s) absent for ${selectedDate}? ` +
          'This records an absence for everyone who has not been marked present.'
      )
    ) {
      return;
    }

    setClosing(true);
    try {
      await attendanceAPI.markRemainingAbsent(selectedDate);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to close the register'));
    } finally {
      setClosing(false);
    }
  };

  const presentRecords = records.filter((record) => record.status === 'PRESENT');
  const absentRecords = records.filter((record) => record.status === 'ABSENT');

  const kpis = [
    {
      label: 'Total Students',
      value: stats?.total_students ?? 0,
      icon: Users,
      color: 'from-primary-500 to-primary-700',
    },
    {
      label: 'Present',
      value: stats?.present ?? 0,
      icon: UserCheck,
      color: 'from-success-500 to-success-700',
    },
    {
      label: 'Absent',
      value: stats?.absent ?? 0,
      icon: UserX,
      color: 'from-danger-500 to-danger-700',
    },
    {
      label: 'Attendance Rate',
      value: `${stats?.attendance_percentage ?? 0}%`,
      icon: TrendingUp,
      color: 'from-warning-500 to-warning-700',
    },
  ];

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
            <p className="text-slate-500 mt-1">
              AI-powered attendance &mdash; capture a whole group in a single frame
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                max={todayISO()}
                onChange={(event) => setSelectedDate(event.target.value || todayISO())}
                className="text-sm text-slate-700 focus:outline-none"
              />
            </div>
            <button
              onClick={() => void loadData()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleCloseRegister}
              disabled={closing || !stats || stats.absent === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              title="Record an absence for every student not yet marked present"
            >
              <ClipboardCheck className="w-4 h-4" />
              {closing ? 'Closing…' : 'Close Register'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white mb-3`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
                <p className="text-sm text-slate-500">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Camera - only for today; you cannot capture a face into the past. */}
          <div>
            {isToday ? (
              <FaceRecognitionCamera onAttendanceMarked={() => void loadData()} autoMark />
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-700">Viewing a past date</p>
                <p className="text-sm text-slate-500 mt-1">
                  Switch back to today to capture attendance with the camera.
                </p>
              </div>
            )}
          </div>

          {/* Register */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                Register &mdash; {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </h3>
              <span className="text-sm text-slate-400">
                {presentRecords.length} present · {absentRecords.length} absent
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : records.length > 0 ? (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {records.map((record) => {
                  const present = record.status === 'PRESENT';
                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 bg-gradient-to-br ${
                          present ? 'from-success-400 to-success-600' : 'from-slate-300 to-slate-500'
                        }`}
                      >
                        {record.student_name.trim().charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate text-sm">
                          {record.student_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                          <span>{record.student_id}</span>
                          {record.grade && (
                            <>
                              <span>&middot;</span>
                              <span>
                                Grade {record.grade}
                                {record.section ? `-${record.section}` : ''}
                              </span>
                            </>
                          )}
                          {record.confidence_score != null && (
                            <>
                              <span>&middot;</span>
                              <span className="text-success-600 font-semibold">
                                {record.confidence_score}% match
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            present
                              ? 'bg-success-100 text-success-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {present ? 'Present' : 'Absent'}
                        </span>
                        {record.time && <p className="text-xs text-slate-400 mt-1">{record.time}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No attendance recorded for this date</p>
                <p className="text-xs text-slate-400 mt-1">
                  {isToday
                    ? 'Start the camera to begin marking students present'
                    : 'Nothing was recorded on this day'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;
