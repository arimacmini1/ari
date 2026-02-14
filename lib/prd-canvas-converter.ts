import type { CanvasEdge, CanvasNode, CanvasState } from "@/lib/canvas-state"

type JsonRecord = Record<string, unknown>

export type PrdCanvasLayout = "columns" | "timeline" | "radial"

export interface PrdCanvasOptions {
  layout?: PrdCanvasLayout
  includeSemanticEdges?: boolean
}

type SemanticKind =
  | "overview"
  | "problem"
  | "persona"
  | "feature"
  | "principle"
  | "risk"
  | "timeline"
  | "metrics"
  | "section"

interface DraftNode {
  id: string
  label: string
  description: string
  kind: SemanticKind
  phase?: 1 | 2 | 3
  order: number
}

interface ParsedPrdModel {
  title: string
  sections: DraftNode[]
  personas: DraftNode[]
  principles: DraftNode[]
  risks: DraftNode[]
  features: DraftNode[]
  frictions: DraftNode[]
}

export function isPrdJson(value: unknown): boolean {
  if (!isRecord(value)) return false
  const hasTitle = typeof value.title === "string" && value.title.trim().length > 0
  const hasSections = isRecord(value.sections)
  const hasRules = isRecord(value.critical_rules)
  const hasMetadata = isRecord(value.metadata_fields)
  return hasTitle && (hasSections || hasRules || hasMetadata)
}

