"use client";

import { Crosshair, GitBranch, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";

const nodes = [
  { id: "contract", label: "Contract v3", type: "document", x: "18%", y: "26%" },
  { id: "commitment", label: "Launch commitment", type: "fact", x: "51%", y: "18%" },
  { id: "speaker-a", label: "Speaker A", type: "speaker", x: "77%", y: "33%" },
  { id: "timeline", label: "Timeline drift", type: "drift", x: "68%", y: "68%" },
  { id: "invoice", label: "Invoice 1042", type: "document", x: "28%", y: "74%" },
];

export function GraphCanvas() {
  const [selectedNode, setSelectedNode] = useState("commitment");
  const [zoom, setZoom] = useState(100);

  return (
    <section className="workspace-pane graph-pane min-h-[620px]" aria-label="Knowledge graph">
      <div className="pane-heading">
        <div>
          <p className="eyebrow">Pane 02 / Relations</p>
          <h2 className="pane-title">Knowledge graph</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="live-dot"><span /> Live canvas</span>
          <button className="icon-button" aria-label="Expand graph" title="Expand graph"><Maximize2 size={16} /></button>
        </div>
      </div>

      <div className="graph-toolbar">
        <div className="flex items-center gap-1">
          <button className="graph-tool" onClick={() => setZoom(Math.max(50, zoom - 10))} aria-label="Zoom out" title="Zoom out"><Minus size={14} /></button>
          <span className="min-w-12 text-center font-mono text-[10px] text-slate-500">{zoom}%</span>
          <button className="graph-tool" onClick={() => setZoom(Math.min(150, zoom + 10))} aria-label="Zoom in" title="Zoom in"><Plus size={14} /></button>
        </div>
        <div className="flex items-center gap-1">
          <button className="graph-tool" aria-label="Center graph" title="Center graph"><Crosshair size={14} /></button>
          <button className="graph-tool" onClick={() => setSelectedNode("commitment")} aria-label="Reset graph" title="Reset graph"><RotateCcw size={14} /></button>
        </div>
      </div>

      <div className="graph-stage">
        <div className="graph-grid" />
        <svg className="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="24" y1="31" x2="51" y2="23" />
          <line x1="58" y1="25" x2="77" y2="35" />
          <line x1="73" y1="42" x2="69" y2="65" />
          <line x1="62" y1="70" x2="35" y2="76" />
          <line x1="25" y1="68" x2="22" y2="37" />
        </svg>
        {nodes.map((node) => (
          <button key={node.id} className={`graph-node node-${node.type} ${selectedNode === node.id ? "node-selected" : ""}`} style={{ left: node.x, top: node.y }} onClick={() => setSelectedNode(node.id)}>
            <span className="node-mark"><GitBranch size={12} /></span>
            <span>{node.label}</span>
          </button>
        ))}
        <div className="absolute bottom-4 left-4 border border-border bg-charcoal/90 px-3 py-2 font-mono text-[10px] text-slate-500">
          {selectedNode === "commitment" ? "Selected: launch commitment" : `Selected: ${nodes.find((node) => node.id === selectedNode)?.label}`}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4 text-[10px] uppercase tracking-[0.12em] text-slate-500">
        <span className="legend-item"><i className="legend-dot bg-blue-500" /> Source</span>
        <span className="legend-item"><i className="legend-dot bg-red-500" /> Contradiction</span>
        <span className="legend-item"><i className="legend-dot bg-amber-500" /> Drift</span>
      </div>
    </section>
  );
}
