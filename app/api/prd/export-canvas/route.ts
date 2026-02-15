import { NextResponse } from "next/server"
import type { CanvasState, BlockType } from "@/lib/canvas-state"
import { convertPrdToCanvas, isPrdJson, type PrdCanvasLayout } from "@/lib/prd-canvas-converter"

type ExportMode = "deterministic" | "llm" | "agentic"
type ExportProvider = "auto" | "openai" | "anthropic" | "gemini"

type ProviderResult =
  | { raw: string; model: string }
  | { raw: null; model: string; error: string }
  | null

const validBlockTypes: BlockType[] = [
  "task",
  "decision",
  "loop",
  "parallel",
  "text",
  "artifact",
  "preview",
]

function normalizeExportMode(value: unknown): ExportMode {
  if (value === "deterministic" || value === "llm" || value === "agentic") return value
  return "agentic"
}

function normalizeExportProvider(value: unknown): ExportProvider {
  if (value === "auto" || value === "openai" || value === "anthropic" || value === "gemini") return value
  return "auto"
}

function buildSystemPrompt(layout: PrdCanvasLayout, semantic: boolean) {
  return `You convert PRD JSON into Ari Prompt Canvas JSON.
Return ONLY valid JSON with this exact shape:
{
  "nodes": [
    {
      "id": "node-1",
      "type": "block",
      "position": { "x": 120, "y": 120 },
      "data": {
        "label": "Short title",
        "description": "Concise details",
        "blockType": "task|decision|loop|parallel|text|artifact|preview"
      }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2", "label": "optional" }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}

Rules:
- Use layout mode: ${layout}
- Include semantic edges: ${semantic ? "yes" : "no"}
- No markdown, no prose, no code fences.
- Keep node descriptions concise (<220 chars).
- Ensure every edge references valid node ids.
- Prefer predictable ids and stable structure.`
}

function buildAgenticSystemPrompt(layout: PrdCanvasLayout, semantic: boolean, requiredSectionLabels: string[]) {
  return `You are an agentic PRD-to-canvas planner.
Your job: convert PRD JSON into Ari Prompt Canvas JSON, with high coverage and explicit workflow structure.

Return ONLY valid JSON with this exact shape:
{
  "nodes": [
    {
      "id": "node-1",
      "type": "block",
      "position": { "x": 120, "y": 120 },
      "data": {
        "label": "Short title",
        "description": "Concise details",
        "blockType": "task|decision|loop|parallel|text|artifact|preview"
      }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2", "label": "optional" }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}

Rules:
- Use layout mode: ${layout}
- Include semantic edges: ${semantic ? "yes" : "no"}
- No markdown, no prose, no code fences.
- Keep node descriptions concise (<220 chars).
- Ensure every edge references valid node ids.
- Prefer predictable ids and stable structure.

Coverage requirements:
- Create at least 1 node whose label exactly matches each of these section labels:
${requiredSectionLabels.map((label) => `- ${label}`).join("\n")}

Detail requirements:
- When you see checklists or enumerations, create separate nodes for the top 10 items (max), and link them to the parent concept node.
- If the PRD describes an ordered workflow (steps, blocks, phases), represent it as a clear chain with \"next\" edges.
- Keep the node count under 120 total.`
}

function normalizeOpenAiModel(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  // Keep this allowlist tight; these are the only models we expose via UI.
  const allowed = new Set(["gpt-5.2", "gpt-5.2-codex", "gpt-5.2-chat-latest"])
  return allowed.has(trimmed) ? trimmed : null
}

async function callOpenAIWithSystem(systemPrompt: string, userText: string, modelOverride?: string | null): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const model = modelOverride || process.env.OPENAI_STRONG_MODEL || process.env.OPENAI_MODEL || "gpt-4o"
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { raw: null, model, error: `OpenAI error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content
  return typeof content === "string"
    ? { raw: content, model }
    : { raw: null, model, error: "OpenAI: missing content" }
}

async function callAnthropicWithSystem(systemPrompt: string, userText: string): Promise<ProviderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  const model = process.env.ANTHROPIC_STRONG_MODEL || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20240620"
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { raw: null, model, error: `Anthropic error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  const content = data?.content?.[0]?.text
  return typeof content === "string"
    ? { raw: content, model }
    : { raw: null, model, error: "Anthropic: missing content" }
}

