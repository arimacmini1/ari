import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import type { CanvasState } from "@/lib/canvas-state"
import type { CollabOperation, CollabVersions } from "@/lib/canvas-collab"
import { applyOperations, diffCanvasState } from "@/lib/canvas-collab"

export interface Collaborator {
  id: string
  name: string
  color: string
  lastSeen: number
  cursor?: { x: number; y: number }
}

interface CollabMessage {
  canvasId: string
  clientId: string
  type: "ops" | "presence" | "cursor"
  payload: any
}

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#e11d48", "#a855f7", "#14b8a6"]

function getClientId() {
  if (typeof window === "undefined") return "server"
  const existing = localStorage.getItem("aei-collab-client-id")
  if (existing) return existing
  const id = `${Math.random().toString(16).slice(2)}-${Date.now()}`
  localStorage.setItem("aei-collab-client-id", id)
  return id
}

function getDisplayName() {
  if (typeof window === "undefined") return "User"
  const existing = localStorage.getItem("aei-collab-name")
  if (existing) return existing
  const id = Math.random().toString(36).slice(2, 6).toUpperCase()
  const name = `User-${id}`
  localStorage.setItem("aei-collab-name", name)
  return name
}

export function useCanvasCollaboration(canvasId: string, onRemoteState: (state: CanvasState) => void) {
  const clientId = useMemo(() => getClientId(), [])
  const displayName = useMemo(() => getDisplayName(), [])
  const channelRef = useRef<BroadcastChannel | null>(null)
  const versionsRef = useRef<CollabVersions>({ nodeTs: new Map(), edgeTs: new Map() })
  const lastLocalStateRef = useRef<CanvasState | null>(null)
  const localEditRef = useRef<Map<string, { ts: number; node: any }>>(new Map())
  const lastCursorSentRef = useRef(0)
  const [collaborators, setCollaborators] = useState<Record<string, Collaborator>>({})
  const [conflicts, setConflicts] = useState<Array<{
    id: string
    nodeId: string
    localNode: any
    remoteNode: any
    ts: number
  }>>([])

  const broadcast = useCallback((message: CollabMessage) => {
    if (!channelRef.current) return
    channelRef.current.postMessage(message)
  }, [])

  const sendPresence = useCallback(() => {
    broadcast({
      canvasId,
      clientId,
      type: "presence",
      payload: { name: displayName, ts: Date.now() },
    })
  }, [broadcast, canvasId, clientId, displayName])

  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now()
    if (now - lastCursorSentRef.current < 50) return
    lastCursorSentRef.current = now
    broadcast({
      canvasId,
      clientId,
      type: "cursor",
      payload: { x, y, ts: now },
    })
  }, [broadcast, canvasId, clientId])

  const broadcastOps = useCallback((prev: CanvasState, next: CanvasState) => {
    const ops = diffCanvasState(prev, next, clientId)
    if (ops.length === 0) return
    for (const op of ops) {
      if (op.type === "node:update" && op.node) {
        localEditRef.current.set(op.node.id, { ts: op.ts, node: op.node })
      }
    }
    broadcast({
      canvasId,
      clientId,
      type: "ops",
      payload: { ops },
    })
  }, [broadcast, canvasId, clientId])

  const observeLocalState = useCallback((state: CanvasState) => {
    const prev = lastLocalStateRef.current
    lastLocalStateRef.current = state
    if (!prev) return
    broadcastOps(prev, state)
  }, [broadcastOps])

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return
    const channel = new BroadcastChannel(`aei-canvas-${canvasId}`)
    channelRef.current = channel

    channel.onmessage = (event) => {
      const message = event.data as CollabMessage
      if (!message || message.canvasId !== canvasId) return
      if (message.clientId === clientId) return

      if (message.type === "presence") {
        setCollaborators((prev) => {
          const color = prev[message.clientId]?.color ?? COLORS[Math.abs(message.clientId.charCodeAt(0)) % COLORS.length]
          return {
            ...prev,
            [message.clientId]: {
              id: message.clientId,
              name: message.payload?.name || "User",
              color,
              lastSeen: message.payload?.ts || Date.now(),
              cursor: prev[message.clientId]?.cursor,
            },
          }
        })
      }

      if (message.type === "cursor") {
        setCollaborators((prev) => {
          const existing = prev[message.clientId]
          if (!existing) return prev
          return {
            ...prev,
            [message.clientId]: {
              ...existing,
              cursor: { x: message.payload.x, y: message.payload.y },
              lastSeen: message.payload.ts || Date.now(),
            },
          }
        })
      }

      if (message.type === "ops") {
        const ops: CollabOperation[] = message.payload?.ops || []
        if (!ops.length) return
        if (!lastLocalStateRef.current) return
        for (const op of ops) {
          if (op.type === "node:update" && op.node) {
            const localEdit = localEditRef.current.get(op.node.id)
            if (localEdit && Math.abs(op.ts - localEdit.ts) < 5000) {
              setConflicts((prev) => [
                ...prev,
                {
                  id: `${op.node.id}-${op.ts}`,
                  nodeId: op.node.id,
                  localNode: localEdit.node,
                  remoteNode: op.node,
                  ts: op.ts,
                },
              ])
            }
          }
        }
        const merged = applyOperations(lastLocalStateRef.current, ops, versionsRef.current)
        lastLocalStateRef.current = merged
        onRemoteState(merged)
      }
    }

    const presenceInterval = setInterval(sendPresence, 5000)
    sendPresence()

    return () => {
      clearInterval(presenceInterval)
      channel.close()
      channelRef.current = null
    }
  }, [canvasId, clientId, onRemoteState, sendPresence])

  useEffect(() => {
    const pruneInterval = setInterval(() => {
      const now = Date.now()
      setCollaborators((prev) => {
        const next: Record<string, Collaborator> = {}
        for (const [id, collaborator] of Object.entries(prev)) {
          if (now - collaborator.lastSeen < 20000) {
            next[id] = collaborator
          }
        }
        return next
      })
    }, 10000)
    return () => clearInterval(pruneInterval)
  }, [])

  return {
    clientId,
    displayName,
    collaborators: Object.values(collaborators),
    broadcastCursor,
    observeLocalState,
    conflicts,
    resolveConflict: (conflictId: string, resolution: "mine" | "theirs") => {
      setConflicts((prev) => {
        const conflict = prev.find((c) => c.id === conflictId)
        if (conflict && lastLocalStateRef.current) {
          if (resolution === "mine") {
            const restored = applyOperations(
              lastLocalStateRef.current,
              [{
                id: conflict.id,
                clientId,
                ts: Date.now(),
                type: "node:update",
                node: conflict.localNode,
              }],
              versionsRef.current
            )
            lastLocalStateRef.current = restored
            onRemoteState(restored)
          }
        }
        return prev.filter((c) => c.id !== conflictId)
      })
    },
  }
}
