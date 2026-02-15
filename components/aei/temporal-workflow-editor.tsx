"use client"

import { useEffect, useMemo, useState } from "react"
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow"
import "reactflow/dist/style.css"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface WorkflowActivity {
  id: "approval_gate" | "generate_bundle" | "docs_parity_gate"
  enabled: boolean
  params: Record<string, boolean>
}

interface WorkflowEditorSpec {
  template_id: "self-bootstrap-v1"
  workflow_name: "SelfBootstrapWorkflow"
  namespace: "default"
  task_queue: "ari-smoke"
  input: {
    roadmap_task_id: string
    repo_root: string
    output_dir: string
    continuous_mode: boolean
  }
  retry_policy: {
    maximum_attempts: number
    initial_interval_seconds: number
  }
  timeouts: {
    workflow_run_timeout_seconds: number
    activity_start_to_close_timeout_seconds: number
  }
  activities: WorkflowActivity[]
}

interface WorkflowGraphPayload {
  nodes: Array<{
    id: string
    label: string
    kind: "start" | "activity" | "gate" | "end"
    position: { x: number; y: number }
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    label?: string
  }>
}

interface ValidationResponse {
  valid: boolean
  errors: string[]
  sanitized_spec?: WorkflowEditorSpec
}

const kindClass: Record<string, string> = {
  start: "bg-emerald-900/35 border-emerald-700 text-emerald-100",
  activity: "bg-blue-900/35 border-blue-700 text-blue-100",
  gate: "bg-amber-900/35 border-amber-700 text-amber-100",
  end: "bg-fuchsia-900/35 border-fuchsia-700 text-fuchsia-100",
}

