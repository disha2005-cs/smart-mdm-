import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import {
  Building2,
  CheckCircle,
  Copy,
  KeyRound,
  Search,
  Shield,
  Trash2,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';
import { getErrorMessage, usersAPI } from '../lib/api';

interface ManagedUser {
  id: number;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'GOVERNMENT' | 'SCHOOL';
  school_id: number | null;
  designation: string | null;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
  school_name: string | null;
  school_udise: string | null;
}

const ROLE_FILTERS = [
  { id: '', label: 'All' },
  { id: 'GOVERNMENT', label: 'Government' },
  { id: 'SCHOOL', label: 'School' },
];

export default function UsersRoles() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await usersAPI.getAll(roleFilter || undefined, search || undefined);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    // Debounced so typing in the search box does not fire a request per keystroke.
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const counts = useMemo(
    () => ({
      total: users.length,
      government: users.filter((user) => user.role === 'GOVERNMENT').length,
      school: users.filter((user) => user.role === 'SCHOOL').length,
      inactive: users.filter((user) => !user.is_active).length,
    }),
    [users]
  );

  const handleToggleActive = async (user: ManagedUser) => {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    if (!confirm(`${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} ${user.first_name} ${user.last_name}?`)) {
      return;
    }
    try {
      await usersAPI.update(user.id, { is_active: !user.is_active });
      setNotice(`${user.employee_id} ${action}d`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${action} the user`));
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    if (
      !confirm(
        `Permanently delete ${user.first_name} ${user.last_name} (${user.employee_id})? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await usersAPI.delete(user.id);
      setNotice(`${user.employee_id} deleted`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete the user'));
    }
  };

  const openReset = async (user: ManagedUser) => {
    setResetTarget(user);
    setError('');
    setNotice('');
    try {
      const response = await usersAPI.generatePassword();
      setNewPassword(response.data.password);
    } catch {
      setNewPassword('');
    }
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    setError('');
    try {
      await usersAPI.resetPassword(resetTarget.id, newPassword);
      setNotice(
        `Password reset for ${resetTarget.employee_id}. Copy it now — it will not be shown again.`
      );
      setResetTarget(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset the password'));
    } finally {
      setResetting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <UserCog className="w-8 h-8 text-primary-600" />
              Users &amp; Roles
            </h1>
            <p className="mt-1 text-slate-500">
              Manage administrator accounts and access. School admins are created from the School
              Management page.
            </p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: counts.total, icon: Users, tone: 'from-primary-500 to-primary-700' },
            { label: 'Government Admins', value: counts.government, icon: Shield, tone: 'from-purple-500 to-purple-700' },
            { label: 'School Admins', value: counts.school, icon: Building2, tone: 'from-success-500 to-success-700' },
            { label: 'Inactive', value: counts.inactive, icon: XCircle, tone: 'from-slate-400 to-slate-600' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.tone} flex items-center justify-center text-white mb-3`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or employee ID"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 focus:border-primary-400 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setRoleFilter(filter.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  roleFilter === filter.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No users match this filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">User</th>
                    <th className="px-6 py-3 font-semibold">Employee ID</th>
                    <th className="px-6 py-3 font-semibold">Role</th>
                    <th className="px-6 py-3 font-semibold">School</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        {user.last_login_at && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Last login{' '}
                            {new Date(user.last_login_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{user.employee_id}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.role === 'GOVERNMENT'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-primary-100 text-primary-700'
                          }`}
                        >
                          {user.role === 'GOVERNMENT' ? <Shield className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                          {user.role === 'GOVERNMENT' ? 'Government' : 'School'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {user.school_name ? (
                          <>
                            <p className="truncate max-w-[200px]">{user.school_name}</p>
                            <p className="text-xs text-slate-400">UDISE {user.school_udise}</p>
                          </>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.is_active ? 'bg-success-100 text-success-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {user.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openReset(user)}
                            title="Reset password"
                            className="rounded-lg p-2 text-primary-600 transition-colors hover:bg-primary-50"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            title={user.is_active ? 'Deactivate' : 'Reactivate'}
                            className="rounded-lg p-2 text-warning-600 transition-colors hover:bg-warning-50"
                          >
                            {user.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            title="Delete user"
                            className="rounded-lg p-2 text-danger-600 transition-colors hover:bg-danger-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-scale-in">
            <div className="rounded-t-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
              <h2 className="text-xl font-bold">Reset Password</h2>
              <p className="text-sm text-primary-100">
                {resetTarget.first_name} {resetTarget.last_name} &middot; {resetTarget.employee_id}
              </p>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">New Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-mono text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(newPassword)}
                    title="Copy"
                    className="rounded-xl border-2 border-slate-200 px-3 text-slate-600 hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  At least 8 characters, including a letter and a digit.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleReset}
                  disabled={resetting || newPassword.length < 8}
                  className="flex-1 rounded-xl bg-primary-600 py-3 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {resetting ? 'Resetting…' : 'Reset Password'}
                </button>
                <button
                  onClick={() => setResetTarget(null)}
                  className="rounded-xl border-2 border-slate-200 px-6 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
