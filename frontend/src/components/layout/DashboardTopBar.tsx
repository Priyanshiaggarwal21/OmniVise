'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Shield,
  RotateCcw,
} from 'lucide-react';

export default function DashboardTopBar() {
  const router = useRouter();

  const [userName, setUserName] = useState('Elena Rostova');
  const [userRole, setUserRole] = useState('Analyst');
  const [userEmail, setUserEmail] = useState('elena.r@omnivise.institutional');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole =
        localStorage.getItem('omnivise_selected_role') ||
        sessionStorage.getItem('omnivise_selected_role');
      if (storedRole) setUserRole(storedRole);

      const storedUser = localStorage.getItem('omnivise_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.name) setUserName(parsed.name);
          if (parsed.role) setUserRole(parsed.role);
          if (parsed.email) setUserEmail(parsed.email);
        } catch {
          // ignore
        }
      }
    }

    // Backend session check
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          if (data.user.name) setUserName(data.user.name);
          if (data.user.role) setUserRole(data.user.role);
          if (data.user.email) setUserEmail(data.user.email);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('omnivise_token');
      localStorage.removeItem('omnivise_user');
      localStorage.removeItem('omnivise_selected_role');
      sessionStorage.removeItem('omnivise_selected_role');
    }

    router.push('/login');
  };

  const formatRole = (r: string) => {
    if (!r) return 'Analyst';
    return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  };

  return (
    <header className="h-16 w-full bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium">Institutional Workspace</span>
        <span className="text-slate-300">&rsaquo;</span>
        <span className="text-slate-900 font-semibold">Overview</span>
      </nav>

      {/* Right-side controls */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <span className="w-2 h-2 rounded-full bg-[#0B5C48] absolute top-1.5 right-1.5 ring-2 ring-white" />
        </div>

        {/* User profile dropdown container */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors text-left focus:outline-none"
          >
            {/* Dark teal avatar */}
            <div className="w-8 h-8 rounded-full bg-[#0B5C48] text-white flex items-center justify-center shadow-xs">
              <UserIcon className="w-4 h-4" />
            </div>

            {/* User metadata */}
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {userName}
                </span>
                <span className="bg-[#D5F5EC] text-[#0B5C48] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Institutional {formatRole(userRole)}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                {userEmail}
              </span>
            </div>

            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1">
              <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                <p className="font-bold text-slate-900">{userName}</p>
                <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
              </div>

              <Link
                href="/select-role"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Switch Clearance Role</span>
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span>Security Settings</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
