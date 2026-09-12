'use client';
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';

interface AuditItem {
  id: string;
  type: string;
  severity: string;
  description: string;
  timestamp: string;
}

export default function AuditPanel() {
  const [audits, setAudits] = useState<AuditItem[]>([]);

  const fetchAudits = () => {
    fetch('http://localhost:8000/api/v1/audit/discrepancies')
      .then((res) => res.json())
      .then((data) => setAudits(data))
      .catch((err) => console.error('API Fetch Error:', err));
  };

  useEffect(() => {
    fetchAudits();
    const interval = setInterval(fetchAudits, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border-l border-slate-800 p-5 rounded-r-lg backdrop-blur-md">
      <div className="mb-4 border-b border-slate-800 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400"/>
            3. Audit Discrepancies
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Real-time discrepancy detection log.</p>
        </div>
        <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-full flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          {audits.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {audits.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-10">No discrepancies detected yet.</div>
        ) : (
          audits.map((item) => (
            <div key={item.id} className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-xl shadow-md hover:border-amber-500/60 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 rounded">
                  {item.severity} SEVERITY
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400"/>
                  {item.timestamp}
                </span>
              </div>
              <p className="text-sm text-slate-200 font-medium leading-relaxed">{item.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
