import { NextRequest, NextResponse } from "next/server"
import type { CanvasNode, CanvasEdge } from "@/lib/canvas-state"
import {
  parseCanvasToInstructionGraph,
  hashTask,
  type InstructionTask,
  type InstructionGraph,
} from "@/lib/instruction-graph"

interface DeltaRequest {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  previous_graph_id: string
  previous_tasks: InstructionTask[]
}

interface TaskDelta {
  task: InstructionTask
  action: "add" | "remove" | "update"
}

interface DeltaResponse {
  graph_id: string
  previous_graph_id: string
  deltas: TaskDelta[]
  full_graph: InstructionGraph
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeltaRequest

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

    if (!body.previous_graph_id || typeof body.previous_graph_id !== "string") {
      return NextResponse.json(
        { error: "previous_graph_id is required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.previous_tasks)) {
      return NextResponse.json(
        { error: "previous_tasks array is required" },
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
    }

    const graph = parseCanvasToInstructionGraph(body.nodes, body.edges)

    const previousByNodeId = new Map<string, InstructionTask>()
    for (const task of body.previous_tasks) {
      previousByNodeId.set(task.source_node_id, task)
    }

    const previousNodeHashes = new Map<string, string>()
    const currentNodeMap = new Map<string, CanvasNode>()
    for (const node of body.nodes) {
      currentNodeMap.set(node.id, node)
    }

    for (const task of body.previous_tasks) {
      const node = currentNodeMap.get(task.source_node_id)
      if (node) {
        previousNodeHashes.set(task.source_node_id, hashTask(node))
      } else {
        previousNodeHashes.set(
          task.source_node_id,
          [
            task.properties.blockType as string ?? '',
            task.properties.label as string ?? '',
            JSON.stringify(task.description ?? ''),
            JSON.stringify(task.properties.loopCount ?? ''),
            JSON.stringify(task.properties.conditionText ?? ''),
            '',
          ].join('|')
        )
      }
    }

    const deltas: TaskDelta[] = []

    const previousNodeIds = new Set(body.previous_tasks.map((t) => t.source_node_id))
    const currentNodeIds = new Set(body.nodes.map((n) => n.id))

    for (const task of graph.tasks) {
      if (!previousNodeIds.has(task.source_node_id)) {
        deltas.push({ task, action: "add" })
      } else {
        const currentNode = currentNodeMap.get(task.source_node_id)
        if (currentNode) {
          const currentHash = hashTask(currentNode)
          const prevHash = previousNodeHashes.get(task.source_node_id)
          if (currentHash !== prevHash) {
            deltas.push({ task, action: "update" })
          }
        }
      }
    }

    for (const prevTask of body.previous_tasks) {
      if (!currentNodeIds.has(prevTask.source_node_id)) {
        deltas.push({ task: prevTask, action: "remove" })
      }
    }

    const response: DeltaResponse = {
      graph_id: graph.graph_id,
      previous_graph_id: body.previous_graph_id,
      deltas,
      full_graph: graph,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cycle detected")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Delta parse endpoint error:", error)
    return NextResponse.json(
      { error: "Failed to compute delta instruction graph" },
      { status: 500 }
    )
  }
}
