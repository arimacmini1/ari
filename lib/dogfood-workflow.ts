/**
 * Dogfood Workflow Enforcement System
 * 
 * This module enforces the B1-B8 workflow for feature development.
 * It provides templates and utilities that can be adapted for any project.
 * 
 * CONFIGURATION - Customize for your project:
 * - BLOCK_PREFIX: Prefix for block IDs (e.g., "B1", "P1", "Step")
 * - BLOCK_NAMES: Names of each workflow step
 * - TASK_ID_PATTERN: Regex pattern for task IDs
 * - FEATURE_FILE_PATTERN: Glob pattern for feature files
 */

// ============================================
// CONFIGURATION - Edit these for your project
// ============================================

export const DOGFOOD_CONFIG = {
  // Block ID prefix (e.g., "B" for B1-B8, "P" for P1-P8, "Step")
  BLOCK_PREFIX: "B",
  
  // Total number of blocks in workflow
  TOTAL_BLOCKS: 8,
  
  // Block names - customize per project
  BLOCK_NAMES: [
    "Scope Lock",        // B1
    "Dependency Check",  // B2
    "Design Pass",       // B3
    "Implement Pass",    // B4
    "Verify Pass",       // B5
    "Review Pass",       // B6
    "Docs Sync",         // B7
    "Ship Decision",     // B8
  ] as const,
  
  // Block owners - customize per project
  BLOCK_OWNERS: [
    "Planner",           // B1
    "Planner",           // B2
    "Architect",         // B3
    "Implementer",       // B4
    "Tester",            // B5
    "Reviewer",          // B6
    "Docs Agent",        // B7
    "Lead",              // B8
  ] as const,
  
  // Task ID pattern (e.g., "FXX-TT-NN" for features, "TXX-TT-NN" for tuning)
  TASK_ID_PATTERN: /^[FT]\d{2}-[A-Z]{2}-\d{2}$/,
  
  // Feature file pattern (glob)
  FEATURE_FILE_PATTERN: "docs/tasks/*-feature-*.md",
  
  // Progress log entry format
  PROGRESS_FORMAT: (blockId: string, date: string, status: string) => 
    `- ${date}: ${blockId} ${status}`,
} as const;

// ============================================
// WORKFLOW BLOCK GENERATION
// ============================================

export interface WorkflowBlock {
  id: string;           // e.g., "B1"
  name: string;         // e.g., "Scope Lock"
  owner: string;        // e.g., "Planner"
  index: number;        // 0-7
}

/**
 * Generate all workflow blocks based on config
 */
export function generateWorkflowBlocks(): WorkflowBlock[] {
  const blocks: WorkflowBlock[] = [];
  for (let i = 0; i < DOGFOOD_CONFIG.TOTAL_BLOCKS; i++) {
    blocks.push({
      id: `${DOGFOOD_CONFIG.BLOCK_PREFIX}${i + 1}`,
      name: DOGFOOD_CONFIG.BLOCK_NAMES[i],
      owner: DOGFOOD_CONFIG.BLOCK_OWNERS[i],
      index: i,
    });
  }
  return blocks;
}

/**
 * Get block by ID (e.g., "B1" -> {id: "B1", name: "Scope Lock", ...})
 */
