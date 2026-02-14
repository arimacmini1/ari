import { TraceExecution } from "@/lib/trace-model"

const TRACE_DB = new Map<string, TraceExecution>()
const TRACE_PROJECT_INDEX = new Map<string, string>()
const TRACE_INSERT_ORDER: string[] = []
const MAX_TRACES = Number.parseInt(process.env.AEI_MAX_TRACES ?? "", 10) || 200

function seedIfNeeded() {
  if (TRACE_DB.size > 0) return

  TRACE_DB.set("exec-001", {
    execution_id: "exec-001",
    project_id: "project-default",
    agent_id: "orchestrator-main",
    start_time: "2026-02-09T10:00:00Z",
    duration: 12.4,
    cost: 0.42,
    status: "success",
    root_decisions: [
      {
        node_id: "decision-1",
        label: "Parse requirements and validate schema",
        decision_context:
          "Analyzed user requirements to extract key entities, constraints, and dependencies. Validated all inputs against the predefined schema to ensure data integrity and consistency. Identified 3 critical constraints and 2 optional features. Schema validation passed with 99% confidence.",
        confidence_score: 97,
        timestamp: "2026-02-09T10:00:02Z",
        decision_outcome: "Proceed with architecture planning",
        agent_id: "orchestrator-main",
        cost: 0.05,
        duration: 1.2,
        alternatives_considered: [
          {
            outcome: "Request clarification from user",
            rejection_reason: "Requirements were sufficiently clear and complete",
          },
        ],
        children: [
          {
            node_id: "decision-1-1",
            label: "Extract entities and constraints",
            decision_context:
              "Used NLP parsing to identify 8 named entities, 3 hard constraints, and 5 soft constraints. Applied entity linking to resolve ambiguous references. Cross-referenced against knowledge base.",
            confidence_score: 94,
            timestamp: "2026-02-09T10:00:03Z",
            decision_outcome: "Extracted 11 total constraints",
            agent_id: "nlp-parser",
            cost: 0.02,
            duration: 0.8,
            parent_decision_id: "decision-1",
          },
          {
            node_id: "decision-1-2",
            label: "Validate schema compliance",
            decision_context:
              "Performed strict validation against JSON schema v7. All required fields present. 2 optional fields added context. No schema violations detected. Generated validation report.",
            confidence_score: 99,
            timestamp: "2026-02-09T10:00:04Z",
            decision_outcome: "Full schema compliance confirmed",
            agent_id: "schema-validator",
            cost: 0.01,
            duration: 0.3,
            parent_decision_id: "decision-1",
            children: [
              {
                node_id: "decision-1-2-1",
                label: "Generate compliance report",
                decision_context: "Compiled detailed validation report with all fields checked.",
                confidence_score: 98,
                timestamp: "2026-02-09T10:00:04Z",
                decision_outcome: "Report generated",
                agent_id: "schema-validator",
                cost: 0.001,
                duration: 0.1,
                parent_decision_id: "decision-1-2",
              },
            ],
          },
        ],
      },
      {
        node_id: "decision-2",
        label: "Generate architecture plan with design patterns",
        decision_context:
          "Evaluated 5 design patterns against requirements: MVC, MVVM, event-driven, microservices, and layered architecture. Scored each on scalability, maintainability, and resource efficiency. Selected microservices due to high scalability requirements. Considered trade-offs in complexity vs benefits.",
        confidence_score: 89,
        timestamp: "2026-02-09T10:00:06Z",
        decision_outcome: "Selected microservices architecture",
        agent_id: "code-gen-alpha",
        cost: 0.12,
        duration: 3.4,
        alternatives_considered: [
          {
            outcome: "Use monolithic architecture",
            rejection_reason: "Does not meet scalability requirements for projected load",
          },
          {
            outcome: "Use event-driven architecture",
            rejection_reason: "Adds unnecessary complexity for this use case",
          },
        ],
        children: [
          {
            node_id: "decision-2-1",
            label: "Evaluate design patterns",
            decision_context:
              "Analyzed MVC (score: 72), MVVM (score: 78), event-driven (score: 81), microservices (score: 92), layered (score: 75). Microservices won on scalability and isolation.",
            confidence_score: 85,
            timestamp: "2026-02-09T10:00:07Z",
            decision_outcome: "Microservices emerged as top choice",
            agent_id: "code-gen-alpha",
            cost: 0.08,
            duration: 2.1,
            parent_decision_id: "decision-2",
            alternatives_considered: [
              {
                outcome: "Weight scalability more heavily",
                rejection_reason: "Current weights reflect requirement importance correctly",
              },
            ],
          },
          {
            node_id: "decision-2-2",
            label: "Resolve service dependencies",
            decision_context:
              "Mapped 12 services with 18 dependencies. Identified 2 circular dependencies and resolved via mediator pattern. Validated dependency graph is acyclic. Estimated max depth: 4 service calls.",
            confidence_score: 92,
            timestamp: "2026-02-09T10:00:09Z",
            decision_outcome: "Dependency graph validated and optimized",
            agent_id: "code-gen-alpha",
            cost: 0.04,
            duration: 1.1,
            parent_decision_id: "decision-2",
          },
        ],
      },
      {
        node_id: "decision-3",
        label: "Run comprehensive test suite",
        decision_context:
          "Executed 156 unit tests, 42 integration tests, and 8 end-to-end tests. Coverage: 87% (up 3% from last run). All critical path tests passed. 1 flaky test identified in retry logic. Performance tests show 95th percentile response time: 234ms.",
        confidence_score: 91,
        timestamp: "2026-02-09T10:00:13Z",
        decision_outcome: "Tests passed with high coverage",
        agent_id: "test-runner-01",
        cost: 0.18,
        duration: 8.7,
        children: [
          {
            node_id: "decision-3-1",
            label: "Run unit tests (156 cases)",
            decision_context: "All 156 unit tests passed in 3.2s. Coverage increased to 87%.",
            confidence_score: 96,
            timestamp: "2026-02-09T10:00:14Z",
            decision_outcome: "156/156 tests passed",
            agent_id: "test-runner-01",
            cost: 0.05,
            duration: 3.2,
            parent_decision_id: "decision-3",
          },
        ],
      },
      {
        node_id: "decision-4",
        label: "Security compliance and vulnerability scan",
        decision_context:
          "Performing security compliance checks against OWASP Top 10, CWE-25, and company security standards. Scanning for CVE vulnerabilities in dependencies. Initial scan in progress...",
        confidence_score: 0,
        timestamp: "2026-02-09T10:00:14Z",
        decision_outcome: "Pending security verification",
        agent_id: "security-scan",
        cost: undefined,
        duration: undefined,
        alternatives_considered: [
          {
            outcome: "Skip security scan",
            rejection_reason: "Security scan is mandatory before deployment",
          },
        ],
      },
    ],
  })

  TRACE_DB.set("exec-002", {
    execution_id: "exec-002",
    project_id: "project-default",
    agent_id: "orchestrator-main",
    start_time: "2026-02-09T11:15:00Z",
    duration: 5.8,
    cost: 0.28,
    status: "warning",
    root_decisions: [
      {
        node_id: "decision-a",
        label: "Initialize code generation from template",
        decision_context:
          "Selected code generation template for REST API. Loaded 3 templates and scored based on requirements. Template-01 matched 92%. Starting code generation...",
        confidence_score: 92,
        timestamp: "2026-02-09T11:15:02Z",
        decision_outcome: "Template-01 selected for code generation",
        agent_id: "orchestrator-main",
        cost: 0.1,
        duration: 2.5,
        children: [
          {
            node_id: "decision-a-1",
            label: "Generate boilerplate code",
            decision_context: "Generated 450 lines of TypeScript boilerplate. Added ESLint config.",
            confidence_score: 88,
            timestamp: "2026-02-09T11:15:04Z",
            decision_outcome: "Boilerplate generated successfully",
            agent_id: "code-gen-alpha",
            cost: 0.06,
            duration: 1.8,
            parent_decision_id: "decision-a",
          },
        ],
      },
      {
        node_id: "decision-b",
        label: "Perform code quality analysis",
        decision_context:
          "Running ESLint, Prettier, and complexity analysis. Found 2 moderate issues. Average cyclomatic complexity: 4.2. Type coverage: 94%.",
        confidence_score: 78,
        timestamp: "2026-02-09T11:15:05Z",
        decision_outcome: "Quality check completed with warnings",
        agent_id: "code-quality-bot",
        cost: 0.08,
        duration: 1.5,
        alternatives_considered: [
          {
            outcome: "Reject code and regenerate",
            rejection_reason: "Issues are moderate and can be fixed. Regeneration would be costly.",
          },
        ],
      },
    ],
  })

  TRACE_INSERT_ORDER.push("exec-001", "exec-002")
  TRACE_PROJECT_INDEX.set("exec-001", "project-default")
  TRACE_PROJECT_INDEX.set("exec-002", "project-default")
}

