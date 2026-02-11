/**
 * Orchestrator Engine
 *
 * Core orchestration logic:
 * - Task decomposition from instruction graphs
 * - Rule evaluation (priority, dependencies, affinity)
 * - Agent assignment & task routing
 * - Simulation & metric estimation
 *
 * Features:
 * - Topological sort for dependency ordering
 * - Agent type affinity matching
 * - Constraint enforcement (max agents, cost caps)
 * - Circular dependency detection
 * - Success probability estimation
 */

// Types
export interface Rule {
  id: string;
  name: string;
  priority: number; // 1–10, higher = more important
  dependencies: string[]; // task IDs this rule depends on
  agent_type_affinity: Record<string, string>; // { task_type: agent_type }
  constraints: {
    max_agents?: number;
    max_cost_per_task?: number;
  };
}

export interface InstructionNode {
  id: string;
  type: string; // 'code_gen', 'test', 'deploy', 'review', etc.
  description: string;
  estimated_cost?: number;
  estimated_duration?: number;
  dependencies?: string[]; // IDs of tasks that must complete first
  parallelizable?: boolean;
}

export interface TaskAssignment {
  id: string;
  assigned_agent_id_or_pool: string;
  estimated_cost: number;
  estimated_duration: number;
  status: 'pending' | 'processing' | 'complete';
}

export interface SimulationResult {
  assignment_plan: TaskAssignment[];
  critical_path: string[]; // longest sequential chain
  estimated_total_cost: number;
  estimated_total_duration: number;
  success_probability: number; // 0–100
  validation_errors: string[];
  artifacts?: any[]; // Generated mock artifacts (from F04-MH-03)
}

export interface ExecutionPlan {
  id: string;
  execution_id: string;
  rule_set_id: string;
  assignment_plan: TaskAssignment[];
  metrics: {
    estimated_cost: number;
    estimated_duration: number;
    success_probability: number;
  };
  created_at: string;
}

// ============================================================================
// ORCHESTRATOR ENGINE
// ============================================================================

export class OrchestratorEngine {
  private rules: Map<string, Rule> = new Map();
  private agent_pool: Set<string> = new Set();

  constructor(rules?: Rule[], agent_ids?: string[]) {
    if (rules) {
      rules.forEach((r) => this.rules.set(r.id, r));
    }
    if (agent_ids) {
      agent_ids.forEach((id) => this.agent_pool.add(id));
    }
  }

  /**
   * Decompose an instruction graph into atomic sub-tasks
   * using topological sort to respect dependencies
   */
  decompose(graph: InstructionNode[]): InstructionNode[] {
    console.log('[decompose] Input graph:', JSON.stringify(graph, null, 2));
    const errors = this.validateGraph(graph);
    console.log('[decompose] Validation errors:', errors);
    if (errors.length > 0) {
      throw new Error(`Graph validation failed: ${errors.join(', ')}`);
    }

    // Build adjacency map
    const adjMap: Map<string, string[]> = new Map();
    const in_degree: Map<string, number> = new Map();

    graph.forEach((node) => {
      adjMap.set(node.id, []);
      in_degree.set(node.id, node.dependencies?.length || 0);
    });

    // Populate adjacency for topological sort
    graph.forEach((node) => {
      if (node.dependencies) {
        node.dependencies.forEach((dep_id) => {
          const deps = adjMap.get(dep_id) || [];
          deps.push(node.id);
          adjMap.set(dep_id, deps);
        });
      }
    });

    // Kahn's algorithm: topological sort
    const queue = Array.from(graph).filter((n) => (in_degree.get(n.id) || 0) === 0);
    const sorted: InstructionNode[] = [];
    const node_map: Map<string, InstructionNode> = new Map(
      graph.map((n) => [n.id, n])
    );

    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      const dependents = adjMap.get(current.id) || [];
      dependents.forEach((dep_id) => {
        const new_degree = (in_degree.get(dep_id) || 0) - 1;
        in_degree.set(dep_id, new_degree);

        if (new_degree === 0) {
          queue.push(node_map.get(dep_id)!);
        }
      });
    }

    if (sorted.length !== graph.length) {
      throw new Error('Circular dependency detected in instruction graph');
    }