async function callGeminiWithSystem(systemPrompt: string, userText: string): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  const model = process.env.GEMINI_STRONG_MODEL || process.env.GEMINI_MODEL || "gemini-1.5-pro"
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userText}` }],
          },
        ],
        generationConfig: { temperature: 0.2 },
      }),
    }
  )
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { raw: null, model, error: `Gemini error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return typeof content === "string"
    ? { raw: content, model }
    : { raw: null, model, error: "Gemini: missing content" }
}

function safeParseJson(raw: string): unknown | null {
  const candidates: string[] = []
  const trimmed = raw.trim()
  if (trimmed) candidates.push(trimmed)
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fence?.[1]) candidates.push(fence[1].trim())
  const firstBrace = trimmed.indexOf("{")
  const lastBrace = trimmed.lastIndexOf("}")
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1))
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // continue
    }
  }
  return null
}

function coerceCanvas(value: unknown): CanvasState | null {
  if (!value || typeof value !== "object") return null
  const obj = value as Record<string, unknown>
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null

  const nodes = obj.nodes.reduce<CanvasState["nodes"]>((acc, node, index) => {
      if (!node || typeof node !== "object") return acc
      const n = node as Record<string, unknown>
      const id = typeof n.id === "string" ? n.id : `node-${index + 1}`
      const data = (n.data && typeof n.data === "object" ? n.data : {}) as Record<string, unknown>
      const rawType = typeof data.blockType === "string" ? data.blockType : "task"
      const blockType = validBlockTypes.includes(rawType as BlockType) ? (rawType as BlockType) : "task"
      const label = typeof data.label === "string" ? data.label : `Node ${index + 1}`
      const description = typeof data.description === "string" ? data.description : ""
      const pos = (n.position && typeof n.position === "object" ? n.position : {}) as Record<string, unknown>
      const x = typeof pos.x === "number" ? pos.x : (index % 6) * 260
      const y = typeof pos.y === "number" ? pos.y : Math.floor(index / 6) * 180
      acc.push({
        id,
        type: "block" as const,
        position: { x, y },
        data: { label, description, blockType },
      })
      return acc
    }, [])

  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = obj.edges.reduce<CanvasState["edges"]>((acc, edge, index) => {
      if (!edge || typeof edge !== "object") return acc
      const e = edge as Record<string, unknown>
      const source = typeof e.source === "string" ? e.source : null
      const target = typeof e.target === "string" ? e.target : null
      if (!source || !target) return acc
      if (!nodeIds.has(source) || !nodeIds.has(target)) return acc
      acc.push({
        id: typeof e.id === "string" ? e.id : `edge-${index + 1}`,
        source,
        target,
        label: typeof e.label === "string" ? e.label : undefined,
      })
      return acc
    }, [])

  const viewportObj = (obj.viewport && typeof obj.viewport === "object" ? obj.viewport : {}) as Record<string, unknown>
  const viewport = {
    x: typeof viewportObj.x === "number" ? viewportObj.x : 0,
    y: typeof viewportObj.y === "number" ? viewportObj.y : 0,
    zoom: typeof viewportObj.zoom === "number" ? viewportObj.zoom : 1,
  }

  return { nodes, edges, viewport }
}

