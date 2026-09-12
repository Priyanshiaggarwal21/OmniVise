'use client';
import React from 'react';
import {
  LayoutDashboard, Activity, CheckSquare, AlertTriangle,
  Network, BarChart3, Settings, HelpCircle, ShieldCheck, LogOut, UploadCloud
} from 'lucide-react';
import type { UserRole } from '../auth/LoginView';

interface NavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'Overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'Monitor', name: 'Monitor', icon: Activity },
  { id: 'Documents', name: 'Documents', icon: UploadCloud },
  { id: 'Claims', name: 'Claims', icon: CheckSquare },
  { id: 'Discrepancies', name: 'Discrepancies', icon: AlertTriangle, badge: '14' },
  { id: 'Graph', name: 'Graph', icon: Network },
  { id: 'Reports', name: 'Reports', icon: BarChart3 },
];

export const NAV_IDS = PRIMARY_NAV.map((n) => n.id);

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  onSignOut: () => void;
  badgeOverride?: Record<string, string>;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  selectedRole,
  setSelectedRole,
  onSignOut,
  badgeOverride,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 border-r border-white/10 flex flex-col justify-between p-4 shrink-0 relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-indigo-500/20 via-white/5 to-fuchsia-500/20 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2.5 px-3 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-emerald-400 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/30">
            O
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white leading-none">OmniVise</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Enterprise Audit</p>
          </div>
        </div>

        <nav className="space-y-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = badgeOverride?.[item.id] ?? item.badge;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-white/10 to-white/[0.03] text-white font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`relative ${isActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {isActive && (
                      <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-fuchsia-400" />
                    )}
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold">{item.name}</span>
                </div>
                {badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/15 text-rose-300 rounded-full ring-1 ring-rose-400/30">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="relative border-t border-white/5 pt-3 space-y-2">
        <div className="space-y-0.5">
          <button
            onClick={() => setActiveTab('Settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'Settings' ? 'bg-white/10 text-white font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('Help')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'Help' ? 'bg-white/10 text-white font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>Help</span>
          </button>
        </div>

        <div className="bg-white/[0.04] border border-white/10 p-2.5 rounded-xl backdrop-blur">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Role</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="w-full text-xs font-bold bg-slate-900/70 border border-white/10 rounded-lg px-2 py-1.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="Admin">Admin — Full Overrides</option>
            <option value="Auditor">Auditor — Review Access</option>
            <option value="Analyst">Analyst — Investigation Access</option>
            <option value="Viewer">Viewer — Read Only</option>
          </select>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between px-1">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-fuchsia-500/20 shrink-0">
              PA
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">Priyanshi Aggarwal</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">{selectedRole} Access</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            title="Sign Out"
            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
}
