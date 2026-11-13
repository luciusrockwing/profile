# AGENTS.md // Autonomous Agent Operational Protocol

> Standard operational specifications, architectural constraints, and procedural playbooks for AI agents (Claude Code, Cursor Composer, Windsurf, GitHub Copilot) operating on the SPECTER OSINT repository.

---

## 1. System Mission & Core Mandate

SPECTER is a minimalist, self-hosted OSINT investigation and target profiling platform. It provides an interactive entity connection link graph, categorized social handle slots, and forensic audit reports.

### The Zero-Blob Law (Critical Constraint)
Under no circumstances may an agent store, upload, or process binary image files or base64 data URIs on the host server:
1. **Avatar URLs**: All avatar and photo slots accept **strictly HTTP/HTTPS URL links** (e.g., `https://images.unsplash.com/...` or target website asset links).
2. **Client-Side Direct Fetching**: The web application renders target avatars via native `<img>` tags configured with `referrerPolicy="no-referrer"`. The server acts solely as a lightweight structured JSON metadata repository.
3. **Storage Ceiling**: The total database (`data/targets.json`) must remain a lightweight text payload (typically under 20 KB for dozens of targets).

---

## 2. Workspace & Environment Layout

```
├── app/
│   ├── api/profiles/route.ts      # REST API: GET, POST, DELETE, PUT (import/reset)
│   ├── layout.tsx                 # Root layout with dark cyber theme
│   ├── not-found.tsx              # App Router 404 handler
│   ├── page.tsx                   # Main state orchestration & view switcher
│   └── globals.css                # Tailwind CSS imports & animations
├── components/
│   ├── astryx/                    # Meta Astryx design system primitives
│   │   ├── tokens.ts              # Theme palette (cyan #06b6d4, emerald #10b981)
│   │   ├── Button.tsx             # AstryxButton (primary, secondary, outline, ghost)
│   │   ├── Card.tsx               # AstryxCard, AstryxCardHeader, AstryxCardBody, AstryxCardFooter
│   │   ├── Badge.tsx              # AstryxBadge (hairline, subtle, unboxed with dot)
│   │   ├── Input.tsx              # AstryxInput (with leftIcon and actionSlot)
│   │   ├── Select.tsx             # AstryxSelect (accessible styled dropdown)
│   │   ├── Modal.tsx              # AstryxModal (dialog with backdrop blur)
│   │   ├── Drawer.tsx             # AstryxDrawer (slide-in entity inspector)
│   │   ├── Table.tsx              # AstryxTable, AstryxTableRow, AstryxTableCell
│   │   └── Avatar.tsx             # AstryxAvatar (zero-storage native image loader)
│   ├── EntityGraphView.tsx        # Force-directed interactive canvas graph
│   ├── ProfilesDashboard.tsx      # Target cards grid with search, filter, tags
│   ├── TargetCard.tsx             # High-density dossier card
│   ├── TargetForm.tsx             # Dossier editor with slot management
│   ├── DossierModal.tsx           # Full dossier inspection & checksum view
│   ├── ReportsView.tsx            # Formatted plaintext audit brief generator
│   ├── DataManagementView.tsx     # Storage telemetry, JSON export/import & reset
│   └── Navbar.tsx                 # Top telemetry header & tab navigation
├── data/
│   └── targets.json               # Canonical persistent database store
├── lib/
│   ├── osint-types.ts             # TypeScript definitions (OsintTarget, Slots, Links)
│   ├── osint-engine.ts            # Graph builder, checksum calculation, URL formatters
│   ├── osint-engine.test.ts       # Automated unit test suite
│   └── seed-data.ts               # Default demonstration intelligence targets
├── skills/                        # Repository operational skills
│   ├── profile-manager/SKILL.md   # Skill: CRUD target profiles & slots
│   ├── database-backup/SKILL.md   # Skill: Backup, restore & validate database
│   └── graph-analysis/SKILL.md    # Skill: Topology & link analysis
```

---

## 3. Standard Agent Commands

| Task | Command | Expected Result |
| --- | --- | --- |
| **Install Dependencies** | `npm install` | Clean installation into `node_modules` |
| **Start Dev Server** | `npm run dev -- -p 3000` | Local server running on `http://localhost:3000` |
| **Run Unit Tests** | `npx tsx --test lib/osint-engine.test.ts` | 6/6 tests passing (TAP output) |
| **Lint Codebase** | `npm run lint` | ESLint check passes with 0 fatal errors |
| **Compile Build** | `npm run build` | Next.js standalone production build succeeds |

