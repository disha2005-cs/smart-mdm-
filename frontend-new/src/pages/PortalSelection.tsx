import { useNavigate } from 'react-router-dom';
import { Landmark, School, ArrowRight } from 'lucide-react';

const PortalSelection = () => {
  const navigate = useNavigate();

  const handleContinue = (portal: 'government' | 'school') => {
    navigate('/login', { state: { portal } });
  };

  const portals = [
    {
      id: 'government' as const,
      icon: Landmark,
      title: 'Government',
      desc: 'Oversee schools, monitor reports, and manage inventory across the district',
      gradient: 'from-primary-600 to-primary-800',
    },
    {
      id: 'school' as const,
      icon: School,
      title: 'School',
      desc: 'Manage students, mark attendance, and track daily meal consumption',
      gradient: 'from-success-500 to-success-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 flex flex-col items-center justify-center px-6 py-12">
      <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 text-center">
        Choose Your Portal
      </h1>
      <p className="text-primary-200 text-lg mb-12 text-center max-w-xl">
        Select the portal that matches your role to continue
      </p>

      <div className="flex flex-col md:flex-row gap-6 max-w-4xl w-full justify-center">
        {portals.map((portal) => {
          const Icon = portal.icon;
          return (
            <div
              key={portal.id}
              className="bg-white rounded-3xl p-8 flex-1 max-w-sm text-center shadow-2xl hover:shadow-3xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group"
              onClick={() => handleContinue(portal.id)}
            >
              <div
                className={`w-20 h-20 bg-gradient-to-br ${portal.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">{portal.title}</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">{portal.desc}</p>
              <button
                className={`inline-flex items-center gap-2 bg-gradient-to-r ${portal.gradient} text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all`}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/')}
        className="mt-10 text-primary-200 hover:text-white transition-colors text-sm"
      >
        &larr; Back to home
      </button>
    </div>
  );
};

export default PortalSelection;
