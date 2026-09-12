'use client';

import { Bell, CheckCircle2, Clock3, KeyRound, Languages, Laptop, LogOut, Palette, Save, ShieldCheck, SlidersHorizontal, Type, Upload, UserRound, Volume2, Zap } from 'lucide-react';
import { useState } from 'react';

type SettingsTab = 'profile' | 'general' | 'security' | 'notifications';
type ToggleRowProps = { label: string; description: string; enabled: boolean; onChange: () => void; icon: React.ReactNode };
interface SettingsViewProps { onSignOut?: () => void; }

const TABS: { id: SettingsTab; label: string; icon: typeof UserRound }[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'security', label: 'Security & Privacy', icon: ShieldCheck },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function ToggleRow({ label, description, enabled, onChange, icon }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3"><div className="rounded-xl border border-white/10 bg-slate-950/70 p-2 text-indigo-300">{icon}</div><div><p className="text-sm font-bold text-slate-100">{label}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div></div>
      <button type="button" role="switch" aria-checked={enabled} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? 'bg-indigo-500' : 'bg-slate-700'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${enabled ? 'left-6' : 'left-1'}`} /></button>
    </div>
  );
}

export default function SettingsView({ onSignOut }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [piiRedaction, setPiiRedaction] = useState(true);
  const [liveWatermark, setLiveWatermark] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30m');
  const [voiceExplanation, setVoiceExplanation] = useState(false);
  const [riskSensitivity, setRiskSensitivity] = useState(10000);
  const [erpKey, setErpKey] = useState('');
  const [erpEndpoint, setErpEndpoint] = useState('');
  const [sapApiKey, setSapApiKey] = useState('');
  const [quickBooksApiKey, setQuickBooksApiKey] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [sessionsCleared, setSessionsCleared] = useState(false);
  const [highRiskEmailAlerts, setHighRiskEmailAlerts] = useState(true);
  const [slackWebhooks, setSlackWebhooks] = useState(false);
  const [dailySummary, setDailySummary] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileName, setProfileName] = useState('Priyanshi Aggarwal');
  const [profileEmail, setProfileEmail] = useState('audit-support@omnivise.ai');
  const [profilePhone, setProfilePhone] = useState('+91 8860096173');
  const [designation, setDesignation] = useState('Lead Auditor');
  const [fontSize, setFontSize] = useState('Medium');
  const [accentColor, setAccentColor] = useState('Cyan Glow');
  const [compactView, setCompactView] = useState(false);
  const [auditCurrency, setAuditCurrency] = useState('USD $');
  const [autoSaveDrafts, setAutoSaveDrafts] = useState(true);
  const [language, setLanguage] = useState('English');

  const saveSettings = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setAvatarUrl(URL.createObjectURL(file));
  };

  const updatePassword = () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) return;
    setPasswordSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    window.setTimeout(() => setPasswordSaved(false), 2500);
  };

  const logOutAllDevices = () => {
    setSessionsCleared(true);
    window.setTimeout(() => setSessionsCleared(false), 2500);
  };

  return (
    <section className="min-h-[calc(100vh-7rem)] rounded-3xl border border-white/10 bg-slate-950/65 p-5 shadow-2xl backdrop-blur-2xl md:p-7">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/80">Workspace configuration</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Settings</h1><p className="mt-1 text-xs text-slate-400">Manage your OmniVise workspace, controls, and notification preferences.</p></div><div className="flex items-center gap-2 text-xs font-bold text-emerald-300"><ShieldCheck size={16} /> Configuration protected</div></header>

        <nav className="mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1.5" aria-label="Settings sections" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-all md:px-4 ${activeTab === id ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30 shadow-lg shadow-indigo-950/20' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'}`}><Icon size={14} />{label}</button>)}
        </nav>

        <div key={activeTab} className="mt-6 animate-[fadeIn_220ms_ease-out]">
          {activeTab === 'profile' && <div className="space-y-5"><SettingsPanelHeader icon={<UserRound size={16} />} title="Auditor Profile" description="Manage your identity and audit workspace credentials." /><div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-center"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-emerald-400/20 text-2xl font-black text-white">{avatarUrl ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }} /> : 'PA'}</div><div><p className="text-sm font-black text-slate-100">Profile avatar</p><p className="mt-1 text-xs text-slate-500">Use a clear image for audit sign-off identity.</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-black text-slate-300 transition hover:bg-white/10 hover:text-white"><Upload size={13} /> Upload avatar<input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" /></label></div></div><div className="grid gap-4 md:grid-cols-2"><Field label="Full Name" value={profileName} onChange={setProfileName} /><div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4"><p className="text-xs font-bold text-indigo-200">Role</p><span className="mt-2 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-black text-indigo-200">Lead Auditor / Admin</span></div><Field label="Work Email" value={profileEmail} type="email" onChange={setProfileEmail} /><Field label="Phone Number" value={profilePhone} type="tel" onChange={setProfilePhone} /><label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs font-bold text-slate-400">Designation<select value={designation} onChange={(event) => setDesignation(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-400/50"><option>Lead Auditor</option><option>Audit Manager</option><option>Senior Auditor</option><option>Audit Analyst</option></select></label><Field label="Workspace" value="OmniVise Holdings" /></div><div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.05] p-4"><p className="text-xs font-bold text-emerald-200">Account verified</p><p className="mt-1 text-[11px] text-slate-500">Your identity is protected by the workspace RBAC policy.</p></div></div>}

          {activeTab === 'general' && <div className="space-y-5"><SettingsPanelHeader icon={<SlidersHorizontal size={16} />} title="General" description="Configure materiality thresholds and ERP connections." /><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-amber-300" /><h2 className="text-sm font-bold text-slate-100">Risk sensitivity</h2><span className="ml-auto rounded-lg bg-amber-500/10 px-2 py-1 font-mono text-xs font-bold text-amber-200">${riskSensitivity.toLocaleString()}</span></div><p className="mt-1 text-xs text-slate-500">Flag variances at or above this materiality threshold.</p><input type="range" min="1000" max="50000" step="1000" value={riskSensitivity} onChange={(event) => setRiskSensitivity(Number(event.target.value))} className="mt-5 w-full accent-amber-400" /><div className="mt-2 flex justify-between font-mono text-[10px] text-slate-600"><span>$1k</span><span>$50k</span></div></div><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center gap-2"><KeyRound size={16} className="text-indigo-300" /><h2 className="text-sm font-bold text-slate-100">ERP API connection</h2></div><p className="mt-1 text-xs text-slate-500">Credentials are stored locally for this workspace session.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="API key" value={erpKey} type="password" placeholder="erp_live_********" onChange={setErpKey} /><Field label="Base endpoint" value={erpEndpoint} type="url" placeholder="https://erp.example.com/api" onChange={setErpEndpoint} /></div></div></div>}

          {activeTab === 'general' && <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-2"><PreferenceSelect icon={<Type size={15} />} label="Font Size" value={fontSize} onChange={setFontSize} options={['Small', 'Medium', 'Large']} /><PreferenceSelect icon={<Palette size={15} />} label="Theme Accent Color" value={accentColor} onChange={setAccentColor} options={['Cyan Glow', 'Emerald', 'Violet']} /><PreferenceSelect icon={<DollarIcon />} label="Default Audit Currency" value={auditCurrency} onChange={setAuditCurrency} options={['USD $', 'INR ₹', 'EUR €']} /><PreferenceSelect icon={<Languages size={15} />} label="Language" value={language} onChange={setLanguage} options={['English', 'Hindi', 'German', 'French']} /><ToggleRow label="Compact View" description="Use denser tables and reduced panel spacing." enabled={compactView} onChange={() => setCompactView((value) => !value)} icon={<SlidersHorizontal size={16} />} /><ToggleRow label="Auto-Save Drafts" description="Save in-progress audit notes automatically." enabled={autoSaveDrafts} onChange={() => setAutoSaveDrafts((value) => !value)} icon={<Save size={16} />} /></div>}

          {activeTab === 'security' && <div className="space-y-4"><SettingsPanelHeader icon={<ShieldCheck size={16} />} title="Security & Privacy" description="Protect sensitive data during reviews and shared sessions." /><ToggleRow label="Screen Share Privacy" description="Auto-redact PII, bank details, and sensitive numbers during screen sharing." enabled={piiRedaction} onChange={() => setPiiRedaction((value) => !value)} icon={<ShieldCheck size={16} />} /><div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Screen share preview</p><p className={`mt-1 font-mono text-sm font-bold tracking-wider text-slate-100 transition ${piiRedaction ? 'blur-sm select-none' : ''}`}>{piiRedaction ? '**** **** 9012' : '4111 2233 4455 9012'}</p></div><ToggleRow label="Live Watermark" description="Show workspace identity and session time on shared screens." enabled={liveWatermark} onChange={() => setLiveWatermark((value) => !value)} icon={<ShieldCheck size={16} />} /><PreferenceSelect icon={<Clock3 size={15} />} label="Session Timeout" value={sessionTimeout} onChange={setSessionTimeout} options={['15m', '30m', '1h']} /><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center gap-2"><KeyRound size={16} className="text-indigo-300" /><div><h2 className="text-sm font-bold text-slate-100">API Key Management</h2><p className="mt-1 text-xs text-slate-500">Manage local connector credentials for ERP integrations.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="SAP API key" value={sapApiKey} type="password" placeholder="sap_live_********" onChange={setSapApiKey} /><Field label="QuickBooks API key" value={quickBooksApiKey} type="password" placeholder="quickbooks_live_********" onChange={setQuickBooksApiKey} /></div></div><ToggleRow label="Voice Explanation" description="Read evidence summaries aloud during audit review." enabled={voiceExplanation} onChange={() => setVoiceExplanation((value) => !value)} icon={<Volume2 size={16} />} /></div>}

          {activeTab === 'security' && <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center gap-2"><KeyRound size={16} className="text-indigo-300" /><div><h2 className="text-sm font-bold text-slate-100">Password & Credentials</h2><p className="mt-1 text-xs text-slate-500">Update the password used to access your audit workspace.</p></div></div><div className="mt-4 space-y-3"><Field label="Current Password" value={currentPassword} type="password" placeholder="Enter current password" onChange={setCurrentPassword} /><Field label="New Password" value={newPassword} type="password" placeholder="Enter new password" onChange={setNewPassword} /><Field label="Confirm Password" value={confirmPassword} type="password" placeholder="Confirm new password" onChange={setConfirmPassword} /><button type="button" onClick={updatePassword} disabled={!currentPassword || !newPassword || newPassword !== confirmPassword} className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2.5 text-xs font-black text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"><KeyRound size={14} /> Update Password</button>{passwordSaved && <p className="flex items-center gap-2 text-xs font-bold text-emerald-300"><CheckCircle2 size={14} /> Password updated successfully.</p>}</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center gap-2"><Laptop size={16} className="text-amber-300" /><div><h2 className="text-sm font-bold text-slate-100">Session & Security Actions</h2><p className="mt-1 text-xs text-slate-500">Review active access and revoke sessions immediately.</p></div></div><div className="mt-4 space-y-2"><div className="flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.05] p-3"><Laptop size={16} className="text-emerald-300" /><div className="flex-1"><p className="text-xs font-bold text-slate-200">Current browser</p><p className="mt-1 text-[10px] text-slate-500">Windows · Chrome · Active now</p></div><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" /></div><div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-3"><Laptop size={16} className="text-slate-500" /><div className="flex-1"><p className="text-xs font-bold text-slate-300">Office workstation</p><p className="mt-1 text-[10px] text-slate-600">Windows · Chrome · 2 hours ago</p></div></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={logOutAllDevices} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs font-black text-amber-200 transition hover:bg-amber-500/20"><LogOut size={14} /> Log Out of All Devices</button><button type="button" onClick={onSignOut} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-500"><LogOut size={14} /> Log Out of OmniVise</button></div>{sessionsCleared && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-300"><CheckCircle2 size={14} /> All other sessions have been logged out.</p>}</div></div>}

          {activeTab === 'notifications' && <div className="space-y-4"><SettingsPanelHeader icon={<Bell size={16} />} title="Notifications" description="Choose which audit events should reach your team." /><ToggleRow label="High-Severity Risk Email Alerts" description="Email the audit team when a high-risk discrepancy is detected." enabled={highRiskEmailAlerts} onChange={() => setHighRiskEmailAlerts((value) => !value)} icon={<Bell size={16} />} /><ToggleRow label="Slack Webhooks" description="Send live discrepancy and reconciliation alerts to Slack." enabled={slackWebhooks} onChange={() => setSlackWebhooks((value) => !value)} icon={<Zap size={16} />} /><ToggleRow label="Daily Summary Digest" description="Receive a daily overview of findings, claims, and processing activity." enabled={dailySummary} onChange={() => setDailySummary((value) => !value)} icon={<Bell size={16} />} /><ToggleRow label="System Maintenance Alerts" description="Get notified about planned downtime and connector maintenance." enabled={maintenanceAlerts} onChange={() => setMaintenanceAlerts((value) => !value)} icon={<ShieldCheck size={16} />} /></div>}
        </div>

        <div className="mt-6 flex justify-end"><button type="button" onClick={saveSettings} className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"><Save size={14} />{saved ? 'Changes saved' : activeTab === 'profile' ? 'Save Changes' : 'Save settings'}</button></div>
      </div>
    </section>
  );
}

function SettingsPanelHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex items-center gap-3 border-b border-white/10 pb-4"><div className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-2 text-indigo-300">{icon}</div><div><h2 className="text-sm font-black text-slate-100">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div></div>;
}

function PreferenceSelect({ icon, label, value, options, onChange }: { icon: React.ReactNode; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs font-bold text-slate-400"><span className="flex items-center gap-2">{icon}{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-400/50">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function DollarIcon() {
  return <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-400/30 text-[10px] text-emerald-300">$</span>;
}

function Field({ label, value, type = 'text', placeholder, onChange }: { label: string; value: string; type?: string; placeholder?: string; onChange?: (value: string) => void }) {
  return <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs font-bold text-slate-400">{label}{onChange ? <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-400/50" /> : <p className="mt-2 text-sm font-bold text-slate-100">{value}</p>}</label>;
}

