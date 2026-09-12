'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function AuthFooter() {
  return (
    <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-xs text-slate-500 font-medium flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-200/50 mt-auto">
      {/* Compliance Certifications */}
      <div className="flex items-center flex-wrap justify-center gap-4 text-slate-600">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#0B5C48]" />
          <span>SOC 2 Type II Certified</span>
        </div>
        <span className="text-slate-300 hidden sm:inline">•</span>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0B5C48]" />
          <span>ISO/IEC 27001 Compliant</span>
        </div>
      </div>

      {/* Links & Copyright */}
      <div className="flex items-center flex-wrap justify-center gap-4 text-slate-500">
        <Link href="/dashboard/help" className="hover:text-slate-800 transition-colors">
          Privacy Policy
        </Link>
        <Link href="/dashboard/help" className="hover:text-slate-800 transition-colors">
          Terms of Service
        </Link>
        <span className="text-slate-400">
          &copy; {new Date().getFullYear()} OmniVise Technologies Inc. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
