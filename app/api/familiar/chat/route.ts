import { NextResponse } from "next/server"
import { resolveCopilotPrompt } from "@/lib/copilot/prompt-router"

type ChatMessage = {
  role: "user" | "ai" | "system"
  content: string
}

function cleanMessages(messages: ChatMessage[]) {
  return messages.filter((m) => m.role !== "system")
}

function getLastUserMessage(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return messages[index]
  }
  return null
}

function userRequestedRichFormatting(lastUserContent: string) {
  const normalized = lastUserContent.toLowerCase()
  const formattingHints = [
    "markdown",
    "md",
    "mermaid",
    "diagram",
    "table",
    "fenced code",
    "code block",
    "format as",
    "use headings",
  ]
  if (normalized.includes("```")) return true
  return formattingHints.some((hint) => normalized.includes(hint))
}

function stripMarkdownToPlainText(text: string) {
  let normalized = text

  normalized = normalized.replace(/```[a-zA-Z0-9_-]*\n?/g, "")
  normalized = normalized.replace(/```/g, "")
  normalized = normalized.replace(/^\s{0,3}#{1,6}\s+/gm, "")
  normalized = normalized.replace(/^\s*>\s?/gm, "")
  normalized = normalized.replace(/\*\*([^*]+)\*\*/g, "$1")
  normalized = normalized.replace(/__([^_]+)__/g, "$1")
  normalized = normalized.replace(/`([^`]+)`/g, "$1")
  normalized = normalized.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
  normalized = normalized.replace(/^\s*[-*+]\s+/gm, "- ")
  normalized = normalized.replace(/^\s*\d+\.\s+/gm, (match) => `${match.trim()} `)
  normalized = normalized.replace(/\n{3,}/g, "\n\n")

  return normalized.trim()
}

function normalizeReply({
  reply,
  promptId,
  allowRichFormatting,
}: {
  reply: string
  promptId: string
  allowRichFormatting: boolean
}) {
  if (allowRichFormatting) return reply.trim()
  const stripMarkdownPromptIds = new Set<string>([
    "ari-architect-v1",
    "ari-architect-readable-v1",
  ])
  if (!stripMarkdownPromptIds.has(promptId)) return reply.trim()
  return stripMarkdownToPlainText(reply)
}

async function callOpenAI(messages: ChatMessage[], systemPrompt: string) {
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
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content })),
      ],
      temperature: 0.4,
      max_tokens: 300,
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { reply: null, error: `OpenAI error ${resp.status}: ${errorText.slice(0, 200)}`, model }
  }
  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content
  return { reply: typeof content === "string" ? content : null, model }
}

async function callOpenRouter(messages: ChatMessage[], systemPrompt: string) {
  const apiKey = process.env.OPENROUTER_KEY
  if (!apiKey) return null
  const model = "openrouter/auto" // Use auto-select or specify a model
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
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content })),
      ],
      temperature: 0.4,
      max_tokens: 300,
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { reply: null, error: `OpenRouter error ${resp.status}: ${errorText.slice(0, 200)}`, model }
  }
  const data = await resp.json()
  // OpenRouter may return content in reasoning or content field
  let content = data?.choices?.[0]?.message?.content
  if (!content && data?.choices?.[0]?.message?.reasoning) {
    // Use reasoning content if main content is empty
    content = data.choices[0].message.reasoning
  }
  return { reply: typeof content === "string" ? content : null, model }
}

async function callAnthropic(messages: ChatMessage[], systemPrompt: string) {
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
      max_tokens: 300,
      temperature: 0.4,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === "ai" ? "assistant" : m.role,
        content: m.content,
      })),
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { reply: null, error: `Anthropic error ${resp.status}: ${errorText.slice(0, 200)}`, model }
  }
  const data = await resp.json()
  const content = data?.content?.[0]?.text
  return { reply: typeof content === "string" ? content : null, model }
}

async function callGemini(messages: ChatMessage[], systemPrompt: string) {
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
                text: `${systemPrompt}\n\n${messages
                  .map((m) => `${m.role}: ${m.content}`)
                  .join("\n")}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
      }),
    }
  )
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { reply: null, error: `Gemini error ${resp.status}: ${errorText.slice(0, 200)}`, model }
  }
  const data = await resp.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return { reply: typeof content === "string" ? content : null, model }
}

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: ChatMessage[]; promptId?: string | null }
  const messages = cleanMessages(body?.messages ?? [])
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 })
  }

  const resolvedPrompt = resolveCopilotPrompt({
    messages,
    requestedPromptId: body?.promptId,
  })

  const lastUserMessage = getLastUserMessage(messages)
  const allowRichFormatting = userRequestedRichFormatting(lastUserMessage?.content ?? "")

  const providers = [callOpenRouter, callOpenAI, callAnthropic, callGemini]
  const errors: string[] = []
  for (const provider of providers) {
    try {
      const result = await provider(messages, resolvedPrompt.prompt.systemPrompt)
      if (result?.reply) {
        return NextResponse.json({
          reply: normalizeReply({
            reply: result.reply,
            promptId: resolvedPrompt.prompt.id,
            allowRichFormatting,
          }),
          model: result.model,
          prompt: {
            id: resolvedPrompt.prompt.id,
            name: resolvedPrompt.prompt.name,
            version: resolvedPrompt.prompt.version,
            mode: resolvedPrompt.mode,
            reason: resolvedPrompt.reason,
          },
        })
      }
      if (result?.error) {
        errors.push(result.error)
      }
    } catch {
      // fall through to next provider
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: errors.join(" | "),
        prompt: {
          id: resolvedPrompt.prompt.id,
          name: resolvedPrompt.prompt.name,
          version: resolvedPrompt.prompt.version,
          mode: resolvedPrompt.mode,
          reason: resolvedPrompt.reason,
        },
      },
      { status: 502 }
    )
  }
  return NextResponse.json({ error: "No LLM providers available." }, { status: 503 })
}
