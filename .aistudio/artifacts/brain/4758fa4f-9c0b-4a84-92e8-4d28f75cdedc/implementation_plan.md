# Meta Astryx Framework Integration & OSINT Platform Redesign

A complete architectural redesign of the self-hosted OSINT platform utilizing Meta's Astryx design system philosophy, providing enterprise-grade accessible component primitives, standardized brand token architecture, and sleek dark cyber aesthetics while retaining zero-server image storage.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following key decisions were confirmed through interactive clarification and form the foundation of this plan:

- **Confirmed Decision 1 (Scope)**: Full platform UI redesign using Astryx component primitives and layout architecture across all screens (Navigation, Entity Graph overlays, Target Dossiers, Slot Form, Forensic Reports, and Storage).
- **Confirmed Decision 2 (Theme Tokens)**: Dark cyber aesthetic with high-contrast neutral slate base (`#070b14`), luminous cyan accents (`#06b6d4`), and emerald operational indicators (`#10b981`).
- **Confirmed Decision 3 (Installation)**: Import Astryx component primitives directly into the local codebase (`components/astryx/`), avoiding external runtime dependency conflicts with Next.js 15+ and keeping styling lightweight and zero-overhead.

---

## 1. Overview & Core Concept

### What It Delivers
This upgrade replaces ad-hoc UI markup with a unified, cohesive design system inspired by Meta's Astryx framework. It establishes a dedicated design library under `components/astryx/` that powers every interactive view of the OSINT suite:
- **Astryx Design Tokens**: Standardized CSS variables and typography tokens for surface elevation, borders, focus rings, state cues, and cyber color accents.
- **Astryx Primitive Components**: Accessible, composable building blocks: `Button`, `Input`, `Select`, `Textarea`, `Card`, `Badge`, `SegmentedControl`, `Modal/Dialog`, `Table`, `Tabs`, `Drawer`, and `StatMetric`.
- **Full Platform Overhaul**: Harmonizes the Front Page Entity Graph, Dossier Grid, Target Creation Slots, Forensic Reports Terminal, and Storage Management under Astryx's design guidelines.
- **Preserved Core OSINT Principles**: Zero binary images stored on server (client browser loads photos directly from external URLs with `no-referrer` protection), high-density data tables, and forensic integrity checksums.

### Target Audience
Self-hosting intelligence analysts, cybersecurity investigators, and security operations engineers who require a clean, responsive, and distraction-free dark workspace for cataloging threat actors and mapping corporate/syndicate connections.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Front Page Network Link Analysis**:
   - User lands on the Astryx-styled Entity Graph.
   - Astryx segmented controls allow instant filtering between Targets, Corporations, Groups, and Handle Slots.
   - Clicking any entity smoothly slides open an Astryx Inspector Drawer showing linked nodes and direct profile links.
2. **Dossier Catalog & Filtering**:
   - High-density grid of Astryx target cards displaying avatar photos loaded client-side from URLs.
   - Live search input and multi-select category/status filters with clean, unboxed metadata.
   - Single-click action to inspect the comprehensive dossier modal or trigger direct external handle links.
3. **Structured Slot Ingestion**:
   - The "+ Add Target" view is structured with Astryx form controls and input groups.
   - Instant visual validation on external photo URLs with a live preview box confirming zero server bytes consumed.
   - Dynamic handle slot builder with platform presets, verification status, and inter-target relationship links.
4. **Forensic Report Generation & Data Portability**:
   - Tabular view of all subject handles and timestamps with deterministic cryptographic checksum.
   - Formatted report preview with 1-click clipboard copy and text file download.
   - Database health panel with live storage metrics and JSON backup export/restore.

### Visual Identity & Theme Tokens
- **Design System Style**: Meta Astryx enterprise component structure tailored for cybersecurity/intelligence operations.
- **Color Tokens**:
  - `Canvas Background`: Deep obsidian `#070b14` and slate `#0d131f`
  - `Surface Elevated`: Charcoal slate `#111827` with crisp 1px hairline border `#1e293b`
  - `Primary Action Accent`: Electric Cyan (`#06b6d4`, hover `#22d3ee`)
  - `Operational Nominal`: Emerald Green (`#10b981`)
  - `Surveillance / Alert`: Amber Gold (`#f59e0b`) and Crimson Rose (`#f43f5e`)
  - `Text Muted`: Cool Slate `#94a3b8` and `#64748b`
- **Typography Pairing**:
  - Headings & Navigation: Contemporary sans display (`Plus Jakarta Sans` / system sans)
  - Data Numerals, Checksums & Handles: Tabular monospace (`font-mono tabular-nums`)
