// F12-MH-02: Code Explorer snapshot normalization utilities
// See: /docs/tasks/feature-12-code-explorer.md

import type { Artifact } from "@/lib/artifact-model"

export interface CodeExplorerFile {
  path: string
  type: string
  language?: string
  size: number
  content: string
}

export interface CodeExplorerSnapshot {
  snapshot_id: string
  source: "generated" | "imported"
  root: string
  generated_at: string
  files: CodeExplorerFile[]
}

export interface ImportedSnapshotFileInput {
  path: string
  type?: string
  language?: string
  content: string
}

function inferExtension(artifact: Artifact): string {
  switch (artifact.type) {
    case "code":
      if (artifact.language === "python") return "py"
      if (artifact.language === "typescript") return "ts"
      return "js"
    case "html":
      return "html"
    case "json":
      return "json"
    case "sql":
      return "sql"
    case "config":
      return "yml"
    case "test":
      return "test.js"
    case "markdown":
      return "md"
    case "svg":
      return "svg"
    case "dockerfile":
      return "Dockerfile"
    case "yaml":
      return "yml"
    default:
      return "txt"
  }
}

export function sanitizePath(input: string): string {
  const unified = input.replace(/\\/g, "/")
  const parts = unified.split("/").filter(Boolean)
  const safe = parts.filter((segment) => segment !== "." && segment !== "..")
  return safe.join("/")
}

function createArtifactPath(artifact: Artifact, index: number): string {
  const extension = inferExtension(artifact)
  const version = artifact.metadata.version_id.replace(/[^a-zA-Z0-9_-]/g, "")
  const languageOrType = artifact.language || artifact.type

  if (extension === "Dockerfile") {
    return sanitizePath(`generated/${artifact.type}/${languageOrType}/${index}-${version}/Dockerfile`)
  }

  return sanitizePath(
    `generated/${artifact.type}/${languageOrType}/${index}-${version}.${extension}`
  )
}

export function normalizeArtifactsToSnapshot(artifacts: Artifact[]): CodeExplorerSnapshot {
  const files: CodeExplorerFile[] = artifacts.map((artifact, index) => ({
    path: createArtifactPath(artifact, index),
    type: artifact.type,
    language: artifact.language,
    size: artifact.metadata.size,
    content: artifact.content,
  }))

  return {
    snapshot_id: `snapshot-${Date.now()}`,
    source: "generated",
    root: "generated",
    generated_at: new Date().toISOString(),
    files,
  }
}

export function normalizeImportedFilesToSnapshot(
  filesInput: ImportedSnapshotFileInput[]
): CodeExplorerSnapshot {
  const files: CodeExplorerFile[] = filesInput
    .filter((file) => typeof file.path === "string" && typeof file.content === "string")
    .map((file) => {
      const normalized = sanitizePath(file.path)
      const withRoot = normalized.startsWith("imported/")
        ? normalized
        : sanitizePath(`imported/${normalized}`)

      return {
        path: withRoot || `imported/file-${Date.now()}.txt`,
        type: file.type || "code",
        language: file.language,
        size: new TextEncoder().encode(file.content).length,
        content: file.content,
      }
    })

  return {
    snapshot_id: `snapshot-${Date.now()}`,
    source: "imported",
    root: "imported",
    generated_at: new Date().toISOString(),
    files,
  }
}
