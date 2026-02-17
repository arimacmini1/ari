/**
 * Alert Rules Store
 * Feature: F06-SH-03 - Alert Rule Templates
 * 
 * Supports alert rules for:
 * - Cost budget exceeded
 * - Quality SLA breach
 * - Error threshold exceeded
 */

export type AlertRuleType = 'cost_budget' | 'quality_sla' | 'error_threshold'
export type AlertRuleStatus = 'active' | 'paused' | 'triggered'
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface AlertRule {
  id: string
  name: string
  description: string
  type: AlertRuleType
  project_id: string
  threshold: number // cost ($), quality (%), errors (count)
  window_ms: number // time window to evaluate
  severity: AlertSeverity
  status: AlertRuleStatus
  created_at: string
  triggered_at?: string
  triggered_value?: number
}

declare global {
  var __aei_alert_rules_db: Map<string, AlertRule> | undefined
}

function getAlertRulesDb(): Map<string, AlertRule> {
  if (!globalThis.__aei_alert_rules_db) {
    globalThis.__aei_alert_rules_db = new Map<string, AlertRule>()
    // Seed with default alert rules
    seedDefaultAlertRules()
  }
  return globalThis.__aei_alert_rules_db
}

function seedDefaultAlertRules() {
  const defaults: Omit<AlertRule, 'id' | 'created_at' | 'triggered_at' | 'triggered_value'>[] = [
    {
      name: 'Cost Budget Warning',
      description: 'Alert when project cost exceeds $100 in the last 24h',
      type: 'cost_budget',
      project_id: 'project-default',
      threshold: 100,
      window_ms: 24 * 60 * 60 * 1000, // 24 hours
      severity: 'warning',
      status: 'active',
    },
    {
      name: 'Cost Budget Critical',
      description: 'Alert when project cost exceeds $500 in the last 24h',
      type: 'cost_budget',
      project_id: 'project-default',
      threshold: 500,
      window_ms: 24 * 60 * 60 * 1000,
      severity: 'critical',
      status: 'active',
    },
    {
      name: 'Quality SLA Warning',
      description: 'Alert when quality score drops below 80%',
      type: 'quality_sla',
      project_id: 'project-default',
      threshold: 80,
      window_ms: 60 * 60 * 1000, // 1 hour
      severity: 'warning',
      status: 'active',
    },
    {
      name: 'Error Threshold Warning',
      description: 'Alert when error count exceeds 10 in the last hour',
      type: 'error_threshold',
      project_id: 'project-default',
      threshold: 10,
      window_ms: 60 * 60 * 1000,
      severity: 'warning',
      status: 'active',
    },
  ]

  defaults.forEach((rule, index) => {
    const id = `alert-${index + 1}`
    const fullRule: AlertRule = {
      ...rule,
      id,
      created_at: new Date().toISOString(),
    }
    globalThis.__aei_alert_rules_db!.set(id, fullRule)
  })
}

export function getAlertRules(projectId?: string): AlertRule[] {
  const db = getAlertRulesDb()
  const rules = Array.from(db.values())
  if (projectId) {
    return rules.filter((r) => r.project_id === projectId)
  }
  return rules
}

export function getAlertRule(id: string): AlertRule | undefined {
  return getAlertRulesDb().get(id)
}

export function createAlertRule(
  rule: Omit<AlertRule, 'id' | 'created_at' | 'status' | 'triggered_at' | 'triggered_value'>
): AlertRule {
  const db = getAlertRulesDb()
  const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const newRule: AlertRule = {
    ...rule,
    id,
    status: 'active',
    created_at: new Date().toISOString(),
  }
  db.set(id, newRule)
  return newRule
}

export function updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | undefined {
  const db = getAlertRulesDb()
  const existing = db.get(id)
  if (!existing) return undefined
  const updated = { ...existing, ...updates }
  db.set(id, updated)
  return updated
}

export function deleteAlertRule(id: string): boolean {
  const db = getAlertRulesDb()
  return db.delete(id)
}

export function checkAlertRules(
  projectId: string,
  metrics: { totalCost: number; avgQuality: number; errorCount: number; windowMs: number }
): AlertRule[] {
  const rules = getAlertRules(projectId).filter((r) => r.status === 'active')
  const triggered: AlertRule[] = []

  for (const rule of rules) {
    let isTriggered = false

    if (rule.type === 'cost_budget' && metrics.totalCost > rule.threshold) {
      isTriggered = true
    } else if (rule.type === 'quality_sla' && metrics.avgQuality < rule.threshold) {
      isTriggered = true
    } else if (rule.type === 'error_threshold' && metrics.errorCount > rule.threshold) {
      isTriggered = true
    }

    if (isTriggered) {
      // Update rule to triggered status
      const updated = updateAlertRule(rule.id, {
        status: 'triggered',
        triggered_at: new Date().toISOString(),
        triggered_value:
          rule.type === 'cost_budget'
            ? metrics.totalCost
            : rule.type === 'quality_sla'
              ? metrics.avgQuality
              : metrics.errorCount,
      })
      if (updated) triggered.push(updated)
    }
  }

  return triggered
}
