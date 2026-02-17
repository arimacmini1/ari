/**
 * ARI Dogfood Agent Definitions
 * 
 * Core agents for the dogfood workflow (B1-B8 phases).
 * These agents execute the ARI development workflow to build ARI itself.
 * 
 * @see docs/process/dogfood-workflow-templateV2.md
 */

export type AgentCapability = 
  | 'plan'         // Create plans, scope definitions
  | 'analyze'      // Analyze code, dependencies
  | 'design'       // Design solutions, architecture
  | 'implement'    // Write code
  | 'test'         // Test/verify
  | 'review'       // Review code
  | 'document'     // Write docs
  | 'decide'       // Make ship decisions
  | 'read'         // Read files
  | 'write'        // Write files
  | 'search'       // Search codebase
  | 'run'          // Run commands
  | 'browse'       // Browser automation (for bug hunting)

export interface AgentTool {
  name: string
  description: string
  capability: AgentCapability
}

export interface AgentDefinition {
  id: string           // e.g., "planner"
  name: string         // e.g., "Planner"
  description: string  // What the agent does
  blocks: string[]     // B1-B8 blocks this agent owns
  capabilities: AgentCapability[]
  tools: AgentTool[]
  defaultModel?: string
}

/**
 * Core ARI dogfood agents (B1-B8 workflow)
 */
export const DOGFOOD_AGENTS: Record<string, AgentDefinition> = {
  /**
   * Planner Agent
   * Handles: B1 Scope Lock, B2 Dependency Check
   * Creates roadmap tasks, feature files, slice goals
   */
  "planner": {
    id: "planner",
    name: "Planner",
    description: "Creates roadmap tasks, defines slice goals, checks dependencies",
    blocks: ["B1", "B2"],
    capabilities: ["plan", "analyze", "read", "search"],
    tools: [
      { name: "read_roadmap", description: "Read project roadmap", capability: "read" },
      { name: "read_feature_file", description: "Read feature task file", capability: "read" },
      { name: "analyze_dependencies", description: "Analyze dependencies", capability: "analyze" },
      { name: "write_slice_goal", description: "Write slice goal and scope", capability: "plan" },
      { name: "search_codebase", description: "Search codebase", capability: "search" },
    ],
    defaultModel: "openrouter/minimax/minimax-m2.5",
  },

  /**
   * Architect Agent
   * Handles: B3 Design Pass
   * Creates file-by-file implementation plans
   */
  "architect": {
    id: "architect",
    name: "Architect",
    description: "Designs implementation plans, creates file-by-file specs",
    blocks: ["B3"],
    capabilities: ["design", "analyze", "read", "search"],
    tools: [
      { name: "read_acceptance_criteria", description: "Read acceptance criteria", capability: "read" },
      { name: "read_current_code", description: "Read current implementation", capability: "read" },
      { name: "search_codebase", description: "Search existing code", capability: "search" },
      { name: "write_implementation_plan", description: "Write implementation plan", capability: "design" },
      { name: "define_contracts", description: "Define file contracts", capability: "design" },
    ],
    defaultModel: "openrouter/minimax/minimax-m2.5",
  },

  /**
   * Implementer Agent
   * Handles: B4 Implement Pass
   * Writes code changes
   */
  "implementer": {
    id: "implementer",
    name: "Implementer",
    description: "Implements code changes from design plans",
    blocks: ["B4"],
    capabilities: ["implement", "read", "write", "run"],
    tools: [
      { name: "read_implementation_plan", description: "Read implementation plan", capability: "read" },
      { name: "read_file", description: "Read file to modify", capability: "read" },
      { name: "write_file", description: "Write/modify files", capability: "write" },
      { name: "run_command", description: "Run build commands", capability: "run" },
      { name: "search_codebase", description: "Find related code", capability: "search" },
    ],
    defaultModel: "openrouter/minimax/minimax-m2.5",
  },

  /**
   * Tester Agent
   * Handles: B5 Verify Pass
   * Runs tests, validates acceptance criteria, bugs hunts via browser automation
   */
  "tester": {
    id: "tester",
    name: "Tester",
    description: "Verifies implementations - runs tests, validates criteria, bug hunts via browser automation",
    blocks: ["B5"],
    capabilities: ["test", "analyze", "read", "run", "browse"],
    tools: [
      { name: "read_acceptance_criteria", description: "Read acceptance criteria", capability: "read" },
      { name: "read_changed_files", description: "Read changed files", capability: "read" },
      { name: "run_tests", description: "Run test suite", capability: "test" },
      { name: "analyze_coverage", description: "Analyze test coverage", capability: "analyze" },
      { name: "capture_evidence", description: "Capture verification evidence", capability: "test" },
      // Browser automation for bug hunting
      { name: "browser_navigate", description: "Navigate to URL (e.g., localhost:3000)", capability: "browse" },
      { name: "browser_snapshot", description: "Take snapshot of current page", capability: "browse" },
      { name: "browser_click", description: "Click element on page", capability: "browse" },
      { name: "browser_type", description: "Type into input field", capability: "browse" },
      { name: "browser_find_bugs", description: "Scan page for bugs/errors and report findings", capability: "browse" },
      { name: "browser_console", description: "Check browser console for errors", capability: "browse" },
    ],
    defaultModel: "openrouter/minimax/minimax-m2.5",
  },

  /**
   * Reviewer Agent
   * Handles: B6 Review Pass
   * Reviews diffs, provides feedback
   */
  "reviewer": {
    id: "reviewer",
    name: "Reviewer",
    description: "Reviews code changes, provides feedback",
    blocks: ["B6"],
    capabilities: ["review", "analyze", "read", "search"],
    tools: [
      { name: "read_diff", description: "Read code diff", capability: "read" },
      { name: "read_tests", description: "Read test files", capability: "read" },
      { name: "analyze_code_quality", description: "Analyze code quality", capability: "analyze" },
      { name: "search_codebase", description: "Find similar patterns", capability: "search" },
      { name: "write_review_findings", description: "Write review findings", capability: "review" },
    ],
    defaultModel: "openrouter/minimax/minimax-m2.5",
  },

  /**
   * Docs Agent
   * Handles: B7 Docs Sync
   * Updates documentation, ensures parity
   */
  "docs-agent": {
    id: "docs-agent",
    name: "Docs Agent",
    description: "Updates documentation, ensures docs parity",
    blocks: ["B7"],
    capabilities: ["document", "read", "write", "analyze"],
    tools: [
      { name: "read_final_diff", description: "Read final diff", capability: "read" },
      { name: "read_task_file", description: "Read task file", capability: "read" },
      { name: "update_progress_log", description: "Update progress log", capability: "document" },
      { name: "update_onboarding", description: "Update onboarding docs", capability: "document" },
      { name: "update_architecture", description: "Update architecture docs", capability: "document" },
      { name: "check_parity", description: "Check docs parity", capability: "analyze" },
    ],
    defaultModel: "openrouter/minimax/minimax-m2.5",
  },

  /**
   * Lead Agent
   * Handles: B8 Ship Decision
   * Makes go/no-go decision
   */
  "lead": {
    id: "lead",
    name: "Lead",
    description: "Makes ship decisions based on B5-B7 outputs",
    blocks: ["B8"],
    capabilities: ["decide", "analyze", "read"],
    tools: [
      { name: "read_verification_results", description: "Read B5 verification", capability: "read" },
      { name: "read_review_findings", description: "Read B6 review", capability: "read" },
      { name: "read_docs_status", description: "Read B7 docs status", capability: "read" },
      { name: "analyze_completeness", description: "Analyze if criteria met", capability: "analyze" },
      { name: "write_decision", description: "Write ship decision", capability: "decide" },
    ],
    defaultModel: "openrouter/minimax/minimax-m2.5",
  },
}

