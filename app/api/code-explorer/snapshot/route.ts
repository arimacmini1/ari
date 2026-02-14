import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { Artifact } from "@/lib/artifact-model"
import { resolveProjectScope } from "@/lib/project-scope"
import {
  normalizeArtifactsToSnapshot,
  normalizeImportedFilesToSnapshot,
  type ImportedSnapshotFileInput,
  type CodeExplorerSnapshot,
} from "@/lib/code-explorer-snapshot"

const snapshotsByProject = new Map<string, Record<"generated" | "imported", CodeExplorerSnapshot | null>>()

function getProjectSnapshots(projectId: string): Record<"generated" | "imported", CodeExplorerSnapshot | null> {
  const existing = snapshotsByProject.get(projectId)
  if (existing) return existing

  const created: Record<"generated" | "imported", CodeExplorerSnapshot | null> = {
    generated: null,
    imported: null,
  }
  snapshotsByProject.set(projectId, created)
  return created
}

const postBodySchema = z.object({
  source: z.enum(["generated", "imported"]).default("generated"),
  artifacts: z.array(z.any()).default([]),
  files: z.array(z.any()).default([]),
})

export async function GET(req: NextRequest) {
  const scope = resolveProjectScope(req)
  if (!scope.ok) {
    return scope.response
  }

  const activeProjectId = scope.projectId ?? "project-default"
  const sourceParam = req.nextUrl.searchParams.get("source")
  const source: "generated" | "imported" =
    sourceParam === "imported" ? "imported" : "generated"
  const snapshot = getProjectSnapshots(activeProjectId)[source]

  if (!snapshot) {
    return NextResponse.json(
      { error: `No ${source} codebase snapshot available yet for project ${activeProjectId}.` },
      { status: 404 }
    )
  }

  return NextResponse.json({ snapshot, project_id: activeProjectId }, { status: 200 })
}

export async function POST(req: NextRequest) {
  try {
    const scope = resolveProjectScope(req)
    if (!scope.ok) {
      return scope.response
    }

    const activeProjectId = scope.projectId ?? "project-default"
    const projectSnapshots = getProjectSnapshots(activeProjectId)
    const body = await req.json()
    const parsed = postBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid snapshot payload." },
        { status: 400 }
      )
    }

    const artifacts = parsed.data.artifacts as Artifact[]
    const files = parsed.data.files as ImportedSnapshotFileInput[]
    if (parsed.data.source === "generated") {
      projectSnapshots.generated = normalizeArtifactsToSnapshot(artifacts)
    } else {
      projectSnapshots.imported = normalizeImportedFilesToSnapshot(files)
    }

    return NextResponse.json(
      { snapshot: projectSnapshots[parsed.data.source], project_id: activeProjectId },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Snapshot save failed." },
      { status: 500 }
    )
  }
}
