import { NextResponse } from "next/server"

type ImportRequest = {
  input?: string
  preflight?: boolean
}

type CanvasState = {
  nodes: Array<{
    id: string
    data: { label: string; description: string; blockType: string }
    position: { x: number; y: number }
    type: "block"
  }>
  edges: Array<{ id: string; source: string; target: string }>
  viewport: { x: number; y: number; zoom: number }
}

type AssignmentPreview = {
  task_id: string
  task_label: string
  assigned_agent: string
}

type ParsedImport = {
  projectName: string
  summary: string
  tasks: string[]
}

type ImportedSnapshotFile = {
  path: string
  type: string
  language: string
  content: string
}

function parseImportInput(input: string): ParsedImport {
  const trimmed = input.trim()
  if (!trimmed) {
    return {
      projectName: "Imported Project",
      summary: "No details provided.",
      tasks: ["Review project requirements", "Set up starter implementation", "Validate output"],
    }
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const projectName =
      typeof parsed.name === "string"
        ? parsed.name
        : typeof parsed.title === "string"
          ? parsed.title
          : "Imported Project"
    const summary =
      typeof parsed.description === "string"
        ? parsed.description
        : typeof parsed.prompt === "string"
          ? parsed.prompt
          : trimmed.slice(0, 220)

    const tasksFromArray =
      Array.isArray(parsed.tasks) && parsed.tasks.every((task) => typeof task === "string")
        ? (parsed.tasks as string[]).slice(0, 8)
        : []

    const files =
      Array.isArray(parsed.files) && parsed.files.length > 0
        ? `Inspect ${Math.min(parsed.files.length, 200)} imported files`
        : null

    const tasks = [
      ...tasksFromArray,
      ...(files ? [files] : []),
      "Generate starter canvas from import",
      "Run assignment preview",
    ]
      .filter(Boolean)
      .slice(0, 8)

    return {
      projectName,
      summary: summary || "Imported project metadata.",
      tasks: tasks.length ? tasks : ["Generate starter canvas from import", "Run assignment preview"],
    }
  } catch {
    const lines = trimmed
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)

    const tasks = lines
      .filter((line) => line.length > 8)
      .slice(0, 6)
      .map((line) => line.replace(/^[-*]\s*/, ""))

    return {
      projectName: "Imported Project",
      summary: trimmed.slice(0, 220),
      tasks:
        tasks.length > 0
          ? tasks
          : ["Interpret project description", "Generate starter canvas", "Run assignment preview"],
    }
  }
}

function suggestAgent(task: string): string {
  const lower = task.toLowerCase()
  if (lower.includes("ui") || lower.includes("frontend") || lower.includes("react")) {
    return "frontend-agent"
  }
  if (lower.includes("api") || lower.includes("backend") || lower.includes("server")) {
    return "backend-agent"
  }
  if (lower.includes("database") || lower.includes("sql") || lower.includes("schema")) {
    return "data-agent"
  }
  if (lower.includes("test") || lower.includes("validate")) {
    return "qa-agent"
  }
  if (lower.includes("deploy") || lower.includes("release")) {
    return "devops-agent"
  }
  return "generalist-agent"
}

function buildImportedCanvas(parsed: ParsedImport): {
  canvas: CanvasState
  assignmentPreview: AssignmentPreview[]
  importedFiles: ImportedSnapshotFile[]
} {
  const base = Date.now()
  const introId = `node-${base}-intro`
  const tasksRootId = `node-${base}-tasks-root`

  const nodes: CanvasState["nodes"] = [
    {
      id: introId,
      type: "block",
      data: {
        label: `Import: ${parsed.projectName}`,
        description: parsed.summary,
        blockType: "text",
      },
      position: { x: 80, y: 120 },
    },
    {
      id: tasksRootId,
      type: "block",
      data: {
        label: "Imported Task Decomposition",
        description: "Starter tasks mapped from imported project context",
        blockType: "parallel",
      },
      position: { x: 360, y: 120 },
    },
  ]

  const edges: CanvasState["edges"] = [
    {
      id: `edge-${introId}-${tasksRootId}`,
      source: introId,
      target: tasksRootId,
    },
  ]

  const assignmentPreview: AssignmentPreview[] = []
  parsed.tasks.forEach((task, index) => {
    const taskId = `node-${base}-task-${index + 1}`
    const assignedAgent = suggestAgent(task)

    nodes.push({
      id: taskId,
      type: "block",
      data: {
        label: `Task ${index + 1}`,
        description: task,
        blockType: "task",
      },
      position: { x: 700, y: 80 + index * 120 },
    })

    edges.push({
      id: `edge-${tasksRootId}-${taskId}`,
      source: tasksRootId,
      target: taskId,
    })

    assignmentPreview.push({
      task_id: taskId,
      task_label: `Task ${index + 1}`,
      assigned_agent: assignedAgent,
    })
  })

  const importedFiles: ImportedSnapshotFile[] = [
    {
      path: "README.md",
      type: "markdown",
      language: "markdown",
      content: `# ${parsed.projectName}\n\n${parsed.summary}\n`,
    },
    ...parsed.tasks.map((task, index) => ({
      path: `tasks/task-${index + 1}.md`,
      type: "markdown",
      language: "markdown",
      content: `# Task ${index + 1}\n\n${task}\n`,
    })),
  ]

  return {
    canvas: {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    assignmentPreview,
    importedFiles,
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ImportRequest
    const input = body?.input ?? ""
    if (typeof input !== "string") {
      return NextResponse.json({ error: "Import input must be a string." }, { status: 400 })
    }
    if (!input.trim()) {
      return NextResponse.json({ error: "Import input is required." }, { status: 400 })
    }

    const startedAt = Date.now()
    const parsed = parseImportInput(input)
    if (body?.preflight) {
      return NextResponse.json({
        preflight: true,
        project_name: parsed.projectName,
        summary: parsed.summary,
        tasks_preview: parsed.tasks,
        duration_ms: Date.now() - startedAt,
      })
    }
    const { canvas, assignmentPreview, importedFiles } = buildImportedCanvas(parsed)
    const durationMs = Date.now() - startedAt

    const origin = new URL(req.url).origin
    await fetch(`${origin}/api/code-explorer/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "imported",
        files: importedFiles,
      }),
    }).catch(() => null)

    return NextResponse.json({
      canvas,
      assignment_preview: assignmentPreview,
      source: "deterministic-import",
      project_name: parsed.projectName,
      duration_ms: durationMs,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed." },
      { status: 500 }
    )
  }
}
