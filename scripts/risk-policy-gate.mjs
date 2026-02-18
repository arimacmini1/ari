import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

function parseArgs(argv) {
  const out = {
    policy: "docs/Ari-v3.0/process/risk-policy.json",
    headSha: "",
    changedFiles: [],
    changedFilesFile: "",
    requiredChecks: [],
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--policy") out.policy = argv[++i] || out.policy
    else if (arg === "--head-sha") out.headSha = argv[++i] || ""
    else if (arg === "--changed-files") {
      const value = argv[++i] || ""
      out.changedFiles.push(...value.split(",").map((v) => v.trim()).filter(Boolean))
    } else if (arg === "--changed-files-file") out.changedFilesFile = argv[++i] || ""
    else if (arg === "--required-check") out.requiredChecks.push(argv[++i] || "")
  }

  out.requiredChecks = out.requiredChecks.filter(Boolean)
  return out
}

function die(payload) {
  console.log(JSON.stringify(payload, null, 2))
  process.exit(1)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
}

function globToRegex(glob) {
  let pattern = ""
  let i = 0
  while (i < glob.length) {
    const ch = glob[i]
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        pattern += ".*"
        i += 2
      } else {
        pattern += "[^/]*"
        i += 1
      }
      continue
    }
    pattern += escapeRegex(ch)
    i += 1
  }
  return new RegExp(`^${pattern}$`)
}

function matchesAny(file, globs) {
  return globs.some((glob) => globToRegex(glob).test(file))
}

function gitChangedFilesFromSha(headSha) {
  const cmd = ["diff-tree", "--no-commit-id", "--name-only", "-r", headSha]
  const res = spawnSync("git", cmd, { encoding: "utf8" })
  if (res.status !== 0) {
    return { files: [], error: (res.stderr || res.stdout || "git diff-tree failed").trim() }
  }
  return { files: (res.stdout || "").split(/\r?\n/).map((v) => v.trim()).filter(Boolean), error: "" }
}

function gitDefaultChangedFiles() {
  const res = spawnSync("git", ["diff", "--name-only", "HEAD~1", "HEAD"], { encoding: "utf8" })
  if (res.status === 0) {
    const files = (res.stdout || "").split(/\r?\n/).map((v) => v.trim()).filter(Boolean)
    if (files.length > 0) return files
  }

  const staged = spawnSync("git", ["diff", "--name-only", "--cached"], { encoding: "utf8" })
  if (staged.status === 0) {
    return (staged.stdout || "").split(/\r?\n/).map((v) => v.trim()).filter(Boolean)
  }

  return []
}

function computeRiskTier(changedFiles, riskTierRules) {
  const ordered = Object.entries(riskTierRules || {})
  for (const [tier, globs] of ordered) {
    if (!Array.isArray(globs)) continue
    if (changedFiles.some((file) => matchesAny(file, globs))) return tier
  }
  return "low"
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const policyPath = path.resolve(process.cwd(), args.policy)

  if (!fs.existsSync(policyPath)) {
    die({ status: "fail", error: `Policy file not found: ${args.policy}` })
  }

  const policy = readJson(policyPath)

  let changedFiles = [...args.changedFiles]
  if (args.changedFilesFile) {
    const filePath = path.resolve(process.cwd(), args.changedFilesFile)
    if (!fs.existsSync(filePath)) {
      die({ status: "fail", error: `Changed files manifest not found: ${args.changedFilesFile}` })
    }
    const loaded = fs.readFileSync(filePath, "utf8").split(/\r?\n/).map((v) => v.trim()).filter(Boolean)
    changedFiles.push(...loaded)
  }

  if (changedFiles.length === 0 && args.headSha) {
    const fromSha = gitChangedFilesFromSha(args.headSha)
    if (fromSha.error) die({ status: "fail", error: fromSha.error, headSha: args.headSha })
    changedFiles = fromSha.files
  }

  if (changedFiles.length === 0) changedFiles = gitDefaultChangedFiles()

  const dedupedChangedFiles = [...new Set(changedFiles)]
  const riskTier = computeRiskTier(dedupedChangedFiles, policy.riskTierRules)

  const mergePolicy = policy.mergePolicy || {}
  const tierPolicy = mergePolicy[riskTier]
  if (!tierPolicy || !Array.isArray(tierPolicy.requiredChecks) || tierPolicy.requiredChecks.length === 0) {
    die({
      status: "fail",
      error: `Missing required checks configuration for tier: ${riskTier}`,
      riskTier,
    })
  }

  const requiredChecks = tierPolicy.requiredChecks
  const invalidChecks = requiredChecks.filter((check) => typeof check !== "string" || check.trim().length === 0)
  if (invalidChecks.length > 0) {
    die({ status: "fail", error: "Invalid required checks found in policy", invalidChecks })
  }

  const docsDriftFailures = []
  for (const rule of policy.docsDriftRules || []) {
    const whenChanged = Array.isArray(rule.whenChanged) ? rule.whenChanged : []
    const requiresAny = Array.isArray(rule.requiresAny) ? rule.requiresAny : []

    const triggered = dedupedChangedFiles.some((file) => matchesAny(file, whenChanged))
    if (!triggered) continue

    const satisfied = dedupedChangedFiles.some((file) => requiresAny.includes(file))
    if (!satisfied) {
      docsDriftFailures.push({
        rule: rule.name || "unnamed-rule",
        requiresAny,
      })
    }
  }

  const missingCallerChecks = args.requiredChecks.filter((check) => !requiredChecks.includes(check))

  const pass = docsDriftFailures.length === 0 && missingCallerChecks.length === 0

  const payload = {
    status: pass ? "pass" : "fail",
    policy: args.policy,
    headSha: args.headSha || null,
    changedFiles: dedupedChangedFiles,
    riskTier,
    requiredChecks,
    callerRequiredChecks: args.requiredChecks,
    missingCallerChecks,
    docsDriftFailures,
  }

  console.log(JSON.stringify(payload, null, 2))
  process.exit(pass ? 0 : 1)
}

main()
