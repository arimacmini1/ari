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

type GithubRef = {
  owner: string
  repo: string
  branch?: string
}

const MAX_IMPORTED_FILES = 180
const MAX_FILE_SIZE_BYTES = 200_000
const EXCLUDED_PATH_SEGMENTS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  ".turbo",
  ".cache",
  "vendor",
  "target",
  "bin",
  "obj",
])

const EXCLUDED_FILE_SUFFIXES = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".7z",
  ".mp4",
  ".mp3",
  ".mov",
  ".avi",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".lock",
]

function parseGithubUrl(input: string): GithubRef | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (!trimmed.includes("github.com/")) return null

  try {
    const url = new URL(trimmed)
    if (url.hostname !== "github.com") return null
    const parts = url.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return null
    const owner = parts[0]
    const repo = parts[1].replace(/\.git$/, "")
    if (!owner || !repo) return null
    const treeIndex = parts.findIndex((p) => p === "tree")
    const branch =
      treeIndex >= 0 && parts.length > treeIndex + 1 ? decodeURIComponent(parts[treeIndex + 1]) : undefined
    return { owner, repo, branch }
  } catch {
    return null
  }
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  return {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function shouldExcludePath(path: string): boolean {
  const lower = path.toLowerCase()
  if (EXCLUDED_FILE_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return true
  const segments = lower.split("/")
  return segments.some((segment) => EXCLUDED_PATH_SEGMENTS.has(segment))
}

function inferLanguage(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith(".ts")) return "typescript"
  if (lower.endsWith(".tsx")) return "tsx"
  if (lower.endsWith(".js")) return "javascript"
  if (lower.endsWith(".jsx")) return "jsx"
  if (lower.endsWith(".py")) return "python"
  if (lower.endsWith(".go")) return "go"
  if (lower.endsWith(".rs")) return "rust"
  if (lower.endsWith(".java")) return "java"
  if (lower.endsWith(".rb")) return "ruby"
  if (lower.endsWith(".php")) return "php"
  if (lower.endsWith(".cs")) return "csharp"
  if (lower.endsWith(".sql")) return "sql"
  if (lower.endsWith(".json")) return "json"
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "yaml"
  if (lower.endsWith(".md")) return "markdown"
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html"
  if (lower.endsWith(".css")) return "css"
  if (lower.endsWith(".sh")) return "shell"
  return "text"
}

function inferType(path: string): string {
  const lang = inferLanguage(path)
  if (lang === "markdown") return "markdown"
  if (lang === "json") return "json"
  if (lang === "sql") return "sql"
  if (lang === "yaml") return "config"
  if (lang === "html") return "html"
  return "code"
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  const inFlight: Promise<void>[] = []

  for (const item of items) {
    const task = (async () => {
      const mapped = await mapper(item)
      results.push(mapped)
    })()
    inFlight.push(task)
    if (inFlight.length >= limit) {
      await Promise.race(inFlight).catch(() => null)
      for (let i = inFlight.length - 1; i >= 0; i--) {
        // Remove settled promises.
        if ((inFlight[i] as unknown as { status?: string }).status) {
          inFlight.splice(i, 1)
        }
      }
    }
  }

  await Promise.allSettled(inFlight)
  return results
}

function buildGithubTasks(files: ImportedSnapshotFile[], projectName: string): string[] {
  const paths = files.map((f) => f.path.toLowerCase())
  const tasks: string[] = []
  if (paths.some((p) => p.includes("test") || p.endsWith(".spec.ts") || p.endsWith(".test.ts"))) {
    tasks.push("Run and fix failing tests")
  }
  if (paths.some((p) => p.includes("migrations") || p.endsWith(".sql"))) {
    tasks.push("Review and validate database migration flow")
  }
  if (paths.some((p) => p.includes("api") || p.includes("routes") || p.includes("controllers"))) {
    tasks.push("Audit API handlers and error paths")
  }
  if (paths.some((p) => p.endsWith("dockerfile") || p.includes("deploy") || p.includes(".github/workflows"))) {
    tasks.push("Check build and deployment configuration")
  }
  tasks.push(`Inspect imported repository: ${projectName}`)
  tasks.push("Generate starter canvas from imported repository")
  tasks.push("Run assignment preview")
  return Array.from(new Set(tasks)).slice(0, 8)
}

async function importGithubProject(ref: GithubRef): Promise<{
  projectName: string
  summary: string
  tasks: string[]
  files: ImportedSnapshotFile[]
  commitSha?: string
  resolvedBranch: string
}> {
  const headers = githubHeaders()
  const repoResp = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}`, { headers })
  if (!repoResp.ok) {
    throw new Error(`GitHub repo lookup failed (${repoResp.status}).`)
  }
  const repoData = (await repoResp.json()) as {
    full_name: string
    description?: string | null
    default_branch: string
    private?: boolean
  }
  const branch = ref.branch || repoData.default_branch

  const treeResp = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers }
  )
  if (!treeResp.ok) {
    throw new Error(`GitHub tree fetch failed (${treeResp.status}).`)
  }
  const treeData = (await treeResp.json()) as {
    tree?: Array<{ path: string; type: string; size?: number; sha: string }>
    truncated?: boolean
  }

  const blobs = (treeData.tree || [])
    .filter((entry) => entry.type === "blob")
    .filter((entry) => !shouldExcludePath(entry.path))
    .filter((entry) => (entry.size ?? 0) <= MAX_FILE_SIZE_BYTES)
    .slice(0, MAX_IMPORTED_FILES)

  const fileResults = await mapWithConcurrency(blobs, 8, async (entry) => {
    const blobResp = await fetch(
      `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/blobs/${entry.sha}`,
      { headers }
    )
    if (!blobResp.ok) return null
    const blobData = (await blobResp.json()) as { content?: string; encoding?: string }
    if (!blobData.content || blobData.encoding !== "base64") return null
    const decoded = Buffer.from(blobData.content.replace(/\n/g, ""), "base64").toString("utf8")
    return {
      path: entry.path,
      type: inferType(entry.path),
      language: inferLanguage(entry.path),
      content: decoded,
    } as ImportedSnapshotFile
  })

  const files = fileResults.filter((file): file is ImportedSnapshotFile => Boolean(file))
  const summaryParts = [
    repoData.description || "GitHub repository import.",
    `Imported ${files.length} files from ${repoData.full_name}@${branch}.`,
    treeData.truncated ? "GitHub tree response was truncated by API limits." : null,
  ].filter(Boolean)

  const tasks = buildGithubTasks(files, repoData.full_name)

  // Fetch commit SHA for the resolved branch
  const refResp = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    { headers }
  ).catch(() => null)
  const commitSha = refResp?.ok
    ? ((await refResp.json()) as { object?: { sha?: string } }).object?.sha
    : undefined

  return {
    projectName: repoData.full_name,
    summary: summaryParts.join(" "),
    tasks,
    files,
    commitSha,
    resolvedBranch: branch,
  }
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
    const githubRef = parseGithubUrl(input)
    const githubImport = githubRef ? await importGithubProject(githubRef) : null
    const parsed = githubImport
      ? {
          projectName: githubImport.projectName,
          summary: githubImport.summary,
          tasks: githubImport.tasks,
        }
      : parseImportInput(input)
    if (body?.preflight) {
      return NextResponse.json({
        preflight: true,
        project_name: parsed.projectName,
        summary: parsed.summary,
        tasks_preview: parsed.tasks,
        imported_file_count: githubImport?.files.length ?? undefined,
        source: githubImport ? "github-import" : "deterministic-import",
        duration_ms: Date.now() - startedAt,
      })
    }
    const { canvas, assignmentPreview, importedFiles } = buildImportedCanvas(parsed)
    const finalImportedFiles = githubImport?.files?.length ? githubImport.files : importedFiles
    const durationMs = Date.now() - startedAt

    const origin = new URL(req.url).origin
    const projectId = req.headers.get("x-project-id") ||
      req.headers.get("cookie")?.match(/aei_active_project_id=([^;]+)/)?.[1] ||
      undefined
    await fetch(`${origin}/api/code-explorer/snapshot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(projectId ? { "x-project-id": projectId } : {}),
      },
      body: JSON.stringify({
        source: "imported",
        files: finalImportedFiles,
      }),
    }).catch(() => null)

    return NextResponse.json({
      canvas,
      assignment_preview: assignmentPreview,
      source: githubImport ? "github-import" : "deterministic-import",
      project_name: parsed.projectName,
      imported_file_count: finalImportedFiles.length,
      duration_ms: durationMs,
      repo_url: githubRef ? `https://github.com/${githubRef.owner}/${githubRef.repo}` : undefined,
      repo_branch: githubImport?.resolvedBranch,
      repo_commit: githubImport?.commitSha,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed." },
      { status: 500 }
    )
  }
}
