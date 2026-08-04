import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Camera,
  Package,
  FileText,
  School as SchoolIcon,
  LogOut,
  Utensils,
  Search,
  Bell,
  Clock,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useSchool } from '../hooks/useSchool';

interface LayoutProps {
  children: ReactNode;
}

/** Get menu items based on user role */
const getMenuItems = (role: string) => {
  if (role === 'GOVERNMENT') {
    return [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: SchoolIcon, label: 'Schools', path: '/schools' },
      { icon: Package, label: 'Inventory', path: '/inventory' },
      { icon: FileText, label: 'Reports', path: '/reports' },
    ];
  } else {
    // SCHOOL role
    return [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Users, label: 'Students', path: '/students' },
      { icon: Camera, label: 'Attendance', path: '/attendance' },
      { icon: Package, label: 'Inventory', path: '/inventory' },
      { icon: FileText, label: 'Reports', path: '/reports' },
    ];
  }
};

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Students', path: '/students' },
  { icon: Camera, label: 'Attendance', path: '/attendance' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: SchoolIcon, label: 'Schools', path: '/schools' },
];

/** Live clock that updates every second. */
const LiveClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const date = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="hidden md:flex items-center gap-2.5 rounded-xl bg-slate-100 px-3.5 py-2">
      <Clock className="h-4 w-4 text-primary-600" />
      <div className="leading-tight">
        <div className="font-mono text-sm font-semibold tabular-nums text-slate-800">{time}</div>
        <div className="text-[11px] text-slate-400">{date}</div>
      </div>
    </div>
  );
};

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { school } = useSchool();
  const [query, setQuery] = useState('');

  // Get user role from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { role: 'SCHOOL' };
  const menuItems = getMenuItems(user.role);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/students?q=${encodeURIComponent(q)}` : '/students');
  };

  const activeItem = menuItems.find((m) => m.path === location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-gradient-to-b from-primary-950 via-primary-900 to-primary-800 text-white">
        {/* Logo Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-lg shadow-primary-950/50 p-1.5">
            <img src="/logo.jpeg" alt="Poshan AI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-base font-bold leading-tight">Poshan AI</div>
            <div className="text-xs text-primary-300">Mid-Day Meal System</div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-primary-400/80">
            Main Menu
          </p>
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                    active
                      ? 'bg-white/15 font-semibold text-white shadow-sm ring-1 ring-white/10'
                      : 'text-primary-100/90 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary-300" />
                  )}
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 transition-colors ${
                      active ? 'text-primary-200' : 'text-primary-300/80 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="ml-auto h-4 w-4 text-primary-300" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* System status card */}
        <div className="px-3 pb-3">
          <div className="rounded-xl bg-white/8 p-3.5 ring-1 ring-white/10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-400" />
              </span>
              <span className="text-xs font-semibold text-white">System Online</span>
            </div>
            <p className="mt-1 truncate text-[11px] text-primary-300">
              {school?.school_name ?? 'Sync active'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="z-20 flex flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
          {/* Page context */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Poshan AI</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-slate-600">{activeItem?.label ?? 'Home'}</span>
            </div>
          </div>

          {/* Global search */}
          <form onSubmit={handleSearch} className="relative mx-auto w-full max-w-md lg:mx-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students, records..."
              aria-label="Global search"
              className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </form>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-3">
            <LiveClock />

            <button
              aria-label="Notifications"
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
            </button>

            <button
              aria-label="Settings"
              onClick={() => navigate('/schools')}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Settings className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
                A
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-semibold text-slate-800">Admin</div>
                <div className="text-[11px] text-slate-400">Coordinator</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
