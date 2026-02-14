import { describe, expect, it } from "vitest"
import type { CanvasState } from "@/lib/canvas-state"
import type { CollabOperation, CollabVersions } from "@/lib/canvas-collab"
import { applyOperations } from "@/lib/canvas-collab"

function baseState(): CanvasState {
  return {
    nodes: [
      {
        id: "n-1",
        type: "block",
        position: { x: 0, y: 0 },
        data: {
          label: "Task",
          blockType: "task",
          description: "base",
        },
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

function versions(): CollabVersions {
  return {
    nodeTs: new Map(),
    edgeTs: new Map(),
    nodeClock: new Map(),
    edgeClock: new Map(),
  }
}

describe("applyOperations deterministic conflict resolution", () => {
  it("produces same final node when equal-ts updates arrive in different orders", () => {
    const opA: CollabOperation = {
      id: "op-a",
      clientId: "client-a",
      ts: 1000,
      type: "node:update",
      node: {
        id: "n-1",
        type: "block",
        position: { x: 0, y: 0 },
        data: {
          label: "Task A",
          blockType: "task",
          description: "from-a",
        },
      },
    }

    const opB: CollabOperation = {
      id: "op-b",
      clientId: "client-z",
      ts: 1000,
      type: "node:update",
      node: {
        id: "n-1",
        type: "block",
        position: { x: 0, y: 0 },
        data: {
          label: "Task Z",
          blockType: "task",
          description: "from-z",
        },
      },
    }

    const stateOne = applyOperations(baseState(), [opA, opB], versions())
    const stateTwo = applyOperations(baseState(), [opB, opA], versions())

    expect(stateOne.nodes[0]?.data.label).toBe("Task Z")
    expect(stateTwo.nodes[0]?.data.label).toBe("Task Z")
  })

  it("ignores older operation for same node when newer clock already applied", () => {
    const newer: CollabOperation = {
      id: "op-new",
      clientId: "client-b",
      ts: 1001,
      type: "node:update",
      node: {
        id: "n-1",
        type: "block",
        position: { x: 0, y: 0 },
        data: {
          label: "New",
          blockType: "task",
          description: "newer",
        },
      },
    }

    const older: CollabOperation = {
      id: "op-old",
      clientId: "client-a",
      ts: 1000,
      type: "node:update",
      node: {
        id: "n-1",
        type: "block",
        position: { x: 0, y: 0 },
        data: {
          label: "Old",
          blockType: "task",
          description: "older",
        },
      },
    }

    const state = applyOperations(baseState(), [newer, older], versions())
    expect(state.nodes[0]?.data.label).toBe("New")
  })
})
