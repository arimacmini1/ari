import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

function parseArgs(argv) {
  const out = {
    headSha: "",
    changedFiles: [],
    maxFindings: 50,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--head-sha") out.headSha = argv[++i] || ""
    else if (arg === "--changed-files") {
      out.changedFiles.push(...(argv[++i] || "").split(",").map((v) => v.trim()).filter(Boolean))
    } else if (arg === "--max-findings") out.maxFindings = Number(argv[++i] || out.maxFindings)
  }

  return out
}

function runGit(args) {
  const res = spawnSync("git", args, { encoding: "utf8" })
  return { status: res.status ?? 1, stdout: res.stdout || "", stderr: res.stderr || "" }
}

function currentHeadSha() {
  const res = runGit(["rev-parse", "HEAD"])
  return res.status === 0 ? res.stdout.trim() : ""
}

function changedFilesFromSha(headSha) {
  const res = runGit(["diff-tree", "--no-commit-id", "--name-only", "-r", headSha])
  if (res.status !== 0) return []
  return res.stdout.split(/\r?\n/).map((v) => v.trim()).filter(Boolean)
}

function defaultChangedFiles() {
  const res = runGit(["diff", "--name-only", "HEAD~1", "HEAD"])
  if (res.status !== 0) return []
  return res.stdout.split(/\r?\n/).map((v) => v.trim()).filter(Boolean)
}

function normalizePath(file) {
  return file.replace(/\\/g, "/")
}

function findFindingsInFile(filePath, absolutePath, maxFindings) {
  const findings = []
  if (!fs.existsSync(absolutePath)) return findings
  const stats = fs.statSync(absolutePath)
  if (!stats.isFile() || stats.size > 1024 * 1024) return findings

  const content = fs.readFileSync(absolutePath, "utf8")
  const lines = content.split(/\r?\n/)

  for (let i = 0; i < lines.length && findings.length < maxFindings; i += 1) {
    const line = lines[i]

    if (/\bconsole\.(log|debug|info|warn|error)\(/.test(line)) {
      findings.push({
        type: "console_statement",
        severity: "medium",
        actionable: true,
        confidence: 0.92,
        file: filePath,
        line: i + 1,
        message: "Console statement should be removed or guarded for production.",
      })
      continue
    }

    if (/\b(api[_-]?key|secret|token)\b\s*[:=]\s*["'][^"']{8,}/i.test(line)) {
      findings.push({
        type: "possible_secret_literal",
        severity: "high",
        actionable: true,
        confidence: 0.97,
        file: filePath,
        line: i + 1,
        message: "Potential hard-coded secret/token literal.",
      })
      continue
    }

    if (/\bTODO\b|\bFIXME\b/.test(line)) {
      findings.push({
        type: "todo_marker",
        severity: "low",
        actionable: false,
        confidence: 0.99,
        file: filePath,
        line: i + 1,
        message: "TODO/FIXME marker found; verify intentional.",
      })
    }
  }

  return findings
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const headSha = args.headSha || ""
  const currentSha = currentHeadSha()
  const staleHead = Boolean(headSha) && Boolean(currentSha) && headSha !== currentSha

  let changedFiles = args.changedFiles
  if (changedFiles.length === 0 && headSha) changedFiles = changedFilesFromSha(headSha)
  if (changedFiles.length === 0) changedFiles = defaultChangedFiles()

  changedFiles = [...new Set(changedFiles.map(normalizePath).filter(Boolean))]

  const findings = []
  for (const file of changedFiles) {
    const absolute = path.resolve(process.cwd(), file)
    findings.push(...findFindingsInFile(file, absolute, Math.max(1, args.maxFindings - findings.length)))
    if (findings.length >= args.maxFindings) break
  }

  const actionableFindings = findings.filter((f) => f.actionable)
  const nonActionableFindings = findings.filter((f) => !f.actionable)

  const result = {
    tool: "local-review-agent",
    head_sha: headSha || null,
    current_head_sha: currentSha || null,
    stale_head: staleHead,
    changed_files: changedFiles,
    actionable_findings: actionableFindings,
    non_actionable_findings: nonActionableFindings,
    confidence_summary: {
      actionable_avg:
        actionableFindings.length === 0
          ? null
          : Number(
              (
                actionableFindings.reduce((sum, finding) => sum + Number(finding.confidence || 0), 0) /
                actionableFindings.length
              ).toFixed(3)
            ),
      total_findings: findings.length,
    },
    status: !staleHead && actionableFindings.length === 0 ? "pass" : "fail",
  }

  console.log(JSON.stringify(result, null, 2))
  process.exit(result.status === "pass" ? 0 : 1)
}

main()
