'use client';
import React, { useState } from 'react';
import { Network, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

export default function GraphCanvas() {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CONTRADICTIONS'>('ALL');

  const nodes = [
    { id: '1', label: 'Q3 Financial Report (PDF)', type: 'SOURCE', x: '15%', y: '25%', color: 'bg-indigo-500' },
    { id: '2', label: 'Revenue Claim ($45M)', type: 'CLAIM', x: '50%', y: '20%', color: 'bg-emerald-500' },
    { id: '3', label: 'Live Transcript Audio', type: 'SOURCE', x: '15%', y: '70%', color: 'bg-indigo-500' },
    { id: '4', label: 'Earnings Call ($41.2M)', type: 'CLAIM', x: '50%', y: '75%', color: 'bg-emerald-500' },
    { id: '5', label: 'CONTRADICTION DETECTED', type: 'DISCREPANCY', x: '80%', y: '48%', color: 'bg-rose-500 animate-pulse' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 p-5 relative overflow-hidden rounded-md border border-slate-800">
      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3 z-10">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400"/>
            2. Real-Time Knowledge Graph
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Semantic relationship extraction & conflict mapping.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveFilter(activeFilter === 'ALL' ? 'CONTRADICTIONS' : 'ALL')}
            className={`px-3 py-1 border text-xs font-semibold rounded-full transition-colors ${
              activeFilter === 'CONTRADICTIONS'
                ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-cyan-300'
            }`}
          >
            {activeFilter === 'CONTRADICTIONS' ? 'Showing Conflicts Only' : 'Filter: All Nodes'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/60 rounded-xl border border-slate-800/80 relative overflow-hidden p-4 shadow-inner">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* Dynamic Nodes Mapping */}
        {nodes
          .filter(node => activeFilter === 'ALL' || node.type === 'DISCREPANCY')
          .map((node) => (
            <div
              key={node.id}
              style={{ left: node.x, top: node.y }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 p-2.5 bg-slate-900/90 border border-slate-700 rounded-lg shadow-lg hover:scale-105 transition-transform cursor-pointer group z-10"
            >
              <span className={`w-3 h-3 rounded-full ${node.color}`} />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                {node.label}
              </span>
            </div>
          ))}

        {/* Overlay Canvas Controls */}
        <div className="absolute bottom-4 right-4 flex gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-lg shadow-md z-20">
          <button className="p-1.5 hover:bg-slate-800 rounded text-slate-300"><ZoomIn className="w-4 h-4"/></button>
          <button className="p-1.5 hover:bg-slate-800 rounded text-slate-300"><ZoomOut className="w-4 h-4"/></button>
          <button className="p-1.5 hover:bg-slate-800 rounded text-slate-300"><RefreshCw className="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  );
}