export default function TemporalWorkflowEditor() {
  const [spec, setSpec] = useState<WorkflowEditorSpec | null>(null)
  const [graph, setGraph] = useState<WorkflowGraphPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [validation, setValidation] = useState<ValidationResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        setError("")
        const response = await fetch("/api/temporal/workflow-editor?template_id=self-bootstrap-v1")
        const payload = await response.json()
        if (!response.ok) {
          setError(payload?.error || "Failed to load workflow editor template")
          return
        }
        setSpec(payload.spec as WorkflowEditorSpec)
        setGraph(payload.graph as WorkflowGraphPayload)
      } catch (loadError) {
        setError(String(loadError))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const flowNodes = useMemo<Node[]>(() => {
    if (!graph) return []
    return graph.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      data: { label: node.label },
      draggable: false,
      className: `rounded-md border px-2 py-1 text-xs ${kindClass[node.kind] || kindClass.activity}`,
    }))
  }, [graph])

  const flowEdges = useMemo<Edge[]>(() => {
    if (!graph) return []
    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
      style: { stroke: "#64748b", strokeWidth: 1.5 },
    }))
  }, [graph])

  const updateActivity = (id: WorkflowActivity["id"], next: WorkflowActivity) => {
    setSpec((current) => {
      if (!current) return current
      return {
        ...current,
        activities: current.activities.map((activity) => (activity.id === id ? next : activity)),
      }
    })
  }

  const validateSpec = async () => {
    if (!spec) return
    try {
      setSubmitting(true)
      const response = await fetch("/api/temporal/workflow-editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: spec.template_id,
          proposed_spec: spec,
        }),
      })
      const payload = (await response.json()) as ValidationResponse
      setValidation(payload)
      if (payload.valid && payload.sanitized_spec) {
        setSpec(payload.sanitized_spec)
      }
    } catch (submitError) {
      setValidation({
        valid: false,
        errors: [String(submitError)],
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-400">Loading workflow template...</div>
  }

  if (error || !spec || !graph) {
    return <div className="text-sm text-rose-300">{error || "Workflow template unavailable."}</div>
  }

  const approvalActivity = spec.activities.find((activity) => activity.id === "approval_gate")
  const docsParityActivity = spec.activities.find((activity) => activity.id === "docs_parity_gate")
  const bundleActivity = spec.activities.find((activity) => activity.id === "generate_bundle")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Badge variant="secondary">{spec.workflow_name}</Badge>
          <Badge variant="secondary">template {spec.template_id}</Badge>
          <Badge variant="secondary">queue {spec.task_queue}</Badge>
        </div>
        <Button size="sm" onClick={validateSpec} disabled={submitting}>
          {submitting ? "Validating..." : "Validate Safe Mutation"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-700 bg-slate-950/50 p-3 space-y-3">
          <h4 className="text-sm font-semibold text-slate-100">Editable Safe Fields</h4>

          <label className="block text-xs text-slate-300">
            Roadmap Task ID
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              value={spec.input.roadmap_task_id}
              onChange={(event) =>
                setSpec((current) =>
                  current
                    ? {
                        ...current,
                        input: { ...current.input, roadmap_task_id: event.target.value },
                      }
                    : current
                )
              }
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-slate-300">
              Retry Attempts
              <input
                type="number"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                value={spec.retry_policy.maximum_attempts}
                onChange={(event) =>
                  setSpec((current) =>
                    current
                      ? {
                          ...current,
                          retry_policy: {
                            ...current.retry_policy,
                            maximum_attempts: Number(event.target.value),
                          },
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="block text-xs text-slate-300">
              Initial Retry Interval (s)
              <input
                type="number"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                value={spec.retry_policy.initial_interval_seconds}
                onChange={(event) =>
                  setSpec((current) =>
                    current
                      ? {
                          ...current,
                          retry_policy: {
                            ...current.retry_policy,
                            initial_interval_seconds: Number(event.target.value),
                          },
                        }
                      : current
                  )
                }
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-slate-300">
              Workflow Timeout (s)
              <input
                type="number"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                value={spec.timeouts.workflow_run_timeout_seconds}
                onChange={(event) =>
                  setSpec((current) =>
                    current
                      ? {
                          ...current,
                          timeouts: {
                            ...current.timeouts,
                            workflow_run_timeout_seconds: Number(event.target.value),
                          },
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="block text-xs text-slate-300">
              Activity Timeout (s)
              <input
                type="number"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                value={spec.timeouts.activity_start_to_close_timeout_seconds}
                onChange={(event) =>
                  setSpec((current) =>
                    current
                      ? {
                          ...current,
                          timeouts: {
                            ...current.timeouts,
                            activity_start_to_close_timeout_seconds: Number(event.target.value),
                          },
                        }
                      : current
                  )
                }
              />
            </label>
          </div>

          <div className="space-y-2 rounded border border-slate-700 bg-slate-900/40 p-2 text-xs text-slate-300">
            <div className="font-semibold text-slate-100">Activities</div>
            {approvalActivity && (
              <label className="flex items-center justify-between">
                <span>approval_gate required</span>
                <input
                  type="checkbox"
                  checked={Boolean(approvalActivity.params.required)}
                  onChange={(event) =>
                    updateActivity("approval_gate", {
                      ...approvalActivity,
                      params: { required: event.target.checked },
                    })
                  }
                />
              </label>
            )}
            {bundleActivity && (
              <label className="flex items-center justify-between">
                <span>generate_bundle enabled</span>
                <input
                  type="checkbox"
                  checked={bundleActivity.enabled}
                  onChange={(event) =>
                    updateActivity("generate_bundle", {
                      ...bundleActivity,
                      enabled: event.target.checked,
                    })
                  }
                />
              </label>
            )}
            {docsParityActivity && (
              <label className="flex items-center justify-between">
                <span>docs_parity_gate required</span>
                <input
                  type="checkbox"
                  checked={Boolean(docsParityActivity.params.required)}
                  onChange={(event) =>
                    updateActivity("docs_parity_gate", {
                      ...docsParityActivity,
                      params: { required: event.target.checked },
                    })
                  }
                />
              </label>
            )}
          </div>
        </div>

        <div className="min-h-[320px] rounded-md border border-slate-700 overflow-hidden">
          <ReactFlow nodes={flowNodes} edges={flowEdges} fitView nodesDraggable={false} nodesConnectable={false}>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {validation && (
        <div
          className={`rounded border p-2 text-xs ${
            validation.valid
              ? "border-emerald-700 bg-emerald-900/20 text-emerald-200"
              : "border-rose-700 bg-rose-900/20 text-rose-200"
          }`}
        >
          <div className="font-semibold">{validation.valid ? "Validation passed" : "Validation blocked"}</div>
          {validation.errors.length > 0 && (
            <ul className="list-disc ml-4 mt-1 space-y-1">
              {validation.errors.map((validationError, index) => (
                <li key={`${validationError}-${index}`}>{validationError}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
