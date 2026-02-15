import fs from "node:fs"
import path from "node:path"

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

function isDir(filePath) {
  try {
    return fs.statSync(filePath).isDirectory()
  } catch {
    return false
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function listFilesRecursive(rootDir) {
  /** @type {string[]} */
  const results = []
  /** @type {string[]} */
  const stack = [rootDir]
  while (stack.length) {
    const current = stack.pop()
    if (!current) continue
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile()) results.push(full)
    }
  }
  return results
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-evidence-manifest.mjs --task-id <Fxx-...> [options]

Options:
  --task-id <id>           Feature task id (e.g. F03-MH-09) (required)
  --workflow-id <id>       Workflow id (optional; used to auto-include matching filenames)
  --evidence-dir <dir>     Evidence directory (default: screehshots_evidence)
  --docs-scope <scope>     tasks|docs|none (default: tasks)
  --out <path>             Output manifest path (default: screehshots_evidence/evidence-manifest-<task>-<date>.json)
  --include-regex <re>     Additional include regex (can be repeated; matches relative path)

Behavior:
  - Includes any evidence paths referenced in docs (by default scans docs/tasks)
  - If --workflow-id is set, also includes any evidence files whose names contain that id
  - Writes a manifest with keep_paths[] used by scripts/cleanup-evidence.mjs
`)
}

function parseArgs(argv) {
  const args = {
    taskId: "",
    workflowId: "",
    evidenceDir: "screehshots_evidence",
    docsScope: "tasks",
    out: "",
    includeRegex: [],
  }

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--") continue
    if (a === "--task-id") args.taskId = argv[++i] || ""
    else if (a === "--workflow-id") args.workflowId = argv[++i] || ""
    else if (a === "--evidence-dir") args.evidenceDir = argv[++i] || ""
    else if (a === "--docs-scope") args.docsScope = argv[++i] || ""
    else if (a === "--out") args.out = argv[++i] || ""
    else if (a === "--include-regex") args.includeRegex.push(argv[++i] || "")
    else if (a === "-h" || a === "--help") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown arg: ${a}`)
    }
  }

  if (!args.taskId) throw new Error("--task-id is required")
  if (!["tasks", "docs", "none"].includes(args.docsScope)) {
    throw new Error(`--docs-scope must be one of: tasks, docs, none`)
  }

  return args
}

function extractEvidencePathsFromText(text) {
  /** @type {string[]} */
  const found = []
  const codeSpanRe = /`(screehshots_evidence\/[^`]+)`/g
  let m
  while ((m = codeSpanRe.exec(text))) {
    const cleaned = m[1].trim().replace(/[.,;:]+$/g, "")
    found.push(cleaned)
  }

  const bareRe = /screehshots_evidence\/[^\s`"')\]}>,]+/g
  while ((m = bareRe.exec(text))) {
    const cleaned = m[0].trim().replace(/[.,;:]+$/g, "")
    found.push(cleaned)
  }

  return found
}

function collectEvidencePathsFromDocs(rootDir, docsScope) {
  const keep = new Set()
  if (docsScope === "none") return keep

  const docsDir = path.join(rootDir, "docs")
  if (!isDir(docsDir)) return keep

  const scanRoot =
    docsScope === "tasks" ? path.join(docsDir, "tasks") : docsDir
  if (!isDir(scanRoot)) return keep

  const files = listFilesRecursive(scanRoot).filter((f) => f.endsWith(".md"))
  for (const f of files) {
    const text = readUtf8(f)
    for (const rel of extractEvidencePathsFromText(text)) keep.add(rel)
  }
  return keep
}

function safeIdForFilename(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "unknown"
}

function main() {
  const args = parseArgs(process.argv)
  const rootDir = process.cwd()
  const evidenceDirAbs = path.join(rootDir, args.evidenceDir)

  if (!isDir(evidenceDirAbs)) {
    throw new Error(`Evidence dir not found: ${args.evidenceDir}`)
  }

  /** @type {RegExp[]} */
  const includeRegex = args.includeRegex
    .filter(Boolean)
    .map((r) => new RegExp(r))

  const keepPaths = new Set()

  // 1) Keep anything referenced in docs (belt-and-suspenders).
  for (const p of collectEvidencePathsFromDocs(rootDir, args.docsScope)) keepPaths.add(p)

  // 2) If workflow id is provided, include any evidence files whose filenames contain it.
  if (args.workflowId) {
    const files = listFilesRecursive(evidenceDirAbs)
    for (const abs of files) {
      const rel = path.relative(rootDir, abs).replaceAll(path.sep, "/")
      const name = path.basename(abs)
      if (name.includes(args.workflowId)) keepPaths.add(rel)
      if (includeRegex.some((re) => re.test(rel))) keepPaths.add(rel)
    }
  } else if (includeRegex.length) {
    const files = listFilesRecursive(evidenceDirAbs)
    for (const abs of files) {
      const rel = path.relative(rootDir, abs).replaceAll(path.sep, "/")
      if (includeRegex.some((re) => re.test(rel))) keepPaths.add(rel)
    }
  }

  // 3) Always include the manifest itself once written.
  const date = new Date().toISOString().slice(0, 10)
  const outPath =
    args.out ||
    path.join(
      evidenceDirAbs,
      `evidence-manifest-${safeIdForFilename(args.taskId)}-${date}.json`
    )

  ensureDir(path.dirname(outPath))

  const sortedKeep = Array.from(keepPaths).sort()
  const manifest = {
    version: 1,
    task_id: args.taskId,
    workflow_id: args.workflowId || null,
    created_at: new Date().toISOString(),
    keep_paths: sortedKeep,
    note:
      "Generated manifest: union of docs-referenced evidence paths plus optional workflow-id filename matches.",
  }

  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n", "utf8")

  console.log(outPath)
  console.log(`keep_paths: ${sortedKeep.length}`)
}

main()
