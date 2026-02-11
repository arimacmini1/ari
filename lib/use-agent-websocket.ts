/**
 * WebSocket Hook for Real-Time Agent Updates
 * Subscribes to agent status/metrics updates via WebSocket
 * Handles reconnection, message buffering, and subscriptions
 */

import { useEffect, useRef, useCallback, useState } from "react"
import { Agent } from "@/lib/agent-tree"

/**
 * Mock WebSocket for development
 * Simulates server-sent agent updates since Next.js serverless doesn't support WebSocket upgrade
 */
function createMockWebSocket(url: string): WebSocket {
  let _readyState = WebSocket.CONNECTING
  const subscriptions = new Set<string>()
  let updateInterval: NodeJS.Timeout | null = null

  const mockWs: any = {
    get readyState() { return _readyState },
    url,
    protocol: "",
    bufferedAmount: 0,
    extensions: "",
    binaryType: "blob" as BinaryType,
    onopen: null as ((ev: Event) => void) | null,
    onclose: null as ((ev: CloseEvent) => void) | null,
    onmessage: null as ((ev: MessageEvent) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,

    send(data: string) {
      try {
        const message = JSON.parse(data)
        if (message.type === "subscribe") {
          subscriptions.add(message.pattern)
          console.log("[MockWebSocket] Subscribed to:", message.pattern)
        } else if (message.type === "unsubscribe") {
          subscriptions.delete(message.pattern)
          console.log("[MockWebSocket] Unsubscribed from:", message.pattern)
        }
      } catch (e) {
        console.error("[MockWebSocket] Failed to parse message:", e)
      }
    },

    close() {
      _readyState = WebSocket.CLOSED
      if (updateInterval) {
        clearInterval(updateInterval)
      }
    },

    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false },
  }

  // Simulate connection opening after a brief delay
  setTimeout(() => {
    _readyState = WebSocket.OPEN
    if (mockWs.onopen) {
      mockWs.onopen({ type: "open" } as Event)
    }

    // Start simulating agent updates
    const statuses = ["idle", "processing", "waiting", "complete", "error"]
    const agentIds = Array.from({ length: 20 }, (_, i) => `agent-${i + 1}`)
    let sequenceId = 0

    updateInterval = setInterval(() => {
      if (_readyState !== WebSocket.OPEN) return
      if (subscriptions.size === 0) return

      const randomAgent = agentIds[Math.floor(Math.random() * agentIds.length)]
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]

      sequenceId++

      const update = {
        type: "agent_update",
        agent_id: randomAgent,
        status: randomStatus,
        metrics: {
          cpu: Math.random() * 100,
          memory: Math.random() * 80,
          tokensPerMin: Math.random() * 500,
          cost: Math.random() * 50,
        },
        timestamp: Date.now(),
        sequenceId,
      }

      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify(update),
          type: "message",
        } as MessageEvent)
      }
    }, 2000)
  }, 100)

  return mockWs as WebSocket
}

export interface AgentUpdate {
  agent_id: string
  status?: Agent["status"]
  metrics?: {
    cpu?: number
    memory?: number
    tokensPerMin?: number
    cost?: number
  }
  timestamp: number
}

export interface WebSocketOptions {
  url?: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useAgentWebSocket(options: WebSocketOptions = {}) {
  const {
    url = typeof window !== "undefined" && window.location ? `ws://${window.location.host}/api/ws` : undefined,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const messageQueueRef = useRef<AgentUpdate[]>([])
  const subscriptionsRef = useRef<Set<string>>(new Set())
  const lastSequenceRef = useRef(0)

  const isConnectedRef = useRef(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<AgentUpdate | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!url || wsRef.current?.readyState === WebSocket.OPEN || isConnectedRef.current) {
      return
    }

    try {
      // Next.js serverless doesn't support WebSocket upgrade
      // Always use mock until a dedicated WS server is available
      // When ready for real WS, set NEXT_PUBLIC_WS_URL in .env.local
      const realWsUrl = typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_WS_URL
        : undefined
      const ws = realWsUrl
        ? new WebSocket(realWsUrl)
        : createMockWebSocket(url || "ws://mock")

      ws.onopen = () => {
        console.log("[WebSocket] Connected")
        isConnectedRef.current = true
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0

        // Resubscribe to existing subscriptions
        subscriptionsRef.current.forEach((pattern) => {
          ws.send(
            JSON.stringify({
              type: "subscribe",
              pattern,
              lastSequenceId: lastSequenceRef.current,
            })
          )
        })

        // Flush queued messages
        while (messageQueueRef.current.length > 0) {
          const msg = messageQueueRef.current.shift()
          if (msg) {
            setLastUpdate(msg)
          }
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === "agent_update") {
            const update: AgentUpdate = {
              agent_id: data.agent_id,
              status: data.status,
              metrics: data.metrics,
              timestamp: data.timestamp || Date.now(),
            }

            // Update last sequence for reconnection
            if (data.sequenceId) {
              lastSequenceRef.current = Math.max(lastSequenceRef.current, data.sequenceId)
            }

            // If not connected, queue the update; otherwise apply immediately
            if (!isConnectedRef.current) {
              messageQueueRef.current.push(update)
            } else {
              setLastUpdate(update)
            }
          } else if (data.type === "error") {
            console.error("[WebSocket] Error from server:", data.message)
            setError(data.message)
          }
        } catch (e) {
          console.error("[WebSocket] Failed to parse message:", e)
        }
      }

      ws.onerror = (event) => {
        console.error("[WebSocket] Error:", event)
        setError("WebSocket connection error")
      }

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected")
        isConnectedRef.current = false
        setIsConnected(false)

        // Attempt reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1)
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)
          setTimeout(() => connect(), delay)
        } else {
          setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`)
        }
      }

      wsRef.current = ws
    } catch (e) {
      console.error("[WebSocket] Connection error:", e)
      setError(String(e))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, reconnectInterval, maxReconnectAttempts])

  // Subscribe to agent updates
  const subscribe = useCallback(
    (pattern: string) => {
      subscriptionsRef.current.add(pattern)

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "subscribe",
            pattern,
            lastSequenceId: lastSequenceRef.current,
          })
        )
      }
    },
    []
  )

  // Unsubscribe from agent updates
  const unsubscribe = useCallback((pattern: string) => {
    subscriptionsRef.current.delete(pattern)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "unsubscribe",
          pattern,
        })
      )
    }
  }, [])

  // Cleanup and auto-connect
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      wsRef.current?.close()
    }
  }, [autoConnect, connect])

  return {
    isConnected,
    lastUpdate,
    error,
    connect,
    subscribe,
    unsubscribe,
  }
}
