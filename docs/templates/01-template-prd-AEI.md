# PRD Template – AEI Product (AI Engineering Interface)

## 🔴 CRITICAL RULES (READ FIRST)

### Output Requirements
- **OUTPUT:** Save generated PRD to `/docs/prd/AEI-prd-master.md`
- **FORMAT:** Markdown document with all sections below
- **SCOPE:** Comprehensive product specification for AI Engineering Interface

### Core AEI Philosophy (Non-Negotiable)
- AEI is an AI mission control cockpit for directing and monitoring agent swarms — NOT a traditional IDE
- Visual-first approach: graphs, flows, simulations > text
- Every feature must enable observable agent behavior and closed feedback loops
- Transparency and trust: every AI decision must be inspectable
- Swarm-native design: built for 10–1,000 agents simultaneously, not single human users

### Strict Structure (No Deviations)
The PRD MUST include these sections in this order:
1. Document Overview (purpose, scope, assumptions)
2. Problem Statement (highest priority — what AEI solves)
3. User Personas (ordered by priority)
4. Key Features (organized by Phase 1/2/3)
5. Core Design Principles
6. MVP Success Criteria
7. Technical Requirements
8. Success Metrics & KPIs
9. Risk Mitigation
10. Timeline & Roadmap
11. Next Immediate Steps

### Required Content Standards

**Problem Statement:**
- Must articulate core frictions that legacy IDEs don't solve
- Focus on agent swarms, not individual agents
- Show why transparency into agent reasoning is critical

**Features:**
- Organize into Phase 1 (MVP), Phase 2 (expansion), Phase 3 (scale)
- Each feature must map to observable user value
- Include specific acceptance criteria and success metrics

**User Personas:**
- Order by priority (not alphabetically)
- Include demographics, goals, pain points, usage scenarios
- Show how each persona uses the system differently

**Technical Requirements:**
- Platform, performance targets, integration points
- Real-time communication (WebSockets, SSE)
- Scalability for 100+ agents with <500ms latency

**Success Metrics:**
- MVP must be measurable and achievable in timeline
- Track user adoption, efficiency gains, reliability improvements
- Include quality metrics for generated artifacts

**Risk Mitigation:**
- Identify top 3–5 risks
- Include concrete mitigation strategies for each
- Address AI reliability, user adoption resistance, UI overload

### Core Rules

1. **Swarm-native from day 1:** Never design single-agent workflows. Always think in terms of agent collections.

2. **Observable agent behavior:** Every feature must show users what agents are doing — progress, decisions, costs, errors.

3. **Closed feedback loops:** Design for: prompt → agents execute → user sees results + traces + costs → user iterates.

4. **Visual-first:** Prioritize visual representations (graphs, flows, decision trees) over text/code.

5. **Transparency & inspectability:** No black boxes. Users must understand why agents made decisions.

6. **Phase clarity:** Clearly separate MVP (Phase 1) from nice-to-haves (Phase 2/3).

7. **Real-time:** Plan for real-time updates from day 1 (agent heartbeats, cost tracking, progress streaming).

---

## PRD Template Structure

### 1. Document Overview

**Purpose:** [1–2 sentences: What is AEI and why does it exist?]

**Scope:**
- **In Scope:** [List key areas: agent management, UI, real-time updates, etc.]
- **Out of Scope:** [List what's explicitly NOT covered]

**Assumptions:** [Key assumptions about agents, users, infrastructure]

**Version History:** [Versioning track]

---

### 2. Problem Statement (Highest Priority)

**Context:** [How is the world changing? Why does AEI matter now?]

**Core Frictions to Solve:**
- [Friction 1]
- [Friction 2]
- [Friction 3]
- [Friction 4]

**How AEI Solves This:** [1–2 sentences: the value proposition]

---

### 3. User Personas – Ordered by Priority

#### Primary Persona: [Name]
- **Demographics:** [Age, experience, background]
- **Goals:** [What do they want to accomplish?]
- **Pain Points:** [What frustrates them today?]
- **Usage Scenario:** [How would they use AEI?]

#### Secondary Persona: [Name]
- **Demographics:** [...]
- **Goals:** [...]
- **Pain Points:** [...]
- **Usage Scenario:** [...]

#### Tertiary Persona: [Name]
- **Demographics:** [...]
- **Goals:** [...]
- **Pain Points:** [...]
- **Usage Scenario:** [...]

---

### 4. Key Features – Ordered by Urgency & Implementation Priority

#### Phase 1 – Immediate Urgency (MVP Core)

**4.1.1 [Feature Name]**
- **Description:** [1–2 sentences]
- **Key Capabilities:** [Bulleted list of what users can do]
- **Success Metrics:** [How do we know this works?]
- **AI Agent Tasks:** [What specific things must agents do to support this?]

**4.1.2 [Feature Name]**
- [Same structure]

**4.1.3 [Feature Name]**
- [Same structure]

#### Phase 2 – High Urgency (Transparency & Trust)

**4.2.1 [Feature Name]**
- [Same structure]

**4.2.2 [Feature Name]**
- [Same structure]

#### Phase 3 – Medium Urgency (Scale & Polish)

**4.3.1 [Feature Name]**
- [Same structure]

---

### 5. Core Design Principles (Non-Negotiable)

- [Principle 1 with 1–2 sentence explanation]
- [Principle 2 with 1–2 sentence explanation]
- [Principle 3 with 1–2 sentence explanation]
- [Principle 4 with 1–2 sentence explanation]
- [Principle 5 with 1–2 sentence explanation]

---

### 6. MVP Success Criteria (Must Hit to Move to Phase 2)

✅ [Testable criterion 1]
✅ [Testable criterion 2]
✅ [Testable criterion 3]
✅ [Testable criterion 4]

---

### 7. Technical Requirements

**7.1 Platform & Stack**
- Frontend: [Recommended tech stack]
- Backend: [Recommended tech stack]
- Real-time Communication: [WebSockets / SSE / etc.]
- Storage: [Database, cache, artifact storage]

**7.2 Performance Targets**
- [Metric 1: <target>]
- [Metric 2: <target>]
- [Metric 3: <target>]

**7.3 Integration Points**
- [API/service 1]
- [API/service 2]
- [API/service 3]

**7.4 Security & Compliance**
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

---

### 8. Success Metrics & KPIs

**8.1 User Adoption**
- NPS: [target]
- MAU: [target]
- Churn Rate: [target]

**8.2 Efficiency**
- Project Completion Time: [target improvement]
- Agent Productivity: [metric]

**8.3 Reliability**
- Workflow Failure Rate: [target]
- Uptime: [target]

**8.4 Quality**
- Code Quality: [how measured]
- User Satisfaction: [how measured]

---

### 9. Risk Mitigation

**Risk 1: [Description]**
- **Impact:** [Consequence if unmitigated]
- **Mitigation:** [Concrete steps to reduce risk]

**Risk 2: [Description]**
- **Impact:** [...]
- **Mitigation:** [...]

**Risk 3: [Description]**
- **Impact:** [...]
- **Mitigation:** [...]

---

### 10. Timeline & Roadmap

**Q1 2026:** [Key milestones]
**Q2 2026:** [Key milestones]
**Q3 2026:** [Key milestones]
**Q4 2026:** [Key milestones]

---

### 11. Next Immediate Steps

- [ ] [Action 1]
- [ ] [Action 2]
- [ ] [Action 3]

---

**Document Owner:** [Name/Role]
**Last Updated:** [Date]
**Next Review:** [Date]