- **Spatial Discipline**:
  - Consistent component padding scales (`sm: 8px`, `md: 16px`, `lg: 24px`)
  - Rounded scale conforming to $r_{\text{inner}} = r_{\text{outer}} - \text{padding}$
  - Single-line controls with truncation prevention

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Local Astryx Primitives vs. Direct Git Dependency
- **Chosen Approach**: Vendor and implement Astryx-compliant component primitives directly in `components/astryx/` using standard Tailwind CSS and accessible DOM elements.
- **Rationale**: Direct git dependencies or complex StyleX bundler plugins frequently introduce build worker friction in Next.js 15 App Router. Creating local, self-contained Astryx primitives ensures 100% build reliability, zero bundle bloat, and complete customization of cyber dark tokens without breaking existing Next.js SSR workflows.
- **Alternative Considered**: Installing via git URL with external build plugin; rejected due to risk of compilation failures and build timeout issues in hermetic environments.

### Decision 2: Preserving Zero-Binary Server Storage Architecture
- **Chosen Approach**: The Astryx redesign will strictly preserve the zero-server-storage policy for target avatars.
- **Rationale**: When users add target photo links, the backend database (`data/targets.json`) stores only the URL string. The browser renders the image directly using native client `<img referrerPolicy="no-referrer">` with fallback state in Astryx `Avatar` components.

---

## 4. Technical Architecture & Component Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SPECTER // OSINT PLATFORM                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        ASTRYX THEME & TOKEN LAYER                      │
│   • CSS Variables (--astryx-bg, --astryx-surface, --astryx-cyan, etc.) │
│   • Typography scale & tabular numerals                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     ASTRYX LOCAL COMPONENT LIBRARY                     │
│  components/astryx/                                                    │
│  ├── Button.tsx           ├── Input.tsx           ├── Select.tsx       │
│  ├── Card.tsx             ├── Badge.tsx           ├── Modal.tsx        │
│  ├── SegmentedControl.tsx ├── Table.tsx           ├── Drawer.tsx       │
│  └── Avatar.tsx           └── Tabs.tsx                                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION FEATURE VIEWS                       │
│  ├── Navbar (Astryx TopBar contract & real-time counter metrics)       │
│  ├── EntityGraphView (Astryx controls, overlay filters, node drawer)   │
│  ├── ProfilesDashboard (Astryx cards, search toolbar, tag filters)     │
│  ├── TargetForm (Astryx form layout, slot editor, live preview)        │
│  ├── DossierModal (Astryx forensic modal, hash verification)           │
│  ├── ReportsView (Astryx terminal & download panel)                    │
│  └── DataManagementView (Storage transparency & backup tools)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PERSISTENCE & ZERO-STORAGE BACKEND                   │
│  • Next.js API Routes (/api/profiles)                                  │
│  • JSON Database (data/targets.json, ~9 KB total storage)              │
│  • Client-direct URL loading (0 MB server binary images)               │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Implementation Mapping
1. `components/astryx/Button.tsx`: Variants for `primary`, `secondary`, `destructive`, and `ghost`; accessible focus rings, loading states, and icon slots.
2. `components/astryx/Card.tsx`: Flat single-elevation surfaces with 1px hairline borders (`border-slate-800`), hover transitions, and clean slot headers.
3. `components/astryx/Input.tsx` & `Select.tsx`: High-contrast dark inputs with prefix icon slots and explicit accessible labels.
4. `components/astryx/Badge.tsx`: Minimalist, unboxed or hairline status indicators for active surveillance, flagged threats, and handle verification.
5. `components/astryx/Modal.tsx` & `Drawer.tsx`: Smooth modal overlays with backdrop blur and escape key handling.
6. `components/astryx/SegmentedControl.tsx`: Replaces candy pills with Astryx segmented toggles for graph filters and category switching.
7. `components/astryx/Table.tsx`: High-density tabular layout with compact row heights and tabular numerals.
8. `components/astryx/Avatar.tsx`: Client-direct URL image loader with fallback monogram and category icon.

### Verification Plan
- **Unit Testing**: Re-run existing 6/6 unit tests in `lib/osint-engine.test.ts` to ensure data handling, checksum generation, and graph link construction remain pristine.
- **Compilation & Linting**: Co-execute `compile_applet` and `lint_applet` ensuring 0 TypeScript errors and 0 ESLint errors.
- **Browser Automation Verification**: Inspect the redesigned UI in headless Chromium across desktop (1440x900) and mobile (390x844) viewports using Playwright CLI:
  - Graph View with Astryx controls and inspector drawer.
  - Profiles Dashboard with Astryx cards and filter controls.
  - Add Target Form with Astryx input fields and photo URL preview.
  - Dossier Modal with Astryx table and copy actions.
