'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Check,
  Key,
  ArrowRight,
} from 'lucide-react';
import AuthHeader from '../../components/auth/AuthHeader';
import AuthFooter from '../../components/auth/AuthFooter';

export type OmniViseRole = 'Analyst' | 'Reviewer' | 'Admin' | 'Executive';

interface RoleConfig {
  role: OmniViseRole;
  title: string;
  description: string;
  tier: string;
  code: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const ROLES: RoleConfig[] = [
  {
    role: 'Analyst',
    title: 'Analyst',
    description: 'Upload evidence, run queries, and trace source graphs across ingested repositories.',
    tier: 'Clearance Tier 1',
    code: 'AC - 01',
    icon: Search,
    iconBg: 'bg-[#EBF3FF]',
    iconColor: 'text-[#2563EB]',
  },
  {
    role: 'Reviewer',
    title: 'Reviewer',
    description: 'Verify conclusions, inspect contradictions, and approve institutional decisions.',
    tier: 'Clearance Tier 2',
    code: 'AC - 02 · AUDIT',
    icon: ShieldCheck,
    iconBg: 'bg-[#0B5C48]',
    iconColor: 'text-white',
  },
  {
    role: 'Admin',
    title: 'Admin',
    description: 'Manage users, evidence sources, RBAC policies, and perimeter trust anchors.',
    tier: 'Clearance Tier 3',
    code: 'AC - SYS',
    icon: ShieldAlert,
    iconBg: 'bg-[#E0F7FA]',
    iconColor: 'text-[#00838F]',
  },
  {
    role: 'Executive',
    title: 'Executive',
    description: 'View decision snapshots, verified strategic briefs, and confidence heatmaps.',
    tier: 'Clearance Tier 3',
    code: 'AC - EXEC',
    icon: Activity,
    iconBg: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]',
  },
];

export default function SelectRolePage() {
  const router = useRouter();
  // Default to Reviewer to match reference, or user selection
  const [selectedRole, setSelectedRole] = useState<OmniViseRole>('Reviewer');

  const handleContinue = () => {
    if (!selectedRole) return;
    try {
      sessionStorage.setItem('omnivise_selected_role', selectedRole);
      localStorage.setItem('omnivise_selected_role', selectedRole);
    } catch {
      // Ignore storage errors in restricted iframe/browser environments
    }
    router.push(`/login?role=${encodeURIComponent(selectedRole)}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between selection:bg-[#0B5C48]/10 selection:text-[#0B5C48] relative overflow-hidden">
      {/* Ambient background gradients matching the light luminous reference */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-[#E6F8F3]/60 via-[#F1F5F9]/40 to-transparent pointer-events-none rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/4 right-10 w-[400px] h-[400px] bg-emerald-50/40 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <AuthHeader />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-6 py-8 sm:py-10 my-auto flex flex-col items-center">
        {/* Step Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EBF2FC] text-[#1E3A8A] text-[11px] font-bold tracking-wider uppercase mb-5 border border-[#D5E2F5] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#0B5C48]" />
          <span>Step 1 of 2 &middot; Identity Verification</span>
        </div>

        {/* Hero Title & Description */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-[#0F172A] text-center tracking-tight mb-3">
          Who&apos;s signing in?
        </h1>
        <p className="text-sm text-slate-500 text-center max-w-xl leading-relaxed mb-10">
          Select your organizational role to configure workspace permissions, cryptographic clearance, and audit scopes.
        </p>

        {/* 2x2 Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
          {ROLES.map((item) => {
            const isSelected = selectedRole === item.role;
            const Icon = item.icon;

            return (
              <button
                key={item.role}
                type="button"
                onClick={() => setSelectedRole(item.role)}
                className={`relative w-full text-left p-6 rounded-2xl transition-all duration-200 focus:outline-none overflow-hidden group ${
                  isSelected
                    ? 'bg-white border-2 border-[#0B5C48] shadow-md ring-4 ring-[#0B5C48]/5'
                    : 'bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* Active corner accent + checkmark badge */}
                {isSelected ? (
                  <div className="absolute top-0 right-0 w-14 h-14 bg-[#D5F5EC] rounded-bl-3xl flex items-start justify-end p-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#0B5C48] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute top-5 right-5 w-4 h-4 rounded-full bg-slate-100 group-hover:bg-slate-200/70 transition-colors" />
                )}

                {/* Role Icon */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105 ${item.iconBg} ${item.iconColor}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Role Title & Active Tag */}
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-bold font-sans text-slate-900 tracking-tight">
                    {item.title}
                  </h2>
                  {isSelected && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#D5F5EC] text-[#0B5C48]">
                      Active
                    </span>
                  )}
                </div>

                {/* Role Description */}
                <p className="text-xs text-slate-500 leading-relaxed min-h-[36px] mb-5">
                  {item.description}
                </p>

                {/* Bottom Clearance Info */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className={`font-sans ${isSelected ? 'text-[#0B5C48] font-medium' : 'text-slate-400'}`}>
                    {item.tier}
                  </span>
                  <span className={isSelected ? 'text-[#0B5C48] font-bold' : 'text-slate-400'}>
                    {item.code}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Big Action Pill Button */}
        <div className="flex flex-col items-center gap-3 w-full max-w-2xl mb-8">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full sm:w-auto px-10 py-3.5 bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white font-medium text-sm rounded-full transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 cursor-pointer group"
          >
            <span>Continue as {selectedRole}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Secondary Administrator Prompt */}
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>Need sovereign or air-gapped clearance?</span>
            <Link
              href="/dashboard/help"
              className="text-[#0B5C48] font-semibold hover:underline"
            >
              Contact Administrator
            </Link>
          </p>
        </div>

        {/* Hardware Token Banner */}
        <div className="w-full max-w-2xl bg-[#E5F7F3]/90 border border-[#BCEEE2] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
            <div className="w-9 h-9 rounded-full bg-[#7FE5CE] text-[#0B5C48] flex items-center justify-center shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  Hardware Token Ready
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B5C48]" />
                <span className="text-[11px] font-mono text-[#0B5C48] font-medium">
                  FIPS-140-3
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Next screen will challenge via WebAuthn, FIDO2, or institutional PKI card.
              </p>
            </div>
          </div>

          <div className="bg-[#E8EFFE] text-[#3B66DE] border border-[#D5E2FD] text-[11px] font-mono font-bold px-3 py-1.5 rounded-lg whitespace-nowrap self-start sm:self-center">
            NODE : US-EAST-SEC-04
          </div>
        </div>
      </main>

      {/* Footer */}
      <AuthFooter />
    </div>
  );
}