export function convertPrdToCanvas(
  value: unknown,
  options: PrdCanvasOptions = {}
): CanvasState | null {
  if (!isPrdJson(value)) return null
  const layout = options.layout ?? "columns"
  const includeSemanticEdges = options.includeSemanticEdges ?? true
  const model = parsePrd(value as JsonRecord)
  const prefix = `prd-${Date.now()}`

  const nodes: CanvasNode[] = []
  const edges: CanvasEdge[] = []

  const rootId = `${prefix}-root`
  nodes.push({
    id: rootId,
    type: "block",
    position: { x: 80, y: 80 },
    data: {
      label: model.title,
      description: "PRD root",
      blockType: "text",
    },
  })

  const all = [
    ...model.sections,
    ...model.personas,
    ...model.features,
    ...model.principles,
    ...model.risks,
    ...model.frictions,
  ]
  const positioned = positionNodes(all, layout)

  for (const node of positioned) {
    nodes.push({
      id: node.id,
      type: "block",
      position: { x: node.x, y: node.y },
      data: {
        label: node.label,
        description: node.description,
        blockType: resolveBlockType(node.kind),
      },
    })
  }

  const sectionFlow = model.sections.sort((a, b) => a.order - b.order)
  if (sectionFlow.length > 0) {
    edges.push(makeEdge(`${prefix}-root-flow`, rootId, sectionFlow[0].id, "starts"))
  }
  for (let i = 0; i < sectionFlow.length - 1; i++) {
    const from = sectionFlow[i]
    const to = sectionFlow[i + 1]
    edges.push(makeEdge(`${prefix}-section-${i + 1}`, from.id, to.id, "next"))
  }

  for (const persona of model.personas) {
    const source = findSectionId(model.sections, "problem") ?? rootId
    edges.push(makeEdge(`${prefix}-persona-${persona.id}`, source, persona.id, "targets"))
  }

  for (const feature of model.features) {
    const source = findSectionId(model.sections, "feature") ?? rootId
    edges.push(makeEdge(`${prefix}-feature-${feature.id}`, source, feature.id, "contains"))
  }

  if (includeSemanticEdges) {
    const firstFeatureByPhase = new Map<number, DraftNode[]>()
    for (const feature of model.features) {
      const phase = feature.phase ?? 1
      const bucket = firstFeatureByPhase.get(phase) ?? []
      bucket.push(feature)
      firstFeatureByPhase.set(phase, bucket)
    }

    const phase1 = firstFeatureByPhase.get(1) ?? []
    const phase2 = firstFeatureByPhase.get(2) ?? []
    const phase3 = firstFeatureByPhase.get(3) ?? []
    connectPhaseProgression(edges, prefix, phase1, phase2, "expands")
    connectPhaseProgression(edges, prefix, phase2, phase3, "expands")

    for (const principle of model.principles) {
      for (const feature of model.features.slice(0, 12)) {
        edges.push(makeEdge(`${prefix}-guides-${principle.id}-${feature.id}`, principle.id, feature.id, "guides"))
      }
    }

    for (const friction of model.frictions) {
      for (const feature of model.features.slice(0, 12)) {
        edges.push(makeEdge(`${prefix}-solves-${friction.id}-${feature.id}`, friction.id, feature.id, "solves"))
      }
    }

    for (const risk of model.risks) {
      for (const feature of model.features.slice(0, 6)) {
        edges.push(makeEdge(`${prefix}-risk-${risk.id}-${feature.id}`, feature.id, risk.id, "risk"))
      }
    }
  }

  return {
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

function parsePrd(prd: JsonRecord): ParsedPrdModel {
  const title = getString(prd.title) ?? "PRD"
  const sectionsRecord = isRecord(prd.sections) ? prd.sections : {}
  const sectionEntries = Object.entries(sectionsRecord).sort((a, b) => numericPrefix(a[0]) - numericPrefix(b[0]))
  const sections: DraftNode[] = []
  const personas: DraftNode[] = []
  const principles: DraftNode[] = []
  const risks: DraftNode[] = []
  const features: DraftNode[] = []
  const frictions: DraftNode[] = []

  for (let i = 0; i < sectionEntries.length; i++) {
    const [key, raw] = sectionEntries[i]
    const normalized = key.toLowerCase()
    sections.push({
      id: `section-${i + 1}-${slugify(key)}`,
      label: prettifyKey(key),
      description: summarizeValue(raw),
      kind: resolveSectionKind(normalized),
      order: i + 1,
    })

    if (normalized.includes("persona")) {
      const extracted = extractPersonas(raw)
      personas.push(...extracted.map((item, idx) => ({ ...item, id: `persona-${idx + 1}-${slugify(item.label)}` })))
    }

    if (normalized.includes("feature")) {
      const extracted = extractFeatures(raw)
      features.push(...extracted.map((item, idx) => ({ ...item, id: `feature-${idx + 1}-${slugify(item.label)}` })))
    }

    if (normalized.includes("principle")) {
      const extracted = extractStringList(raw)
      principles.push(
        ...extracted.map((item, idx) => ({
          id: `principle-${idx + 1}`,
          label: `Principle ${idx + 1}`,
          description: item,
          kind: "principle" as const,
          order: idx + 1,
        }))
      )
    }

    if (normalized.includes("risk")) {
      const extracted = extractRisks(raw)
      risks.push(...extracted.map((item, idx) => ({ ...item, id: `risk-${idx + 1}-${slugify(item.label)}` })))
    }

    if (normalized.includes("problem")) {
      const extracted = extractFrictions(raw)
      frictions.push(...extracted.map((item, idx) => ({ ...item, id: `friction-${idx + 1}-${slugify(item.label)}` })))
    }
  }

  if (features.length === 0) {
    features.push({
      id: "feature-template",
      label: "Feature Template",
      description: "No explicit feature list found; template placeholder exported.",
      kind: "feature",
      phase: 1,
      order: 1,
    })
  }

  return { title, sections, personas, principles, risks, features, frictions }
}

function extractPersonas(raw: unknown): DraftNode[] {
  const result: DraftNode[] = []
  if (!isRecord(raw)) return result

  const personaList =
    asRecordArray((raw as JsonRecord).personas).length > 0
      ? asRecordArray((raw as JsonRecord).personas)
      : asRecordArray((raw as JsonRecord).persona_template)

  for (let i = 0; i < personaList.length; i++) {
    const item = personaList[i]
    const name = getString(item.name) ?? `Persona ${i + 1}`
    const goals = asStringArray(item.goals).slice(0, 3).join(", ")
    const pains = asStringArray(item.pain_points).slice(0, 3).join(", ")
    const description = [goals ? `Goals: ${goals}` : "", pains ? `Pain: ${pains}` : ""]
      .filter(Boolean)
      .join(" | ") || summarizeValue(item)
    result.push({
      id: `persona-${i + 1}`,
      label: name,
      description: description.slice(0, 220),
      kind: "persona",
      order: i + 1,
    })
  }

  if (result.length === 0 && isRecord((raw as JsonRecord).persona_template)) {
    const tmpl = (raw as JsonRecord).persona_template as JsonRecord
    result.push({
      id: "persona-template",
      label: getString(tmpl.name) ?? "Persona Template",
      description: summarizeValue(tmpl),
      kind: "persona",
      order: 1,
    })
  }
  return result
}

function extractFeatures(raw: unknown): DraftNode[] {
  const result: DraftNode[] = []
  if (!isRecord(raw)) return result
  const obj = raw as JsonRecord
  const phases = isRecord(obj.phases) ? obj.phases : null

  if (phases) {
    const phaseEntries = Object.entries(phases)
    for (const [phaseKey, phaseValue] of phaseEntries) {
      const phase = inferPhase(phaseKey)
      const items = asRecordArray((phaseValue as JsonRecord).features).length > 0
        ? asRecordArray((phaseValue as JsonRecord).features)
        : asRecordArray(phaseValue)
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        result.push({
          id: `feature-${phaseKey}-${i + 1}`,
          label: getString(item.id) ?? getString(item.name) ?? getString(item.title) ?? `Feature ${i + 1}`,
          description: summarizeFeature(item),
          kind: "feature",
          phase,
          order: i + 1,
        })
      }
    }
  }

  if (result.length === 0) {
    const featureTemplates = asRecordArray(obj.feature_template)
    if (featureTemplates.length > 0) {
      for (let i = 0; i < featureTemplates.length; i++) {
        const item = featureTemplates[i]
        result.push({
          id: `feature-template-${i + 1}`,
          label: getString(item.id) ?? getString(item.name) ?? getString(item.title) ?? `Feature ${i + 1}`,
          description: summarizeFeature(item).slice(0, 220),
          kind: "feature",
          phase: 1,
          order: i + 1,
        })
      }
    } else if (isRecord(obj.feature_template)) {
      const tmpl = obj.feature_template as JsonRecord
      result.push({
        id: "feature-template",
        label: getString(tmpl.id) ?? "Feature Template",
        description: summarizeFeature(tmpl).slice(0, 220),
        kind: "feature",
        phase: 1,
        order: 1,
      })
    }
  }

  return result
}

function extractRisks(raw: unknown): DraftNode[] {
  if (!isRecord(raw)) return []
  const list = asRecordArray((raw as JsonRecord).risk_template)
  if (list.length > 0) {
    return list.map((item, idx) => ({
      id: `risk-${idx + 1}`,
      label: getString(item.description) ?? `Risk ${idx + 1}`,
      description: summarizeValue(item).slice(0, 220),
      kind: "risk",
      order: idx + 1,
    }))
  }

  const template = isRecord((raw as JsonRecord).risk_template)
    ? ((raw as JsonRecord).risk_template as JsonRecord)
    : null
  if (!template) return []
  return [
    {
      id: "risk-template",
      label: "Risk Template",
      description: summarizeValue(template).slice(0, 220),
      kind: "risk",
      order: 1,
    },
  ]
}

function extractFrictions(raw: unknown): DraftNode[] {
  if (!isRecord(raw)) return []
  const frictions = asStringArray((raw as JsonRecord).core_frictions_to_solve)
  return frictions.map((item, idx) => ({
    id: `friction-${idx + 1}`,
    label: `Friction ${idx + 1}`,
    description: item,
    kind: "problem",
    order: idx + 1,
  }))
}

function extractStringList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string")
  if (isRecord(raw)) {
    const values = Object.values(raw)
    return values.filter((item): item is string => typeof item === "string")
  }
  return []
}

