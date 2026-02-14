import fs from "node:fs"
import path from "node:path"
import { convertPrdToCanvas, type PrdCanvasLayout } from "../lib/prd-canvas-converter"

interface CliArgs {
  input: string
  output: string
  layout: PrdCanvasLayout
  semantic: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args = [...argv]
  const input = args[0]
  if (!input) {
    throw new Error("Usage: tsx scripts/prd-to-canvas.ts <input.json> [--output canvas.json] [--layout columns|timeline|radial] [--semantic true|false]")
  }

  let output = "canvas.json"
  let layout: PrdCanvasLayout = "columns"
  let semantic = true

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]
    if (arg === "--output" && next) {
      output = next
      i++
      continue
    }
    if (arg === "--layout" && next && (next === "columns" || next === "timeline" || next === "radial")) {
      layout = next
      i++
      continue
    }
    if (arg === "--semantic" && next) {
      semantic = next !== "false"
      i++
      continue
    }
  }

  return { input, output, layout, semantic }
}

function main() {
  const { input, output, layout, semantic } = parseArgs(process.argv.slice(2))
  const raw = fs.readFileSync(input, "utf8")
  const parsed = JSON.parse(raw) as unknown
  const canvas = convertPrdToCanvas(parsed, { layout, includeSemanticEdges: semantic })
  if (!canvas) {
    throw new Error("Input file does not match PRD template shape.")
  }

  const outPath = path.resolve(output)
  fs.writeFileSync(outPath, JSON.stringify(canvas, null, 2), "utf8")
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath} (${canvas.nodes.length} nodes, ${canvas.edges.length} edges)`)
}

main()
