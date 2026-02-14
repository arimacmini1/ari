# AEI Project Roadmap – Should-Have Tasks

**Generated from:** Master AEI PRD (v2.1)
**Date:** February 10, 2026
**Status:** Ready for Engineering

---

## Phase 1 – Agent Mission Control MVP (Target: weeks 1–8)

### Should-Have Tier (critical for decent beta / early user feedback)

- [ ] `P1-SH-01` Add voice input support to Prompt Canvas (speech-to-text → canvas block generation)
  - Owner hint: Frontend / Design
  - Dependencies: `P1-MH-04`, `P1-MH-05`
  - Blocks: `P2-SH-06`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Microphone button on canvas triggers speech-to-text (browser Web Speech API or Deepgram)
    - Transcribed text fed to lightweight LLM to suggest canvas blocks (task, decision, loop)
    - User reviews and accepts/rejects suggested blocks before adding to canvas
    - Support 30s of continuous speech per utterance
  - Est. effort: M

- [ ] `P1-SH-02` Implement agent reassignment, pause, and terminate actions from dashboard context menu
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-MH-03`, `P1-MH-05`
  - Blocks: `P2-SH-02`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Right-click agent → "reassign" shows target agent pool, user selects, handover completes
    - "Pause" agent stops accepting new tasks, completes current task, then idles
    - "Terminate" gracefully shuts down agent (cleanup, final status report)
    - All actions logged to audit trail
    - Dashboard updates reflect state changes within 1s
  - Est. effort: M

- [ ] `P1-SH-03` Add agent error detection and escalation alerts (anomaly thresholds)
  - Owner hint: Backend
  - Dependencies: `P1-MH-01`, `P1-MH-10`
  - Blocks: `P2-SH-03`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Alert rules: timeout (no heartbeat >2min), error rate spike (>5% in 5min window), cost overage (>budget)
    - Escalation queue shows pending alerts, user can acknowledge or trigger override
    - Escalation queue persisted and surveyable in history
    - Alerts integrate with dashboard notification system
  - Est. effort: M

- [ ] `P1-SH-04` Implement basic RBAC enforcement: viewer, editor, admin roles
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-MH-07`, `ext:user-auth-skeleton`
  - Blocks: `P1-SH-06`, `P2-MH-07`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Three roles: viewer (read-only), editor (execute, edit canvas), admin (all + user management)
    - Role enforcement in API layer (not just UI)
    - Audit log accessible only by admin
    - High-risk actions (terminate, deploy) require admin approval or confirmation
    - User management UI (assign roles, revoke access)
  - Est. effort: M

- [ ] `P1-SH-05` Build artifact preview system showing generated code/UI/schema snippets
  - Owner hint: Frontend / Design
  - Dependencies: `P1-MH-06`
  - Blocks: `P2-MH-02`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Preview pane shows generated artifacts (code, HTML, SQL, JSON) side-by-side with task info
    - Syntax highlighting for code artifacts
    - Copy-to-clipboard button for each artifact
    - Diff viewer comparing current preview vs. previous version (if rerun)
    - Support for 5–10 artifact types (code, schema, config, UI mockup)
  - Est. effort: M

