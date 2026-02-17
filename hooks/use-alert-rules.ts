/**
 * Alert Rules Hook
 * Feature: F06-SH-03 - Alert Rule Templates
 */

import { useState, useEffect } from 'react'

export interface AlertRule {
  id: string
  name: string
  description: string
  type: 'cost_budget' | 'quality_sla' | 'error_threshold'
  project_id: string
  threshold: number
  window_ms: number
  severity: 'info' | 'warning' | 'critical'
  status: 'active' | 'paused' | 'triggered'
  created_at: string
  triggered_at?: string
  triggered_value?: number
}

export function useAlertRules(projectId?: string) {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRules() {
      try {
        const url = projectId 
          ? `/api/alerts?projectId=${projectId}`
          : '/api/alerts'
        const response = await fetch(url)
        const data = await response.json()
        setRules(data.rules || [])
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchRules()
  }, [projectId])

  const activeRules = rules.filter(r => r.status === 'active')
  const triggeredRules = rules.filter(r => r.status === 'triggered')

  return { rules, activeRules, triggeredRules, loading, error }
}

export function useCreateAlertRule() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createRule(rule: Partial<AlertRule>) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create alert rule')
      }
      return data.rule
    } catch (err) {
      setError(String(err))
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { createRule, loading, error }
}
