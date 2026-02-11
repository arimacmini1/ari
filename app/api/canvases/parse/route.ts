import { NextRequest, NextResponse } from "next/server"
import type { CanvasNode, CanvasEdge } from "@/lib/canvas-state"
import { parseCanvasToInstructionGraph } from "@/lib/instruction-graph"

interface ParseRequest {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ParseRequest

    if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
      return NextResponse.json(
        { error: "Invalid request: nodes and edges arrays required" },
        { status: 400 }
      )
    }

    if (body.nodes.length === 0) {
      return NextResponse.json(
        { error: "Canvas must contain at least one node" },
        { status: 400 }
      )
    }

    const validBlockTypes = ["task", "decision", "loop", "parallel", "text"]
    for (const node of body.nodes) {
      if (!node.data?.blockType || !validBlockTypes.includes(node.data.blockType)) {
        return NextResponse.json(
          { error: `Invalid block type "${node.data?.blockType}" on node "${node.id}"` },
          { status: 400 }
        )
      }
      if (!node.id) {
        return NextResponse.json(
          { error: "Each node must have an id" },
          { status: 400 }
        )
      }
    }

    const nodeIds = new Set(body.nodes.map((n) => n.id))
    for (const edge of body.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        return NextResponse.json(
          { error: `Edge references unknown node: ${edge.source} -> ${edge.target}` },
          { status: 400 }
        )
      }
    }

    const graph = parseCanvasToInstructionGraph(body.nodes, body.edges)
    return NextResponse.json(graph, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cycle detected")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Parse endpoint error:", error)
    return NextResponse.json(
      { error: "Failed to parse canvas to instruction graph" },
      { status: 500 }
    )
  }
}
