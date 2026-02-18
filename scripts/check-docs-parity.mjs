import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
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

function listFilesSafe(dirPath) {
  try {
    return fs.readdirSync(dirPath)
  } catch {
    return []
  }
}

function findSingleFeatureTaskFile(featureId) {
  const tasksDir = path.join(process.cwd(), "docs", "tasks")
  const prefix = `feature-${featureId}-`
  const matches = fs
    .readdirSync(tasksDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".md"))
    .map((name) => path.join(tasksDir, name))
    .filter((p) => !p.endsWith("feature-task-index.md"))

  if (matches.length === 0) return { file: null, error: `No feature task file found for ${featureId}.` }
  if (matches.length > 1) {
    return {
      file: null,
      error: `Multiple feature task files found for ${featureId}: ${matches.map((m) => path.basename(m)).join(", ")}`,
    }
  }
  return { file: matches[0], error: null }
}

function sliceSection(content, header) {
  const headerRe = new RegExp(`^##\\s+${header.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b.*$`, "m")
  const m = content.match(headerRe)
  if (!m || m.index == null) return null
  const start = m.index + m[0].length
  const rest = content.slice(start)
  const nextHeader = rest.match(/^##\s+/m)
  const end = nextHeader && nextHeader.index != null ? start + nextHeader.index : content.length
  return content.slice(start, end)
}

function allMustHavesChecked(content) {
  const section = sliceSection(content, "Must-Have Tasks")
  if (!section) return { ok: true, unchecked: [] }
  const lines = section.split("\n")
  const unchecked = []
  for (const line of lines) {
    const mh = line.match(/^\s*-\s*\[( |x)\]\s*`(F[^`]+-MH-[^`]+)`/)
    if (!mh) continue
    const checked = mh[1] === "x"
    if (!checked) unchecked.push(mh[2])
  }
  return { ok: unchecked.length === 0, unchecked }
}

function parseCheckedTuningMustHaves(content) {
  const section = sliceSection(content, "Must-Have Tasks")
  if (!section) return []
  const lines = section.split("\n")
  const tasks = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const mh = line.match(/^\s*-\s*\[x\]\s*`(T\d{2}-MH-\d{2})`\s*(.*)$/)
    if (!mh) continue
    const taskId = mh[1]
    const title = mh[2] || ""
    const block = [line]
    let j = i + 1
    while (j < lines.length && !lines[j].match(/^\s*-\s*\[( |x)\]\s*`T\d{2}-[A-Z]{2}-\d{2}`/)) {
      block.push(lines[j])
      j += 1
    }
    tasks.push({ taskId, title, block: block.join("\n") })
    i = j - 1
  }

  return tasks
}

function hasB5B6B7Evidence(taskBlock) {
  const hasB5 = /B5 completed\./.test(taskBlock) && /Evidence:\s*.+/i.test(taskBlock)
  const hasB6 = /B6 completed\./.test(taskBlock)
  const hasB7 = /B7 completed\./.test(taskBlock)
  return { hasB5, hasB6, hasB7 }
}

function companionDocsExist(featureId) {
  const onboarding = path.join(process.cwd(), "docs", "on-boarding", `feature-${featureId}-onboarding.md`)
  const architecture = path.join(process.cwd(), "docs", "architecture", `feature-${featureId}-architecture.md`)
  return {
    onboarding,
    architecture,
    ok: fileExists(onboarding) && fileExists(architecture),
    missing: [!fileExists(onboarding) ? onboarding : null, !fileExists(architecture) ? architecture : null].filter(Boolean),
  }
}

function main() {
  const aliasCheck = spawnSync(process.execPath, ["scripts/update-roadmap-alias-map.mjs", "--check"], {
    stdio: "pipe",
    encoding: "utf8",
  })

  const featureStatusPath = path.join(process.cwd(), "docs", "process", "feature-status.json")
  const featureStatus = readJson(featureStatusPath)
  const completeIds = Object.entries(featureStatus.feature_status || {})
    .filter(([, status]) => status === "complete")
    .map(([id]) => id)

  const errors = []

  if (aliasCheck.status !== 0) {
    const stdout = (aliasCheck.stdout || "").trim()
    const stderr = (aliasCheck.stderr || "").trim()
    const msg = [stderr, stdout].filter(Boolean).join("\n")
    errors.push(`[roadmap-alias-map] ${msg || "Alias map check failed"}`)
  }

  for (const featureId of completeIds) {
    const { file, error } = findSingleFeatureTaskFile(featureId)
    if (error) {
      errors.push(`[${featureId}] ${error}`)
      continue
    }

    const content = readUtf8(file)
    const mh = allMustHavesChecked(content)
    if (!mh.ok) {
      errors.push(
        `[${featureId}] Must-Have tasks not fully checked in ${path.relative(process.cwd(), file)}: ${mh.unchecked.join(", ")}`
      )
    }

    const companions = companionDocsExist(featureId)
    if (!companions.ok) {
      errors.push(`[${featureId}] Missing companion docs: ${companions.missing.join(", ")}`)
    }
  }

  const tuningPolicyPath = path.join(process.cwd(), "docs", "Ari-v3.0", "process", "risk-policy.json")
  if (!fileExists(tuningPolicyPath)) {
    errors.push("[tuning] Missing docs/Ari-v3.0/process/risk-policy.json")
  }

  const tuningStatusPath = path.join(process.cwd(), "docs", "Ari-v3.0", "process", "tuning-feature-status.json")
  if (!fileExists(tuningStatusPath)) {
    errors.push("[tuning] Missing docs/Ari-v3.0/process/tuning-feature-status.json")
  } else {
    try {
      const statusJson = readJson(tuningStatusPath)
      const allowed = new Set(["planned", "in_progress", "qa_needed", "complete", "blocked"])
      for (const [key, value] of Object.entries(statusJson.feature_status || {})) {
        if (!allowed.has(String(value))) {
          errors.push(`[tuning] Invalid status for ${key} in tuning-feature-status.json: ${String(value)}`)
        }
      }
    } catch (error) {
      errors.push(`[tuning] Failed to parse tuning-feature-status.json: ${String(error)}`)
    }
  }

  const tuningTasksDir = path.join(process.cwd(), "docs", "Ari-v3.0", "tasks")
  const tuningFiles = listFilesSafe(tuningTasksDir)
    .filter((name) => name.startsWith("tuning-feature-") && name.endsWith(".md"))
    .map((name) => path.join(tuningTasksDir, name))

  for (const file of tuningFiles) {
    const content = readUtf8(file)
    const checkedTasks = parseCheckedTuningMustHaves(content)
    for (const task of checkedTasks) {
      const evidence = hasB5B6B7Evidence(task.block)
      if (!evidence.hasB5 || !evidence.hasB6 || !evidence.hasB7) {
        errors.push(
          `[tuning] ${path.relative(process.cwd(), file)} ${task.taskId} missing required progress evidence (B5/B6/B7)`
        )
      }
    }
  }

  if (errors.length > 0) {
    console.error("DOCS PARITY CHECK FAILED")
    for (const e of errors) console.error(`- ${e}`)
    process.exit(1)
  }

  console.log("DOCS PARITY CHECK PASSED")
}

main()
