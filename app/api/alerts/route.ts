/**
 * Alert Rules API
 * Feature: F06-SH-03 - Alert Rule Templates
 * 
 * GET /api/alerts - List alert rules
 * POST /api/alerts - Create alert rule
 * PUT /api/alerts/[id] - Update alert rule
 * DELETE /api/alerts/[id] - Delete alert rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveProjectContext } from '@/lib/project-context'
import {
  getAlertRules,
  getAlertRule,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  type AlertRule,
  type AlertRuleType,
  type AlertSeverity,
} from '@/lib/alert-rules-store'

/**
 * GET /api/alerts - List alert rules
 */
export async function GET(req: NextRequest) {
  try {
    const projectContext = resolveProjectContext(req)
    const projectId = projectContext.ok ? projectContext.projectId : 'project-default'
    
    const rules = getAlertRules(projectId)
    
    return NextResponse.json({ rules }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

/**
 * POST /api/alerts - Create alert rule
 */
export async function POST(req: NextRequest) {
  try {
    const projectContext = resolveProjectContext(req)
    const projectId = projectContext.ok ? projectContext.projectId : 'project-default'
    
    const body = await req.json()
    const { name, description, type, threshold, window_ms, severity } = body
    
    // Validate required fields
    if (!name || !type || threshold === undefined || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, threshold, severity' },
        { status: 400 }
      )
    }
    
    // Validate type
    const validTypes: AlertRuleType[] = ['cost_budget', 'quality_sla', 'error_threshold']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Validate severity
    const validSeverities: AlertSeverity[] = ['info', 'warning', 'critical']
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      )
    }
    
    const rule = createAlertRule({
      name,
      description: description || '',
      type,
      project_id: projectId,
      threshold,
      window_ms: window_ms || 24 * 60 * 60 * 1000, // Default 24 hours
      severity,
    })
    
    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
