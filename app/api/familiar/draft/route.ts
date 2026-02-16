import { NextResponse } from "next/server"
import { diffCanvasState } from "@/lib/canvas-collab"
import { createInitialCanvasState, type CanvasState, type CanvasNode, type CanvasEdge } from "@/lib/canvas-state"

type ChatMessage = {
  role: "user" | "ai" | "system"
  content: string
}

const VALID_BLOCK_TYPES = new Set([
  "task",
  "decision",
  "loop",
  "parallel",
  "text",
  "artifact",
  "preview",
])

const SYSTEM_PROMPT = `You generate a draft Prompt Canvas graph from a chat transcript.
Return ONLY valid JSON with this shape:
{
  "nodes": [{ "id": "node-1", "type": "block", "data": { "label": "...", "description": "...", "blockType": "text|task|decision|loop|parallel|artifact|preview" }, "position": { "x": 0, "y": 0 } }],
  "edges": [{ "id": "edge-1", "source": "node-1", "target": "node-2" }],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
Keep 3-8 nodes. Reuse existing node IDs from the current draft whenever possible.
Only add new nodes when needed and use stable IDs like "draft-node-5".`

function cleanMessages(messages: ChatMessage[]) {
  return messages.filter((m) => m.role !== "system")
}

function normalizeCanvas(raw: CanvasState): CanvasState | null {
  if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return null
  const nodes: CanvasNode[] = raw.nodes
    .filter((node) => node && typeof node.id === "string")
    .map((node) => {
      const blockType = VALID_BLOCK_TYPES.has(node.data?.blockType)
        ? node.data?.blockType
        : "task"
      return {
        ...node,
        type: "block",
        data: {
          label: typeof node.data?.label === "string" ? node.data.label : "Untitled",
          description: typeof node.data?.description === "string" ? node.data.description : "",
          blockType,
        },
        position: {
          x: typeof node.position?.x === "number" ? node.position.x : 0,
          y: typeof node.position?.y === "number" ? node.position.y : 0,
        },
      }
    })

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: CanvasEdge[] = raw.edges
    .filter((edge) => edge && typeof edge.id === "string")
    .filter((edge) => typeof edge.source === "string" && typeof edge.target === "string")
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({ ...edge }))

  return {
    nodes,
    edges,
    viewport: {
      x: typeof raw.viewport?.x === "number" ? raw.viewport.x : 0,
      y: typeof raw.viewport?.y === "number" ? raw.viewport.y : 0,
      zoom: typeof raw.viewport?.zoom === "number" ? raw.viewport.zoom : 1,
    },
  }
}

