import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  // Not authenticated - redirect to login
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    
    // Check if user's role is allowed
    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-red-600 mb-2">403 Forbidden</h1>
            <p className="text-slate-600 mb-6">
              You don't have permission to access this page.
            </p>
            <div className="text-sm text-slate-500 mb-6">
              Required role: <span className="font-semibold">{allowedRoles.join(' or ')}</span>
              <br />
              Your role: <span className="font-semibold">{user.role}</span>
            </div>
            <button
              onClick={() => window.history.back()}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    // Role is allowed - render the protected content
    return <>{children}</>;
  } catch (error) {
    // Invalid user data - clear and redirect to login
    console.error('Error parsing user data:', error);
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }
};

export default RoleProtectedRoute;
