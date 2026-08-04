import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SchoolDashboard from './SchoolDashboard';
import GovernmentDashboard from './GovernmentDashboard';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setUserRole(user.role);
  }, [navigate]);

  if (!userRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  if (userRole === 'GOVERNMENT') {
    return <GovernmentDashboard />;
  } else {
    return <SchoolDashboard />;
  }
};

export default Dashboard;
