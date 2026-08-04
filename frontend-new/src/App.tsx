import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Welcome from './pages/Welcome';
import PortalSelection from './pages/PortalSelection';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Schools from './pages/Schools';
import FoodAllocation from './pages/FoodAllocation';
import BudgetAllocation from './pages/BudgetAllocation';
import Notifications from './pages/Notifications';
import UsersRoles from './pages/UsersRoles';
import Settings from './pages/Settings';
import Meals from './pages/Meals';
import RoleProtectedRoute from './components/RoleProtectedRoute';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('token') !== null
  );

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/portal-selection" element={<PortalSelection />} />
        <Route
          path="/login"
          element={<Login onLogin={() => setIsAuthenticated(true)} />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['GOVERNMENT', 'SCHOOL']}>
                <Dashboard />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['SCHOOL']}>
                <Students />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['SCHOOL']}>
                <Attendance />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/meals"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['SCHOOL']}>
                <Meals />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['GOVERNMENT', 'SCHOOL']}>
                <Inventory />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['GOVERNMENT', 'SCHOOL']}>
                <Reports />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/schools"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['GOVERNMENT']}>
                <Schools />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/food-allocation"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['GOVERNMENT']}>
                <FoodAllocation />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budget-allocation"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['GOVERNMENT']}>
                <BudgetAllocation />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['GOVERNMENT', 'SCHOOL']}>
                <Notifications />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['GOVERNMENT']}>
                <UsersRoles />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['GOVERNMENT', 'SCHOOL']}>
                <Settings />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
