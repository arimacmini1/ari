import { NextResponse } from "next/server"

type ChatMessage = {
  role: "user" | "ai" | "system"
  content: string
}

type CanvasState = {
  nodes: Array<{
    id: string
    data: { label: string; description: string; blockType: string }
    position: { x: number; y: number }
    type: "block"
  }>
  edges: Array<{ id: string; source: string; target: string }>
  viewport: { x: number; y: number; zoom: number }
}

const SYSTEM_PROMPT = `You are a prompt-to-canvas converter.
Return ONLY valid JSON with this shape:
{
  "nodes": [{ "id": "node-1", "type": "block", "data": { "label": "...", "description": "...", "blockType": "text|task|decision|loop|parallel|artifact|preview" }, "position": { "x": 0, "y": 0 } }],
  "edges": [{ "id": "edge-1", "source": "node-1", "target": "node-2" }],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}`

function deterministicCanvas(messages: ChatMessage[]): CanvasState {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  const prompt = lastUser?.content?.trim() || "Describe your project goals here."
  const textId = `node-${Date.now()}-text`
  const taskId = `node-${Date.now()}-task`
  return {
    nodes: [
      {
        id: textId,
        type: "block",
        data: {
          label: "Prompt",
          description: prompt,
          blockType: "text",
        },
        position: { x: 80, y: 120 },
      },
      {
        id: taskId,
        type: "block",
        data: {
          label: "Task",
          description: "Initial task derived from chat prompt",
          blockType: "task",
        },
        position: { x: 360, y: 140 },
      },
    ],
    edges: [
      {
        id: `edge-${textId}-${taskId}`,
        source: textId,
        target: taskId,
      },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

async function callOpenAI(messages: ChatMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const model = process.env.OPENAI_STRONG_MODEL || process.env.OPENAI_MODEL || "gpt-4o"
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
        ...messages.map((m) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content })),
      ],
      temperature: 0.2,
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

async function callAnthropic(messages: ChatMessage[]) {
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
      max_tokens: 800,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role === "ai" ? "assistant" : m.role,
        content: m.content,
      })),
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

async function callOpenRouter(messages: ChatMessage[]) {
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
        ...messages.map((m) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content })),
      ],
      temperature: 0.4,
      max_tokens: 600,
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

async function callGemini(messages: ChatMessage[]) {
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
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}` }],
          },
        ],
        generationConfig: { temperature: 0.2 },
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
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) continue
      return parsed as CanvasState
    } catch {
      // try next candidate
    }
  }

  return null
}

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: ChatMessage[] }
  const messages = body?.messages ?? []
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ canvas: deterministicCanvas([]), source: "deterministic" })
  }

  const providers = [callOpenRouter, callOpenAI, callAnthropic, callGemini]
  const errors: string[] = []
  for (const provider of providers) {
    try {
      const result = await provider(messages)
      if (!result) continue
      if (result.error) errors.push(result.error)
      if (result.raw) {
        const parsed = safeParseCanvas(result.raw)
        if (parsed) return NextResponse.json({ canvas: parsed, source: "llm", model: result.model })
        errors.push(`Parse failed for model ${result.model}`)
      }
    } catch {
      // fall through to next provider
    }
  }

  return NextResponse.json({
    canvas: deterministicCanvas(messages),
    source: "deterministic",
    model: "deterministic",
    errors,
  })
}