function summarizeFeature(item: JsonRecord): string {
  const description = getString(item.description)
  const caps = asStringArray(item.key_capabilities).slice(0, 3)
  const metrics = asStringArray(item.success_metrics).slice(0, 2)
  return [
    description,
    caps.length > 0 ? `Capabilities: ${caps.join("; ")}` : "",
    metrics.length > 0 ? `Success: ${metrics.join("; ")}` : "",
  ].filter(Boolean).join(" | ") || summarizeValue(item)
}

function positionNodes(
  nodes: DraftNode[],
  layout: PrdCanvasLayout
): Array<DraftNode & { x: number; y: number }> {
  if (layout === "timeline") {
    return nodes
      .sort((a, b) => a.order - b.order)
      .map((node, idx) => ({ ...node, x: 360, y: 140 + idx * 140 }))
  }

  if (layout === "radial") {
    const centerX = 580
    const centerY = 420
    const radius = 340
    return nodes.map((node, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(nodes.length, 1)
      return {
        ...node,
        x: Math.round(centerX + Math.cos(angle) * radius),
        y: Math.round(centerY + Math.sin(angle) * radius),
      }
    })
  }

  const counters = new Map<string, number>()
  return nodes.map((node) => {
    const lane = laneForNode(node)
    const count = counters.get(lane) ?? 0
    counters.set(lane, count + 1)
    const x = laneX(lane)
    const y = 140 + count * 150
    return { ...node, x, y }
  })
}