function prettifySectionKey(key: string): string {
  return key
    .replace(/^\d+_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function requiredSectionLabels(prd: unknown): string[] {
  if (!prd || typeof prd !== "object") return []
  const sections = (prd as Record<string, unknown>).sections
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) return []
  return Object.keys(sections).map(prettifySectionKey)
}

function missingSectionLabels(canvas: CanvasState, required: string[]): string[] {
  const labels = canvas.nodes.map((n) => n.data.label.toLowerCase())
  return required.filter((req) => {
    const target = req.toLowerCase()
    return !labels.some((label) => label === target)
  })
}

async function exportCanvasAgentic(
  provider: (systemPrompt: string, userText: string) => Promise<ProviderResult>,
  prd: unknown,
  layout: PrdCanvasLayout,
  includeSemanticEdges: boolean,
  requiredLabels: string[]
): Promise<{ canvas: CanvasState; model: string } | { error: string } | null> {
  const systemPrompt = buildAgenticSystemPrompt(layout, includeSemanticEdges, requiredLabels)
  const userText = `PRD JSON:\n${JSON.stringify(prd)}`

  let lastRaw: string | null = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    const attemptPrompt =
      attempt === 1
        ? systemPrompt
        : `${systemPrompt}\n\nYou MUST fix issues from the previous attempt:\n- Return valid JSON only\n- Ensure required section label nodes exist exactly as specified`
    const attemptUserText =
      attempt === 1
        ? userText
        : `Previous output (may be invalid):\n${lastRaw ?? ""}\n\nRe-run conversion for this PRD:\n${userText}`

    const result = await provider(attemptPrompt, attemptUserText)
    if (!result) return null
    if ("error" in result) return { error: result.error }
    lastRaw = result.raw

    const parsed = safeParseJson(result.raw)
    const canvas = coerceCanvas(parsed)
    if (!canvas) continue

    const missing = missingSectionLabels(canvas, requiredLabels)
    if (missing.length === 0) {
      return { canvas, model: result.model }
    }

    lastRaw =
      `${result.raw}\n\nMissing required section label nodes:\n` +
      missing.slice(0, 24).map((m) => `- ${m}`).join("\n")
  }

  return null
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    prd?: unknown
    layout?: PrdCanvasLayout
    includeSemanticEdges?: boolean
    exportMode?: ExportMode
    exportProvider?: ExportProvider
    openAiModel?: string
  }
  const prd = body?.prd
  const layout = body?.layout ?? "columns"
  const includeSemanticEdges = body?.includeSemanticEdges ?? true
  const exportMode = normalizeExportMode(body?.exportMode)
  const exportProvider = normalizeExportProvider(body?.exportProvider)
  const openAiModel = normalizeOpenAiModel(body?.openAiModel)

  if (!isPrdJson(prd)) {
    return NextResponse.json({ error: "Invalid PRD JSON payload." }, { status: 400 })
  }

  const deterministic = convertPrdToCanvas(prd, { layout, includeSemanticEdges })
  if (!deterministic) {
    return NextResponse.json({ error: "Failed to convert PRD JSON deterministically." }, { status: 400 })
  }

  if (exportMode === "deterministic") {
    return NextResponse.json({ canvas: deterministic, source: "deterministic", model: "deterministic" })
  }

  const providerOrder: ExportProvider[] =
    exportProvider === "auto" ? ["openai", "anthropic", "gemini"] : [exportProvider]
  const errors: string[] = []
  const requiredLabels = requiredSectionLabels(prd)
  const singlePassPrompt = buildSystemPrompt(layout, includeSemanticEdges)

  for (const providerName of providerOrder) {
    try {
      const provider =
        providerName === "openai"
          ? (system: string, user: string) => callOpenAIWithSystem(system, user, openAiModel)
          : providerName === "anthropic"
            ? callAnthropicWithSystem
            : callGeminiWithSystem

      if (exportMode === "agentic") {
        const agentic = await exportCanvasAgentic(provider, prd, layout, includeSemanticEdges, requiredLabels)
        if (!agentic) continue
        if ("error" in agentic) {
          errors.push(agentic.error)
          continue
        }
        return NextResponse.json({
          canvas: agentic.canvas,
          source: "agentic",
          model: agentic.model,
          fallback_available: true,
        })
      }

      const result = await provider(singlePassPrompt, JSON.stringify(prd))
      if (!result) continue
      if ("error" in result) {
        errors.push(result.error)
        continue
      }
      const parsed = safeParseJson(result.raw)
      const canvas = coerceCanvas(parsed)
      if (canvas) {
        return NextResponse.json({
          canvas,
          source: "llm",
          model: result.model,
          fallback_available: true,
        })
      }
      errors.push(`Parse failed for model ${result.model}`)
    } catch {
      errors.push("Provider call failed")
    }
  }

  return NextResponse.json({
    canvas: deterministic,
    source: "deterministic",
    model: "deterministic",
    errors,
  })
}
