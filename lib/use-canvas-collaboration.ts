import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import type { CanvasState } from "@/lib/canvas-state"
import type { CanvasNode } from "@/lib/canvas-state"
import type { CollabOperation, CollabVersions } from "@/lib/canvas-collab"
import { applyOperations, diffCanvasState } from "@/lib/canvas-collab"
import { createCanvasCollabTransport, type CollabTransport } from "@/lib/canvas-collab-transport"

export interface Collaborator {
  id: string
  userId: string
  name: string
  color: string
  lastSeen: number
  cursor?: { xFlow: number; yFlow: number }
}

interface CollabMessage {
  canvasId: string
  clientId: string
  type: "ops" | "presence" | "cursor"
  payload: {
    name?: string
    userId?: string
    ts?: number
    xFlow?: number
    yFlow?: number
    x?: number
    y?: number
    ops?: CollabOperation[]
  }
}

interface CollaborationConflict {
  id: string
  nodeId: string
  localNode: CanvasNode
  remoteNode: CanvasNode
  ts: number
}

interface ConflictResolutionRecord {
  conflictId: string
  nodeId: string
  resolution: "mine" | "theirs"
  resolvedAt: number
}

export interface CollaborationEditEvent {
  id: string
  nodeId: string
  nodeLabel: string
  actorName: string
  action: "add" | "update" | "remove"
  createdAt: number
}

interface UseCanvasCollaborationOptions {
  transportFactory?: (channelName: string) => CollabTransport
  scopeKey?: string
}

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#e11d48", "#a855f7", "#14b8a6"]

function getClientId() {
  if (typeof window === "undefined") return "server"
  const runtimeKey = "__aei_collab_client_id__"
  const existing = (window as unknown as Record<string, string | undefined>)[runtimeKey]
  if (existing) return existing
  const generated = `${Math.random().toString(16).slice(2)}-${Date.now()}`
  ;(window as unknown as Record<string, string>)[runtimeKey] = generated
  return generated
}

function getDisplayName() {
  if (typeof window === "undefined") return "User"
  const sessionExisting = sessionStorage.getItem("aei-collab-name")
  if (sessionExisting) return sessionExisting
  const id = Math.random().toString(36).slice(2, 6).toUpperCase()
  const name = `User-${id}`
  sessionStorage.setItem("aei-collab-name", name)
  return name
}

function getUserId() {
  if (typeof window === "undefined") return "local-user"
  return (
    sessionStorage.getItem("aei-user") ||
    sessionStorage.getItem("aei.userId") ||
    "local-user"
  )
}