- [ ] `P1-SH-06` Create project/workspace scoping (isolate agent pools and cost tracking per project)
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-SH-04`, `P1-MH-07`
  - Blocks: `P2-CH-03`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - User can create project, assign budget, invite team members with role
    - Agent Dashboard filtered by project (with global override view for admin)
    - Cost metrics scoped to project; alerting per project budget
    - Audit logs scoped by project (with global view for compliance)
  - Est. effort: M

- [x] `P1-SH-07` Add main workspace chat telemetry and adoption KPIs
  - Owner hint: Product / Analytics
  - Dependencies: `P1-MH-12`, `P1-MH-10`
  - Blocks: `none`
  - Feature refs: `F15-MH-01`, `F15-MH-02`
  - Acceptance criteria:
    - Track usage split between main workspace chat and full AEI
    - Log time-to-first-output and completion rate for main workspace chat users
    - Dashboard view of mode usage trends (daily/weekly)
    - Metrics accessible without leaving main screen
  - Est. effort: S

- [x] `P1-SH-08` Add main workspace chat migration guides and in-product helper tips
  - Owner hint: Product / Design / Content
  - Dependencies: `P1-MH-12`, `P1-MH-15`
  - Blocks: `none`
  - Feature refs: `F15-MH-03`
  - Acceptance criteria:
    - In-product tips map main chat concepts to AEI features (chat -> canvas, preview -> simulator)
    - Migration guide available from onboarding and settings
    - Tips can be dismissed and never shown again
    - Links to tutorial flow for hands-on migration
  - Est. effort: S

- [x] `P1-SH-09` Polish Replit import UX with validation and error recovery
  - Owner hint: Frontend / Backend
  - Dependencies: `P1-MH-13`
  - Blocks: `none`
  - Feature refs: `F15-MH-04`
  - Acceptance criteria:
    - Import wizard validates input and previews detected project metadata
    - Clear error states for unsupported exports with next-step guidance
    - Retry flow without losing prior input
    - Import results include a short summary of generated canvas blocks
  - Est. effort: M

---

## Phase 2 – Multi-Agent Workflows & Advanced Control (Target: weeks 9–16)

### Should-Have Tier (critical for GA and sustained growth)

- [ ] `P2-SH-01` Team collaboration features (shared canvas, live edit, comment threads)
  - Owner hint: Backend / Frontend
  - Dependencies: `P2-MH-03`, `P1-MH-07`
  - Blocks: `P3-SH-01`
  - Feature refs: `F16-MH-01`, `F16-MH-02`, `F16-MH-03`, `F16-MH-04`
  - Acceptance criteria:
    - Multiple users edit same canvas concurrently with operational transform or CRDTs
    - Comment threads on canvas blocks and tasks
    - @mention notifications and activity feed
    - Version history per canvas with rollback capability
  - Est. effort: L

- [ ] `P2-SH-02` Agent capability discovery and marketplace preview
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-MH-01`, `P1-MH-05`
  - Blocks: `P3-MH-02`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Discovery UI: browse agents by capability tag (code, research, design, deployment)
    - Each agent card shows: name, version, cost-per-task, success rate, user reviews
    - Ability to "try" agent on sample task before assigning
    - Integration with canvas (drag agent onto task block)
  - Est. effort: M

- [ ] `P2-SH-03` Cost optimization recommendations and automated budget enforcement
  - Owner hint: Backend / AI
  - Dependencies: `P2-MH-05`, `P2-MH-02`
  - Blocks: `P3-SH-02`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Analyze past executions, suggest: cheaper agent types, parallelization strategies, caching opportunities
    - Budget alerts: hard cap (prevents execution), soft cap (warning)
    - Scheduled cost reports (daily/weekly) per project
    - Cost simulation on canvas (preview estimated cost before execution)
  - Est. effort: M

- [ ] `P2-SH-04` Plugin architecture and integration framework
  - Owner hint: Backend / Infra
  - Dependencies: `P1-MH-06`, `P1-MH-05`
  - Blocks: `P3-MH-04`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Plugin SDK: documented interfaces for agents, canvas blocks, integrations
    - Plugin config schema (YAML/JSON) and validation
    - Sandboxed plugin execution (resource limits, timeout)
    - Plugin lifecycle: install, enable/disable, update, uninstall
    - First-party plugins: Slack, GitHub, Datadog integrations
  - Est. effort: L

- [ ] `P2-SH-05` Accessibility features (WCAG 2.1 AA compliance)
  - Owner hint: Frontend / Design
  - Dependencies: `P1-MH-03`, `P2-MH-05`
  - Blocks: `P2-SH-06`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Keyboard navigation for all dashboard and canvas operations
    - Screen reader support (ARIA labels, semantic HTML)
    - Color contrast ratios meet WCAG AA
    - Focus management and skip links
    - Automated accessibility testing in CI/CD
  - Est. effort: M

- [ ] `P2-SH-06` Voice commands and hands-free operation
  - Owner hint: Frontend
  - Dependencies: `P1-SH-01`, `P2-SH-05`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Voice commands: "execute", "pause all", "show agent X logs", "what's my cost today?"
    - Command recognition with confidence threshold; ask for confirmation if <80%
    - Voice feedback (read-aloud KPIs, status changes)
    - Works with browser Speech API + optional Deepgram for higher accuracy
  - Est. effort: M

---

## Phase 3 – Scale & Polish (Target: weeks 17+)

### Should-Have Tier (critical for GA and sustained growth)

- [ ] `P3-SH-01` Build comprehensive training and certification program
  - Owner hint: Design / Content / Frontend
  - Dependencies: `P2-SH-01`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Interactive tutorials for 5 skill levels (novice to expert)
    - Video walkthroughs for common workflows
    - Certification exams and badges (in-app)
    - Knowledge base with searchable articles and FAQs
    - Community forum integration (moderated)
  - Est. effort: M

- [ ] `P3-SH-02` Implement advanced analytics: predictive quality scores and cost optimization
  - Owner hint: Backend / AI / Data
  - Dependencies: `P2-MH-05`, `P2-SH-03`
  - Blocks: `P3-CH-03`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - ML model predicts quality/cost for new canvas before execution
    - Recommendation engine: suggest agent types, parallelization, batching
    - Trend forecasting: predict future cost and quality based on historical patterns
    - A/B testing framework: compare two canvas versions statistically
  - Est. effort: L

