import { z } from "zod"

const BLOCKED_KEYS = new Set([
  "command",
  "shell",
  "script",
  "env",
  "image",
  "docker_image",
  "container",
  "binary",
  "executable",
])

const ROADMAP_TASK_ID_PATTERN = /^[A-Z0-9.-]+$/
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9._/-]+$/

const safeRelativePath = z
  .string()
  .min(1)
  .max(128)
  .regex(SAFE_PATH_PATTERN, "path contains unsupported characters")
  .refine((value) => !value.startsWith("/"), "absolute paths are not allowed")
  .refine((value) => !value.includes(".."), "parent traversal is not allowed")

const workflowInputSchema = z
  .object({
    roadmap_task_id: z
      .string()
      .min(3)
      .max(64)
      .regex(ROADMAP_TASK_ID_PATTERN, "roadmap_task_id contains unsupported characters"),
    repo_root: safeRelativePath,
    output_dir: safeRelativePath,
    continuous_mode: z.boolean(),
  })
  .strict()

const retryPolicySchema = z
  .object({
    maximum_attempts: z.number().int().min(1).max(5),
    initial_interval_seconds: z.number().int().min(1).max(60),
  })
  .strict()

const timeoutPolicySchema = z
  .object({
    workflow_run_timeout_seconds: z.number().int().min(30).max(3600),
    activity_start_to_close_timeout_seconds: z.number().int().min(5).max(300),
  })
  .strict()

const approvalGateActivitySchema = z
  .object({
    id: z.literal("approval_gate"),
    enabled: z.boolean(),
    params: z
      .object({
        required: z.boolean(),
      })
      .strict(),
  })
  .strict()

const generateBundleActivitySchema = z
  .object({
    id: z.literal("generate_bundle"),
    enabled: z.boolean(),
    params: z
      .object({
        allow_write_under_repo_root_only: z.boolean(),
      })
      .strict(),
  })
  .strict()

const docsParityGateActivitySchema = z
  .object({
    id: z.literal("docs_parity_gate"),
    enabled: z.boolean(),
    params: z
      .object({
        required: z.boolean(),
      })
      .strict(),
  })
  .strict()

const activitySchema = z.discriminatedUnion("id", [
  approvalGateActivitySchema,
  generateBundleActivitySchema,
  docsParityGateActivitySchema,
])

const workflowEditorSpecSchema = z
  .object({
    template_id: z.literal("self-bootstrap-v1"),
    workflow_name: z.literal("SelfBootstrapWorkflow"),
    namespace: z.literal("default"),
    task_queue: z.literal("ari-smoke"),
    input: workflowInputSchema,
    retry_policy: retryPolicySchema,
    timeouts: timeoutPolicySchema,
    activities: z.array(activitySchema).length(3),
  })
  .strict()

const graphNodeSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: z.enum(["start", "activity", "gate", "end"]),
    position: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .strict(),
  })
  .strict()

const graphEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    label: z.string().optional(),
  })
  .strict()

const workflowGraphSchema = z
  .object({
    nodes: z.array(graphNodeSchema).min(1),
    edges: z.array(graphEdgeSchema),
  })
  .strict()

export type WorkflowEditorSpec = z.infer<typeof workflowEditorSpecSchema>
export type WorkflowEditorGraph = z.infer<typeof workflowGraphSchema>

export interface WorkflowEditorTemplate {
  template_id: "self-bootstrap-v1"
  spec: WorkflowEditorSpec
  graph: WorkflowEditorGraph
}

export interface WorkflowEditorValidationResult {
  valid: boolean
  errors: string[]
  sanitized_spec?: WorkflowEditorSpec
}