    return sorted;
  }

  /**
   * Assign decomposed tasks to agents based on rules
   */
  assign(
    tasks: InstructionNode[],
    rule_set_id: string,
    constraints_override?: Record<string, unknown>
  ): { assignments: TaskAssignment[]; errors: string[] } {
    console.log('[assign] Tasks:', JSON.stringify(tasks, null, 2));
    console.log('[assign] Rule set ID:', rule_set_id);
    const rule_set = this.rules.get(rule_set_id);
    console.log('[assign] Retrieved rule set:', JSON.stringify(rule_set, null, 2));
    if (!rule_set) {
      return { assignments: [], errors: [`Rule set ${rule_set_id} not found`] };
    }

    const assignments: TaskAssignment[] = [];
    const errors: string[] = [];
    const agent_ids = Array.from(this.agent_pool);

    // Sort tasks by priority (rules define which have higher priority)
    const task_priority: Map<string, number> = new Map();
    tasks.forEach((t) => {
      const affinity_entries = Object.entries(rule_set?.agent_type_affinity || {});
      const matches = affinity_entries.filter(([, agent_type]) =>
        t.type.toLowerCase().includes(agent_type?.toLowerCase() || '')
      );
      task_priority.set(t.id, matches.length > 0 ? (rule_set?.priority || 5) : 5);
    });

    const sorted_tasks = [...tasks].sort(
      (a, b) => (task_priority.get(b.id) || 5) - (task_priority.get(a.id) || 5)
    );

    // Greedy assignment
    sorted_tasks.forEach((task) => {
      let assigned = false;

      // Try to find affinity match
      for (const [task_type, agent_type] of Object.entries(
        rule_set?.agent_type_affinity || {}
      )) {
        if (task.type.toLowerCase().includes(task_type.toLowerCase())) {
          const matching_agent = agent_ids.find((id) =>
            id.toLowerCase().includes(agent_type.toLowerCase())
          );

          if (matching_agent) {
            assignments.push({
              id: task.id,
              assigned_agent_id_or_pool: matching_agent,
              estimated_cost: task.estimated_cost || 10,
              estimated_duration: task.estimated_duration || 30,
              status: 'pending',
            });
            assigned = true;
            break;
          }
        }
      }

      // Fallback: assign to first available agent
      if (!assigned) {
        if (agent_ids.length === 0) {
          errors.push(`No agents available for task ${task.id}`);
        } else {
          assignments.push({
            id: task.id,
            assigned_agent_id_or_pool: agent_ids[0],
            estimated_cost: task.estimated_cost || 10,
            estimated_duration: task.estimated_duration || 30,
            status: 'pending',
          });
          assigned = true;
        }
      }
    });

    return { assignments, errors };
  }

  /**
   * Simulate orchestration: decompose → assign → estimate metrics
   */
  simulate(
    graph: InstructionNode[],
    rule_set_id: string,
    constraints_override?: Record<string, unknown>
  ): SimulationResult {
    const validation_errors: string[] = [];

    // Step 1: Decompose
    let decomposed_tasks: InstructionNode[];
    try {
      decomposed_tasks = this.decompose(graph);
    } catch (e) {
      return {
        assignment_plan: [],
        critical_path: [],
        estimated_total_cost: 0,
        estimated_total_duration: 0,
        success_probability: 0,
        validation_errors: [String(e)],
      };
    }

    // Step 2: Assign
    const { assignments, errors: assignment_errors } = this.assign(
      decomposed_tasks,
      rule_set_id,
      constraints_override
    );

    validation_errors.push(...assignment_errors);

    // Step 3: Estimate metrics
    const total_cost = assignments.reduce((sum, a) => sum + a.estimated_cost, 0);
    const critical_path = this.computeCriticalPath(decomposed_tasks, assignments);
    const max_duration = Math.max(
      ...assignments.map((a) => a.estimated_duration),
      0
    );

    // Success probability: assume 95% base, -5% per error
    const success_probability = Math.max(
      0,
      95 - validation_errors.length * 5
    );

    return {
      assignment_plan: assignments,
      critical_path,
      estimated_total_cost: total_cost,
      estimated_total_duration: max_duration,
      success_probability,
      validation_errors,
    };
  }

  /**
   * Find the critical path (longest chain of dependent tasks)
   */
  private computeCriticalPath(
    tasks: InstructionNode[],
    assignments: TaskAssignment[]
  ): string[] {
    if (tasks.length === 0) return [];

    // Build dependency graph
    const task_map: Map<string, InstructionNode> = new Map(
      tasks.map((t) => [t.id, t])
    );
    const assign_map: Map<string, TaskAssignment> = new Map(
      assignments.map((a) => [a.id, a])
    );

    // DFS to find longest path
    let longest_path: string[] = [];

    const dfs = (task_id: string, current_path: string[]): void => {
      const task = task_map.get(task_id);
      if (!task) return;

      current_path.push(task_id);

      const has_dependents = tasks.some((t) =>
        t.dependencies?.includes(task_id)
      );

      if (!has_dependents) {
        // Leaf node
        if (current_path.length > longest_path.length) {
          longest_path = [...current_path];
        }
      } else {
        // Continue DFS
        tasks.forEach((t) => {
          if (t.dependencies?.includes(task_id)) {
            dfs(t.id, [...current_path]);
          }
        });
      }
    };

    // Start from root nodes (no dependencies)
    tasks
      .filter((t) => !t.dependencies || t.dependencies.length === 0)
      .forEach((t) => dfs(t.id, []));

    return longest_path;
  }

  /**
   * Validate instruction graph for circular dependencies and structure
   */
  private validateGraph(graph: InstructionNode[]): string[] {
    const errors: string[] = [];

    // Check for missing IDs
    graph.forEach((node) => {
      if (!node.id) errors.push('Task missing id');
      if (!node.type) errors.push(`Task ${node.id} missing type`);
    });

    // Check for circular dependencies (DFS-based cycle detection)
    const visited: Set<string> = new Set();
    const rec_stack: Set<string> = new Set();

    const has_cycle = (node_id: string): boolean => {
      visited.add(node_id);
      rec_stack.add(node_id);

      const node = graph.find((n) => n.id === node_id);
      if (node && node.dependencies) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            if (has_cycle(dep)) return true;
          } else if (rec_stack.has(dep)) {
            return true;
          }
        }
      }

      rec_stack.delete(node_id);
      return false;
    };

    graph.forEach((node) => {
      if (!visited.has(node.id)) {
        if (has_cycle(node.id)) {
          errors.push(`Circular dependency detected involving task ${node.id}`);
          return;
        }
      }
    });

    return errors;
  }

  // =========================================================================
  // RULE MANAGEMENT
  // =========================================================================

  addRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  getRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  getRule(rule_set_id: string): Rule | undefined {
    return this.rules.get(rule_set_id);
  }

  updateRule(rule: Rule): void {
    if (!this.rules.has(rule.id)) {
      throw new Error(`Rule ${rule.id} not found`);
    }
    this.rules.set(rule.id, rule);
  }

  deleteRule(rule_set_id: string): void {
    this.rules.delete(rule_set_id);
  }

  // =========================================================================
  // AGENT POOL MANAGEMENT
  // =========================================================================

  setAgentPool(agent_ids: string[]): void {
    this.agent_pool.clear();
    agent_ids.forEach((id) => this.agent_pool.add(id));
  }

  getAgentPool(): string[] {
    return Array.from(this.agent_pool);
  }

  addAgent(agent_id: string): void {
    this.agent_pool.add(agent_id);
  }

  removeAgent(agent_id: string): void {
    this.agent_pool.delete(agent_id);
  }
}