- [ ] `P3-SH-03` Add white-label and SaaS multi-tenancy features
  - Owner hint: Backend / Frontend / Infra
  - Dependencies: `P2-CH-03`, `P3-MH-01`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Custom branding: logo, colors, domain
    - Separate billing and invoicing per tenant
    - Tenant-specific integrations and plugins
    - Admin portal for white-label providers
  - Est. effort: M

- [ ] `P3-SH-04` Implement continuous deployment and blue-green rollout strategy
  - Owner hint: Backend / Infra
  - Dependencies: `P2-MH-09`, `P3-MH-03`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Automated testing and deployment pipeline
    - Blue-green deployment with health checks
    - Canary deployments for gradual rollout
    - Automated rollback on critical errors
    - Zero-downtime deployments
  - Est. effort: M

- [ ] `P3-SH-05` Build advanced debugging tools: interactive agent playback and time-travel debugging
  - Owner hint: Frontend / Backend
  - Dependencies: `P2-MH-01`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Playback execution step-by-step with variable inspection
    - Time-travel: jump to any point in execution and inspect state
    - Breakpoint debugging: pause execution at certain decisions
    - Conditional breakpoints (e.g., pause if confidence < 50%)
    - Memory/performance profiling during playback
  - Est. effort: L
- [x] `P1-SH-07` Add main workspace chat telemetry and adoption KPIs
  - Owner hint: Product / Analytics
  - Dependencies: `P1-MH-12`, `P1-MH-10`
  - Blocks: `none`
  - Feature refs: `F15-MH-01`, `F15-MH-02`
  - Acceptance criteria:
    - Track usage split between main workspace chat and full AEI
    - Log time-to-first-output and completion rate for main workspace chat users
    - Dashboard view of mode usage trends (daily/weekly)
    - Metrics accessible without leaving main screen
  - Est. effort: S

- [x] `P1-SH-08` Add main workspace chat migration guides and in-product helper tips
  - Owner hint: Product / Design / Content
  - Dependencies: `P1-MH-12`, `P1-MH-15`
  - Blocks: `none`
  - Feature refs: `F15-MH-03`
  - Acceptance criteria:
    - In-product tips map main chat concepts to AEI features (chat -> canvas, preview -> simulator)
    - Migration guide available from onboarding and settings
    - Tips can be dismissed and never shown again
    - Links to tutorial flow for hands-on migration
  - Est. effort: S

- [x] `P1-SH-09` Polish Replit import UX with validation and error recovery
  - Owner hint: Frontend / Backend
  - Dependencies: `P1-MH-13`
  - Blocks: `none`
  - Feature refs: `F15-MH-04`
  - Acceptance criteria:
    - Import wizard validates input and previews detected project metadata
    - Clear error states for unsupported exports with next-step guidance
    - Retry flow without losing prior input
    - Import results include a short summary of generated canvas blocks
  - Est. effort: M

---

## Phase 2 & 3 Dependency Summary

#### Phase 1 Should-Haves (Additions)
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| `P1-SH-07` | Main workspace chat telemetry | `P1-MH-12`, `P1-MH-10` | `none` |
| `P1-SH-08` | Main workspace chat migration guides | `P1-MH-12`, `P1-MH-15` | `none` |
| `P1-SH-09` | Replit import UX polish | `P1-MH-13` | `none` |

#### Phase 2 Should-Haves
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| `P2-SH-01` | Team collaboration | `P2-MH-03`, `P1-MH-07` | `P3-SH-01` |
| `P2-SH-02` | Agent capability discovery | `P1-MH-01`, `P1-MH-05` | `P3-MH-02` |
| `P2-SH-03` | Cost optimization recs | `P2-MH-05`, `P2-MH-02` | `P3-SH-02` |
| `P2-SH-04` | Plugin architecture | `P1-MH-06`, `P1-MH-05` | `P3-MH-04` |
| `P2-SH-05` | Accessibility features | `P1-MH-03`, `P2-MH-05` | `P2-SH-06` |
| `P2-SH-06` | Voice commands | `P1-SH-01`, `P2-SH-05` | `none` |

#### Phase 3 Should-Haves
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| `P3-SH-01` | Training & certification | `P2-SH-01` | `none` |
| `P3-SH-02` | Predictive analytics | `P2-MH-05`, `P2-SH-03` | `P3-CH-03` |
| `P3-SH-03` | White-label / SaaS | `P2-CH-03`, `P3-MH-01` | `none` |
| `P3-SH-04` | Blue-green deployment | `P2-MH-09`, `P3-MH-03` | `none` |
| `P3-SH-05` | Time-travel debugging | `P2-MH-01` | `none` |

---

**Roadmap Owner:** Product Team
**Generated:** February 10, 2026
**Last Review:** February 10, 2026