function deterministicDraft(messages: ChatMessage[], draft: CanvasState | null): CanvasState {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  const prompt = lastUser?.content?.trim() || "Describe your project goals here."
  const base = draft ?? createInitialCanvasState()
  const nodes = [...base.nodes]
  const edges = [...base.edges]

  let promptNode = nodes.find((n) => n.data?.blockType === "text")
  if (!promptNode) {
    promptNode = {
      id: "draft-text",
      type: "block",
      data: { label: "Prompt", description: prompt, blockType: "text" },
      position: { x: 80, y: 120 },
    }
    nodes.push(promptNode)
  } else {
    promptNode.data = { ...promptNode.data, label: "Prompt", description: prompt }
  }

  let taskNode = nodes.find((n) => n.data?.blockType === "task")
  if (!taskNode) {
    taskNode = {
      id: "draft-task",
      type: "block",
      data: { label: "Task", description: "Initial task derived from chat", blockType: "task" },
      position: { x: 360, y: 140 },
    }
    nodes.push(taskNode)
  }

  const edgeId = `edge-${promptNode.id}-${taskNode.id}`
  const hasEdge = edges.some((edge) => edge.source === promptNode?.id && edge.target === taskNode?.id)
  if (!hasEdge) {
    edges.push({ id: edgeId, source: promptNode.id, target: taskNode.id })
  }

  return {
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

async function callOpenAI(messages: ChatMessage[], draft: CanvasState | null) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const model = process.env.OPENAI_FAST_MODEL || "gpt-4o-mini"
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Chat transcript:\n${messages
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}\n\nCurrent draft JSON:\n${JSON.stringify(draft ?? {}, null, 2)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 900,
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { raw: null as string | null, model, error: `OpenAI error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content
  return typeof content === "string" ? { raw: content, model } : { raw: null as string | null, model, error: "OpenAI: missing content" }
}

async function callAnthropic(messages: ChatMessage[], draft: CanvasState | null) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  const model = process.env.ANTHROPIC_FAST_MODEL || "claude-3-haiku-20240307"
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Chat transcript:\n${messages
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}\n\nCurrent draft JSON:\n${JSON.stringify(draft ?? {}, null, 2)}`,
        },
      ],
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { raw: null as string | null, model, error: `Anthropic error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  const content = data?.content?.[0]?.text
  return typeof content === "string" ? { raw: content, model } : { raw: null as string | null, model, error: "Anthropic: missing content" }
}

async function callOpenRouter(messages: ChatMessage[], draft: CanvasState | null) {
  const apiKey = process.env.OPENROUTER_KEY
  if (!apiKey) return null
  const model = "openrouter/auto"
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Ari",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Chat transcript:\n${messages
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}\n\nCurrent draft JSON:\n${JSON.stringify(draft ?? {}, null, 2)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 900,
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { raw: null as string | null, model, error: `OpenRouter error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  let content = data?.choices?.[0]?.message?.content
  if (!content && data?.choices?.[0]?.message?.reasoning) {
    content = data.choices[0].message.reasoning
  }
  return typeof content === "string" ? { raw: content, model } : { raw: null as string | null, model, error: "OpenRouter: missing content" }
}

async function callGemini(messages: ChatMessage[], draft: CanvasState | null) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  const model = process.env.GEMINI_FAST_MODEL || "gemini-1.5-flash"
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nChat transcript:\n${messages
                  .map((m) => `${m.role}: ${m.content}`)
                  .join("\n")}\n\nCurrent draft JSON:\n${JSON.stringify(draft ?? {}, null, 2)}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
      }),
    }
  )
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { raw: null as string | null, model, error: `Gemini error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return typeof content === "string" ? { raw: content, model } : { raw: null as string | null, model, error: "Gemini: missing content" }
}

function safeParseCanvas(raw: string): CanvasState | null {
  const candidates: string[] = []
  const trimmed = raw.trim()
  if (trimmed) candidates.push(trimmed)

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch?.[1]) candidates.push(fenceMatch[1].trim())

  const firstBrace = trimmed.indexOf("{")
  const lastBrace = trimmed.lastIndexOf("}")
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1).trim())
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      const normalized = normalizeCanvas(parsed as CanvasState)
      if (normalized) return normalized
    } catch {
      // try next candidate
    }
  }

  return null
}

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: ChatMessage[]; draft?: CanvasState | null }
  const messages = cleanMessages(body?.messages ?? [])
  const draft = body?.draft ?? null
  if (!Array.isArray(messages) || messages.length === 0) {
    const fallback = deterministicDraft([], draft)
    const ops = diffCanvasState(draft ?? createInitialCanvasState(), fallback, "familiar-draft")
    return NextResponse.json({ ops, source: "deterministic", model: "deterministic" })
  }

  const providers = [callOpenRouter, callOpenAI, callAnthropic, callGemini]
  const errors: string[] = []
  for (const provider of providers) {
    try {
      const result = await provider(messages, draft)
      if (!result) continue
      if (result.error) errors.push(result.error)
      if (result.raw) {
        const parsed = safeParseCanvas(result.raw)
        if (parsed) {
          const ops = diffCanvasState(draft ?? createInitialCanvasState(), parsed, "familiar-draft")
          return NextResponse.json({ ops, source: "llm", model: result.model })
        }
        errors.push(`Parse failed for model ${result.model}`)
      }
    } catch {
      // fall through to next provider
    }
  }

  const fallback = deterministicDraft(messages, draft)
  const ops = diffCanvasState(draft ?? createInitialCanvasState(), fallback, "familiar-draft")
  return NextResponse.json({ ops, source: "deterministic", model: "deterministic", errors })
}
