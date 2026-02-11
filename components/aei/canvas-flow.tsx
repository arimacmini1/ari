"use client"

import React, { useState, useCallback, useEffect, useRef } from "react"
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  Connection,
  MarkerType,
  ReactFlowInstance,
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
  onPointerMove?: (point: { x: number; y: number }) => void
}

export function CanvasFlow({
  initialState,
  onStateChange,
  onAddBlock,
  onDropBlock,
  selectedNode,
  onSelectNode,
  onPointerMove,
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

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { type: string; direction?: string; query?: string };
      if (detail?.type === 'canvas-zoom') {
        if (!reactFlowInstance.current) return;
        if (detail.direction === 'in') reactFlowInstance.current.zoomIn?.();
        if (detail.direction === 'out') reactFlowInstance.current.zoomOut?.();
        if (detail.direction === 'fit') reactFlowInstance.current.fitView?.({ duration: 300 });
      }
      if (detail?.type === 'canvas-select' && detail.query) {
        const q = detail.query.toLowerCase();
        setNodes((prev) =>
          prev.map((node) => {
            const label = String((node.data as CanvasNode["data"]).label || '').toLowerCase();
            return { ...node, selected: label === q };
          })
        );
      }
    };
    window.addEventListener('aei-voice-command', handler as EventListener);
    return () => window.removeEventListener('aei-voice-command', handler as EventListener);
  }, [setNodes]);

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
          onPointerMove?.({ x: event.clientX, y: event.clientY })
        }}
        connectionLineStyle={{ stroke: "#22c55e", strokeWidth: 2 }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
