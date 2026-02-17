/**
 * ARI Agent Tools Registry
 * 
 * Defines the actual tools available to agents when they execute.
 * These connect to code-server and the file system.
 * 
 * @see PRD Section 4.2.1 - "Native Temporal/langchain agents w/ tools (read/write/search/runCmd)"
 */

import { spawn, execSync } from "node:child_process"
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

export interface ToolResult {
  success: boolean
  output?: string
  error?: string
  duration_ms?: number
}

export interface ToolContext {
  workspacePath: string  // Root of the project being edited
  repoUrl?: string
  repoBranch?: string
  repoCommit?: string
}

/**
 * Read a file from the workspace
 */
export async function tool_read_file(path: string, context: ToolContext): Promise<ToolResult> {
  const start = Date.now()
  try {
    const fullPath = join(context.workspacePath, path)
    const content = readFileSync(fullPath, "utf-8")
    return {
      success: true,
      output: content,
      duration_ms: Date.now() - start,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - start,
    }
  }
}

/**
 * Write content to a file
 */
export async function tool_write_file(
  path: string,
  content: string,
  context: ToolContext
): Promise<ToolResult> {
  const start = Date.now()
  try {
    const fullPath = join(context.workspacePath, path)
    
    // Create parent directories if needed
    const { mkdirSync, dirname } = await import("node:fs")
    mkdirSync(dirname(fullPath), { recursive: true })
    
    writeFileSync(fullPath, content, "utf-8")
    return {
      success: true,
      output: `Written ${content.length} bytes to ${path}`,
      duration_ms: Date.now() - start,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - start,
    }
  }
}

/**
 * Search codebase using grep
 */
export async function tool_search_codebase(
  pattern: string,
  context: ToolContext,
  options?: { glob?: string; ignore?: string[] }
): Promise<ToolResult> {
  const start = Date.now()
  try {
    const { grepSync } = await import("node:fs")
    
    const ignoreFlags = options?.ignore?.map(i => `--ignore=${i}`).join(" ") || "--ignore=node_modules --ignore=.git"
    const globFlag = options?.glob ? `--include=${options.glob}` : ""
    
    const cmd = `grep -rn ${ignoreFlags} ${globFlag} "${pattern}" "${context.workspacePath}" | head -50`
    const output = execSync(cmd, { encoding: "utf-8", timeout: 30000 })
    
    return {
      success: true,
      output: output || "No matches found",
      duration_ms: Date.now() - start,
    }
  } catch (error: any) {
    if (error.status === 1) {
      return { success: true, output: "No matches found", duration_ms: Date.now() - start }
    }
    return {
      success: false,
      error: error.message,
      duration_ms: Date.now() - start,
    }
  }
}

/**
 * Run a shell command
 */
export async function tool_run_command(
  command: string,
  context: ToolContext,
  options?: { cwd?: string; timeout?: number }
): Promise<ToolResult> {
  const start = Date.now()
  const cwd = options?.cwd || context.workspacePath
  
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
    })
    
    let stdout = ""
    let stderr = ""
    const timeout = options?.timeout || 60000
    
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve({
        success: false,
        error: `Command timed out after ${timeout}ms`,
        duration_ms: Date.now() - start,
      })
    }, timeout)
    
    child.stdout.on("data", (data) => { stdout += data.toString() })
    child.stderr.on("data", (data) => { stderr += data.toString() })
    
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({
        success: code === 0,
        output: stdout,
        error: code !== 0 ? stderr : undefined,
        duration_ms: Date.now() - start,
      })
    })
    
    child.on("error", (error) => {
      clearTimeout(timer)
      resolve({
        success: false,
        error: error.message,
        duration_ms: Date.now() - start,
      })
    })
  })
}

/**
 * Run tests
 */
export async function tool_run_tests(
  context: ToolContext,
  options?: { testPath?: string; coverage?: boolean }
): Promise<ToolResult> {
  const start = Date.now()
  
  // Detect test framework and run appropriate command
  const hasJest = existsSync(join(context.workspacePath, "package.json"))
  const testPath = options?.testPath || "."
  
  let command = "npm test"
  if (options?.coverage) {
    command = "npm test -- --coverage"
  }
  if (testPath !== ".") {
    command = `npm test -- ${testPath}`
  }
  
  return tool_run_command(command, context, { timeout: 120000 })
}

/**
 * Format code
 */
export async function tool_format_code(
  context: ToolContext,
  options?: { path?: string }
): Promise<ToolResult> {
  const path = options?.path || "."
  
  // Try prettier first, then fall back to other formatters
  const prettier = join(context.workspacePath, "node_modules/.bin/prettier")
  if (existsSync(prettier)) {
    return tool_run_command(`${prettier} --write ${path}`, context, { timeout: 60000 })
  }
  
  return tool_run_command(`npm run format -- --write ${path}`, context, { timeout: 60000 })
}

/**
 * Lint code
 */
export async function tool_lint_code(
  context: ToolContext,
  options?: { path?: string; fix?: boolean }
): Promise<ToolResult> {
  const path = options?.path || "."
  const fix = options?.fix ? "--fix" : ""
  
  return tool_run_command(`npm run lint ${path} ${fix}`.trim(), context, { timeout: 60000 })
}

/**
 * List files in directory
 */
export async function tool_list_files(
  path: string,
  context: ToolContext,
  options?: { recursive?: boolean; maxDepth?: number }
): Promise<ToolResult> {
  const start = Date.now()
  const root = join(context.workspacePath, path)
  
  try {
    const files: string[] = []
    
    function walk(dir: string, depth: number) {
      if (options?.maxDepth && depth > options.maxDepth) return
      
      const entries = readdirSync(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const relativePath = relative(context.workspacePath, fullPath)
        
        if (entry === "node_modules" || entry === ".git" || entry.includes("dist") || entry.includes(".next")) {
          continue
        }
        
        files.push(relativePath)
        
        if (options?.recursive && statSync(fullPath).isDirectory()) {
          walk(fullPath, depth + 1)
        }
      }
    }
    
    walk(root, 0)
    
    return {
      success: true,
      output: files.slice(0, 100).join("\n"),
      duration_ms: Date.now() - start,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - start,
    }
  }
}

/**
 * Get repository info
 */
export function getRepoContext(context: ToolContext): string {
  const parts = []
  if (context.repoUrl) parts.push(`URL: ${context.repoUrl}`)
  if (context.repoBranch) parts.push(`Branch: ${context.repoBranch}`)
  if (context.repoCommit) parts.push(`Commit: ${context.repoCommit}`)
  parts.push(`Workspace: ${context.workspacePath}`)
  return parts.join("\n")
}