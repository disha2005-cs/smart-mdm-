import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  trend?: string;
  color?: string;
  onClick?: () => void;
  lastUpdated?: string;
}

export default function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'primary',
  onClick,
  lastUpdated,
}: KPICardProps) {
  const colorClasses = {
    primary: 'from-blue-500 to-blue-600',
    success: 'from-green-500 to-green-600',
    warning: 'from-yellow-500 to-yellow-600',
    danger: 'from-red-500 to-red-600',
    info: 'from-cyan-500 to-cyan-600',
    purple: 'from-purple-500 to-purple-600',
  };

  const bgGradient = colorClasses[color as keyof typeof colorClasses] || colorClasses.primary;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${bgGradient}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600">{label}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            
            {trend && (
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <span>{trend}</span>
              </p>
            )}
          </div>
        </div>
      </div>
      
      {lastUpdated && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Updated: {lastUpdated}</p>
        </div>
      )}
    </div>
  );
}
