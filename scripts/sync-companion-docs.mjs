import fs from "node:fs"
import path from "node:path"

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8")
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function parseArgs(argv) {
  const args = {
    taskId: "",
    workflowId: "",
    status: "in_progress",
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--") continue
    if (a === "--task-id") args.taskId = argv[++i] || ""
    else if (a === "--workflow-id") args.workflowId = argv[++i] || ""
    else if (a === "--status") args.status = argv[++i] || ""
    else if (a === "-h" || a === "--help") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown arg: ${a}`)
    }
  }
  if (!args.taskId) throw new Error("--task-id is required")
  if (!args.workflowId) throw new Error("--workflow-id is required")
  return args
}

function printHelp() {
  console.log(`Usage:
  node scripts/sync-companion-docs.mjs --task-id <FXX-*> --workflow-id <workflow_id> [--status <state>]

Creates missing companion docs and appends an automated B7 sync log entry:
  - docs/on-boarding/feature-XX-onboarding.md
  - docs/architecture/feature-XX-architecture.md
`)
}

function featureIdFromTaskId(taskId) {
  const match = taskId.match(/^F([0-9]+(?:\\.[0-9]+)?)-/)
  if (!match) throw new Error(`Cannot parse feature id from task id: ${taskId}`)
  return match[1]
}

function findFeatureTaskFile(rootDir, featureId) {
  const tasksDir = path.join(rootDir, "docs", "tasks")
  const prefix = `feature-${featureId}-`
  const matches = fs
    .readdirSync(tasksDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".md"))
    .filter((name) => name !== "feature-task-index.md")

  if (matches.length === 0) throw new Error(`No feature task file found for feature ${featureId}`)
  if (matches.length > 1) {
    throw new Error(`Multiple feature task files found for feature ${featureId}: ${matches.join(", ")}`)
  }
  return path.join(tasksDir, matches[0])
}

function featureNameFromTaskHeader(taskFilePath) {
  const firstLine = readUtf8(taskFilePath).split("\n")[0] || ""
  // Example: # Feature 03 - Orchestrator Hub
  const match = firstLine.match(/^#\s*Feature\s+[^-–]+[-–]\s*(.+)\s*$/)
  if (match) return match[1].trim()
  return path.basename(taskFilePath, ".md")
}

function onboardingStub({ featureId, featureName, taskFileRel, status }) {
  return [
    `# Feature ${featureId} - ${featureName} On-Boarding Guide`,
    "",
    `**Feature task file:** \`${taskFileRel}\``,
    `**Related architecture:** \`docs/architecture/feature-${featureId}-architecture.md\``,
    `**Status:** \`${status}\``,
    "",
    "## Quick Start",
    "",
    "Pending detailed onboarding content for this feature.",
    "",
    "## Automated Slice Sync Log",
    "",
  ].join("\n")
}

function architectureStub({ featureId, featureName, taskFileRel, status }) {
  return [
    `# Feature ${featureId} - ${featureName} Architecture`,
    "",
    `**Feature task file:** \`${taskFileRel}\``,
    `**Related on-boarding:** \`docs/on-boarding/feature-${featureId}-onboarding.md\``,
    `**Status:** \`${status}\``,
    "",
    "## Overview",
    "",
    "Pending detailed architecture content for this feature.",
    "",
    "## Automated Slice Sync Log",
    "",
  ].join("\n")
}

function ensureSyncSection(content) {
  if (content.includes("## Automated Slice Sync Log")) return content
  const suffix = content.endsWith("\n") ? "" : "\n"
  return `${content}${suffix}\n## Automated Slice Sync Log\n\n`
}

function addSyncEntry({ content, entryKey, entryLine }) {
  if (content.includes(entryKey)) return content
  const withSection = ensureSyncSection(content)
  const suffix = withSection.endsWith("\n") ? "" : "\n"
  return `${withSection}${suffix}- ${entryLine}\n`
}

function main() {
  const args = parseArgs(process.argv)
  const rootDir = process.cwd()
  const featureId = featureIdFromTaskId(args.taskId)
  const taskFilePath = findFeatureTaskFile(rootDir, featureId)
  const taskFileRel = path.relative(rootDir, taskFilePath).replaceAll(path.sep, "/")
  const featureName = featureNameFromTaskHeader(taskFilePath)

  const onboardingPath = path.join(rootDir, "docs", "on-boarding", `feature-${featureId}-onboarding.md`)
  const architecturePath = path.join(rootDir, "docs", "architecture", `feature-${featureId}-architecture.md`)

  const today = new Date().toISOString().slice(0, 10)
  const entryKey = `task: ${args.taskId} | workflow: ${args.workflowId}`
  const entryLine = `${today} | task: ${args.taskId} | workflow: ${args.workflowId} | task_file: ${taskFileRel}`

  let onboardingCreated = false
  let architectureCreated = false

  ensureDir(path.dirname(onboardingPath))
  ensureDir(path.dirname(architecturePath))

  if (!fileExists(onboardingPath)) {
    writeUtf8(
      onboardingPath,
      onboardingStub({
        featureId,
        featureName,
        taskFileRel,
        status: args.status,
      })
    )
    onboardingCreated = true
  }

  if (!fileExists(architecturePath)) {
    writeUtf8(
      architecturePath,
      architectureStub({
        featureId,
        featureName,
        taskFileRel,
        status: args.status,
      })
    )
    architectureCreated = true
  }

  const onboardingNext = addSyncEntry({
    content: readUtf8(onboardingPath),
    entryKey,
    entryLine,
  })
  writeUtf8(onboardingPath, onboardingNext)

  const architectureNext = addSyncEntry({
    content: readUtf8(architecturePath),
    entryKey,
    entryLine,
  })
  writeUtf8(architecturePath, architectureNext)

  console.log(
    JSON.stringify(
      {
        task_id: args.taskId,
        workflow_id: args.workflowId,
        feature_id: featureId,
        onboarding: {
          path: path.relative(rootDir, onboardingPath).replaceAll(path.sep, "/"),
          created: onboardingCreated,
          synced: true,
        },
        architecture: {
          path: path.relative(rootDir, architecturePath).replaceAll(path.sep, "/"),
          created: architectureCreated,
          synced: true,
        },
      },
      null,
      2
    )
  )
}

main()
