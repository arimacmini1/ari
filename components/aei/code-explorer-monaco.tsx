"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type MonacoEditorInstance = {
  dispose: () => void
  setValue: (value: string) => void
  layout: () => void
  saveViewState: () => unknown
  restoreViewState: (state: unknown) => void
  getModel: () => unknown
}

type MonacoModule = {
  editor: {
    create: (
      element: HTMLElement,
      options: Record<string, unknown>
    ) => MonacoEditorInstance
    setModelLanguage: (model: unknown, languageId: string) => void
  }
}

type AmdRequire = {
  (deps: string[], onLoad: (monaco: MonacoModule) => void): void
  config: (config: { paths: { vs: string } }) => void
}

declare global {
  interface Window {
    require?: AmdRequire
    __aeiMonaco?: MonacoModule
    __aeiMonacoPromise?: Promise<MonacoModule>
    MonacoEnvironment?: {
      getWorkerUrl?: (moduleId: string, label: string) => string
    }
  }
}

const MONACO_BASE_URL = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs"
const LARGE_FILE_THRESHOLD = 250_000
const monacoViewStateByPath = new Map<string, unknown>()

function inferMonacoLanguage(path: string, fileLanguage?: string): string {
  const lowered = path.toLowerCase()
  if (lowered.endsWith("/dockerfile") || lowered.endsWith("dockerfile")) return "dockerfile"

  const extension = lowered.split(".").pop()
  if (!extension) return fileLanguage || "plaintext"

  if (extension === "ts") return "typescript"
  if (extension === "tsx") return "typescript"
  if (extension === "js") return "javascript"
  if (extension === "jsx") return "javascript"
  if (extension === "json") return "json"
  if (extension === "py") return "python"
  if (extension === "sql") return "sql"
  if (extension === "md") return "markdown"
  if (extension === "html") return "html"
  if (extension === "css") return "css"
  if (extension === "yml" || extension === "yaml") return "yaml"
  if (extension === "sh") return "shell"

  return fileLanguage || "plaintext"
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`) as
      | HTMLScriptElement
      | null
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve()
        return
      }
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Failed to load script.")), {
        once: true,
      })
      return
    }

    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.dataset.src = src
    script.addEventListener("load", () => {
      script.dataset.loaded = "true"
      resolve()
    })
    script.addEventListener("error", () => reject(new Error("Failed to load script.")))
    document.head.appendChild(script)
  })
}

async function loadMonaco(): Promise<MonacoModule> {
  if (window.__aeiMonaco) return window.__aeiMonaco
  if (window.__aeiMonacoPromise) return window.__aeiMonacoPromise

  window.__aeiMonacoPromise = (async () => {
    await loadScript(`${MONACO_BASE_URL}/loader.js`)

    const amdRequire = window.require
    if (!amdRequire) {
      throw new Error("Monaco loader unavailable in this browser context.")
    }

    amdRequire.config({ paths: { vs: MONACO_BASE_URL } })
    window.MonacoEnvironment = {
      getWorkerUrl: () => {
        const workerSrc = [
          `self.MonacoEnvironment = { baseUrl: '${MONACO_BASE_URL}/' };`,
          `importScripts('${MONACO_BASE_URL}/base/worker/workerMain.js');`,
        ].join("")
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(workerSrc)}`
      },
    }

    return await new Promise<MonacoModule>((resolve, reject) => {
      try {
        amdRequire(["vs/editor/editor.main"], (monaco) => {
          window.__aeiMonaco = monaco
          resolve(monaco)
        })
      } catch (error) {
        reject(error)
      }
    })
  })()

  return window.__aeiMonacoPromise
}

interface CodeExplorerMonacoProps {
  path: string
  content: string
  language?: string
}

export function CodeExplorerMonaco({ path, content, language }: CodeExplorerMonacoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<MonacoEditorInstance | null>(null)

  const [editorStatus, setEditorStatus] = useState<"loading" | "ready" | "error">("loading")
  const [editorError, setEditorError] = useState<string | null>(null)
  const [allowLarge, setAllowLarge] = useState<Set<string>>(new Set())

  const isLargeFile = content.length > LARGE_FILE_THRESHOLD && !allowLarge.has(path)
  const languageId = useMemo(() => inferMonacoLanguage(path, language), [language, path])

  useEffect(() => {
    const onResize = () => {
      editorRef.current?.layout()
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || isLargeFile) return
    let cancelled = false
    setEditorStatus("loading")
    setEditorError(null)

    loadMonaco()
      .then((monaco) => {
        if (cancelled || !containerRef.current) return

        editorRef.current = monaco.editor.create(containerRef.current, {
          value: content,
          language: languageId,
          readOnly: true,
          minimap: { enabled: false },
          automaticLayout: true,
          fontSize: 12,
          wordWrap: "on",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          renderWhitespace: "selection",
          tabSize: 2,
          insertSpaces: true,
          theme: "vs-dark",
        })

        const editor = editorRef.current
        if (!editor) return

        const model = editor.getModel()
        if (model) {
          monaco.editor.setModelLanguage(model, languageId)
        }

        const savedViewState = monacoViewStateByPath.get(path)
        if (savedViewState) {
          editor.restoreViewState(savedViewState)
        }
        editor.layout()

        setEditorStatus("ready")
      })
      .catch((error) => {
        if (cancelled) return
        setEditorStatus("error")
        setEditorError(
          error instanceof Error ? error.message : "Failed to initialize Monaco editor."
        )
      })

    return () => {
      cancelled = true
      if (editorRef.current) {
        monacoViewStateByPath.set(path, editorRef.current.saveViewState())
        editorRef.current.dispose()
        editorRef.current = null
      }
    }
  }, [content, isLargeFile, languageId, path])

  if (isLargeFile) {
    return (
      <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
        <div>This file is large and deferred to avoid UI freezes.</div>
        <div className="mt-1">
          File size: {(content.length / 1024).toFixed(1)} KB (threshold:{" "}
          {(LARGE_FILE_THRESHOLD / 1024).toFixed(0)} KB)
        </div>
        <button
          type="button"
          className="mt-3 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary/40"
          onClick={() => {
            setAllowLarge((prev) => {
              const next = new Set(prev)
              next.add(path)
              return next
            })
          }}
        >
          Load file anyway
        </button>
      </div>
    )
  }

  if (editorStatus === "error") {
    return (
      <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
        {editorError || "Failed to load Monaco editor."}
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[360px] w-full">
      {editorStatus === "loading" ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60 text-xs text-muted-foreground">
          Loading Monaco editor...
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full overflow-hidden rounded-sm" />
    </div>
  )
}
