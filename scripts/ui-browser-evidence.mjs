import fs from "node:fs"
import path from "node:path"

function parseArgs(argv) {
  const out = { mode: "verify", evidenceDir: "evidence/browser", flow: "default-flow" }
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--mode") out.mode = argv[++i] || out.mode
    else if (arg === "--evidence-dir") out.evidenceDir = argv[++i] || out.evidenceDir
    else if (arg === "--flow") out.flow = argv[++i] || out.flow
  }
  return out
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function main() {
  const args = parseArgs(process.argv)
  const dir = path.resolve(process.cwd(), args.evidenceDir)
  ensureDir(dir)
  const manifestPath = path.join(dir, "browser-evidence.json")

  if (args.mode === "capture") {
    const payload = {
      captured_at: new Date().toISOString(),
      flow: args.flow,
      entrypoint: "local",
      account_identity: "local-dev",
      artifacts: [
        {
          type: "screenshot",
          path: path.relative(process.cwd(), path.join(dir, "placeholder-screenshot.txt")),
          freshness: "fresh",
        },
      ],
    }
    fs.writeFileSync(path.join(dir, "placeholder-screenshot.txt"), "placeholder evidence\n", "utf8")
    fs.writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
    console.log(JSON.stringify({ status: "pass", mode: "capture", manifest: path.relative(process.cwd(), manifestPath) }, null, 2))
    return
  }

  if (!fs.existsSync(manifestPath)) {
    console.log(JSON.stringify({ status: "fail", mode: "verify", error: "Missing browser evidence manifest", manifest: path.relative(process.cwd(), manifestPath) }, null, 2))
    process.exit(1)
  }

  const payload = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  const valid = Boolean(payload.flow) && Array.isArray(payload.artifacts) && payload.artifacts.length > 0

  console.log(
    JSON.stringify(
      {
        status: valid ? "pass" : "fail",
        mode: "verify",
        manifest: path.relative(process.cwd(), manifestPath),
        flow: payload.flow || null,
      },
      null,
      2
    )
  )

  process.exit(valid ? 0 : 1)
}

main()
