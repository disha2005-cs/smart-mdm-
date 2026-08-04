import Layout from '../components/Layout';
import { Bell, Check, AlertCircle, Info, Calendar } from 'lucide-react';

export default function Notifications() {
  // Mock notifications data
  const notifications = [
    { id: 1, type: 'alert', title: 'Low Stock Alert', message: 'Dal stock is approaching threshold at Greenwood School', time: '2 hours ago', read: false },
    { id: 2, type: 'info', title: 'Inspection Scheduled', message: 'District inspection scheduled for tomorrow at St. Joseph School', time: '5 hours ago', read: false },
    { id: 3, type: 'success', title: 'Budget Approved', message: 'Monthly budget of ₹50,000 has been approved', time: '1 day ago', read: true },
    { id: 4, type: 'alert', title: 'Attendance Below Threshold', message: 'Attendance at Sarvodaya School is below 85%', time: '2 days ago', read: true },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Notifications</h1>
            <p className="mt-1 text-slate-500">Stay updated with system alerts and messages</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-700 transition-colors hover:border-primary-300">
            <Check className="h-4 w-4" />
            Mark All as Read
          </button>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">All Notifications</h2>
              <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {notifications.filter(n => !n.read).length} Unread
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    notification.type === 'alert' ? 'bg-red-100' :
                    notification.type === 'info' ? 'bg-blue-100' :
                    'bg-green-100'
                  }`}>
                    {notification.type === 'alert' && <AlertCircle className="h-5 w-5 text-red-600" />}
                    {notification.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
                    {notification.type === 'success' && <Check className="h-5 w-5 text-green-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">{notification.title}</h3>
                      {!notification.read && (
                        <span className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-1"></span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-400">{notification.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-sm font-medium text-slate-600">Alerts</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">2</p>
            <p className="text-sm text-slate-500 mt-2">Require attention</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-medium text-slate-600">Info</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">1</p>
            <p className="text-sm text-slate-500 mt-2">General updates</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-sm font-medium text-slate-600">Success</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">1</p>
            <p className="text-sm text-slate-500 mt-2">Completed actions</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
