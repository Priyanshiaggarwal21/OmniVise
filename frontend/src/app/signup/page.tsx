'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Mail,
  Lock,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowRight,
  Key,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import AuthHeader from '../../components/auth/AuthHeader';
import AuthFooter from '../../components/auth/AuthFooter';
import AuthSecurityBadge from '../../components/auth/AuthSecurityBadge';

function SignupFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<string>('Analyst');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    identifier?: string;
    password?: string;
    confirmPassword?: string;
    agreeTerms?: string;
    form?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam) {
      setRole(roleParam);
    } else {
      const stored =
        sessionStorage.getItem('omnivise_selected_role') ||
        localStorage.getItem('omnivise_selected_role');
      if (stored) setRole(stored);
    }
  }, [searchParams]);

  // Compute password strength
  const getPasswordStrength = () => {
    if (!password) return { level: 0, label: '' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { level: 1, label: 'WEAK' };
    if (score === 2) return { level: 2, label: 'FAIR' };
    if (score === 3) return { level: 3, label: 'GOOD' };
    return { level: 4, label: 'STRONG' };
  };

  const passwordStrength = getPasswordStrength();
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!identifier.trim()) {
      newErrors.identifier = 'Work email or mobile number is required';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) &&
      !/^\+?[0-9\s-]{8,15}$/.test(identifier)
    ) {
      newErrors.identifier = 'Enter a valid enterprise email or phone number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must accept the terms to proceed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const isEmail = identifier.includes('@');
      const payload: {
        name: string;
        password: string;
        role: string;
        email?: string;
        phone?: string;
      } = {
        name: name.trim(),
        password,
        role: role.toLowerCase(),
      };
      if (isEmail) {
        payload.email = identifier.trim().toLowerCase();
      } else {
        payload.phone = identifier.trim();
        payload.email = `${identifier.replace(/[^0-9]/g, '')}@omnivise.local`;
      }

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({
          form: data.error || data.detail || 'Registration failed. Please verify your details.',
        });
        setIsSubmitting(false);
        return;
      }

      if (data.access_token) {
        localStorage.setItem('omnivise_token', data.access_token);
      }
      if (data.role) {
        localStorage.setItem('omnivise_selected_role', data.role);
        sessionStorage.setItem('omnivise_selected_role', data.role);
      }
      if (data.user) {
        localStorage.setItem('omnivise_user', JSON.stringify(data.user));
      }

      setIsSubmitting(false);
      setSubmittedSuccess(true);

      setTimeout(() => {
        router.push(
          `/login?role=${encodeURIComponent(role)}&registered=true&email=${encodeURIComponent(identifier)}`
        );
      }, 900);
    } catch (err: unknown) {
      const error = err as Error;
      setErrors({
        form: error?.message || 'Network error connecting to OmniVise gateway.',
      });
      setIsSubmitting(false);
    }
  };

  const handleFipsMock = () => {
    alert('FIPS 140-3 Hardware Token registration initiated. Preparing cryptographic pair...');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between selection:bg-[#0B5C48]/10 selection:text-[#0B5C48] relative overflow-hidden">
      {/* Ambient luminous background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-[#E6F8F3]/60 via-[#F1F5F9]/40 to-transparent pointer-events-none rounded-full blur-3xl -z-10" />

      {/* Header */}
      <AuthHeader subtitle="Institutional Gateway" showAvatar={true} />

      {/* Main Container */}
      <main className="w-full max-w-lg mx-auto px-4 py-6 sm:py-8 my-auto flex flex-col items-center">
        {/* Floating Card */}
        <div className="w-full max-w-[440px] bg-white rounded-3xl p-7 sm:p-9 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] border border-slate-100 relative">
          {/* Top Decorative Header Block matching Reference Image 3 */}
          <div className="w-full bg-[#F1F3F9] rounded-2xl p-4 mb-6 flex items-center justify-between border border-slate-200/50">
            <div>
              <span className="font-bold text-slate-900 text-sm block">
                Workspace Onboarding
              </span>
              <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                Clearance profile: <strong className="text-[#0B5C48]">{role}</strong>
              </span>
            </div>
            <Link
              href="/select-role"
              className="text-[#0B5C48] hover:text-[#084838] font-semibold text-xs transition-colors"
            >
              Change
            </Link>
          </div>

          {/* Heading & Subtitle */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-sans font-bold text-slate-900 tracking-tight mb-2">
              Create your account
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Set up your credentials to access verified intelligence workspaces.
            </p>
          </div>

          {submittedSuccess ? (
            <div className="p-6 bg-[#E6F8F3] border border-[#BCEEE2] rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#0B5C48] text-white mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-[#0B5C48]">Account Created Successfully</h2>
              <p className="text-xs text-slate-600">
                Directing you to the verification gateway to complete sign in...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errors.form && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed">{errors.form}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                      if (errors.form) setErrors((prev) => ({ ...prev, form: undefined }));
                    }}
                    placeholder="e.g. Elena Rostova"
                    className={`w-full bg-[#F8FAFC] border text-slate-900 text-xs rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.name
                        ? 'border-rose-400 focus:ring-rose-400/20'
                        : 'border-slate-200 focus:border-[#0B5C48] focus:ring-[#0B5C48]/10'
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.name}</p>
                )}
              </div>

              {/* Work Email or Mobile ID */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Work Email or Mobile ID
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }));
                      if (errors.form) setErrors((prev) => ({ ...prev, form: undefined }));
                    }}
                    placeholder="analyst@institutional.omnivise.com"
                    className={`w-full bg-[#F8FAFC] border text-slate-900 text-xs rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.identifier
                        ? 'border-rose-400 focus:ring-rose-400/20'
                        : 'border-slate-200 focus:border-[#0B5C48] focus:ring-[#0B5C48]/10'
                    }`}
                  />
                </div>
                {errors.identifier && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.identifier}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Min 12 chars</span>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                      if (errors.form) setErrors((prev) => ({ ...prev, form: undefined }));
                    }}
                    placeholder="Minimum 12 characters"
                    className={`w-full bg-[#F8FAFC] border text-slate-900 text-xs rounded-xl pl-10 pr-10 py-3 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.password
                        ? 'border-rose-400 focus:ring-rose-400/20'
                        : 'border-slate-200 focus:border-[#0B5C48] focus:ring-[#0B5C48]/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex-1 grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1 rounded-full transition-colors ${
                            passwordStrength.level >= step
                              ? 'bg-[#0B5C48]'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold tracking-wider text-[#0B5C48]">
                      {passwordStrength.label}
                    </span>
                  </div>
                )}

                {errors.password && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <RotateCcw className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword)
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    placeholder="Re-enter password"
                    className={`w-full bg-[#F8FAFC] border text-slate-900 text-xs rounded-xl pl-10 pr-10 py-3 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.confirmPassword
                        ? 'border-rose-400 focus:ring-rose-400/20'
                        : 'border-slate-200 focus:border-[#0B5C48] focus:ring-[#0B5C48]/10'
                    }`}
                  />
                  {passwordsMatch ? (
                    <div className="absolute right-3.5 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0B5C48] focus:ring-[#0B5C48] accent-[#0B5C48]"
                  />
                  <span className="leading-snug text-[11px] text-slate-600">
                    I agree to OmniVise{' '}
                    <Link href="/dashboard/help" className="text-[#0B5C48] font-semibold hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/dashboard/help" className="text-[#0B5C48] font-semibold hover:underline">
                      Institutional Security Policy
                    </Link>
                  </span>
                </label>
                {errors.agreeTerms && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.agreeTerms}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#0B5C48] hover:bg-[#084838] active:bg-[#06392c] text-white font-medium text-xs sm:text-sm rounded-full transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 mt-3 cursor-pointer group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? 'Creating Workspace Profile...' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/80" />
            </div>
            <div className="relative inline-block bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Or continue with
            </div>
          </div>

          {/* Hardware Security Key Option */}
          <button
            type="button"
            onClick={handleFipsMock}
            className="w-full py-2.5 px-4 bg-[#EFF5F9] hover:bg-[#E2EDF5] border border-[#D5E3EE] rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-700 transition-colors mb-6 group cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span className="truncate">Register with Hardware Security Key (FIPS 140-3)</span>
            <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0">
              FAST
            </span>
          </button>

          {/* Bottom Card Link */}
          <div className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link
              href={`/login?role=${encodeURIComponent(role)}`}
              className="text-[#0B5C48] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Docked Security Badge */}
        <AuthSecurityBadge />
      </main>

      {/* Footer */}
      <AuthFooter />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center text-xs text-slate-500">
          Loading registration gateway...
        </div>
      }
    >
      <SignupFormContent />
    </Suspense>
  );
}
