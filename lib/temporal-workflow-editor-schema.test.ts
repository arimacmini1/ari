import { describe, expect, it } from "vitest"
import {
  getWorkflowEditorTemplate,
  validateWorkflowEditorSpec,
} from "@/lib/temporal-workflow-editor-schema"

describe("temporal workflow editor schema", () => {
  it("accepts a constrained allowed edit", () => {
    const template = getWorkflowEditorTemplate("self-bootstrap-v1")
    expect(template).not.toBeNull()
    if (!template) return

    const allowed = {
      ...template.spec,
      retry_policy: {
        ...template.spec.retry_policy,
        maximum_attempts: 3,
      },
    }

    const result = validateWorkflowEditorSpec("self-bootstrap-v1", allowed)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.sanitized_spec?.retry_policy.maximum_attempts).toBe(3)
  })

  it("blocks unsafe edit keys", () => {
    const template = getWorkflowEditorTemplate("self-bootstrap-v1")
    expect(template).not.toBeNull()
    if (!template) return

    const blocked = {
      ...template.spec,
      script: "rm -rf .",
    }

    const result = validateWorkflowEditorSpec("self-bootstrap-v1", blocked)
    expect(result.valid).toBe(false)
    expect(result.errors.some((message) => message.toLowerCase().includes("blocked key"))).toBe(true)
  })
})
