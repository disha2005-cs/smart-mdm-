import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  Info,
  RefreshCw,
  ScanLine,
  Trash2,
} from 'lucide-react';
import { alertsAPI, getErrorMessage } from '../lib/api';
import type { Alert } from '../types';

const SEVERITY_STYLES: Record<string, { icon: typeof AlertCircle; wrapper: string; icon_color: string }> = {
  HIGH: { icon: AlertCircle, wrapper: 'bg-danger-100', icon_color: 'text-danger-600' },
  MEDIUM: { icon: AlertTriangle, wrapper: 'bg-warning-100', icon_color: 'text-warning-600' },
  LOW: { icon: Info, wrapper: 'bg-primary-100', icon_color: 'text-primary-600' },
};

const relativeTime = (iso: string) => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function Notifications() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await alertsAPI.getAll();
      setAlerts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load notifications'));
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = useMemo(() => alerts.filter((alert) => alert.status === 'UNREAD'), [alerts]);

  const counts = useMemo(
    () => ({
      high: alerts.filter((a) => a.severity === 'HIGH').length,
      medium: alerts.filter((a) => a.severity === 'MEDIUM').length,
      low: alerts.filter((a) => a.severity === 'LOW' || !a.severity).length,
    }),
    [alerts]
  );

  const handleMarkRead = async (id: number) => {
    try {
      await alertsAPI.markRead(id);
      // Update in place so the list does not jump while it is being read.
      setAlerts((current) =>
        current.map((alert) => (alert.id === id ? { ...alert, status: 'READ' } : alert))
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update the notification'));
    }
  };

  const handleMarkAllRead = async () => {
    if (!unread.length) return;
    setBusy(true);
    try {
      await alertsAPI.markAllRead();
      setAlerts((current) => current.map((alert) => ({ ...alert, status: 'READ' })));
      setNotice('All notifications marked as read');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to mark all as read'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this notification?')) return;
    try {
      await alertsAPI.delete(id);
      setAlerts((current) => current.filter((alert) => alert.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete the notification'));
    }
  };

  const handleScan = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await alertsAPI.scanLowStock();
      setNotice(response.data?.message ?? 'Stock scan complete');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to scan stock levels'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary-600" />
              Notifications
            </h1>
            <p className="mt-1 text-slate-500">System alerts raised from live data</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void load()}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleScan}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              title="Raise alerts for every item at or below its reorder threshold"
            >
              <ScanLine className="h-4 w-4" />
              Scan Stock Levels
            </button>
            <button
              onClick={handleMarkAllRead}
              disabled={busy || unread.length === 0}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Mark All as Read
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
            {notice}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'High Severity', value: counts.high, icon: AlertCircle, tone: 'bg-danger-100 text-danger-600' },
            { label: 'Medium Severity', value: counts.medium, icon: AlertTriangle, tone: 'bg-warning-100 text-warning-600' },
            { label: 'Low Severity', value: counts.low, icon: Info, tone: 'bg-primary-100 text-primary-600' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${stat.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-600">{stat.label}</h3>
                </div>
                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">All Notifications</h2>
            <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {unread.length} Unread
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No notifications</p>
              <p className="text-xs text-slate-400 mt-1">
                Run a stock scan to raise alerts for items below their reorder threshold.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {alerts.map((alert) => {
                const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.LOW;
                const Icon = style.icon;
                const isUnread = alert.status === 'UNREAD';
                return (
                  <div
                    key={alert.id}
                    className={`p-4 transition-colors hover:bg-slate-50 ${isUnread ? 'bg-primary-50/40' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.wrapper}`}>
                        <Icon className={`h-5 w-5 ${style.icon_color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-800">
                            {alert.alert_type.replace(/_/g, ' ')}
                          </h3>
                          {isUnread && (
                            <span className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="text-xs text-slate-400">{relativeTime(alert.created_at)}</span>
                          {isUnread && (
                            <button
                              onClick={() => handleMarkRead(alert.id)}
                              className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(alert.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-danger-600 hover:text-danger-800"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