export function useCanvasCollaboration(
  canvasId: string,
  onRemoteState: (state: CanvasState) => void,
  options?: UseCanvasCollaborationOptions
) {
  const clientId = useMemo(() => getClientId(), [])
  const displayName = useMemo(() => getDisplayName(), [])
  const userId = useMemo(() => getUserId(), [])
  const transportFactory = options?.transportFactory ?? createCanvasCollabTransport
  const scopeKey = options?.scopeKey ?? "default"
  const transportRef = useRef<CollabTransport | null>(null)
  const versionsRef = useRef<CollabVersions>({
    nodeTs: new Map(),
    edgeTs: new Map(),
    nodeClock: new Map(),
    edgeClock: new Map(),
  })
  const lastLocalStateRef = useRef<CanvasState | null>(null)
  const localEditRef = useRef<Map<string, { ts: number; node: CanvasNode }>>(new Map())
  const latestConflictByNodeRef = useRef<Map<string, number>>(new Map())
  const conflictResolutionByNodeRef = useRef<Map<string, number>>(new Map())
  const lastCursorSentRef = useRef(0)
  const [collaborators, setCollaborators] = useState<Record<string, Collaborator>>({})
  const [conflicts, setConflicts] = useState<CollaborationConflict[]>([])
  const [resolutionLog, setResolutionLog] = useState<ConflictResolutionRecord[]>([])
  const [editEvents, setEditEvents] = useState<CollaborationEditEvent[]>([])

  const broadcast = useCallback((message: CollabMessage) => {
    if (!transportRef.current) return
    transportRef.current.postMessage(message)
  }, [])

  const sendPresence = useCallback(() => {
    broadcast({
      canvasId,
      clientId,
      type: "presence",
      payload: { name: displayName, userId, ts: Date.now() },
    })
  }, [broadcast, canvasId, clientId, displayName, userId])

  const broadcastCursor = useCallback((xFlow: number, yFlow: number) => {
    const now = Date.now()
    if (now - lastCursorSentRef.current < 50) return
    lastCursorSentRef.current = now
    broadcast({
      canvasId,
      clientId,
      type: "cursor",
      payload: { xFlow, yFlow, ts: now },
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
      payload: { ops, name: displayName, userId },
    })
  }, [broadcast, canvasId, clientId, displayName, userId])

  const observeLocalState = useCallback((state: CanvasState) => {
    const prev = lastLocalStateRef.current
    lastLocalStateRef.current = state
    if (!prev) return
    broadcastOps(prev, state)
  }, [broadcastOps])

  useEffect(() => {
    const transport = transportFactory(`aei-canvas-${scopeKey}-${canvasId}`)
    transportRef.current = transport

    transport.setOnMessage((rawMessage) => {
      const message = rawMessage as CollabMessage
      if (!message || message.canvasId !== canvasId) return
      if (message.clientId === clientId) return

      if (message.type === "presence") {
        setCollaborators((prev) => {
          const color = prev[message.clientId]?.color ?? COLORS[Math.abs(message.clientId.charCodeAt(0)) % COLORS.length]
          return {
            ...prev,
            [message.clientId]: {
              id: message.clientId,
              userId: message.payload?.userId || message.clientId,
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
          const xFlow = message.payload.xFlow
          const yFlow = message.payload.yFlow
          if (typeof xFlow !== "number" || typeof yFlow !== "number") return prev
          return {
            ...prev,
            [message.clientId]: {
              ...existing,
              userId: existing.userId || message.payload?.userId || message.clientId,
              cursor: { xFlow, yFlow },
              lastSeen: message.payload.ts || Date.now(),
            },
          }
        })
      }

      if (message.type === "ops") {
        const ops: CollabOperation[] = message.payload?.ops || []
        const actorName = message.payload?.name || message.clientId
        if (!ops.length) return
        if (!lastLocalStateRef.current) return
        const nextEditEvents: CollaborationEditEvent[] = []
        for (const op of ops) {
          if (op.type.startsWith("node")) {
            const action = op.type.split(":")[1] as "add" | "update" | "remove"
            const nodeId = op.node?.id ?? op.targetId
            if (nodeId) {
              const currentNode = op.node ?? lastLocalStateRef.current.nodes.find((n) => n.id === nodeId) ?? null
              nextEditEvents.push({
                id: op.id,
                nodeId,
                nodeLabel: currentNode?.data?.label || nodeId,
                actorName,
                action,
                createdAt: op.ts,
              })
            }
          }
          if (op.type === "node:update" && op.node) {
            const localEdit = localEditRef.current.get(op.node.id)
            const recentlyResolvedAt = conflictResolutionByNodeRef.current.get(op.node.id) ?? 0
            if (localEdit && Math.abs(op.ts - localEdit.ts) < 5000 && op.ts > recentlyResolvedAt) {
              const lastQueuedTs = latestConflictByNodeRef.current.get(op.node.id) ?? 0
              if (op.ts <= lastQueuedTs) continue
              latestConflictByNodeRef.current.set(op.node.id, op.ts)
              setConflicts((prev) => {
                const nodeId = op.node.id
                const nextConflict: CollaborationConflict = {
                  id: `${nodeId}-${op.clientId}-${op.id}`,
                  nodeId,
                  localNode: localEdit.node,
                  remoteNode: op.node,
                  ts: op.ts,
                }
                const withoutNode = prev.filter((existing) => existing.nodeId !== nodeId)
                return [...withoutNode, nextConflict]
              })
            }
          }
        }
        if (nextEditEvents.length > 0) {
          setEditEvents((prev) => [...nextEditEvents, ...prev].slice(0, 200))
        }
        const merged = applyOperations(lastLocalStateRef.current, ops, versionsRef.current)
        lastLocalStateRef.current = merged
        onRemoteState(merged)
      }
    })

    const presenceInterval = setInterval(sendPresence, 5000)
    sendPresence()

    return () => {
      clearInterval(presenceInterval)
      transport.close()
      transportRef.current = null
    }
  }, [canvasId, clientId, onRemoteState, sendPresence, transportFactory, scopeKey])

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

  const collaboratorsList = useMemo(() => Object.values(collaborators), [collaborators])

  return {
    clientId,
    displayName,
    collaborators: collaboratorsList,
    broadcastCursor,
    observeLocalState,
    conflicts,
    resolutionLog,
    editEvents,
    resolveConflict: (conflictId: string, resolution: "mine" | "theirs") => {
      setConflicts((prev) => {
        const conflict = prev.find((c) => c.id === conflictId)
        if (conflict && lastLocalStateRef.current) {
          conflictResolutionByNodeRef.current.set(conflict.nodeId, Date.now())
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
          setResolutionLog((log) => [
            {
              conflictId,
              nodeId: conflict.nodeId,
              resolution,
              resolvedAt: Date.now(),
            },
            ...log,
          ].slice(0, 100))
        }
        return prev.filter((c) => c.id !== conflictId)
      })
    },
  }
}
