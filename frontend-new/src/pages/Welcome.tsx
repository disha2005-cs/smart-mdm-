import { useNavigate } from 'react-router-dom';
import { Utensils, ShieldCheck, ChartBar as BarChart3, Camera, ArrowRight } from 'lucide-react';

const features = [
  { icon: Camera, title: 'Face Recognition Attendance', desc: 'AI-powered automatic attendance tracking' },
  { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Live dashboards and meal consumption insights' },
  { icon: ShieldCheck, title: 'Inventory Monitoring', desc: 'IoT-ready stock tracking with smart alerts' },
];

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Decorative pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-500/20 rounded-full blur-3xl" />

      <div className="relative z-10 text-center max-w-4xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-4 mb-10 animate-fade-in">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl p-2">
            <img src="/logo.jpeg" alt="Poshan AI Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        <p className="text-primary-200 text-lg font-medium mb-2 animate-fade-in">Welcome to</p>
        <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-4 tracking-tight animate-fade-in">
          Poshan AI
        </h1>
        <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in">
          Smart Nutrition Monitoring &amp; Meal Management System for Karnataka Government Schools
        </p>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-all animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-primary-200">{f.desc}</p>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/portal-selection')}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-success-500 to-primary-500 hover:from-success-600 hover:to-primary-600 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-xl transition-all hover:scale-105 animate-fade-in"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="mt-10 text-sm text-primary-300">Powered by AI &middot; Government of Karnataka</p>
      </div>
    </div>
  );
};

export default Welcome;
