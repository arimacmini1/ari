"use client"

import React, { useState, useCallback, useEffect, useRef } from "react"
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Connection,
  MarkerType,
  ReactFlowInstance,
  useViewport,
} from "reactflow"
import "reactflow/dist/style.css"
import { Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  canvasActions,
  createInitialHistory,
  type CanvasState,
  type CanvasNode,
  type BlockType,
  type HistoryState,
} from "@/lib/canvas-state"
import { canvasSerializer } from "@/lib/canvas-serialization"
import { isValidConnection as checkConnection } from "@/lib/connection-rules"
import BlockNode from "./block-node"

const nodeTypes = {
  block: BlockNode,
}

interface CanvasFlowProps {
  initialState?: CanvasState
  onStateChange?: (state: CanvasState) => void
  onAddBlock?: (blockType: string) => void
  onDropBlock?: (blockType: BlockType, label: string, description: string, position: { x: number; y: number }) => void
  selectedNode?: string | null
  onSelectNode?: (nodeId: string | null) => void
  collaborators?: Array<{
    id: string
    name: string
    color: string
    cursor?: { xFlow: number; yFlow: number }
  }>
  onFlowPointerMove?: (point: { xFlow: number; yFlow: number }) => void
}

function CursorOverlay({
  collaborators,
}: {
  collaborators: Array<{
    id: string
    name: string
    color: string
    cursor?: { xFlow: number; yFlow: number }
  }>
}) {
  const viewport = useViewport()

  return (
    <div className="pointer-events-none absolute inset-0">
      {collaborators
        .filter((c) => c.cursor)
        .map((c) => {
          if (!c.cursor) return null
          const left = c.cursor.xFlow * viewport.zoom + viewport.x
          const top = c.cursor.yFlow * viewport.zoom + viewport.y
          return (
            <div key={c.id} className="absolute" style={{ left, top }}>
              <div className="flex items-center gap-1 text-[10px] font-medium" style={{ color: c.color }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </div>
            </div>
          )
        })}
    </div>
  )
}

export function CanvasFlow({
  initialState,
  onStateChange,
  onAddBlock,
  onDropBlock,
  selectedNode,
  onSelectNode,
  collaborators = [],
  onFlowPointerMove,
}: CanvasFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialState?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialState?.edges || [])
  const [history, setHistory] = useState<HistoryState>(createInitialHistory())
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const lastSyncedStateRef = useRef<string>("")

  // Sync from parent when initialState changes (e.g. addBlock, property save)
  useEffect(() => {
    const incoming = JSON.stringify({ nodes: initialState?.nodes, edges: initialState?.edges })
    if (incoming !== lastSyncedStateRef.current) {
      lastSyncedStateRef.current = incoming
      if (initialState?.nodes) setNodes(initialState.nodes)
      if (initialState?.edges) setEdges(initialState.edges)
    }
  }, [initialState, setNodes, setEdges])

  // Notify parent of internal state changes (drag, connect, delete)
  useEffect(() => {
    const current = JSON.stringify({ nodes, edges })
    if (current === lastSyncedStateRef.current) return
    lastSyncedStateRef.current = current
    const state: CanvasState = {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    }
    onStateChange?.(state)
  }, [nodes, edges, onStateChange])

  const recordHistory = useCallback(() => {
    setHistory((prev) =>
      canvasActions.pushHistory({
        ...prev,
        present: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
      })
    )
  }, [nodes, edges])

  const validateConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return false
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)
      if (!sourceNode || !targetNode) return false
      const sourceType = (sourceNode.data as CanvasNode["data"]).blockType || "task"
      const targetType = (targetNode.data as CanvasNode["data"]).blockType || "task"
      const result = checkConnection(
        sourceType,
        targetType,
        connection.source,
        connection.target,
        edges,
        nodes
      )
      if (!result.valid) {
        console.warn(`[Canvas] Invalid connection: ${result.reason}`)
      }
      return result.valid
    },
    [nodes, edges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!validateConnection(connection)) return
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const sourceType = (sourceNode?.data as CanvasNode["data"])?.blockType || "task"
      const edgeColor = sourceType === "decision" ? "#f97316" : "#22c55e"
      const styledEdge = {
        ...connection,
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
      }
      const newEdges = addEdge(styledEdge, edges)
      setEdges(newEdges)
      recordHistory()
    },
    [edges, setEdges, recordHistory, validateConnection, nodes]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedNode && e.key === "Delete") {
        const newNodes = nodes.filter((n) => n.id !== selectedNode)
        const newEdges = edges.filter(
          (e) => e.source !== selectedNode && e.target !== selectedNode
        )
        setNodes(newNodes)
        setEdges(newEdges)
        onSelectNode?.(null)
        recordHistory()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedNode, nodes, edges, setNodes, setEdges, recordHistory, onSelectNode])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const blockType = e.dataTransfer.getData("application/aei-block-type") as BlockType
      if (!blockType) return

      const label = e.dataTransfer.getData("application/aei-block-label") || blockType
      const description = e.dataTransfer.getData("application/aei-block-description") || ""

      const position = reactFlowInstance.current
        ? reactFlowInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        : { x: e.clientX, y: e.clientY }

      onDropBlock?.(blockType, label, description, position)
    },
    [onDropBlock]
  )

  return (
    <div
      className="h-full w-full"
      tabIndex={0}
      aria-label="Canvas workspace"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => { reactFlowInstance.current = instance }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        isValidConnection={validateConnection}
        nodeTypes={nodeTypes}
        onSelectionChange={(selection) => {
          onSelectNode?.(selection.nodes[0]?.id || null)
        }}
        onMouseMove={(event) => {
          const instance = reactFlowInstance.current
          if (!instance) return
          const flow = instance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
          onFlowPointerMove?.({ xFlow: flow.x, yFlow: flow.y })
        }}
        connectionLineStyle={{ stroke: "#22c55e", strokeWidth: 2 }}
        fitView
      >
        <Background />
        <CursorOverlay collaborators={collaborators} />
      </ReactFlow>
    </div>
  )
}
