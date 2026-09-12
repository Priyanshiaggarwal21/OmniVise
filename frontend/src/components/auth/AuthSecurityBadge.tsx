'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AuthSecurityBadge() {
  return (
    <div className="w-full max-w-[440px] mx-auto mt-4 bg-[#EAF6F2]/90 border border-[#C5EBDF] rounded-2xl px-4 py-3 text-center flex items-center justify-center gap-2 text-xs text-slate-700 shadow-sm backdrop-blur-xs">
      <ShieldCheck className="w-4 h-4 text-[#0B5C48] shrink-0" />
      <span className="leading-snug">
        Protected by 256-bit TLS encryption &amp; cryptographic node isolation.
      </span>
    </div>
  );
}
