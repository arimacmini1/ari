"use client"

import { useEffect, useRef, useState } from "react"

interface CodeExplorerCoderProps {
  path: string
  content: string
}

const CODE_SERVER_URL = "http://127.0.0.1:8080"
const PROJECT_PATH = "/Users/ari_mac_mini/Desktop/ari"

export function CodeExplorerCoder({ content }: CodeExplorerCoderProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Check if code-server is ready by polling
    const checkServer = async () => {
      try {
        const res = await fetch(CODE_SERVER_URL, { method: "HEAD" })
        return res.ok
      } catch {
        return false
      }
    }

    const interval = setInterval(async () => {
      const isReady = await checkServer()
      if (isReady) {
        clearInterval(interval)
        setLoaded(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Build the code-server URL - open the project folder
  const coderUrl = `${CODE_SERVER_URL}/?folder=${encodeURIComponent(PROJECT_PATH)}`

  if (error) {
    return (
      <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
        Failed to load code-server. Is it running?
        <button
          type="button"
          className="mt-2 block rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary/40"
          onClick={() => setError(false)}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[360px] w-full">
      {!loaded ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60 text-xs text-muted-foreground">
          Loading code-server...
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        src={coderUrl}
        className="h-full w-full overflow-hidden rounded-sm border-0"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
        onError={() => setError(true)}
      />
    </div>
  )
}
