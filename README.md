# AEI - AI Engineering Interface

**Post-IDE control center for AI agent orchestration and management**

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## Overview

AEI (AI Engineering Interface) is a comprehensive dashboard for managing multi-agent AI workflows. Monitor agent health, coordinate task execution, build visual workflows, and optimize cost vs. performance — all in one unified interface.

### Key Features

- **🤖 Agent Dashboard** - Real-time monitoring and control of AI agent swarms
- **🎯 Orchestrator Hub** - Rule-based task coordination with simulation and execution
- **🎨 Prompt Canvas** - Visual workflow builder with drag-and-drop blocks
- **📊 Analytics** - Performance metrics, cost tracking, and sparkline charts
- **⚡ Real-Time Updates** - WebSocket-powered live status and metrics

---

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Application runs at `http://localhost:3000`

### First Steps

1. Open `http://localhost:3000`
2. Click **Agents** in the sidebar → See agent monitoring dashboard
3. Click **Orchestrator** → Create your first coordination rule
4. Click **Workflows** → Build a visual task workflow

**⏱️ Time to first use: 2 minutes**

---

## Documentation

### 📚 User Guides

- **[KNOWLEDGE-BASE.md](./KNOWLEDGE-BASE.md)** - Complete user manual
  - Dashboard overview
  - Feature guides (Agents, Orchestrator, Canvas)
  - Common workflows
  - Troubleshooting
  - FAQ

- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Quick reference card
  - Common tasks
  - Keyboard shortcuts
  - Status colors
  - Best practices
  - Quick fixes

### 📖 Technical Documentation

- **[/docs/on-boarding/](/docs/on-boarding/)** - Feature on-boarding guides
  - [Feature 01: Prompt Canvas](docs/on-boarding/feature-01-onboarding.md)
  - [Feature 02: Agent Dashboard](docs/on-boarding/feature-02-onboarding.md)
  - [Feature 03: Orchestrator Hub](docs/on-boarding/feature-03-onboarding.md)

- **[/docs/architecture/](/docs/architecture/)** - System architecture
  - Component design
  - API references
  - Data models
  - Algorithms

- **[CHANGELOG.md](/docs/CHANGELOG.md)** - Release history and updates
- **[BUG-FIXES.md](/docs/BUG-FIXES.md)** - Known issues and hotfixes

---

## Features

### Agent Dashboard

Monitor and control your AI agent swarm in real-time:

- **Hierarchical agent tree** with expand/collapse
- **Real-time status updates** via WebSocket (every 2s)
- **Sparkline charts** for CPU, memory, tokens/min, cost
- **Context menu actions**: Pause, Resume, Terminate, Inspect Logs
- **Agent logs viewer** with copy-to-clipboard

