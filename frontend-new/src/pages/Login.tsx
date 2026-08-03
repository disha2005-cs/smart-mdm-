import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const portal = (location.state as any)?.portal || 'government';
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
    navigate('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Back Button - Top Left */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          background: 'rgba(255,255,255,0.2)',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ← Back
      </button>

      {/* Title */}
      <h1 style={{
        color: 'white',
        fontSize: '42px',
        fontWeight: 'bold',
        marginBottom: '40px',
        textAlign: 'center',
        textShadow: '0 4px 10px rgba(0,0,0,0.3)'
      }}>
        {portal === 'government' ? 'Government Login' : 'School Login'}
      </h1>

      {/* Login Form Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '25px',
        padding: '50px 60px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 25px 80px rgba(0,0,0,0.4)'
      }}>
        <form onSubmit={handleLogin}>
          {/* Username Field */}
          <div style={{ marginBottom: '25px' }}>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Username"
              style={{
                width: '100%',
                padding: '16px 20px',
                border: '2px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
              required
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Password"
              style={{
                width: '100%',
                padding: '16px 20px',
                border: '2px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
              required
            />
          </div>

          {/* Remember Me */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '30px'
          }}>
            <input
              type="checkbox"
              id="remember"
              checked={formData.rememberMe}
              onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer'
              }}
            />
            <label htmlFor="remember" style={{
              fontSize: '15px',
              color: '#4b5563',
              cursor: 'pointer'
            }}>
              Remember Me
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '16px',
              background: '#1e40af',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 8px 20px rgba(30, 64, 175, 0.4)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#1e3a8a';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(30, 64, 175, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#1e40af';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(30, 64, 175, 0.4)';
            }}
          >
            LOGIN
          </button>

          {/* Links */}
          <div style={{
            marginTop: '25px',
            textAlign: 'center'
          }}>
            <a href="#" style={{
              color: '#3b82f6',
              fontSize: '14px',
              textDecoration: 'none',
              display: 'block',
              marginBottom: '10px'
            }}>
              Forgot Password?
            </a>
            <p style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Don't have an account?{' '}
              <a href="#" style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: 'bold'
              }}>
                Register
              </a>
            </p>
          </div>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              padding: '12px',
              background: '#e5e7eb',
              color: '#4b5563',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '20px',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#d1d5db'}
            onMouseOut={(e) => e.currentTarget.style.background = '#e5e7eb'}
          >
            ← Back
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
