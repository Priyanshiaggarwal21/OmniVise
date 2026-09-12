'use client';

import React, { useState } from 'react';
import WelcomeAnimation from '../../components/auth/WelcomeAnimation';

const COLOR_SWATCHES = [
  {
    token: 'bg',
    varName: '--bg',
    hex: '#FDFCFA',
    label: 'Paper White (Canvas)',
    usage: 'Main page and background canvas',
    bgClass: 'bg-bg',
    borderClass: 'border-border',
  },
  {
    token: 'bg-secondary',
    varName: '--bg-secondary',
    hex: '#F1F1EC',
    label: 'Secondary Panel',
    usage: 'Sidebars, panels, and muted containers',
    bgClass: 'bg-bg-secondary',
    borderClass: 'border-border',
  },
  {
    token: 'ink',
    varName: '--ink',
    hex: '#14181C',
    label: 'Text Ink',
    usage: 'Primary body text, headings, dark icons',
    bgClass: 'bg-ink text-bg',
    borderClass: 'border-ink',
  },
  {
    token: 'ink-muted',
    varName: '--ink-muted',
    hex: '#55606A',
    label: 'Muted Ink',
    usage: 'Secondary labels, timestamps, captions',
    bgClass: 'bg-ink-muted text-bg',
    borderClass: 'border-ink-muted',
  },
  {
    token: 'accent-teal',
    varName: '--accent-teal',
    hex: '#0E6E5C',
    label: 'Primary Accent (Teal)',
    usage: 'Brand identity, primary actions, active indicators',
    bgClass: 'bg-accent-teal text-bg',
    borderClass: 'border-accent-teal',
  },
  {
    token: 'accent-gold',
    varName: '--accent-gold',
    hex: '#C08A2E',
    label: 'Secondary Accent (Gold)',
    usage: 'Strictly evidence highlights, claims, and citations',
    bgClass: 'bg-accent-gold text-bg',
    borderClass: 'border-accent-gold',
  },
  {
    token: 'border',
    varName: '--border',
    hex: '#E4E1D8',
    label: 'Border',
    usage: '1px hairline separation on flat panels and cards',
    bgClass: 'bg-border',
    borderClass: 'border-border',
  },
];