---

## 4. Target Data Model Specification

Every target profile stored in `data/targets.json` must conform strictly to `OsintTarget`:

```typescript
export interface OsintTarget {
  id: string;                      // Unique ID (e.g., "tgt-1794300464018-afbvz")
  alias: string;                   // Primary codename or handle (required)
  realName?: string;               // Confirmed legal name (optional)
  category: TargetCategory;        // 'individual' | 'company' | 'syndicate' | 'asset' | 'unknown'
  status: TargetStatus;            // 'active' | 'surveillance' | 'monitored' | 'cold' | 'archived' | 'flagged'
  priority: TargetPriority;        // 'critical' | 'high' | 'medium' | 'low'
  avatarUrl?: string;              // Direct HTTP/HTTPS URL ONLY (no base64)
  organization?: string;           // Primary organizational umbrella
  location?: string;               // Geographic jurisdiction or location
  companies: string[];             // Associated companies (creates graph nodes)
  groups: string[];                // Associated syndicates/groups (creates graph nodes)
  tags: string[];                  // Classifier tags (e.g., ["#phishing", "#fin-fraud"])
  handles: SocialHandleSlot[];     // Identified account slots
  relationships: TargetRelationship[]; // Direct links to other recorded target IDs
  timeline: TimelineEvent[];       // Key timestamped intelligence events
  notes: string;                   // Investigative findings and analyst notes
  createdAt: string;               // ISO 8601 timestamp
  updatedAt: string;               // ISO 8601 timestamp
}

export interface SocialHandleSlot {
  id: string;                      // Unique slot ID
  platform: SocialPlatform;        // 'twitter' | 'telegram' | 'github' | 'linkedin' | 'darkweb' | ...
  customLabel?: string;            // Used when platform is 'custom'
  value: string;                   // Handle, username, wallet, or domain
  verified: HandleVerification;    // 'verified' | 'suspected' | 'impersonator'
  notes?: string;
}
```

---

## 5. Agent Playbook: Managing Target Profiles

### A. Adding a New Target Profile
1. **Validate Avatar Link**: Run `validateAvatarUrl(avatarUrl)` from `lib/osint-engine.ts`. If the URL begins with `data:` or contains base64 strings, reject it immediately.
2. **Assign Unique ID**: Format as `tgt-${Date.now()}-${randomString}`.
3. **Normalize Tags**: Ensure tags are trimmed and lowercase, prepending `#` if absent.
4. **Persist Profile**: Either perform a `POST` request to `http://localhost:3000/api/profiles` with `{ target: targetPayload }` or safely edit `data/targets.json` while maintaining valid JSON structure.
5. **Verify**: Run `npx tsx --test lib/osint-engine.test.ts` to ensure integrity functions pass.

### B. Updating an Existing Target Profile
1. Locate target in `data/targets.json` by `id` or exact `alias`.
2. Update modified fields (e.g., append new `SocialHandleSlot`, adjust `status` to `surveillance`, or add linked companies).
3. Update `updatedAt` to `new Date().toISOString()`.
4. Ensure cross-target `relationships` reference valid target IDs.

### C. Removing a Target Profile
1. When deleting target with ID `tgt-XYZ`, remove the entry from `data/targets.json`.
2. Clean up dangling references: iterate over remaining targets and remove any item in `relationships` where `targetId === 'tgt-XYZ'`.
3. Save file and verify with `node -e "JSON.parse(fs.readFileSync('data/targets.json'))"`.

---

## 6. Forensic Integrity & Reporting

- **SHA-256 Checksum**: The platform generates deterministic forensic fingerprints using `generateForensicChecksum(target)`. This hash must stay stable unless target fields are modified.
- **Audit Reports**: Plain-text dossiers are generated using `generateDossierReport(target)`. Agents can output this format for plain-text logging or ticket exports.

---

## 7. AI Agent Guardrails

- **NEVER** edit files in `node_modules` or `.next`.
- **NEVER** introduce external CSS frameworks; use existing Tailwind CSS tokens and Meta Astryx primitives in `components/astryx/`.
- **NEVER** store avatar images on the server filesystem.
- **ALWAYS** run `npm run lint` and `npx tsx --test lib/osint-engine.test.ts` after making codebase changes.
