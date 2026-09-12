'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, HelpCircle, User } from 'lucide-react';

interface AuthHeaderProps {
  subtitle?: string;
  showAvatar?: boolean;
}

export default function AuthHeader({ subtitle, showAvatar = false }: AuthHeaderProps) {
  return (
    <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
      {/* Brand logo & title */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-lg bg-[#0B5C48] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
          {/* OmniVise geometric icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-bold text-lg text-slate-900 tracking-tight leading-tight group-hover:text-[#0B5C48] transition-colors">
            OmniVise
          </span>
          {subtitle && (
            <span className="text-[11px] font-medium text-slate-500 tracking-normal leading-none mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </Link>

      {/* Right-side security & support badges */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white/80 border border-slate-200/90 rounded-full px-3 py-1.5 shadow-sm backdrop-blur-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0B5C48]" />
          <span>256-Bit Encrypted</span>
        </div>

        <Link
          href="/dashboard/help"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>Support</span>
        </Link>

        {showAvatar && (
          <div
            className="w-7 h-7 rounded-full bg-[#0B5C48] text-white flex items-center justify-center shadow-sm"
            aria-label="User profile"
          >
            <User className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </header>
  );
}
