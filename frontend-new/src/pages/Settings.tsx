import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Settings as SettingsIcon, User, Shield, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import api from '../lib/api';

export default function Settings() {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Email change states
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setCurrentEmail(response.data.email);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      await api.post('/users/change-password', null, {
        params: {
          current_password: currentPassword,
          new_password: newPassword
        }
      });

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto close modal after 2 seconds
      setTimeout(() => {
        setShowChangePassword(false);
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(newEmail)) {
      setError('Invalid email format');
      return;
    }

    if (newEmail === currentEmail) {
      setError('New email must be different from current email');
      return;
    }

    setLoading(true);

    try {
      await api.post('/users/change-email', null, {
        params: {
          new_email: newEmail,
          password: emailPassword
        }
      });

      setSuccess('Email changed successfully!');
      setCurrentEmail(newEmail);
      setNewEmail('');
      setEmailPassword('');
      
      // Auto close modal after 2 seconds
      setTimeout(() => {
        setShowChangeEmail(false);
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('Error changing email:', err);
      setError(err.response?.data?.detail || 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary-600" />
            Settings
          </h1>
          <p className="mt-1 text-slate-500">Configure your account and preferences</p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Email Settings</h2>
                <p className="text-sm text-slate-500">Update your email address</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Current Email</p>
              <p className="text-sm font-semibold text-slate-800">{currentEmail}</p>
            </div>
            <button 
              onClick={() => setShowChangeEmail(true)}
              className="w-full mt-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-3 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Change Email
            </button>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Security</h2>
                <p className="text-sm text-slate-500">Password and authentication</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Password</p>
              <p className="text-sm font-semibold text-slate-800">••••••••</p>
            </div>
            <button 
              onClick={() => setShowChangePassword(true)}
              className="w-full mt-4 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-3 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Change Password</h2>
                    <p className="text-sm text-red-100">Update your account password</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChangePassword(false);
                    setError('');
                    setSuccess('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <SettingsIcon className="w-5 h-5 rotate-90" />
                </button>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {error && (
                <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0" />
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-success-50 border border-success-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
                  <p className="text-sm text-success-700">{success}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5 text-slate-500" /> : <Eye className="w-5 h-5 text-slate-500" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5 text-slate-500" /> : <Eye className="w-5 h-5 text-slate-500" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5 text-slate-500" /> : <Eye className="w-5 h-5 text-slate-500" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Update Password
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setError('');
                    setSuccess('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
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

      {/* Change Email Modal */}
      {showChangeEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Change Email</h2>
                    <p className="text-sm text-blue-100">Update your email address</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChangeEmail(false);
                    setError('');
                    setSuccess('');
                    setNewEmail('');
                    setEmailPassword('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <SettingsIcon className="w-5 h-5 rotate-90" />
                </button>
              </div>
            </div>

            <form onSubmit={handleChangeEmail} className="p-6 space-y-4">
              {error && (
                <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0" />
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-success-50 border border-success-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
                  <p className="text-sm text-success-700">{success}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Current Email</label>
                <div className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-600">
                  {currentEmail}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">New Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Enter new email address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password (for verification)</label>
                <div className="relative">
                  <input
                    type={showEmailPassword ? 'text' : 'password'}
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {showEmailPassword ? <EyeOff className="w-5 h-5 text-slate-500" /> : <Eye className="w-5 h-5 text-slate-500" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Update Email
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeEmail(false);
                    setError('');
                    setSuccess('');
                    setNewEmail('');
                    setEmailPassword('');
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
    </Layout>
  );
}