**[→ Learn more](./KNOWLEDGE-BASE.md#agents-dashboard)**

### Orchestrator Hub

Coordinate multi-agent workflows with intelligent task assignment:

- **Rule-based coordination** (priority, affinity, constraints)
- **Non-destructive simulation** (preview before executing)
- **Constraint adjustment** (max agents, cost budget)
- **Task decomposition** using topological sort
- **Execution history & replay** viewer

**[→ Learn more](./KNOWLEDGE-BASE.md#orchestrator-hub)**

### Prompt Canvas

Build visual workflows with drag-and-drop blocks:

- **7 block types**: Task, Decision, Loop, Parallel, Text, etc.
- **Connection validation** with visual feedback
- **Canvas versioning** with full history
- **Export to Orchestrator** for execution
- **Delta re-execution** (only changed tasks)

**[→ Learn more](./KNOWLEDGE-BASE.md#prompt-canvas)**

---

## Common Workflows

### Monitor Agent Health
```
1. Click "Agents" in sidebar
2. Check status badges (red = error, yellow = waiting)
3. Right-click agent → "Inspect Logs"
4. Review error messages and take action
```

### Execute a Task Plan
```
1. Click "Orchestrator"
2. Create rule (+ New Rule button)
3. Click "Simulate"
4. Adjust constraints if needed
5. Click "Execute Plan"
6. Monitor in Agents dashboard
```

### Build Visual Workflow
```
1. Click "Workflows"
2. Drag blocks to canvas
3. Connect blocks (output → input)
4. Configure properties
5. Save and export to Orchestrator
```

**[→ See all workflows](./KNOWLEDGE-BASE.md#common-workflows)**

---

## Project Structure

```
ari/
├── app/                      # Next.js app router pages
│   ├── agents/              # Agent Dashboard page
│   ├── orchestrator/        # Orchestrator Hub page
│   ├── api/                 # API routes
│   │   ├── orchestrator/    # Orchestrator API endpoints
│   │   └── executions/      # Execution tracking API
│   └── page.tsx             # Main landing page
│
├── components/              # React components
│   ├── aei/                 # AEI-specific components
│   │   ├── agent-tree.tsx   # Hierarchical agent list
│   │   ├── rule-editor.tsx  # Orchestrator rule form
│   │   ├── canvas-flow.tsx  # Prompt Canvas
│   │   └── ...
│   └── ui/                  # Reusable UI components (Shadcn)
│
├── lib/                     # Shared libraries
│   ├── orchestrator-engine.ts  # Core orchestration logic
│   └── utils.ts             # Utility functions
│
├── docs/                    # Documentation
│   ├── on-boarding/         # User guides per feature
│   ├── architecture/        # Technical architecture docs
│   ├── tasks/               # Feature task definitions
│   └── CHANGELOG.md         # Version history
│
├── KNOWLEDGE-BASE.md        # Complete user manual
├── QUICK-REFERENCE.md       # Quick reference card
└── README.md                # This file
```

---

## Technology Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS, Shadcn UI components
- **Canvas:** React Flow (visual workflow builder)
- **Charts:** Custom SVG sparklines
- **Real-Time:** WebSocket (mock in dev mode)
- **API:** Next.js API routes (REST)

---

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- agent-dashboard

# Run with coverage
npm test -- --coverage
```

### Building for Production
```bash
# Create production build
npm run build

# Start production server
npm start
```

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_WS_URL=ws://localhost:3001  # WebSocket server URL (optional)

# Trace kill switches / guardrails
AEI_DISABLE_TRACE_COMPARE=1             # Server: disable POST /api/traces/compare
AEI_DISABLE_TRACE_FORK=1                # Server: disable POST /api/traces/fork
AEI_MAX_TRACES=200                      # Server: cap in-memory stored traces (fork spam protection)

# Optional UI mirrors (hide/disable controls in the client)
NEXT_PUBLIC_AEI_DISABLE_TRACE_COMPARE=1
NEXT_PUBLIC_AEI_DISABLE_TRACE_FORK=1
```

### Kill Switch Verification
```bash
# 1) Start dev server with kill switches enabled
AEI_DISABLE_TRACE_COMPARE=1 AEI_DISABLE_TRACE_FORK=1 npm run dev

# 2) In another terminal, verify both endpoints return 503
npm run killswitch:check

# Optional custom host/port
bash scripts/check-trace-killswitch.sh http://localhost:3001
```

---

## Troubleshooting

### Common Issues

**"I don't see the New Rule button"**
- Solution: Click **Orchestrator** in the left sidebar to navigate to the Orchestrator Hub

**"Agents not updating in real-time"**
- Solution: Refresh page, check browser console for WebSocket errors

**"Page is blank"**
- Solution: Clear Next.js cache: `rm -rf .next && npm run dev`

**[→ See all troubleshooting](./KNOWLEDGE-BASE.md#troubleshooting)**

---

## Roadmap

### Current (Phase 1) ✅
- [x] Agent Dashboard with real-time monitoring
- [x] Orchestrator Hub with simulation
- [x] Prompt Canvas visual builder
- [x] Execution history and replay

### Phase 2 (In Progress)
- [ ] Real agent pool with capacity constraints
- [ ] Mid-flight task reassignment
- [ ] Advanced Gantt visualization
- [ ] Database persistence (PostgreSQL)
- [ ] Multi-graph comparison
- [ ] Team collaboration features

### Phase 3 (Planned)
- [ ] LLM-powered agent suggestions
- [ ] Cost optimization recommendations
- [ ] Anomaly detection and auto-escalation
- [ ] Advanced analytics dashboard
- [ ] Workflow templates library

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit with clear message (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow existing component patterns
- Add JSDoc comments for public APIs
- Update documentation for user-facing changes

---

## Support

- **Documentation:** [KNOWLEDGE-BASE.md](./KNOWLEDGE-BASE.md)
- **Quick Help:** [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
- **Issues:** Report bugs or request features via GitHub Issues
- **Discussions:** Join community discussions for questions

---

## License

MIT License - see LICENSE file for details

---

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Visual canvas powered by [React Flow](https://reactflow.dev/)
- Icons from [Lucide](https://lucide.dev/)

---

**Version:** 0.3.0
**Last Updated:** 2026-02-08
**Status:** Active Development
