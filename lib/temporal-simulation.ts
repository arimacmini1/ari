import { spawn } from "node:child_process"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import net from "node:net"
import path from "node:path"

export interface TemporalSimulationInstructionNode {
  id: string
  type: string
  description: string
  estimated_cost?: number
  estimated_duration?: number
  dependencies?: string[]
}

export interface TemporalSimulationAssignment {
  id: string
  assigned_agent_id_or_pool: string
  estimated_cost: number
  estimated_duration: number
  status?: string
}

export interface TemporalSimulationPayload {
  simulation_id: string
  rule_set_id: string
  instruction_graph: TemporalSimulationInstructionNode[]
  assignment_plan: TemporalSimulationAssignment[]
  artifact_candidates?: Array<{
    type: string
    language?: string
    content: string
    metadata?: {
      size?: number
      lines?: number
      complexity_score?: number
      language?: string
      created_at?: string
      version_id?: string
    }
  }>
}

export interface TemporalSimulationTaskResult {
  id: string
  assigned_agent_id_or_pool: string
  status: "complete" | "failed"
  estimated_cost: number
  actual_cost: number
  estimated_duration: number
  actual_duration: number
}

export interface TemporalSimulationResult {
  simulation_id: string
  rule_set_id: string
  status: "complete" | "failed"
  tasks: TemporalSimulationTaskResult[]
  artifacts: Array<{
    type: string
    language?: string
    content: string
    metadata: {
      size: number
      lines: number
      complexity_score?: number
      language?: string
      created_at: string
      version_id: string
    }
  }>
  task_count: number
}

const REPO_ROOT = process.cwd()
const TEMPORAL_WORKER_DIR = path.join(REPO_ROOT, "temporal_worker")
const PYTHON_VENV_BIN = path.join(TEMPORAL_WORKER_DIR, ".venv", "bin", "python")
const SIMULATION_RUNNER = path.join(TEMPORAL_WORKER_DIR, "run_simulation.py")

function temporalSimulationEnabledByEnv() {
  const env = process.env.AEI_TEMPORAL_SIMULATION_ENABLED
  return env !== "0" && env !== "false"
}

function resolvePythonExecutable() {
  if (existsSync(PYTHON_VENV_BIN)) return PYTHON_VENV_BIN
  return "python3"
}

export function canRunTemporalSimulation(): boolean {
  if (!temporalSimulationEnabledByEnv()) return false
  return existsSync(SIMULATION_RUNNER)
}

function isTemporalWorkerProcessRunning(): boolean {
  if (process.platform === "win32") return true
  try {
    const result = spawnSync("pgrep", ["-f", "temporal_worker/worker.py"], {
      cwd: REPO_ROOT,
      stdio: "ignore",
    })
    return result.status === 0
  } catch {
    return false
  }
}

function canConnectTemporalServer(timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once("connect", () => done(true))
    socket.once("timeout", () => done(false))
    socket.once("error", () => done(false))
    socket.connect(7233, "127.0.0.1")
  })
}

export async function getTemporalSimulationPreflight(): Promise<{
  ok: boolean
  reason?: string
}> {
  if (!temporalSimulationEnabledByEnv()) {
    return {
      ok: false,
      reason: "AEI_TEMPORAL_SIMULATION_ENABLED is disabled.",
    }
  }
  if (!existsSync(SIMULATION_RUNNER)) {
    return {
      ok: false,
      reason: "Temporal simulation runner script is missing.",
    }
  }
  const serverReachable = await canConnectTemporalServer()
  if (!serverReachable) {
    return {
      ok: false,
      reason: "Temporal server is unreachable on localhost:7233.",
    }
  }
  if (!isTemporalWorkerProcessRunning()) {
    return {
      ok: false,
      reason: "Temporal worker is not running (expected process: temporal_worker/worker.py).",
    }
  }
  return { ok: true }
}

export async function runTemporalSimulationWorkflow(
  payload: TemporalSimulationPayload
): Promise<{ workflowId: string; result: TemporalSimulationResult }> {
  const pythonExecutable = resolvePythonExecutable()
  const runnerInput = JSON.stringify(payload)
  const timeoutMs = Math.max(
    1000,
    Number(process.env.AEI_TEMPORAL_SIMULATION_TIMEOUT_MS || 12000)
  )

  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, [SIMULATION_RUNNER], {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })

    const timeout = setTimeout(() => {
      child.kill("SIGKILL")
      reject(
        new Error(
          `Temporal simulation runner timed out after ${timeoutMs}ms`
        )
      )
    }, timeoutMs)

    child.on("error", (error) => {
      clearTimeout(timeout)
      reject(
        new Error(`Failed to start Temporal simulation runner: ${String(error)}`)
      )
    })

    child.on("close", (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        reject(
          new Error(
            `Temporal simulation runner exited with code ${code}. stderr=${stderr || "(empty)"}`
          )
        )
        return
      }

      const lines = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
      const lastLine = lines[lines.length - 1]
      if (!lastLine) {
        reject(new Error("Temporal simulation runner produced no output"))
        return
      }

      let parsed: { workflow_id: string; result: TemporalSimulationResult }
      try {
        parsed = JSON.parse(lastLine)
      } catch (error) {
        reject(
          new Error(
            `Unable to parse Temporal simulation output as JSON. Output=${lastLine}. Error=${String(error)}`
          )
        )
        return
      }

      resolve({ workflowId: parsed.workflow_id, result: parsed.result })
    })

    child.stdin.write(runnerInput)
    child.stdin.end()
  })
}
