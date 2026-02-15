/**
 * Trace Data Model & Schema
 * Feature: F05-MH-01 (AI Trace Viewer)
 *
 * Defines TypeScript interfaces for trace data including decision nodes,
 * executions, alternatives considered, and confidence scoring.
 */

import type { SourceRepo } from '@/lib/execution-store'

export interface Alternative {
  outcome: string;
  rejection_reason: string;
}

export interface DecisionNode {
  node_id: string;
  label?: string;                   // Brief context for tree view (optional, used in UI)
  decision_context: string;        // Full reasoning text (500-2000 chars)
  confidence_score: number;         // 0-100
  timestamp: string;                // ISO 8601
  decision_outcome: string;         // Selected action
  alternatives_considered?: Alternative[];
  parent_decision_id?: string;
  agent_id: string;
  cost?: number;
  duration?: number;
  children?: DecisionNode[];
}

export interface TraceExecution {
  execution_id: string;
  project_id?: string;             // Active project context for scoping
  agent_id: string;
  start_time: string;               // ISO 8601
  duration: number;                 // seconds
  cost: number;                      // USD
  status: 'success' | 'warning' | 'failed' | 'pending';
  root_decisions: DecisionNode[];
  source_execution_id?: string;     // Optional link for forked traces
  fork_node_id?: string;            // Optional decision node that was forked
  fork_mode?: 'scoped' | 'full';    // scoped = downstream subtree only
  source_repo?: SourceRepo;
}

export interface TraceNode extends DecisionNode {
  label: string;                    // Abbreviated context for tree view (50-100 chars)
  isExpanded?: boolean;             // UI state
}

/**
 * Helper to extract a preview label from full context
 */
export function getContextPreview(context: string, maxChars: number = 100): string {
  if (!context) return 'No context';
  const trimmed = context.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.substring(0, maxChars) + '...';
}

/**
 * Helper to format confidence score for display
 */
export function formatConfidence(score: number): string {
  return `${Math.round(score)}%`;
}

/**
 * Helper to get confidence color class
 */
export function getConfidenceColor(score: number): string {
  if (score >= 90) return 'bg-emerald-400';
  if (score >= 80) return 'bg-amber-400';
  return 'bg-destructive';
}

/**
 * Helper to get confidence status
 */
export function getConfidenceStatus(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

/**
 * Helper to flatten a decision tree into a list
 */
export function flattenDecisionTree(nodes: DecisionNode[]): DecisionNode[] {
  const result: DecisionNode[] = [];

  function traverse(node: DecisionNode) {
    result.push(node);
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return result;
}

/**
 * Helper to count total nodes in tree
 */
export function countDecisionNodes(nodes: DecisionNode[]): number {
  let count = 0;

  function traverse(node: DecisionNode) {
    count++;
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return count;
}

/**
 * Helper to get tree depth
 */
export function getTreeDepth(nodes: DecisionNode[]): number {
  let maxDepth = 0;

  function traverse(node: DecisionNode, depth: number) {
    maxDepth = Math.max(maxDepth, depth);
    if (node.children) {
      node.children.forEach((child) => traverse(child, depth + 1));
    }
  }

  nodes.forEach((node) => traverse(node, 1));
  return maxDepth;
}
