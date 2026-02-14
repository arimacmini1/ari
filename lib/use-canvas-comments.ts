import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  canonicalizeMentionHandle,
  extractMentions,
  normalizeCommentBody,
  resolveMentionTargets,
  shortPreview,
  type CanvasComment,
  type CanvasCommentThread,
  type CanvasActivityEntry,
  type MentionIdentity,
} from "@/lib/canvas-comments"

interface CanvasCommentsState {
  threads: CanvasCommentThread[]
  activity: CanvasActivityEntry[]
}

interface CommentsBroadcastMessage {
  type: "sync"
  payload: CanvasCommentsState
}

interface CollaboratorIdentityPayload {
  id: string
  name: string
}

interface CollaboratorsEventDetail {
  count: number
  names: string[]
  collaborators?: CollaboratorIdentityPayload[]
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function storageKey(projectId: string, canvasId: string): string {
  return `aei.canvas.comments.${projectId}.${canvasId}`
}

function channelName(projectId: string, canvasId: string): string {
  return `aei-canvas-comments-${projectId}-${canvasId}`
}

function loadState(key: string): CanvasCommentsState {
  if (typeof window === "undefined") return { threads: [], activity: [] }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { threads: [], activity: [] }
    const parsed = JSON.parse(raw)
    const threads = Array.isArray(parsed?.threads) ? parsed.threads : []
    const activity = Array.isArray(parsed?.activity) ? parsed.activity : []
    return { threads, activity }
  } catch {
    return { threads: [], activity: [] }
  }
}

function persistState(key: string, state: CanvasCommentsState): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(state))
}

function resolveStoredUserId(): string {
  if (typeof window === "undefined") return "local-user"
  return sessionStorage.getItem("aei-user") || sessionStorage.getItem("aei.userId") || "local-user"
}

function sameCollaborators(
  left: CollaboratorIdentityPayload[],
  right: CollaboratorIdentityPayload[]
): boolean {
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (left[i]?.id !== right[i]?.id) return false
    if (left[i]?.name !== right[i]?.name) return false
  }
  return true
}

