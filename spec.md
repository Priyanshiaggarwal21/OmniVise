# OmniVise: Master System Specification

## 1. Executive Overview & Problem Statement
OmniVise is a multi-modal intelligence, audit, and cross-source discrepancy detection workspace. It solves information overload by ingesting multi-format data (Audio, Video streams, PDFs, Excel sheets, and Code Repositories) and automatically surfacing cross-source contradictions and timeline drifts with millisecond-precise timestamp and document citations.

## 2. Core Architecture & Tech Stack
- **Frontend Framework:** Next.js 14 (App Router, TypeScript)
- **Styling & UI:** Tailwind CSS, Shadcn UI Components
- **Visual Core:** React Flow / Cytoscape.js (Interactive Knowledge Graph)
- **Backend Engine:** FastAPI (Python 3.11+, Async Engine)
- **AI Models & RAG:** Groq Cloud API (Llama 3.3 70B & Whisper Large v3), Google Gemini 1.5 Flash (Vision & OCR)
- **Vector Database:** Qdrant Cloud Free Tier (Hybrid Vector + Payload Search)
- **Graph Engine:** NetworkX (Python native)

## 3. Design System Specs (Enterprise Slate & Matte Monochrome)
- **Base Theme:** `#0C0E12` (Deep Charcoal Matte)
- **Card Surface:** `#131720` (Subtle Dark Slate)
- **Precision Borders:** `#1F2430` (1px Hairline Crisp Separation)
- **Typography:** Inter / Plus Jakarta Sans (Primary UI), JetBrains Mono (Timestamps & Data)
- **Semantic Alert Tokens:**
  - `Live Guard Status`: `#2563EB` (Cobalt Blue Translucent)
  - `Fact Contradiction`: `#DC2626` (Crisp Matte Crimson)
  - `Timeline Drift`: `#D97706` (Refined Warm Amber)
  - `Verified Grounded Fact`: `#059669` (Professional Emerald)

## 4. Feature Matrix Requirements

### Feature 1: Universal Multi-Format Ingestion
- Support async upload for PDF, DOCX, XLSX, MP3, MP4, and ZIP files.
- Background LlamaIndex/Unstructured parsing pipelines.

### Feature 2: Dual-Spectrum 3-Pane Dashboard
- **Pane 1:** Synchronized Media Player (Video/Audio) + Native PDF/XLSX Viewer.
- **Pane 2:** Interactive Visual Knowledge Graph Canvas.
- **Pane 3:** Real-time Discrepancy Matrix & Speaker Audit Log.

### Feature 3: Live Guard Mode (Privacy-Aware Permissions)
- Real-time screen/audio WebSocket ingestion (`ws://`).
- Permission Modal before activation: Choice between **In-App Silent Log** (Default) or **System/Overlay Notifications**.

### Feature 4: Interactive Graph Scrubbing
- Click event on any Graph Node or Red Contradiction Badge automatically seeks the Media Player to the exact millisecond timestamp AND highlights the corresponding PDF page/paragraph.

### Feature 5: Advanced Security & Privacy
- **Multi-Speaker Diarization:** Segment commitments by individual speaker IDs.
- **Zero-Data Retention Toggle:** Process files in-memory (RAM) with auto-purge on session close.
- **Offline Fallback:** Local mock JSON fallback engine for resilient live demos.

## 5. File Structure Blueprint