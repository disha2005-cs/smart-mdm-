import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Lock, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../lib/api';
import { clearSchoolCache } from '../hooks/useSchool';

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const portal = (location.state as { portal?: string } | null)?.portal ?? 'government';

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const roleUpper = portal.toUpperCase();
      
      // Call login API
      const response = await authAPI.login(formData.username, formData.password, roleUpper);
      const { access_token, role } = response.data;

      // Store token temporarily
      localStorage.setItem('token', access_token);

      // Get user details
      const meResponse = await authAPI.me();
      const userData = meResponse.data;

      // Store complete user data
      // /auth/me already carries the school, so storing it here means the
      // rest of the app never has to fetch it again.
      localStorage.setItem('user', JSON.stringify({
        role,
        employee_id: userData.employee_id,
        school_id: userData.school_id || null,
        school: userData.school ?? null,
        name: `${userData.first_name} ${userData.last_name}`,
        email: userData.email,
      }));
      clearSchoolCache();

      onLogin();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setFormData({
      username: portal === 'government' ? 'GOV-001' : '',
      password: portal === 'government' ? 'admin123' : '',
    });
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={() => navigate('/portal-selection')}
          className="text-primary-200 hover:text-white flex items-center gap-2 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-2">
              <img src="/logo.jpeg" alt="Poshan AI Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {portal === 'government' ? 'Government Login' : 'School Login'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Employee ID or Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder={portal === 'government' ? 'GOV-001 or email@example.com' : 'SCH-001 or email@example.com'}
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl text-slate-800 focus:border-primary-500 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-slate-200 rounded-xl text-slate-800 focus:border-primary-500 focus:outline-none transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 text-white py-3.5 rounded-xl font-semibold shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
            {portal === 'government' ? (
              <>
                <p className="text-xs text-primary-700 font-semibold mb-1">Default Administrator</p>
                <p className="text-sm text-primary-800">GOV-001 / admin123</p>
                <p className="text-xs text-primary-600 mt-1">
                  Created by <code>seed.py</code>. Change this password after first login.
                </p>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="text-xs text-primary-600 hover:text-primary-800 font-semibold mt-1"
                >
                  Click to auto-fill &rarr;
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-primary-700 font-semibold mb-1">School Login</p>
                <p className="text-sm text-primary-800">
                  Use the employee ID and password issued by your government administrator.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
