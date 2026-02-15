import { NextRequest, NextResponse } from "next/server"
import {
  getWorkflowEditorTemplate,
  validateWorkflowEditorSpec,
} from "@/lib/temporal-workflow-editor-schema"

const DEFAULT_TEMPLATE_ID = "self-bootstrap-v1"

export async function GET(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get("template_id") || DEFAULT_TEMPLATE_ID
  const template = getWorkflowEditorTemplate(templateId)
  if (!template) {
    return NextResponse.json(
      { error: `Unsupported template_id: ${templateId}` },
      { status: 404 }
    )
  }

  return NextResponse.json(
    {
      template_id: template.template_id,
      spec: template.spec,
      graph: template.graph,
    },
    { status: 200 }
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const templateId = typeof body?.template_id === "string" ? body.template_id : DEFAULT_TEMPLATE_ID
    const proposedSpec = body?.proposed_spec

    if (!proposedSpec || typeof proposedSpec !== "object" || Array.isArray(proposedSpec)) {
      return NextResponse.json(
        { valid: false, errors: ["proposed_spec must be a JSON object"] },
        { status: 400 }
      )
    }

    const result = validateWorkflowEditorSpec(templateId, proposedSpec)
    const statusCode = result.valid ? 200 : 400
    return NextResponse.json(result, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      { valid: false, errors: [String(error)] },
      { status: 500 }
    )
  }
}