/**
 * Get agent by ID
 */
export function getAgent(agentId: string): AgentDefinition | undefined {
  return DOGFOOD_AGENTS[agentId]
}

/**
 * Get agents for a specific block
 */
export function getAgentsForBlock(blockId: string): AgentDefinition[] {
  return Object.values(DOGFOOD_AGENTS).filter(agent => agent.blocks.includes(blockId))
}

/**
 * Get all agent IDs
 */
export function getAgentIds(): string[] {
  return Object.keys(DOGFOOD_AGENTS)
}

/**
 * Get agent for block (single agent per block assumption)
 */
export function getAgentForBlock(blockId: string): AgentDefinition | undefined {
  const agents = getAgentsForBlock(blockId)
  return agents[0]
}

// Alias for backwards compatibility
export const AGENTS = DOGFOOD_AGENTS
export { getAgent as getDogfoodAgent, suggestAgent }

/**
 * Simple agent suggestion based on task description
 */
export function suggestAgent(taskDescription: string): string {
  const lower = taskDescription.toLowerCase()
  
  if (lower.includes("plan") || lower.includes("scope") || lower.includes("dependency")) {
    return "planner"
  }
  if (lower.includes("design") || lower.includes("architect") || lower.includes("plan")) {
    return "architect"
  }
  if (lower.includes("implement") || lower.includes("code") || lower.includes("build")) {
    return "implementer"
  }
  if (lower.includes("test") || lower.includes("verify") || lower.includes("validation")) {
    return "tester"
  }
  if (lower.includes("review") || lower.includes("feedback") || lower.includes("approve")) {
    return "reviewer"
  }
  if (lower.includes("doc") || lower.includes("parity") || lower.includes("onboarding")) {
    return "docs-agent"
  }
  if (lower.includes("ship") || lower.includes("decision") || lower.includes("release")) {
    return "lead"
  }
  
  // Default to implementer for code tasks
  return "implementer"
}