function laneForNode(node: DraftNode): string {
  if (node.kind === "persona") return "persona"
  if (node.kind === "principle") return "principle"
  if (node.kind === "risk") return "risk"
  if (node.kind === "feature") return `phase-${node.phase ?? 1}`
  if (node.kind === "timeline") return "timeline"
  if (node.kind === "metrics") return "metrics"
  return "core"
}

function laneX(lane: string): number {
  if (lane === "persona") return -140
  if (lane === "core") return 360
  if (lane === "principle") return 40
  if (lane === "phase-1") return 760
  if (lane === "phase-2") return 1160
  if (lane === "phase-3") return 1560
  if (lane === "risk") return 1960
  if (lane === "timeline") return 1560
  if (lane === "metrics") return 1960
  return 360
}

function connectPhaseProgression(
  edges: CanvasEdge[],
  prefix: string,
  from: DraftNode[],
  to: DraftNode[],
  label: string
) {
  if (from.length === 0 || to.length === 0) return
  const fromSlice = from.slice(0, 5)
  const toSlice = to.slice(0, 5)
  for (let i = 0; i < fromSlice.length; i++) {
    const source = fromSlice[i]
    const target = toSlice[i % toSlice.length]
    edges.push(makeEdge(`${prefix}-phase-${source.id}-${target.id}`, source.id, target.id, label))
  }
}

function resolveSectionKind(key: string): SemanticKind {
  if (key.includes("overview")) return "overview"
  if (key.includes("problem")) return "problem"
  if (key.includes("persona")) return "persona"
  if (key.includes("feature")) return "feature"
  if (key.includes("principle")) return "principle"
  if (key.includes("risk")) return "risk"
  if (key.includes("timeline") || key.includes("roadmap")) return "timeline"
  if (key.includes("metric") || key.includes("kpi")) return "metrics"
  return "section"
}

function resolveBlockType(kind: SemanticKind): CanvasNode["data"]["blockType"] {
  if (kind === "problem") return "decision"
  if (kind === "feature") return "parallel"
  if (kind === "principle") return "text"
  if (kind === "risk") return "preview"
  if (kind === "timeline") return "loop"
  if (kind === "metrics") return "artifact"
  return "task"
}

function findSectionId(sections: DraftNode[], kindHint: string): string | null {
  return sections.find((item) => item.kind === resolveSectionKind(kindHint))?.id ?? null
}

function makeEdge(id: string, source: string, target: string, label?: string): CanvasEdge {
  return { id, source, target, label }
}

function summarizeValue(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 220)
  if (Array.isArray(value)) {
    return value
      .slice(0, 3)
      .map((item) => (typeof item === "string" ? item : summarizeValue(item)))
      .join(" | ")
  }
  if (isRecord(value)) {
    const strings = Object.values(value).filter((item): item is string => typeof item === "string")
    if (strings.length > 0) return strings.slice(0, 2).join(" | ").slice(0, 220)
    return `Contains ${Object.keys(value).length} fields`
  }
  return ""
}

function inferPhase(value: string): 1 | 2 | 3 {
  const lower = value.toLowerCase()
  if (lower.includes("phase 2") || lower.includes("phase_2") || lower.includes("phase2")) return 2
  if (lower.includes("phase 3") || lower.includes("phase_3") || lower.includes("phase3")) return 3
  return 1
}

function numericPrefix(key: string): number {
  const match = key.match(/^(\d+)_/)
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER
}

function prettifyKey(key: string): string {
  return key
    .replace(/^\d+_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function asRecordArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is JsonRecord => isRecord(item))
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
