'use client';

import React, { useState } from 'react';
import { Lock, Shield, Eye, UserCog } from 'lucide-react';
import type { Role, Session } from '../lib/omnivise';
import { loginRequest, saveSession } from '../lib/omnivise';

const DEMOS: { role: Role; email: string; password: string; blurb: string; icon: typeof Shield }[] = [
  { role: 'Admin', email: 'admin@omnivise.ai', password: 'admin123', blurb: 'Full access', icon: UserCog },
  { role: 'Auditor', email: 'auditor@omnivise.ai', password: 'audit123', blurb: 'Upload & review', icon: Shield },
  { role: 'Viewer', email: 'viewer@omnivise.ai', password: 'view123', blurb: 'Read-only', icon: Eye },
];

export default function AuthModal({
  open,
  onClose,
  onAuthenticated,
}: {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (session: Session) => void;
}) {
  const [email, setEmail] = useState('admin@omnivise.ai');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await loginRequest(email, password);
      saveSession(session);
      onAuthenticated(session);
    } catch {
      setError('Invalid credentials. Use a demo role below.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Sign in to OmniVise</h2>
            <p className="text-xs text-slate-500">JWT + RBAC workspace gate</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</span>
            <input
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</span>
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {DEMOS.map((demo) => {
            const Icon = demo.icon;
            return (
              <button
                key={demo.role}
                type="button"
                onClick={() => {
                  setEmail(demo.email);
                  setPassword(demo.password);
                }}
                className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-left"
              >
                <Icon className="w-3.5 h-3.5 text-slate-500 mb-1" />
                <p className="text-[11px] font-bold text-slate-900">{demo.role}</p>
                <p className="text-[10px] text-slate-400">{demo.blurb}</p>
              </button>
            );
          })}
        </div>

        <button onClick={onClose} className="mt-4 w-full text-[11px] font-semibold text-slate-400 hover:text-slate-700">
          Continue as previous session
        </button>
      </div>
    </div>
  );
}
