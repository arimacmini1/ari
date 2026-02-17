'use client'

/**
 * Alert Rules Panel Component
 * Feature: F06-SH-03 - Alert Rule Templates (UX)
 * 
 * Displays alert rules with status indicators and create/edit functionality.
 */

import { useState } from 'react'
import { useAlertRules, type AlertRule } from '@/hooks/use-alert-rules'

interface AlertRulesPanelProps {
  projectId?: string
}

export function AlertRulesPanel({ projectId }: AlertRulesPanelProps) {
  const { rules, activeRules, triggeredRules, loading, error } = useAlertRules(projectId)
  const [showCreate, setShowCreate] = useState(false)
  const [newAlert, setNewAlert] = useState({
    name: '',
    description: '',
    type: 'cost_budget' as const,
    threshold: 100,
    severity: 'warning' as const,
  })

  const handleCreate = async () => {
    // In a real app, this would call the API
    setShowCreate(false)
    setNewAlert({ name: '', description: '', type: 'cost_budget', threshold: 100, severity: 'warning' })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 border-red-500 text-red-400'
      case 'warning': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
      case 'info': return 'bg-blue-500/20 border-blue-500 text-blue-400'
      default: return 'bg-slate-700 border-slate-600 text-slate-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'triggered': return 'bg-red-500/20 text-red-400 border-red-500'
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500'
      case 'paused': return 'bg-slate-600/20 text-slate-400 border-slate-500'
      default: return 'bg-slate-700 text-slate-300 border-slate-600'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cost_budget': return '💰'
      case 'quality_sla': return '📊'
      case 'error_threshold': return '⚠️'
      default: return '🔔'
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-700 rounded-full"></div>
          <div className="h-4 bg-slate-700 rounded w-32"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-900 rounded-lg border border-red-700 p-6">
        <p className="text-red-400">Error loading alerts: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Alert Rules</h3>
          <p className="text-sm text-slate-400">
            {activeRules.length} active · {triggeredRules.length} triggered
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
        >
          {showCreate ? 'Cancel' : '+ New Alert'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-4 space-y-3">
          <h4 className="text-sm font-medium text-slate-200">Create New Alert Rule</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={newAlert.name}
                onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                placeholder="Alert name"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={newAlert.type}
                onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200"
              >
                <option value="cost_budget">💰 Cost Budget</option>
                <option value="quality_sla">📊 Quality SLA</option>
                <option value="error_threshold">⚠️ Error Threshold</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Threshold</label>
              <input
                type="number"
                value={newAlert.threshold}
                onChange={(e) => setNewAlert({ ...newAlert, threshold: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Severity</label>
              <select
                value={newAlert.severity}
                onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newAlert.name}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md"
            >
              Create Alert
            </button>
          </div>
        </div>
      )}

      {/* Alert Rules List */}
      {rules.length === 0 ? (
        <div className="bg-slate-900 rounded-lg border border-slate-700 p-8 text-center">
          <p className="text-slate-400">No alert rules configured</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
          >
            Create your first alert
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${getSeverityColor(rule.severity)}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{getTypeIcon(rule.type)}</span>
                <div>
                  <p className="font-medium text-slate-200">{rule.name}</p>
                  <p className="text-xs text-slate-400">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(rule.status)}`}>
                  {rule.status}
                </span>
                <span className="text-xs text-slate-500">
                  {rule.type === 'cost_budget' 
                    ? `$${rule.threshold}` 
                    : rule.type === 'quality_sla'
                      ? `<${rule.threshold}%`
                      : `>${rule.threshold}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
