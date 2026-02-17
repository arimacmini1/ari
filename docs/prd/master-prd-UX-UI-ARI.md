# PRD – ARI UX/UI (Local AI Coding Cockpit)

## 🔴 CRITICAL RULES (READ FIRST)

### Output Requirements
- **OUTPUT:** This document serves as the master UX/UI spec for ARI.
- **FORMAT:** Markdown with all sections below.
- **SCOPE:** Comprehensive UX/UI specification for ARI's local-first developer experience.

### Core ARI Philosophy (Non-Negotiable)
- ARI is a local AI coding cockpit: everything runs on laptop (no cloud/accounts/waiting).
- Guided 60-second loops: intent → workspace → canvas → ship.
- No guessing: agents embedded in codebase via code-server + tools/RAG.
- Visual/live: watch clones, edits, traces in real-time.
- Swarm-to-solo: scales from dogfood slices to team PRs.

### Strict Structure (No Deviations)
1. Document Overview
2. Problem Statement
3. User Personas (priority-ordered)
4. Key Features (Phase 1/2/3)
5. Core Design Principles
6. MVP Success Criteria
7. Technical Requirements
8. Success Metrics & KPIs
9. Risk Mitigation
10. Timeline & Roadmap
11. Next Immediate Steps

---

## 1. Document Overview

**Purpose:** Define ARI's UX/UI for seamless local AI-assisted coding: import repo → edit in real VS Code → Prompt Canvas agents ship features in 60s.

**Scope:**
- **In Scope:** Main workspace, repo import, code-server integration, Prompt Canvas (agents/blocks), traces with badges.
- **Out of Scope:** Cloud/multi-user collab (focus local solo/team dogfood), advanced RBAC.

**Assumptions:** Local Docker/code-server, Temporal for agents, Next.js/Tailwind UI.

**Version History:** v1.0 – 2026-02-16 (initial spec from vision + ground truth).

---

## 2. Problem Statement (Highest Priority)

**Context:** Developers lose hours to context-switching (IDE ↔ chat), file-guessing, simulated diffs, cloud latency.

**Core Frictions to Solve:**
- Repo import/setup: manual clone/index.
- Code editing: leave Ari for VS Code.
- Agent awareness: prompts forget codebase; manual drags.
- Loop time: intent → ship takes hours vs 60s.
- Observability: traces lack repo/commit context.

**How ARI Solves This:** Local cockpit embeds VS Code + codebase-aware canvas agents for live edits/traces.

---

## 3. User Personas – Ordered by Priority

#### Primary Persona: Solo AI Fullstack Dev
- **Demographics:** Indie hacker/consultant, 2-10 yrs exp, builds AI tools locally.
- **Goals:** Ship features fast without cloud/setup.
- **Pain Points:** Context loss, agent hallucinations on files.
- **Usage Scenario:** Import own repo, type "add badge", watch agents edit/ship.

#### Secondary Persona: Team Lead Dogfooder
- **Demographics:** Eng manager, dogfoods AI on team repo.
- **Goals:** Validate slices, PR-ready changes.
- **Pain Points:** Team sync on traces without shared cloud.
- **Usage Scenario:** Import team repo, run dogfood template, approve/commit.

#### Tertiary Persona: Maintainer/Onboarder
- **Demographics:** New contributor to ARI.
- **Goals:** Follow guided path without docs deep-dive.
- **Pain Points:** Overwhelm from tabs/modes.
- **Usage Scenario:** Starter template → first canvas → trace review.

---

## 4. Key Features – Ordered by Urgency & Implementation Priority

#### Phase 1 – Immediate Urgency (MVP Core)

**4.1.1 Repo Import (Stage A – “Bring in the code”)**
- **Description:** Land in workspace → Project Context card → paste GitHub URL → live status (Queued → Cloning → Indexing → Ready).
- **Key Capabilities:** Clone to ~/ari/projects/, auto-index for agents.
- **Success Metrics:** <30s import, 100% local.
- **AI Agent Tasks:** N/A (UI-driven).

