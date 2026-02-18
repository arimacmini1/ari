import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

function parseArgs(argv) {
  const out = {
    headSha: "",
    findingsJson: "",
    findingsFile: "",
    apply: false,
    maxFileEdits: 25,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--head-sha") out.headSha = argv[++i] || ""
    else if (arg === "--findings-json") out.findingsJson = argv[++i] || ""
    else if (arg === "--findings-file") out.findingsFile = argv[++i] || ""
    else if (arg === "--apply") out.apply = true
    else if (arg === "--max-file-edits") out.maxFileEdits = Number(argv[++i] || out.maxFileEdits)
  }

  return out
}

function runGit(args) {
  const res = spawnSync("git", args, { encoding: "utf8" })
  return { status: res.status ?? 1, stdout: res.stdout || "", stderr: res.stderr || "" }
}

function parseFindingsPayload(args) {
  if (args.findingsFile) {
    const absolute = path.resolve(process.cwd(), args.findingsFile)
    return JSON.parse(fs.readFileSync(absolute, "utf8"))
  }

  if (args.findingsJson) return JSON.parse(args.findingsJson)
  return { actionable_findings: [] }
}

function extractActionableFindings(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.actionable_findings)) return payload.actionable_findings
  return []
}

function removeConsoleStatements(filePath) {
  const absolute = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(absolute)) return { changed: false, removed: 0 }

  const original = fs.readFileSync(absolute, "utf8")
  const lines = original.split(/\r?\n/)
  const next = []
  let removed = 0

  for (const line of lines) {
    if (/\bconsole\.(log|debug|info|warn|error)\(/.test(line)) {
      removed += 1
      continue
    }
    next.push(line)
  }

  if (removed === 0) return { changed: false, removed: 0 }

  fs.writeFileSync(absolute, `${next.join("\n")}${original.endsWith("\n") ? "\n" : ""}`)
  return { changed: true, removed }
}

function currentHeadSha() {
  const res = runGit(["rev-parse", "HEAD"])
  return res.status === 0 ? res.stdout.trim() : ""
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const payload = parseFindingsPayload(args)
  const actionableFindings = extractActionableFindings(payload)

  const beforeSha = currentHeadSha()
  if (args.headSha && beforeSha && args.headSha !== beforeSha) {
    console.log(
      JSON.stringify(
        {
          status: "fail",
          reason: "stale_head",
          expected_head_sha: args.headSha,
          current_head_sha: beforeSha,
        },
        null,
        2
      )
    )
    process.exit(1)
  }

  const byFile = new Map()
  for (const finding of actionableFindings) {
    const file = typeof finding.file === "string" ? finding.file.trim() : ""
    if (!file) continue
    if (!byFile.has(file)) byFile.set(file, [])
    byFile.get(file).push(finding)
  }

  const fileEntries = [...byFile.entries()].slice(0, Math.max(1, args.maxFileEdits))
  const planned = []
  const changedFiles = []

  for (const [file, findings] of fileEntries) {
    const hasConsoleFinding = findings.some((finding) => finding.type === "console_statement")
    if (!hasConsoleFinding) continue

    if (!args.apply) {
      planned.push({ file, action: "remove_console_statements" })
      continue
    }

    const result = removeConsoleStatements(file)
    if (result.changed) {
      planned.push({ file, action: "remove_console_statements", removed: result.removed })
      changedFiles.push(file)
    }
  }

  let commitSha = null
  if (args.apply && changedFiles.length > 0) {
    const addRes = runGit(["add", ...changedFiles])
    if (addRes.status !== 0) {
      console.log(JSON.stringify({ status: "fail", reason: "git_add_failed", stderr: addRes.stderr }, null, 2))
      process.exit(1)
    }

    const message = `chore: remediation agent fixes (head:${args.headSha || beforeSha || "unknown"})`
    const commitRes = runGit(["commit", "-m", message])
    if (commitRes.status !== 0) {
      console.log(
        JSON.stringify(
          {
            status: "fail",
            reason: "git_commit_failed",
            stderr: commitRes.stderr,
            stdout: commitRes.stdout,
          },
          null,
          2
        )
      )
      process.exit(1)
    }

    commitSha = currentHeadSha() || null
  }

  const response = {
    status: "pass",
    applied: args.apply,
    before_head_sha: beforeSha || null,
    commit_sha: commitSha,
    changed_files: changedFiles,
    planned_actions: planned,
    actionable_findings_count: actionableFindings.length,
  }

  console.log(JSON.stringify(response, null, 2))
}

main()
