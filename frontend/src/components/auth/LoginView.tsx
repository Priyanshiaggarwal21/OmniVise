'use client';
import React from 'react';
import { ArrowRight, Shield } from 'lucide-react';

export type UserRole = 'Admin' | 'Auditor' | 'Analyst' | 'Viewer';

interface LoginViewProps {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  onLogin: (e: React.FormEvent) => void;
}

const ROLE_OPTIONS: { role: UserRole; desc: string }[] = [
  { role: 'Admin', desc: 'Full Access' },
  { role: 'Auditor', desc: 'Review Only' },
  { role: 'Analyst', desc: 'Investigation Access' },
  { role: 'Viewer', desc: 'Read Only' },
];

export default function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  selectedRole,
  setSelectedRole,
  onLogin,
}: LoginViewProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl mx-auto shadow-md">
            O
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">OmniVise Enterprise</h1>
          <p className="text-xs text-slate-500 font-medium">Autonomous Financial Audit & XAI Platform</p>
        </div>

        <form onSubmit={onLogin} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Select RBAC Persona</label>
            <div className="grid grid-cols-4 gap-2">
              {ROLE_OPTIONS.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => setSelectedRole(item.role)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedRole === item.role
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-xs font-extrabold">{item.role}</p>
                  <p className={`text-[9px] ${selectedRole === item.role ? 'text-slate-300' : 'text-slate-400'}`}>{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
          >
            Sign In as {selectedRole} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-emerald-600" /> SOC2 Type II Certified</span>
          <span>v2.4.0-XAI</span>
        </div>
      </div>
    </div>
  );
}