function generateTrace(executionId: string, projectId: string): TraceExecution {
  const timestamp = new Date().toISOString()
  return {
    execution_id: executionId,
    project_id: projectId,
    agent_id: "orchestrator-main",
    start_time: timestamp,
    duration: Math.random() * 15 + 2,
    cost: Math.random() * 0.5 + 0.1,
    status: "success",
    root_decisions: [
      {
        node_id: "decision-main",
        label: "Parse and execute request",
        decision_context:
          "Analyzed incoming execution request. Validated parameters and constraints. Selected execution strategy based on requirements and available resources.",
        confidence_score: 92,
        timestamp,
        decision_outcome: "Execution proceeding with optimal strategy",
        agent_id: "orchestrator-main",
        cost: 0.05,
        duration: 2.5,
        children: [
          {
            node_id: "decision-exec-1",
            label: "Execute assigned tasks",
            decision_context:
              "Dispatched 3 tasks to available agents. Monitored execution progress. All tasks completed successfully within time budget.",
            confidence_score: 88,
            timestamp,
            decision_outcome: "All tasks executed successfully",
            agent_id: "task-executor",
            cost: 0.08,
            duration: 5.2,
            parent_decision_id: "decision-main",
          },
          {
            node_id: "decision-validation",
            label: "Validate execution results",
            decision_context:
              "Performed comprehensive validation of execution outputs. Checked for correctness, performance metrics, and compliance with constraints.",
            confidence_score: 95,
            timestamp,
            decision_outcome: "Results validated and approved",
            agent_id: "validator",
            cost: 0.02,
            duration: 1.8,
            parent_decision_id: "decision-main",
          },
        ],
      },
    ],
  }
}

