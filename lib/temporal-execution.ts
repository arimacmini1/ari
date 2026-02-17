import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

export interface TemporalAssignment {
  id: string
  assigned_agent_id_or_pool: string
  estimated_cost: number
  estimated_duration: number
  status?: string
}

export interface TemporalExecutionPayload {
  execution_id: string
  rule_set_id: string
  assignment_plan: TemporalAssignment[]
}

export interface TemporalExecutionTaskResult {
  id: string
  assigned_agent_id_or_pool: string
  status: "complete" | "failed"
  estimated_cost: number
  actual_cost: number
  estimated_duration: number
  actual_duration: number
}

export interface TemporalExecutionResult {
  execution_id: string
  rule_set_id: string
  status: "complete" | "failed"
  tasks: TemporalExecutionTaskResult[]
  actual_cost: number
  actual_duration: number
  task_count: number
}

const REPO_ROOT = process.cwd()
const TEMPORAL_WORKER_DIR = path.join(REPO_ROOT, "temporal_worker")
const PYTHON_VENV_BIN = path.join(TEMPORAL_WORKER_DIR, ".venv", "bin", "python")
const EXECUTION_RUNNER = path.join(TEMPORAL_WORKER_DIR, "run_execution.py")

function temporalExecutionEnabledByEnv() {
  const env = process.env.AEI_TEMPORAL_EXECUTION_ENABLED
  return env !== "0" && env !== "false"
}

function resolvePythonExecutable() {
  // First check venv, then try common macOS paths
  if (existsSync(PYTHON_VENV_BIN)) return PYTHON_VENV_BIN
  // Try to find python3 in common locations
  const possiblePaths = [
    "/usr/bin/python3",
    "/usr/local/bin/python3",
    "/opt/homebrew/bin/python3",
    "/opt/homebrew/bin/python",
    "python3",
  ]
  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }
  return "python3" // fallback to PATH search
}

export function canRunTemporalExecution(): boolean {
  if (!temporalExecutionEnabledByEnv()) return false
  return existsSync(EXECUTION_RUNNER)
}

export async function runTemporalExecutionWorkflow(
  payload: TemporalExecutionPayload
): Promise<{ workflowId: string; result: TemporalExecutionResult }> {
  const pythonExecutable = resolvePythonExecutable()
  const runnerInput = JSON.stringify(payload)

  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, [EXECUTION_RUNNER], {
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

    child.on("error", (error) => {
      reject(
        new Error(`Failed to start Temporal execution runner: ${String(error)}`)
      )
    })

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Temporal execution runner exited with code ${code}. stderr=${stderr || "(empty)"}`
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
        reject(new Error("Temporal execution runner produced no output"))
        return
      }

      let parsed: { workflow_id: string; result: TemporalExecutionResult }
      try {
        parsed = JSON.parse(lastLine)
      } catch (error) {
        reject(
          new Error(
            `Unable to parse Temporal execution output as JSON. Output=${lastLine}. Error=${String(error)}`
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
