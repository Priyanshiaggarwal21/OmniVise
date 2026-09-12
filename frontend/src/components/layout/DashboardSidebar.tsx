'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  UploadCloud,
  LayoutGrid,
  Scale,
  Database,
  Sliders,
  HelpCircle,
  ShieldCheck,
  Key,
  ChevronsUpDown,
  Building2,
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Upload Evidence', href: '/dashboard/upload', icon: UploadCloud },
  { name: 'Workspace', href: '/dashboard/workspace', icon: LayoutGrid },
  { name: 'Decisions', href: '/dashboard/decisions', icon: Scale },
  { name: 'Memory Vault', href: '/vault', icon: Database },
  { name: 'Settings', href: '/dashboard/settings', icon: Sliders },
  { name: 'Help & Docs', href: '/dashboard/help', icon: HelpCircle },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 shrink-0 h-screen sticky top-0 overflow-y-auto no-scrollbar z-30">
      <div className="space-y-6">
        {/* Brand header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#0B5C48] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-slate-900 tracking-tight leading-tight">
                  OmniVise
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5C48]" />
                <span className="text-[10px] text-slate-500 font-medium">Gateway Secure</span>
              </div>
            </div>
          </Link>
          <span className="bg-[#F1F5F9] text-slate-600 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
            v4.2
          </span>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#0B5C48] text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Compliance & Workspace Tier */}
      <div className="space-y-2 pt-4 border-t border-slate-100">
        {/* Security verification card */}
        <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-xl p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>SOC-2 Type II</span>
            </div>
            <span className="text-[11px] font-semibold text-[#0B5C48]">Verified</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>FIPS 140-3 HSM</span>
            </div>
            <span className="text-[11px] font-semibold text-[#0B5C48]">Active</span>
          </div>
        </div>

        {/* Workspace Tier Selector */}
        <button
          type="button"
          className="w-full bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="truncate">Apex Enterprise Tier</span>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>
      </div>
    </aside>
  );
}
