import Layout from '../components/Layout';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Palette } from 'lucide-react';

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
          <p className="mt-1 text-slate-500">Configure your account and system preferences</p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Profile Settings</h2>
                <p className="text-sm text-slate-500">Update your personal information</p>
              </div>
            </div>
            <button className="w-full mt-4 rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              Manage Profile
            </button>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Bell className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Notifications</h2>
                <p className="text-sm text-slate-500">Configure alert preferences</p>
              </div>
            </div>
            <button className="w-full mt-4 rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              Notification Settings
            </button>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Security</h2>
                <p className="text-sm text-slate-500">Password and authentication</p>
              </div>
            </div>
            <button className="w-full mt-4 rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              Security Settings
            </button>
          </div>

          {/* Database Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Database</h2>
                <p className="text-sm text-slate-500">Backup and restore data</p>
              </div>
            </div>
            <button className="w-full mt-4 rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              Database Settings
            </button>
          </div>

          {/* Appearance Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Palette className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Appearance</h2>
                <p className="text-sm text-slate-500">Theme and display options</p>
              </div>
            </div>
            <button className="w-full mt-4 rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              Appearance Settings
            </button>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <SettingsIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">System</h2>
                <p className="text-sm text-slate-500">General system configuration</p>
              </div>
            </div>
            <button className="w-full mt-4 rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              System Settings
            </button>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500">Version</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">1.0.0</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Environment</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">Development</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Last Updated</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">August 4, 2026</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