export function useCanvasComments(canvasId: string, projectId: string) {
  const key = useMemo(() => storageKey(projectId, canvasId), [projectId, canvasId])
  const [state, setState] = useState<CanvasCommentsState>({ threads: [], activity: [] })
  const channelRef = useRef<BroadcastChannel | null>(null)
  const [actorId, setActorId] = useState("local-user")
  const [actorName, setActorName] = useState("User")
  const [collaboratorIdentities, setCollaboratorIdentities] = useState<CollaboratorIdentityPayload[]>([])
  const seenActivityIdsRef = useRef<Set<string>>(new Set())
  const seenInitializedRef = useRef(false)

  const actorMentionHandle = useMemo(() => {
    const fromUserId = canonicalizeMentionHandle(actorId)
    if (fromUserId.length >= 2) return fromUserId
    const fromName = canonicalizeMentionHandle(actorName)
    return fromName.length >= 2 ? fromName : "user"
  }, [actorId, actorName])

  const mentionDirectory = useMemo<MentionIdentity[]>(() => {
    const seen = new Set<string>()
    const directory: MentionIdentity[] = []
    const addEntry = (userId: string, displayName: string, rawHandle: string) => {
      const normalizedUserId = userId.trim()
      if (!normalizedUserId) return
      const mentionHandle = canonicalizeMentionHandle(rawHandle)
      if (mentionHandle.length < 2) return
      const dedupeKey = `${normalizedUserId}:${mentionHandle}`
      if (seen.has(dedupeKey)) return
      seen.add(dedupeKey)
      directory.push({
        userId: normalizedUserId,
        displayName: displayName.trim() || normalizedUserId,
        mentionHandle,
      })
    }
    const addIdentity = (userId: string, displayName: string) => {
      addEntry(userId, displayName, userId)
      addEntry(userId, displayName, displayName)
    }
    addIdentity(actorId, actorName)
    for (const collaborator of collaboratorIdentities) {
      addIdentity(collaborator.id, collaborator.name)
    }
    return directory
  }, [actorId, actorName, collaboratorIdentities])

  useEffect(() => {
    setState(loadState(key))
    if (typeof window === "undefined") return
    setActorId(resolveStoredUserId())
    setActorName(sessionStorage.getItem("aei-collab-name") || "User")
  }, [key])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<CollaboratorsEventDetail>).detail
      const collaborators = Array.isArray(detail?.collaborators) ? detail.collaborators : []
      const nextCollaborators = collaborators
        .filter((entry) => typeof entry?.id === "string" && typeof entry?.name === "string")
        .map((entry) => ({ id: entry.id, name: entry.name }))
      setCollaboratorIdentities((prev) =>
        sameCollaborators(prev, nextCollaborators) ? prev : nextCollaborators
      )
    }
    window.addEventListener("aei-collaborators", handler as EventListener)
    return () => {
      window.removeEventListener("aei-collaborators", handler as EventListener)
    }
  }, [])

  const writeState = useCallback(
    (next: CanvasCommentsState, shouldBroadcast = true) => {
      setState(next)
      persistState(key, next)
      if (shouldBroadcast && channelRef.current) {
        const message: CommentsBroadcastMessage = { type: "sync", payload: next }
        channelRef.current.postMessage(message)
      }
    },
    [key]
  )

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return
    const channel = new BroadcastChannel(channelName(projectId, canvasId))
    channelRef.current = channel

    channel.onmessage = (event: MessageEvent<CommentsBroadcastMessage>) => {
      const message = event.data
      if (!message || message.type !== "sync") return
      writeState(message.payload, false)
    }

    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [canvasId, projectId, writeState])

  const addComment = useCallback(
    (nodeId: string, nodeLabel: string, body: string) => {
      const normalized = normalizeCommentBody(body)
      if (!normalized) return false

      const now = new Date().toISOString()
      const commentId = createId("comment")
      const threadId = `thread-${nodeId}`
      const mentions = extractMentions(normalized)
      const mentionTargets = resolveMentionTargets(mentions, mentionDirectory)
      const resolvedMentions = mentionTargets.map((target) => target.mentionHandle)

      const comment: CanvasComment = {
        id: commentId,
        canvas_id: canvasId,
        project_id: projectId,
        node_id: nodeId,
        node_label: nodeLabel,
        author_id: actorId,
        author_name: actorName,
        body: normalized,
        mentions: resolvedMentions,
        created_at: now,
      }

      const existingThread = state.threads.find((thread) => thread.thread_id === threadId)
      const nextThread: CanvasCommentThread = existingThread
        ? {
            ...existingThread,
            updated_at: now,
            comments: [...existingThread.comments, comment],
          }
        : {
            thread_id: threadId,
            canvas_id: canvasId,
            project_id: projectId,
            node_id: nodeId,
            node_label: nodeLabel,
            created_at: now,
            updated_at: now,
            resolved_at: null,
            comments: [comment],
          }

      const nextThreads = [
        nextThread,
        ...state.threads.filter((thread) => thread.thread_id !== threadId),
      ]

      const commentActivity: CanvasActivityEntry = {
        id: createId("activity"),
        type: "comment",
        canvas_id: canvasId,
        project_id: projectId,
        node_id: nodeId,
        node_label: nodeLabel,
        actor_name: actorName,
        summary: shortPreview(normalized),
        mention: null,
        source_comment_id: commentId,
        source_edit_id: null,
        created_at: now,
        read_at: now,
      }

      const mentionActivity: CanvasActivityEntry[] = mentionTargets.map((mentionTarget) => ({
        id: createId("activity"),
        type: "mention",
        canvas_id: canvasId,
        project_id: projectId,
        node_id: nodeId,
        node_label: nodeLabel,
        actor_name: actorName,
        summary: shortPreview(normalized),
        mention: mentionTarget.mentionHandle,
        mention_user_id: mentionTarget.userId,
        source_comment_id: commentId,
        source_edit_id: null,
        created_at: now,
        read_at: mentionTarget.userId === actorId ? null : now,
      }))

      const nextState: CanvasCommentsState = {
        threads: nextThreads,
        activity: [commentActivity, ...mentionActivity, ...state.activity].slice(0, 300),
      }

      writeState(nextState)
      return true
    },
    [actorId, actorName, canvasId, mentionDirectory, projectId, state, writeState]
  )

  const markActivityRead = useCallback(
    (activityId: string) => {
      const now = new Date().toISOString()
      const nextState: CanvasCommentsState = {
        ...state,
        activity: state.activity.map((entry) =>
          entry.id === activityId ? { ...entry, read_at: entry.read_at || now } : entry
        ),
      }
      writeState(nextState)
    },
    [state, writeState]
  )

  const markAllActivityRead = useCallback(() => {
    const now = new Date().toISOString()
    const nextState: CanvasCommentsState = {
      ...state,
      activity: state.activity.map((entry) => {
        if (entry.read_at) return entry
        if (entry.type !== "mention") return { ...entry, read_at: now }
        const isTargetedToActor =
          entry.mention_user_id === actorId ||
          (!!entry.mention && entry.mention === actorMentionHandle)
        return isTargetedToActor ? { ...entry, read_at: now } : entry
      }),
    }
    writeState(nextState)
  }, [actorId, actorMentionHandle, state, writeState])

  const clearReadActivity = useCallback(() => {
    const nextState: CanvasCommentsState = {
      ...state,
      activity: state.activity.filter((entry) => entry.read_at === null),
    }
    writeState(nextState)
  }, [state, writeState])

  const threadForNode = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) return null
      return state.threads.find((thread) => thread.node_id === nodeId) || null
    },
    [state.threads]
  )

  const recordEditActivity = useCallback(
    (input: {
      editId: string
      nodeId: string
      nodeLabel: string
      actorName: string
      action: "add" | "update" | "remove"
      timestampMs: number
    }) => {
      const exists = state.activity.some((entry) => entry.source_edit_id === input.editId)
      if (exists) return
      const createdAt = new Date(input.timestampMs).toISOString()
      const summaryByAction = {
        add: `added block ${input.nodeLabel}`,
        update: `updated block ${input.nodeLabel}`,
        remove: `removed block ${input.nodeLabel}`,
      } as const
      const nextEntry: CanvasActivityEntry = {
        id: createId("activity"),
        type: "edit",
        canvas_id: canvasId,
        project_id: projectId,
        node_id: input.nodeId,
        node_label: input.nodeLabel,
        actor_name: input.actorName,
        summary: summaryByAction[input.action],
        mention: null,
        source_comment_id: null,
        source_edit_id: input.editId,
        created_at: createdAt,
        read_at: createdAt,
      }
      const nextState: CanvasCommentsState = {
        ...state,
        activity: [nextEntry, ...state.activity].slice(0, 300),
      }
      writeState(nextState)
    },
    [canvasId, projectId, state, writeState]
  )

  const recordRollbackActivity = useCallback(
    (input: {
      rollbackId: string
      actorName: string
      fromVersionId: string
      toVersionId: string
      timestampMs: number
    }) => {
      const exists = state.activity.some((entry) => entry.source_edit_id === input.rollbackId)
      if (exists) return
      const createdAt = new Date(input.timestampMs).toISOString()
      const nextEntry: CanvasActivityEntry = {
        id: createId("activity"),
        type: "rollback",
        canvas_id: canvasId,
        project_id: projectId,
        node_id: "canvas",
        node_label: "Canvas",
        actor_name: input.actorName,
        summary: `rolled back ${input.fromVersionId} -> ${input.toVersionId}`,
        mention: null,
        source_comment_id: null,
        source_edit_id: input.rollbackId,
        created_at: createdAt,
        read_at: createdAt,
      }
      const nextState: CanvasCommentsState = {
        ...state,
        activity: [nextEntry, ...state.activity].slice(0, 300),
      }
      writeState(nextState)
    },
    [canvasId, projectId, state, writeState]
  )

  const unreadMentions = useMemo(
    () =>
      state.activity.filter((entry) => {
        if (entry.type !== "mention" || entry.read_at !== null) return false
        if (entry.mention_user_id) return entry.mention_user_id === actorId
        return entry.mention === actorMentionHandle
      }).length,
    [actorId, actorMentionHandle, state.activity]
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    window.dispatchEvent(
      new CustomEvent("aei-collab-notifications", {
        detail: { unread: unreadMentions },
      })
    )
  }, [unreadMentions])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!seenInitializedRef.current) {
      seenActivityIdsRef.current = new Set(state.activity.map((entry) => entry.id))
      seenInitializedRef.current = true
      return
    }

    const newIncoming = state.activity.filter(
      (entry) =>
        !seenActivityIdsRef.current.has(entry.id) &&
        (entry.type === "comment" || entry.type === "mention")
    )

    if (newIncoming.length > 0) {
      window.dispatchEvent(
        new CustomEvent("aei-collab-activity", {
          detail: { count: newIncoming.length },
        })
      )
    }

    const nextSeen = new Set(seenActivityIdsRef.current)
    for (const entry of state.activity) {
      nextSeen.add(entry.id)
    }
    if (nextSeen.size > 1000) {
      const recentIds = state.activity.slice(0, 400).map((entry) => entry.id)
      seenActivityIdsRef.current = new Set(recentIds)
      return
    }
    seenActivityIdsRef.current = nextSeen
  }, [actorName, state.activity])

  return {
    actorName,
    actorMentionHandle,
    threads: state.threads,
    activity: state.activity,
    unreadMentions,
    addComment,
    recordEditActivity,
    recordRollbackActivity,
    threadForNode,
    markActivityRead,
    markAllActivityRead,
    clearReadActivity,
  }
}