export function getOrCreateTraceExecution(
  executionId: string,
  options?: { projectId?: string }
): TraceExecution {
  seedIfNeeded()
  const existing = TRACE_DB.get(executionId)
  if (existing) {
    const existingProjectId = TRACE_PROJECT_INDEX.get(executionId) ?? existing.project_id
    if (options?.projectId && existingProjectId && existingProjectId !== options.projectId) {
      throw new Error(`Trace ${executionId} is not in active project ${options.projectId}`)
    }
    return existing
  }

  const trace = generateTrace(executionId, options?.projectId ?? "project-default")
  upsertTraceExecution(trace, options?.projectId)
  return trace
}

export function getTraceExecution(executionId: string): TraceExecution | null {
  seedIfNeeded()
  return TRACE_DB.get(executionId) ?? null
}

export function getTraceProjectId(executionId: string): string | null {
  seedIfNeeded()
  return TRACE_PROJECT_INDEX.get(executionId) ?? null
}

export function upsertTraceExecution(trace: TraceExecution, projectId?: string) {
  seedIfNeeded()
  const id = trace.execution_id
  const resolvedProjectId = projectId ?? trace.project_id ?? "project-default"
  trace.project_id = resolvedProjectId

  if (!TRACE_DB.has(id)) {
    TRACE_INSERT_ORDER.push(id)
  }

  TRACE_DB.set(id, trace)
  TRACE_PROJECT_INDEX.set(id, resolvedProjectId)

  // Simple cap to prevent unbounded memory growth (fork spam, etc).
  while (TRACE_INSERT_ORDER.length > MAX_TRACES) {
    const oldest = TRACE_INSERT_ORDER.shift()
    if (!oldest) break
    TRACE_DB.delete(oldest)
    TRACE_PROJECT_INDEX.delete(oldest)
  }
}
