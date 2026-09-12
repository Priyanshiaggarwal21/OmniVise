'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Upload,
  MessageSquare,
  CheckSquare,
  Database,
  History,
  Settings,
  HelpCircle,
  LogOut,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

interface NavSection {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const NAV_SECTIONS: NavSection[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Upload Evidence', href: '/dashboard/upload', icon: Upload },
  { label: 'Workspace (query/chat)', href: '/dashboard/workspace', icon: MessageSquare },
  { label: 'Decisions', href: '/dashboard/decisions', icon: CheckSquare },
  { label: 'Memory Vault', href: '/vault', icon: Database },
  { label: 'Activity Log', href: '/dashboard/activity', icon: History, roles: ['admin', 'reviewer'] },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Help', href: '/dashboard/help', icon: HelpCircle },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [userName, setUserName] = useState('Priyanshi Aggarwal');
  const [userRole, setUserRole] = useState('Analyst');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Read local cache first for instant render
    if (typeof window !== 'undefined') {
      const storedRole =
        localStorage.getItem('omnivise_selected_role') ||
        sessionStorage.getItem('omnivise_selected_role');
      if (storedRole) {
        setUserRole(storedRole);
      }

      const storedUser = localStorage.getItem('omnivise_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.name) setUserName(parsed.name);
          if (parsed.role) setUserRole(parsed.role);
        } catch {
          // ignore
        }
      }
    }

    // Verify profile with backend via session cookie
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          if (data.user.name) setUserName(data.user.name);
          if (data.user.role) setUserRole(data.user.role);
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
    <header className="sticky top-0 z-40 w-full bg-bg/95 backdrop-blur-md border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0 mr-6">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-teal shadow-sm shadow-accent-teal/30" />
            <Link
              href="/dashboard"
              className="font-serif font-bold text-lg text-ink tracking-tight hover:text-accent-teal transition-colors"
            >
              OmniVise
            </Link>
            <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider text-ink-muted/80 bg-bg-secondary border border-border px-1.5 py-0.5 rounded">
              v2.4
            </span>
          </div>

          {/* Navigation Links with animated underline and active state */}
          <nav
            aria-label="Dashboard navigation"
            className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-5 overflow-x-auto no-scrollbar py-2"
          >
            {NAV_SECTIONS.filter((s) => !s.roles || s.roles.includes(userRole.toLowerCase().trim())).map((section) => {
              const isActive =
                section.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === section.href || pathname.startsWith(`${section.href}/`);
              const Icon = section.icon;

              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className={`group relative py-2.5 px-2 text-xs font-medium tracking-normal whitespace-nowrap transition-colors duration-150 flex items-center gap-1.5 select-none ${
                    isActive
                      ? 'text-accent-teal font-semibold'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors duration-150 ${
                      isActive
                        ? 'text-accent-teal'
                        : 'text-ink-muted group-hover:text-ink'
                    }`}
                  />
                  <span>{section.label}</span>

                  {/* Active Indicator & Animated Underline (grows from left to right on hover) */}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 left-0 h-[2.5px] bg-accent-teal rounded-full transition-all duration-300 ease-out ${
                      isActive ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-100'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Notification Bell & Dropdown */}
            <NotificationBell />

            {/* User Corner: Name, Role Badge, Logout */}
            <div className="flex items-center gap-3 shrink-0 ml-2 pl-3 sm:pl-4 border-l border-border">
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-ink leading-snug">
                {userName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-[#F0F7F5] border border-accent-teal/30 text-accent-teal">
                  {formatRole(userRole)}
                </span>
              </div>
            </div>

            {/* Mobile role badge */}
            <div className="md:hidden flex items-center">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-[#F0F7F5] border border-accent-teal/30 text-accent-teal">
                {formatRole(userRole)}
              </span>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:text-[#C93B2B] hover:bg-[#C93B2B]/5 rounded border border-transparent hover:border-[#C93B2B]/20 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#C93B2B]/30"
              title="Sign out of OmniVise"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isLoggingOut ? 'Signing out...' : 'Logout'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
  );
}