export function getBlock(blockId: string): WorkflowBlock | undefined {
  const blocks = generateWorkflowBlocks();
  return blocks.find(b => b.id === blockId);
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that a feature file follows B1-B8 workflow
 */
export function validateFeatureFile(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const blocks = generateWorkflowBlocks();
  
  // Check for each block's progress entry
  for (const block of blocks) {
    const blockPattern = new RegExp(`${block.id}[\\s_-]`, 'i');
    if (!blockPattern.test(content)) {
      warnings.push(`Missing ${block.id} (${block.name}) progress entry`);
    }
  }
  
  // Check for "DONE" or "done" markers - blocks should be completed, not just started
  const doneBlocks = content.match(/B\d+.*(?:done|complete|shipped)/gi) || [];
  if (doneBlocks.length > 0 && doneBlocks.length < blocks.length) {
    warnings.push("Some blocks marked done but not all - workflow may be incomplete");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a task can be marked complete
 * Returns false if B1-B7 aren't done before B8
 */
export function canMarkComplete(content: string, taskId: string): boolean {
  // Check B8 is being marked done
  if (!content.includes("B8") && !content.includes("b8")) {
    return true; // Not a ship decision
  }
  
  // Check all previous blocks have progress
  for (let i = 1; i < 8; i++) {
    const blockId = `B${i}`;
    if (!content.toLowerCase().includes(blockId.toLowerCase())) {
      return false;
    }
  }
  
  return true;
}

// ============================================
// FEATURE FILE TEMPLATE GENERATION
// ============================================

export interface FeatureTask {
  id: string;
  title: string;
  owner: string;
  dependencies: string[];
  blocks: string[];
  roadmapRef?: string;
}

/**
 * Generate a feature file template with B1-B8 structure
 */
export function generateFeatureFile(
  featureNumber: number,
  featureName: string,
  tasks: FeatureTask[]
): string {
  const blocks = generateWorkflowBlocks();
  const featureNum = String(featureNumber).padStart(2, '0');
  
  let md = `# Feature ${featureNum} – ${featureName}\n\n`;
  md += `**Owner:** TBD\n\n`;
  md += `## Overview\n\n`;
  md += `One-paragraph summary of what this feature delivers.\n\n`;
  
  // Must-Have Tasks
  md += `## Must-Have Tasks\n\n`;
  for (const task of tasks) {
    md += `- [ ] \`${task.id}\` ${task.title}\n`;
    md += `  - Owner: ${task.owner}\n`;
    md += `  - Dependencies: ${task.dependencies.join(', ') || 'none'}\n`;
    md += `  - Blocks: ${task.blocks.join(', ') || 'TBD'}\n`;
    if (task.roadmapRef) {
      md += `  - Roadmap ref: ${task.roadmapRef}\n`;
    }
    md += `  - Acceptance criteria:\n`;
    md += `    - TBD\n`;
    md += `  - Progress / Fixes / Updates:\n`;
    md += `    - ${new Date().toISOString().split('T')[0]}: Not started\n\n`;
  }
  
  // B1-B8 Progress Section
  md += `## B1-B8 Workflow Progress\n\n`;
  md += `| Block | Name | Status | Notes |\n`;
  md += `|-------|------|--------|-------|\n`;
  for (const block of blocks) {
    md += `| ${block.id} | ${block.name} | Not started | |\n`;
  }
  
  // Cross-Feature Dependencies
  md += `\n## Cross-Feature Dependencies\n\n`;
  md += `### Inbound\n`;
  md += `| Task ID | Task | Blocked | Status |\n`;
  md += `|---------|------|---------|--------|\n`;
  md += `| - | None yet | - | - |\n`;
  
  md += `\n### Outbound\n`;
  md += `| Task ID | Task | Blocks | Feature |\n`;
  md += `|---------|------|--------|---------|\n`;
  md += `| - | None yet | - | - |\n`;
  
  return md;
}

// ============================================
// CANVAS TEMPLATE GENERATION
// ============================================

export interface CanvasNode {
  id: string;
  type: string;
  data: {
    label: string;
    description: string;
    blockType: string;
  };
  position: { x: number; y: number };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: { x: number; y: number; zoom: number };
}

/**
 * Generate a canvas state with B1-B8 blocks
 * This can be used to initialize a canvas/flowchart tool
 */
export function generateCanvasTemplate(): CanvasState {
  const blocks = generateWorkflowBlocks();
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nodeId = `block-${block.id.toLowerCase()}`;
    
    nodes.push({
      id: nodeId,
      type: "block",
      data: {
        label: `${block.id}: ${block.name}`,
        description: `Owner: ${block.owner}`,
        blockType: `b${i + 1}-${block.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      position: { x: 200 * i, y: 100 },
    });
    
    if (i > 0) {
      edges.push({
        id: `edge-${blocks[i - 1].id}-${block.id}`,
        source: `block-${blocks[i - 1].id.toLowerCase()}`,
        target: nodeId,
      });
    }
  }
  
  return {
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