export default function StyleGuidePage() {
  const [showWelcomePreview, setShowWelcomePreview] = useState(false);

  return (
    <main className="min-h-screen bg-bg text-ink p-8 md:p-14 max-w-6xl mx-auto space-y-16">
      {/* Header */}
      <header className="border-b border-border pb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent-teal" />
          <p className="text-xs uppercase tracking-wider font-semibold text-accent-teal">
            OmniVise Design System
          </p>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink tracking-tight">
          Visual System &amp; Tokens
        </h1>
        <p className="text-sm text-ink-muted mt-2 max-w-2xl">
          Light mode token verification, typography scale (Fraunces + Inter), flat hairline 1px cards,
          and interactive state behaviors.
        </p>

        {/* Demo Nav with Animated Underline */}
        <nav className="mt-8 flex gap-8 text-xs font-medium uppercase tracking-wider text-ink-muted">
          <a href="#swatches" className="nav-link text-ink font-semibold">
            Color Swatches
          </a>
          <a href="#typography" className="nav-link">
            Type Scale
          </a>
          <a href="#buttons" className="nav-link">
            Button States
          </a>
          <a href="#interactive" className="nav-link">
            Interactive Cards
          </a>
        </nav>
      </header>

      {/* 1. Color Swatches */}
      <section id="swatches" className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="text-2xl font-serif font-semibold text-ink">1. Color Palette Tokens</h2>
          <span className="text-xs text-ink-muted font-mono">Light Mode Only — No Dark Backdrops</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLOR_SWATCHES.map((swatch) => (
            <div
              key={swatch.token}
              className="border border-border rounded p-3.5 bg-bg flex flex-col justify-between"
            >
              <div>
                <div
                  className={`h-16 w-full rounded-sm border ${swatch.borderClass} ${swatch.bgClass} flex items-end p-2 mb-3`}
                >
                  <span className="font-mono text-[11px] font-semibold">{swatch.hex}</span>
                </div>
                <h3 className="font-sans font-semibold text-xs text-ink">{swatch.label}</h3>
                <p className="text-[11px] text-ink-muted mt-1 leading-snug">{swatch.usage}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-ink-muted">
                <span>{swatch.token}</span>
                <span>{swatch.varName}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Type Scale */}
      <section id="typography" className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="text-2xl font-serif font-semibold text-ink">2. Typography Scale</h2>
          <span className="text-xs text-ink-muted font-mono">Headlines: Fraunces (Serif) | UI &amp; Body: Inter (Sans)</span>
        </div>

        <div className="border border-border rounded bg-bg p-6 space-y-6 divide-y divide-border">
          <div className="grid grid-cols-1 md:grid-cols-4 items-baseline gap-4 pt-3">
            <span className="text-xs font-mono text-ink-muted">H1 &middot; Fraunces 36px</span>
            <h1 className="md:col-span-3 text-4xl font-serif font-bold text-ink">
              Cross-Source Contradiction Surface
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 items-baseline gap-4 pt-6">
            <span className="text-xs font-mono text-ink-muted">H2 &middot; Fraunces 28px</span>
            <h2 className="md:col-span-3 text-3xl font-serif font-semibold text-ink">
              Auditor Evidence Graph &amp; Lineage
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 items-baseline gap-4 pt-6">
            <span className="text-xs font-mono text-ink-muted">H3 &middot; Fraunces 22px</span>
            <h3 className="md:col-span-3 text-2xl font-serif font-semibold text-ink">
              Verified Revenue Recognition Commitments
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 items-baseline gap-4 pt-6">
            <span className="text-xs font-mono text-ink-muted">H4 &middot; Fraunces 18px</span>
            <h4 className="md:col-span-3 text-xl font-serif font-medium text-ink">
              Q3 Earnings Call vs 10-Q Ingestion Log
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 items-baseline gap-4 pt-6">
            <span className="text-xs font-mono text-ink-muted">H5 &middot; Fraunces 16px</span>
            <h5 className="md:col-span-3 text-lg font-serif font-medium text-ink">
              Diarized Speaker Attributions (CFO vs 8-K)
            </h5>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 items-baseline gap-4 pt-6">
            <span className="text-xs font-mono text-ink-muted">H6 &middot; Fraunces 14px</span>
            <h6 className="md:col-span-3 text-base font-serif font-medium text-ink">
              Sub-Claim Discrepancy Classification
            </h6>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 items-baseline gap-4 pt-6">
            <span className="text-xs font-mono text-ink-muted">Body Regular &middot; Inter 14px</span>
            <p className="md:col-span-3 text-sm text-ink leading-relaxed">
              OmniVise ingests multi-format filings, earnings transcripts, and financial models to autonomously
              detect variance in factual assertions, temporal reporting shifts, and metric drift.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 items-baseline gap-4 pt-6">
            <span className="text-xs font-mono text-ink-muted">Caption &middot; Inter 12px</span>
            <p className="md:col-span-3 text-xs text-ink-muted">
              Source: SEC EDGAR 10-Q &bull; Millisecond timestamp 00:14:22.408 &bull; Verified via Llama 3.3 70B
            </p>
          </div>
        </div>
      </section>

      {/* 3. Button States */}
      <section id="buttons" className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="text-2xl font-serif font-semibold text-ink">3. Button States</h2>
          <span className="text-xs text-ink-muted font-mono">Default, Hover, Active, Disabled</span>
        </div>

        <div className="border border-border rounded bg-bg p-6 space-y-8">
          {/* Primary Buttons */}
          <div>
            <div className="mb-3">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-ink">
                Primary Action Buttons (Deep Teal Accent)
              </h3>
              <p className="text-[11px] text-ink-muted">Primary user workflows, confirmations, submissions</p>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <button
                type="button"
                className="px-4 py-2 bg-accent-teal text-bg text-xs font-semibold rounded transition-colors duration-150 hover:bg-[#0b5849] active:bg-[#084539] focus:outline-none focus:ring-2 focus:ring-accent-teal/30"
              >
                Default State
              </button>

              <button
                type="button"
                className="px-4 py-2 bg-[#0b5849] text-bg text-xs font-semibold rounded"
              >
                Simulated :hover
              </button>

              <button
                type="button"
                className="px-4 py-2 bg-[#084539] text-bg text-xs font-semibold rounded"
              >
                Simulated :active
              </button>

              <button
                type="button"
                disabled
                className="px-4 py-2 bg-[#F1F1EC] text-ink-muted border border-border text-xs font-semibold rounded cursor-not-allowed opacity-60"
              >
                Disabled
              </button>
            </div>
          </div>

          {/* Secondary Outline Buttons */}
          <div className="pt-6 border-t border-border">
            <div className="mb-3">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-ink">
                Secondary / Outline Buttons
              </h3>
              <p className="text-[11px] text-ink-muted">1px hairline border, neutral ink styling</p>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <button
                type="button"
                className="px-4 py-2 bg-bg hover:bg-bg-secondary text-ink border border-border text-xs font-medium rounded transition-colors duration-150 active:bg-[#EAE8E1] focus:outline-none"
              >
                Default Outline
              </button>

              <button
                type="button"
                className="px-4 py-2 bg-bg-secondary text-ink border border-border text-xs font-medium rounded"
              >
                Simulated :hover
              </button>

              <button
                type="button"
                className="px-4 py-2 bg-[#EAE8E1] text-ink border border-border text-xs font-medium rounded"
              >
                Simulated :active
              </button>

              <button
                type="button"
                disabled
                className="px-4 py-2 bg-bg text-ink-muted/50 border border-border/60 text-xs font-medium rounded cursor-not-allowed"
              >
                Disabled
              </button>
            </div>
          </div>

          {/* Evidence Highlight Badges & Buttons */}
          <div className="pt-6 border-t border-border">
            <div className="mb-3">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-accent-gold">
                Evidence Highlights Only (Warm Gold Token)
              </h3>
              <p className="text-[11px] text-ink-muted">Strictly reserved for citations, claims, and audit flags</p>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <span className="inline-flex items-center px-3 py-1.5 bg-[#FBF6EC] border border-[#ECD9B2] text-accent-gold text-xs font-medium rounded">
                Evidence Tag: Revenue Citation &sect;4.2
              </span>
              <button
                type="button"
                className="px-4 py-2 bg-accent-gold text-bg text-xs font-semibold rounded hover:bg-[#a67524] transition-colors"
              >
                Jump to Evidence
              </button>
              <span className="text-xs text-ink-muted italic">
                (Gold is never used for general UI buttons or nav elements)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Flat Cards (Hairline Border & Subtle Tint on Hover) */}
      <section id="interactive" className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="text-2xl font-serif font-semibold text-ink">4. Interactive Selectable Cards</h2>
          <span className="text-xs text-ink-muted font-mono">Hairline 1px border, 4-6px radius, no drop shadows</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="selectable-card border border-border rounded bg-bg p-5 cursor-pointer">
            <span className="text-[10px] font-mono uppercase tracking-wider text-accent-teal font-semibold">
              Selectable Card &middot; Hover Me
            </span>
            <h3 className="font-serif text-lg font-semibold text-ink mt-1">Audit Trail #1042</h3>
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">
              Hover over this flat card to observe the hairline border shift to teal and subtle background tint,
              reverting cleanly on mouse-leave.
            </p>
          </div>

          <div className="selectable-card border border-border rounded bg-bg p-5 cursor-pointer">
            <span className="text-[10px] font-mono uppercase tracking-wider text-accent-teal font-semibold">
              Selectable Card &middot; Hover Me
            </span>
            <h3 className="font-serif text-lg font-semibold text-ink mt-1">GAAP Discrepancy</h3>
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">
              Strictly flat surface with no drop shadows or rounded pill shapes, keeping data density crisp.
            </p>
          </div>

          <div className="border border-border rounded bg-bg-secondary p-5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-semibold">
              Secondary Surface (Non-Interactive)
            </span>
            <h3 className="font-serif text-lg font-semibold text-ink mt-1">Secondary Panel (#F1F1EC)</h3>
            <p className="text-xs text-ink-muted mt-2 leading-relaxed">
              Static secondary panel background used for sidebars and tool docks.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Welcome Animation Preview */}
      <section id="welcome-animation" className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="text-2xl font-serif font-semibold text-ink">5. Post-Login Welcome Animation</h2>
          <span className="text-xs text-ink-muted font-mono">Understated cursive Hello + Inter success text</span>
        </div>

        <div className="border border-border rounded bg-bg p-6 space-y-4">
          <p className="text-xs text-ink-muted">
            Click below to trigger the full-screen welcome transition that plays immediately upon login verification before loading the workspace dashboard.
          </p>

          <button
            type="button"
            onClick={() => setShowWelcomePreview(true)}
            className="px-4 py-2 bg-accent-teal hover:bg-[#0b5849] active:bg-[#084539] text-bg text-xs font-semibold rounded transition-colors"
          >
            Play Full-Screen Welcome Animation
          </button>
        </div>
      </section>

      {showWelcomePreview && (
        <WelcomeAnimation
          onComplete={() => setShowWelcomePreview(false)}
        />
      )}
    </main>
  );
}