const SELF_BOOTSTRAP_TEMPLATE: WorkflowEditorTemplate = {
  template_id: "self-bootstrap-v1",
  spec: {
    template_id: "self-bootstrap-v1",
    workflow_name: "SelfBootstrapWorkflow",
    namespace: "default",
    task_queue: "ari-smoke",
    input: {
      roadmap_task_id: "P2-MH-10",
      repo_root: ".",
      output_dir: "screehshots_evidence",
      continuous_mode: true,
    },
    retry_policy: {
      maximum_attempts: 2,
      initial_interval_seconds: 1,
    },
    timeouts: {
      workflow_run_timeout_seconds: 900,
      activity_start_to_close_timeout_seconds: 20,
    },
    activities: [
      {
        id: "approval_gate",
        enabled: true,
        params: { required: true },
      },
      {
        id: "generate_bundle",
        enabled: true,
        params: { allow_write_under_repo_root_only: true },
      },
      {
        id: "docs_parity_gate",
        enabled: true,
        params: { required: true },
      },
    ],
  },
  graph: {
    nodes: [
      { id: "start", label: "Start", kind: "start", position: { x: 40, y: 120 } },
      { id: "approval_gate", label: "Approval Gate", kind: "gate", position: { x: 230, y: 120 } },
      { id: "generate_bundle", label: "Generate Bundle", kind: "activity", position: { x: 450, y: 120 } },
      { id: "docs_parity_gate", label: "Docs Parity Gate", kind: "gate", position: { x: 670, y: 120 } },
      { id: "complete", label: "Complete", kind: "end", position: { x: 880, y: 120 } },
    ],
    edges: [
      { id: "e-start-approval", source: "start", target: "approval_gate" },
      { id: "e-approval-bundle", source: "approval_gate", target: "generate_bundle" },
      { id: "e-bundle-docs", source: "generate_bundle", target: "docs_parity_gate" },
      { id: "e-docs-complete", source: "docs_parity_gate", target: "complete" },
    ],
  },
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function collectBlockedKeys(value: unknown, path: string[] = [], hits: string[] = []): string[] {
  if (!value || typeof value !== "object") return hits
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectBlockedKeys(item, [...path, String(index)], hits))
    return hits
  }

  for (const [key, child] of Object.entries(value)) {
    const lowered = key.toLowerCase()
    if (BLOCKED_KEYS.has(lowered)) {
      const fullPath = [...path, key].join(".")
      hits.push(fullPath)
    }
    collectBlockedKeys(child, [...path, key], hits)
  }

  return hits
}

function normalizeZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const dottedPath = issue.path.join(".")
    return dottedPath ? `${dottedPath}: ${issue.message}` : issue.message
  })
}

function hasExpectedActivityIds(spec: WorkflowEditorSpec): boolean {
  const ids = spec.activities.map((activity) => activity.id).sort()
  return JSON.stringify(ids) === JSON.stringify(["approval_gate", "docs_parity_gate", "generate_bundle"])
}

export function getWorkflowEditorTemplate(templateId: string): WorkflowEditorTemplate | null {
  if (templateId !== SELF_BOOTSTRAP_TEMPLATE.template_id) return null
  return deepClone(SELF_BOOTSTRAP_TEMPLATE)
}

export function validateWorkflowEditorSpec(
  templateId: string,
  proposedSpec: unknown
): WorkflowEditorValidationResult {
  const template = getWorkflowEditorTemplate(templateId)
  if (!template) {
    return { valid: false, errors: [`Unsupported template_id: ${templateId}`] }
  }

  const blockedKeyHits = collectBlockedKeys(proposedSpec)
  if (blockedKeyHits.length > 0) {
    return {
      valid: false,
      errors: blockedKeyHits.map((path) => `Blocked key is not allowed: ${path}`),
    }
  }

  const parsed = workflowEditorSpecSchema.safeParse(proposedSpec)
  if (!parsed.success) {
    return {
      valid: false,
      errors: normalizeZodErrors(parsed.error),
    }
  }

  if (!hasExpectedActivityIds(parsed.data)) {
    return {
      valid: false,
      errors: ["activities must include exactly: approval_gate, generate_bundle, docs_parity_gate"],
    }
  }

  return {
    valid: true,
    errors: [],
    sanitized_spec: parsed.data,
  }
}
