import {
  DEFAULT_COPILOT_PROMPT_ID,
  getCopilotPromptById,
  type CopilotPromptDefinition,
} from "@/lib/copilot/prompt-registry"

type ChatMessage = {
  role: "user" | "ai" | "system"
  content: string
}

interface ResolvePromptInput {
  messages: ChatMessage[]
  requestedPromptId?: string | null
}

interface ResolvePromptResult {
  prompt: CopilotPromptDefinition
  mode: "auto" | "manual"
  reason: string
}

const keywordHints: Record<string, string[]> = {
  "ari-architect-v1": [
    "code",
    "architecture",
    "design",
    "system",
    "api",
    "backend",
    "frontend",
    "database",
    "schema",
    "refactor",
    "performance",
    "deploy",
    "testing",
    "folder",
    "typescript",
    "python",
    "golang",
    "rust",
  ],
}

function scorePrompt(promptId: string, text: string) {
  const hints = keywordHints[promptId] ?? []
  if (hints.length === 0) return 0
  const normalized = text.toLowerCase()
  let score = 0
  for (const hint of hints) {
    if (normalized.includes(hint)) score += 1
  }
  return score
}

export function resolveCopilotPrompt({
  messages,
  requestedPromptId,
}: ResolvePromptInput): ResolvePromptResult {
  if (requestedPromptId && requestedPromptId !== "auto") {
    const requested = getCopilotPromptById(requestedPromptId)
    if (requested?.enabled) {
      return {
        prompt: requested,
        mode: "manual",
        reason: `manual override: ${requestedPromptId}`,
      }
    }
  }

  const fallback = getCopilotPromptById(DEFAULT_COPILOT_PROMPT_ID)
  if (!fallback) {
    throw new Error(`Fallback prompt not found: ${DEFAULT_COPILOT_PROMPT_ID}`)
  }

  const lastUser = [...messages].reverse().find((message) => message.role === "user")
  const text = lastUser?.content ?? ""
  if (!text.trim()) {
    return { prompt: fallback, mode: "auto", reason: "no user text, fallback default" }
  }

  const candidates = [
    getCopilotPromptById("ari-architect-v1"),
    fallback,
  ].filter((prompt): prompt is CopilotPromptDefinition => Boolean(prompt && prompt.enabled))

  let best = fallback
  let bestScore = -1
  for (const candidate of candidates) {
    const score = scorePrompt(candidate.id, text)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  if (best.id === fallback.id && bestScore <= 0) {
    return { prompt: fallback, mode: "auto", reason: "no keyword match, fallback default" }
  }

  return {
    prompt: best,
    mode: "auto",
    reason: `keyword score ${bestScore} for ${best.id}`,
  }
}
