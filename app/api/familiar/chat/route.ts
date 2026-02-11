import { NextResponse } from "next/server"

type ChatMessage = {
  role: "user" | "ai" | "system"
  content: string
}

const SYSTEM_PROMPT = `You are an expert planning assistant for an AI workflow canvas.
Respond with concise, actionable guidance. Ask clarifying questions when needed.
Do not return JSON. Keep replies under 120 words unless asked for detail.`

function cleanMessages(messages: ChatMessage[]) {
  return messages.filter((m) => m.role !== "system")
}

async function callOpenAI(messages: ChatMessage[]) {
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
        ...messages.map((m) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content })),
      ],
      temperature: 0.4,
      max_tokens: 300,
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { reply: null, error: `OpenAI error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content
  return { reply: typeof content === "string" ? content : null }
}

async function callAnthropic(messages: ChatMessage[]) {
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
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role === "ai" ? "assistant" : m.role,
        content: m.content,
      })),
    }),
  })
  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "")
    return { reply: null, error: `Anthropic error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  const content = data?.content?.[0]?.text
  return { reply: typeof content === "string" ? content : null }
}

async function callGemini(messages: ChatMessage[]) {
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
                text: `${SYSTEM_PROMPT}\n\n${messages
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
    return { reply: null, error: `Gemini error ${resp.status}: ${errorText.slice(0, 200)}` }
  }
  const data = await resp.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return { reply: typeof content === "string" ? content : null }
}

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: ChatMessage[] }
  const messages = cleanMessages(body?.messages ?? [])
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 })
  }

  const providers = [callGemini, callAnthropic, callOpenAI]
  const errors: string[] = []
  for (const provider of providers) {
    try {
      const result = await provider(messages)
      if (result?.reply) {
        return NextResponse.json({ reply: result.reply })
      }
      if (result?.error) {
        errors.push(result.error)
      }
    } catch {
      // fall through to next provider
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" | ") }, { status: 502 })
  }
  return NextResponse.json({ error: "No LLM providers available." }, { status: 503 })
}
