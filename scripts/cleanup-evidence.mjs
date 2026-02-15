import fs from "node:fs"
import path from "node:path"

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function readJson(filePath) {
  return JSON.parse(stripBom(readUtf8(filePath)))
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
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.isFile()) {
        results.push(full)
      }
    }
  }
  return results
}

function parseArgs(argv) {
  const args = {
    apply: false,
    delete: false,
    allowNoManifest: false,
    failIfDrop: false,
    evidenceDir: "screehshots_evidence",
    docsScope: "tasks", // "tasks" | "docs" | "none"
    trashDir: "_trash",
    keepRegex: [],
    verbose: false,
  }

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--") continue
    if (a === "--apply") args.apply = true
    else if (a === "--delete") args.delete = true
    else if (a === "--allow-no-manifest") args.allowNoManifest = true
    else if (a === "--fail-if-drop") args.failIfDrop = true
    else if (a === "--verbose") args.verbose = true
    else if (a === "--evidence-dir") args.evidenceDir = argv[++i]
    else if (a === "--docs-scope") args.docsScope = argv[++i]
    else if (a === "--trash-dir") args.trashDir = argv[++i]
    else if (a === "--keep-regex") args.keepRegex.push(argv[++i])
    else if (a === "-h" || a === "--help") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown arg: ${a}`)
    }
  }

  if (!["tasks", "docs", "none"].includes(args.docsScope)) {
    throw new Error(`--docs-scope must be one of: tasks, docs, none`)
  }

  return args
}

function printHelp() {
  // Keep in sync with usage expectations: safe-by-default.
  console.log(`Usage:
  node scripts/cleanup-evidence.mjs [options]

Safe defaults:
  - Dry-run (no deletion/move) unless you pass --apply
  - Moves files to trash (not delete) unless you pass --delete
  - Keeps anything referenced by docs (by default scans docs/tasks)
  - Refuses to apply if no evidence manifests exist (override with --allow-no-manifest)

Options:
  --apply                 Actually move/delete files (default: dry-run)
  --delete                Permanently delete (default: move to trash)
  --allow-no-manifest     Allow --apply with zero manifests (NOT recommended)
  --fail-if-drop          Exit non-zero if any files would be dropped
  --evidence-dir <dir>    Evidence directory (default: screehshots_evidence)
  --docs-scope <scope>    tasks|docs|none (default: tasks)
  --trash-dir <dir>       Trash folder under evidence dir (default: _trash)
  --keep-regex <re>       Additional keep pattern (can be repeated)
  --verbose               Print per-file decisions
`)
}

function extractEvidencePathsFromText(text) {
  /** @type {string[]} */
  const found = []
  // Prefer markdown code spans, which can include spaces in filenames.
  const codeSpanRe = /`(screehshots_evidence\/[^`]+)`/g
  let m
  while ((m = codeSpanRe.exec(text))) {
    const cleaned = m[1].trim().replace(/[.,;:]+$/g, "")
    found.push(cleaned)
  }

  // Fallback: bare paths without spaces.
  const bareRe = /screehshots_evidence\/[^\s`"')\]}>,]+/g
  while ((m = bareRe.exec(text))) {
    const cleaned = m[0].trim().replace(/[.,;:]+$/g, "")
    found.push(cleaned)
  }

  return found
}

function collectKeepFromDocs(rootDir, docsScope) {
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

function collectKeepFromManifests(rootDir, evidenceDirRel) {
  const keepPathsSet = new Set()
  const evidenceDir = path.join(rootDir, evidenceDirRel)
  if (!isDir(evidenceDir)) return { keepPaths: keepPathsSet, manifestCount: 0 }

  const manifests = fs
    .readdirSync(evidenceDir)
    .filter((n) => n.startsWith("evidence-manifest") && n.endsWith(".json"))
    .map((n) => path.join(evidenceDir, n))

  for (const mf of manifests) {
    try {
      const data = readJson(mf)
      const keepList = Array.isArray(data.keep_paths) ? data.keep_paths : []
      for (const p of keepList) {
        if (typeof p !== "string" || !p.trim()) continue
        keepPathsSet.add(p.trim())
      }
    } catch {
      // Ignore invalid manifests; they should never cause deletion.
    }
  }

  return { keepPaths: keepPathsSet, manifestCount: manifests.length }
}

function isUnderDir(child, parent) {
  const rel = path.relative(parent, child)
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}

function moveToTrash(fromPath, trashRoot, rootDir) {
  const rel = path.relative(rootDir, fromPath)
  const toPath = path.join(trashRoot, rel)
  ensureDir(path.dirname(toPath))
  try {
    fs.renameSync(fromPath, toPath)
    return toPath
  } catch {
    // Cross-device or permission issues: fallback to copy+unlink.
    fs.copyFileSync(fromPath, toPath)
    fs.unlinkSync(fromPath)
    return toPath
  }
}

function main() {
  const args = parseArgs(process.argv)
  const rootDir = process.cwd()
  const evidenceDir = path.join(rootDir, args.evidenceDir)

  if (!isDir(evidenceDir)) {
    console.error(`Evidence dir not found: ${args.evidenceDir}`)
    process.exit(1)
  }

  const keepFromDocs = collectKeepFromDocs(rootDir, args.docsScope)
  const { keepPaths: keepFromManifests, manifestCount } = collectKeepFromManifests(
    rootDir,
    args.evidenceDir
  )

  /** @type {RegExp[]} */
  const extraKeepRegex = args.keepRegex
    .map((r) => {
      try {
        return new RegExp(r)
      } catch (e) {
        throw new Error(`Invalid --keep-regex '${r}': ${e}`)
      }
    })
    .filter(Boolean)

  // Conservative always-keep patterns to protect workflow continuity.
  const alwaysKeep = [
    /^\.gitkeep$/i,
    /^README(\..+)?$/i,
    /^evidence-manifest.*\.json$/i,
    /^temporal-.*history.*\.json$/i,
    /^temporal-.*transcript.*\.(json|txt)$/i,
    /^npm-docs-parity-.*\.txt$/i,
    /^docs-parity-check-.*\.txt$/i,
  ]

  const keepSet = new Set()
  for (const rel of keepFromDocs) keepSet.add(rel)
  for (const rel of keepFromManifests) keepSet.add(rel)

  const allEvidenceFiles = listFilesRecursive(evidenceDir)
    .filter((f) => isUnderDir(f, evidenceDir))
    .filter((f) => !f.includes(`${path.sep}${args.trashDir}${path.sep}`))

  const candidates = []
  const kept = []

  for (const abs of allEvidenceFiles) {
    const relFromRoot = path.relative(rootDir, abs).replaceAll(path.sep, "/")
    const base = path.basename(abs)

    let keep = false
    if (keepSet.has(relFromRoot)) keep = true
    else if (alwaysKeep.some((re) => re.test(base))) keep = true
    else if (extraKeepRegex.some((re) => re.test(relFromRoot) || re.test(base)))
      keep = true

    if (keep) kept.push(relFromRoot)
    else candidates.push(relFromRoot)

    if (args.verbose) {
      console.log(`${keep ? "KEEP " : "DROP "} ${relFromRoot}`)
    }
  }

  kept.sort()
  candidates.sort()

  console.log("Evidence cleanup plan")
  console.log(`- evidence_dir: ${args.evidenceDir}`)
  console.log(`- docs_scope:   ${args.docsScope}`)
  console.log(`- manifests:    ${manifestCount}`)
  console.log(`- keep(docs):   ${keepFromDocs.size}`)
  console.log(`- keep(total):  ${kept.length}`)
  console.log(`- drop(total):  ${candidates.length}`)

  if (args.failIfDrop && candidates.length > 0) {
    console.log("")
    console.log("Failing because drop(total) > 0. Files that would be dropped:")
    for (const rel of candidates.slice(0, 50)) console.log(`- ${rel}`)
    if (candidates.length > 50) console.log(`- ...and ${candidates.length - 50} more`)
    process.exit(3)
  }

  if (!args.apply) {
    console.log("")
    console.log("Dry-run only (no changes). Re-run with --apply to move/delete.")
    process.exit(0)
  }

  if (manifestCount === 0 && !args.allowNoManifest) {
    console.log("")
    console.log("Refusing to apply cleanup because no evidence manifests were found.")
    console.log(
      "Create one or more `screehshots_evidence/evidence-manifest*.json` files first, or re-run with --allow-no-manifest."
    )
    process.exit(2)
  }

  if (candidates.length === 0) {
    console.log("Nothing to clean.")
    process.exit(0)
  }

  const trashRoot = path.join(evidenceDir, args.trashDir, new Date().toISOString().replaceAll(":", "-"))
  if (!args.delete) ensureDir(trashRoot)

  let moved = 0
  let deleted = 0
  for (const rel of candidates) {
    const abs = path.join(rootDir, rel)
    if (!fileExists(abs)) continue
    if (!isUnderDir(abs, evidenceDir)) {
      throw new Error(`Refusing to touch non-evidence path: ${rel}`)
    }

    if (args.delete) {
      fs.unlinkSync(abs)
      deleted++
    } else {
      moveToTrash(abs, trashRoot, rootDir)
      moved++
    }
  }

  console.log("")
  if (args.delete) {
    console.log(`Deleted ${deleted} file(s).`)
  } else {
    console.log(`Moved ${moved} file(s) to trash: ${path.relative(rootDir, trashRoot)}`)
  }
}

main()
