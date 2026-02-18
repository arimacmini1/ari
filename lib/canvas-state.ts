import { produce } from 'immer'
import type { Node, Edge } from 'reactflow'

export type BlockType = 'task' | 'decision' | 'loop' | 'parallel' | 'text' | 'artifact' | 'preview' | 'memory'

export interface CanvasNode extends Node {
  data: {
    label: string
    description?: string
    blockType: BlockType
    loopCount?: number
    conditionText?: string
    agentType?: string
  }
}

export type CanvasEdge = Edge

export interface CanvasState {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport: { x: number; y: number; zoom: number }
}

export interface HistoryState {
  past: CanvasState[]
  present: CanvasState
  future: CanvasState[]
}

const initialState: CanvasState = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

const initialHistory: HistoryState = {
  past: [],
  present: initialState,
  future: [],
}

// Actions for immutable state mutations
export const canvasActions = {
  setNodes: (state: HistoryState, nodes: CanvasNode[]) => {
    return produce(state, (draft) => {
      draft.present.nodes = nodes
      draft.future = []
    })
  },

  setEdges: (state: HistoryState, edges: CanvasEdge[]) => {
    return produce(state, (draft) => {
      draft.present.edges = edges
      draft.future = []
    })
  },

  setViewport: (state: HistoryState, viewport: CanvasState['viewport']) => {
    return produce(state, (draft) => {
      draft.present.viewport = viewport
      draft.future = []
    })
  },

  addNode: (state: HistoryState, node: CanvasNode) => {
    return produce(state, (draft) => {
      draft.present.nodes.push(node)
      draft.future = []
    })
  },

  deleteNode: (state: HistoryState, nodeId: string) => {
    return produce(state, (draft) => {
      draft.present.nodes = draft.present.nodes.filter((n) => n.id !== nodeId)
      draft.present.edges = draft.present.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      )
      draft.future = []
    })
  },

  updateNode: (state: HistoryState, nodeId: string, updates: Partial<CanvasNode>) => {
    return produce(state, (draft) => {
      const node = draft.present.nodes.find((n) => n.id === nodeId)
      if (node) {
        Object.assign(node, updates)
      }
      draft.future = []
    })
  },

  addEdge: (state: HistoryState, edge: CanvasEdge) => {
    return produce(state, (draft) => {
      draft.present.edges.push(edge)
      draft.future = []
    })
  },

  deleteEdge: (state: HistoryState, edgeId: string) => {
    return produce(state, (draft) => {
      draft.present.edges = draft.present.edges.filter((e) => e.id !== edgeId)
      draft.future = []
    })
  },

  undo: (state: HistoryState) => {
    if (state.past.length === 0) return state
    return produce(state, (draft) => {
      const newFuture = [draft.present, ...draft.future]
      draft.present = draft.past[draft.past.length - 1]
      draft.past = draft.past.slice(0, -1)
      draft.future = newFuture
    })
  },

  redo: (state: HistoryState) => {
    if (state.future.length === 0) return state
    return produce(state, (draft) => {
      const newPast = [...draft.past, draft.present]
      draft.present = draft.future[0]
      draft.future = draft.future.slice(1)
      draft.past = newPast.slice(-50)
    })
  },

  pushHistory: (state: HistoryState) => {
    return produce(state, (draft) => {
      draft.past.push(draft.present)
      draft.past = draft.past.slice(-50)
      draft.future = []
    })
  },
}

export const createInitialHistory = (): HistoryState => initialHistory
export const createInitialCanvasState = (): CanvasState => initialState
