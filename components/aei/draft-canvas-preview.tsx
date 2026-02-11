"use client"

import React from "react"
import ReactFlow, { Background, Controls } from "reactflow"
import "reactflow/dist/style.css"
import type { CanvasState } from "@/lib/canvas-state"
import BlockNode from "./block-node"

const nodeTypes = {
  block: BlockNode,
}

interface DraftCanvasPreviewProps {
  state: CanvasState
  className?: string
}

export function DraftCanvasPreview({ state, className }: DraftCanvasPreviewProps) {
  return (
    <div className={["h-full w-full", className].filter(Boolean).join(" ")}>
      <ReactFlow
        nodes={state.nodes}
        edges={state.edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        panOnDrag={false}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