**4.1.2 Code Workspace**
- **Description:** Green button → embedded code-server VS Code (full sidebar/terminal/debug).
- **Key Capabilities:** Edit real files; Continue.dev optional for bridge.
- **Success Metrics:** Instant open, npm run dev works.
- **AI Agent Tasks:** Live diffs visible.

**4.1.3 Prompt Canvas Basics**
- **Description:** Knows repo/commit/roadmap; templates (Dogfood Slice).
- **Key Capabilities:** Type sentence → basic graph.
- **Success Metrics:** Zero-setup canvas.
- **AI Agent Tasks:** Planner scopes.

#### Phase 2 – High Urgency (Agent Intelligence)

**4.2.1 Agent Blocks (Planner/Architect/Implementer/Tester/Docs/Lead)**
- **Description:** Auto-light up: scope → files (94% conf) → execute in workspace → tests/screenshots → summary card.
- **Key Capabilities:** No drag; searchCodebase/RAG; live VS Code edits.
- **Success Metrics:** Approve → ship in <30s.
- **AI Agent Tasks:** Native Temporal/langchain agents w/ tools (read/write/search/runCmd).

**4.2.2 Trace Viewer w/ Repo Badge**
- **Description:** Headers show commit; inline history.
- **Key Capabilities:** View diffs/evidence.
- **Success Metrics:** Always know codebase state.

#### Phase 3 – Medium Urgency (Scale & Polish)

**4.3.1 Split-View Workspace/Canvas**
- **Description:** Side-by-side no-switching.
- **Key Capabilities:** Drag-drop blocks to code.

**4.3.2 Voice/Templates/Advanced**
- **Description:** Speak intents; operational templates.

---

## 5. Core Design Principles (Non-Negotiable)

- **Local-First:** No cloud/accounts; all laptop (clone/code-server/Temporal local).
- **60s Loops:** Import → type → approve → commit.
- **No Guessing:** Agents use RAG/tools in workspace; auto-files/confidence.
- **Live/Visual:** Watch statuses/buttons light up; real-time diffs/traces.
- **Inspectable:** Every step traceable (repo badge, agent outputs).

---

## 6. MVP Success Criteria (Must Hit to Move to Phase 2)

✅ [x] Import-to-ship badge feature <60s.
✅ [ ] Zero manual file drags.
✅ [ ] Embedded VS Code full-featured.
✅ [ ] Agents edit real files (via bridge/native).

---

## 7. Technical Requirements

**7.1 Platform & Stack**
- Frontend: Next.js/Tailwind; iframe code-server.
- Backend: Temporal activities for agents; Docker code-server w/ Continue/langchain.

**7.2 Performance Targets**
- Import: <30s.
- Agent response: <5s.
- Edits live: <1s latency.

**7.3 Integration Points**
- code-server Docker.
- Git clone/index.
- Langchain tools/RAG (LanceDB).

**7.4 Security & Compliance**
- Local-only; no auth.

---

## 8. Success Metrics & KPIs

**8.1 User Adoption**
- NPS: >8.
- First-loop time: <60s.

**8.2 Efficiency**
- File-discovery accuracy: >90%.
- Iteration rate: >3/run.

**8.3 Reliability**
- Agent success: >95%.
- Uptime: 100% local.

---

## 9. Risk Mitigation

**Risk 1: Agent File Guessing**
- **Impact:** Bad edits.
- **Mitigation:** Mandatory approve + RAG/index.

**Risk 2: code-server Perf**
- **Impact:** Slow workspace.
- **Mitigation:** Opt Docker; fallback tabs.

**Risk 3: Onboarding Friction**
- **Impact:** Low adoption.
- **Mitigation:** Workflow Mode guide.

---

## 10. Timeline & Roadmap

**Q1 2026:** Phase 1 (import/workspace/canvas).
**Q2 2026:** Phase 2 (agents).
**Q3 2026:** Phase 3 (polish).

---

## 11. Next Immediate Steps

- [ ] Impl Phase 1 UI (import/card/buttons).
- [ ] Docker code-server w/ agent bridge.
- [ ] Native agents (lib/agents/*).
- [ ] Dogfood badge feature.

**Document Owner:** Cline
**Last Updated:** 2026-02-16
**Next Review:** 2026-03-01