// ============================================================================
// FACTORY & HELPERS
// ============================================================================

export function createOrchestratorEngine(rules?: Rule[], agents?: string[]): OrchestratorEngine {
  return new OrchestratorEngine(rules, agents);
}

/**
 * Mock agent pool for simulation (when real agents not available)
 */
export const MOCK_AGENT_TYPES = ['code_gen_agent', 'test_agent', 'deploy_agent', 'review_agent'];

export function createMockAgentPool(count: number = 10): string[] {
  const agents: string[] = [];
  for (let i = 0; i < count; i++) {
    const agent_type = MOCK_AGENT_TYPES[i % MOCK_AGENT_TYPES.length];
    agents.push(`${agent_type}-${i}`);
  }
  return agents;
}

export function estimateTaskCost(task: InstructionNode, base_cost: number = 10): number {
  // Cost multiplier based on task type
  const cost_multiplier: Record<string, number> = {
    code_gen: 1.5,
    test: 1.0,
    deploy: 2.0,
    review: 0.5,
  };

  const multiplier = cost_multiplier[task.type] || 1.0;
  return task.estimated_cost || base_cost * multiplier;
}

export function estimateTaskDuration(task: InstructionNode, base_duration: number = 30): number {
  // Duration multiplier based on task type (in seconds)
  const duration_multiplier: Record<string, number> = {
    code_gen: 2.0,
    test: 1.5,
    deploy: 3.0,
    review: 1.0,
  };

  const multiplier = duration_multiplier[task.type] || 1.0;
  return task.estimated_duration || base_duration * multiplier;
}

/**
 * Generate artifacts for a simulation (F04-MH-03)
 * Can be called after simulation completes to populate artifacts
 */
export function generateArtifactsForSimulation(
  tasks: InstructionNode[],
  assignments: TaskAssignment[]
): any[] {
  try {
    const { generateAllArtifacts } = require('./artifact-generator');
    return generateAllArtifacts(tasks, assignments);
  } catch (e) {
    console.warn('Artifact generation failed:', e);
    return [];
  }
}
