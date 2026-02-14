export interface CanvasComment {
  id: string
  canvas_id: string
  project_id: string
  node_id: string
  node_label: string
  author_id: string
  author_name: string
  body: string
  mentions: string[]
  created_at: string
}

export interface MentionIdentity {
  userId: string
  displayName: string
  mentionHandle: string
}

export interface MentionTarget {
  userId: string
  displayName: string
  mentionHandle: string
  token: string
}

export interface CanvasCommentThread {
  thread_id: string
  canvas_id: string
  project_id: string
  node_id: string
  node_label: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  comments: CanvasComment[]
}

export type CanvasActivityType = "mention" | "comment" | "edit" | "rollback"

export interface CanvasActivityEntry {
  id: string
  type: CanvasActivityType
  canvas_id: string
  project_id: string
  node_id: string
  node_label: string
  actor_name: string
  summary: string
  mention: string | null
  mention_user_id?: string | null
  source_comment_id: string | null
  source_edit_id: string | null
  created_at: string
  read_at: string | null
}

const MENTION_RE = /(^|\s)@([a-zA-Z0-9_.:-]{2,64})\b/g

export function extractMentions(text: string): string[] {
  const mentions = new Set<string>()
  for (const match of text.matchAll(MENTION_RE)) {
    if (match[2]) mentions.add(match[2].toLowerCase())
  }
  return Array.from(mentions)
}

export function canonicalizeMentionHandle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_.:-]/g, "")
}

export function resolveMentionTargets(
  mentions: string[],
  directory: MentionIdentity[]
): MentionTarget[] {
  if (mentions.length === 0 || directory.length === 0) return []
  const byHandle = new Map<string, MentionIdentity>()
  for (const identity of directory) {
    const handle = canonicalizeMentionHandle(identity.mentionHandle)
    if (!handle || byHandle.has(handle)) continue
    byHandle.set(handle, identity)
  }
  const results: MentionTarget[] = []
  const seen = new Set<string>()
  for (const token of mentions) {
    const normalized = canonicalizeMentionHandle(token)
    if (!normalized) continue
    const match = byHandle.get(normalized)
    if (!match) continue
    const key = `${match.userId}:${normalized}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({
      userId: match.userId,
      displayName: match.displayName,
      mentionHandle: normalized,
      token: normalized,
    })
  }
  return results
}

export function normalizeCommentBody(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

export function shortPreview(value: string, max = 96): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}
