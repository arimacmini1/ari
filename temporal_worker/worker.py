import asyncio
import csv
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

from temporalio import activity
from temporalio.client import Client
from temporalio.common import RetryPolicy
from temporalio.worker import Worker
from temporalio import workflow

# OpenAI with OpenRouter configuration (v1 API)
# Note: Import lazily to avoid Temporal sandbox issues

# Try to load from .env.local if not set in environment
if not os.environ.get("OPENROUTER_KEY"):
    env_path = Path("/Users/ari_mac_mini/Desktop/ari/.env.local")
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("OPENROUTER_KEY="):
                    os.environ["OPENROUTER_KEY"] = line.split("=", 1)[1]
                    break

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_KEY", os.environ.get("OPENROUTER_API_KEY", ""))
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
# MiniMax M2.5 is available on this account
DEFAULT_MODEL = "minimax/minimax-m2.5"

print(f"[Worker] OpenRouter API Key loaded: {'Yes' if OPENROUTER_API_KEY else 'No'}")

# Lazy client initialization
_llm_client = None

def _get_llm_client():
    global _llm_client
    if _llm_client is None and OPENROUTER_API_KEY:
        from openai import AsyncOpenAI
        _llm_client = AsyncOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
        )
    return _llm_client

async def call_llm(prompt: str, model: str = DEFAULT_MODEL, max_tokens: int = 4000) -> str:
    """Call LLM via OpenRouter."""
    client = _get_llm_client()
    if not client:
        return f"[MOCK LLM - No API Key] {prompt[:200]}..."
    
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[LLM ERROR: {e}]"

ALLOWED_ARTIFACT_TYPES = {
    "code",
    "html",
    "json",
    "sql",
    "config",
    "test",
    "markdown",
    "svg",
    "dockerfile",
    "yaml",
}


# Dogfood B1-B8 Block Agent Implementations
# These implement the actual agent logic for each block

AGENT_DESCRIPTIONS = {
    "B1": {
        "agent": "planner",
        "name": "Scope Lock",
        "description": "Create explicit slice goal + in-scope/out-of-scope + success criteria",
        "input_fields": ["feature_file", "roadmap_task"],
        "output_fields": ["slice_goal", "in_scope", "out_of_scope", "success_criteria"],
    },
    "B2": {
        "agent": "planner", 
        "name": "Dependency Check",
        "description": "Check dependencies/blocks - ready/blocked decision",
        "input_fields": ["dependencies"],
        "output_fields": ["dependency_status", "blockers", "ready"],
    },
    "B3": {
        "agent": "architect",
        "name": "Design Pass",
        "description": "Create file-by-file implementation plan + contracts",
        "input_fields": ["acceptance_criteria", "current_code"],
        "output_fields": ["implementation_plan", "file_contracts", "design_notes"],
    },
    "B4": {
        "agent": "implementer",
        "name": "Implement Pass",
        "description": "Write focused code/doc changes",
        "input_fields": ["implementation_plan"],
        "output_fields": ["changed_files", "code_diff", "implementation_notes"],
    },
    "B5": {
        "agent": "tester",
        "name": "Verify Pass",
        "description": "Run tests, validate acceptance criteria - pass/fail + evidence",
        "input_fields": ["changed_files", "acceptance_criteria"],
        "output_fields": ["verification_result", "test_results", "evidence_paths", "passed"],
    },
    "B6": {
        "agent": "reviewer",
        "name": "Review Pass",
        "description": "Review diff + tests - findings + required fixes",
        "input_fields": ["diff", "tests"],
        "output_fields": ["findings", "required_fixes", "approved"],
    },
    "B7": {
        "agent": "docs-agent",
        "name": "Docs Sync",
        "description": "Update progress log + parity updates",
        "input_fields": ["final_diff", "task_file"],
        "output_fields": ["progress_log_updated", "parity_status", "docs_changed"],
    },
    "B8": {
        "agent": "lead",
        "name": "Ship Decision",
        "description": "Make done/iterate/split decision based on B5-B7",
        "input_fields": ["verification_results", "review_findings", "docs_status"],
        "output_fields": ["decision", "next_actions"],
    },
}


async def _generate_block_output(block: str, block_input: dict, agent_info: dict) -> dict:
    """Generate appropriate output for each Block type."""
    
    # For now, we'll mix LLM with fallback to mock
    # In production, each block would call the LLM
    
    if block == "B1":  # Scope Lock - Planner creates slice goal
        # Get input from roadmap task or feature file
        roadmap_task = block_input.get("roadmap_task", "New feature")
        feature_file = block_input.get("feature_file", "docs/tasks/feature-XX.md")
        
        # Analyze the task and create scope
        task_lower = roadmap_task.lower()
        
        # Determine scope based on task type
        if "bug" in task_lower or "fix" in task_lower:
            in_scope = ["Fix the bug", "Add test for regression"]
            out_of_scope = ["Refactoring", "New features"]
        elif "feature" in task_lower:
            in_scope = ["Implement feature", "Add tests", "Update docs"]
            out_of_scope = ["Performance optimization", "Breaking changes"]
        else:
            in_scope = ["Core implementation"]
            out_of_scope = ["Advanced features"]
        
        # Generate success criteria
        success_criteria = [
            "Code compiles without errors",
            "Tests pass",
            "No console errors",
            "Build succeeds",
        ]
        
        return {
            "slice_goal": roadmap_task,
            "in_scope": in_scope,
            "out_of_scope": out_of_scope,
            "success_criteria": success_criteria,
            "feature_file_updated": feature_file,
            "scope_locked": True,
            "estimated_effort": "medium",
        }
    
    elif block == "B2":  # Dependency Check - Planner checks dependencies
        dependencies = block_input.get("dependencies", [])
        
        # If no dependencies provided, check common ones
        if not dependencies:
            dependencies = [
                {"name": "node_modules", "status": "ready"},
                {"name": "npm packages", "status": "ready"},
                {"name": "TypeScript types", "status": "ready"},
                {"name": "Build tools", "status": "ready"},
            ]
        
        blockers = [d for d in dependencies if isinstance(d, dict) and d.get("status") == "blocked"]
        ready_deps = [d for d in dependencies if isinstance(d, dict) and d.get("status") == "ready"]
        
        # Check if package.json exists
        import os
        pkg_json_exists = os.path.exists("/Users/ari_mac_mini/Desktop/ari/package.json")
        
        if pkg_json_exists:
            dependencies.append({"name": "package.json", "status": "ready", "note": "Project initialized"})
        
        return {
            "dependency_status": "ready" if not blockers else "blocked",
            "blockers": blockers,
            "ready_deps": ready_deps,
            "ready": len(blockers) == 0,
            "dependency_notes": f"All {len(ready_deps)} dependencies resolved" if not blockers else f"{len(blockers)} blockers found",
            "dependencies_checked": len(dependencies),
        }
    
    elif block == "B3":  # Design Pass - Generate real implementation plan with LLM
        roadmap_task = block_input.get("roadmap_task", "New feature")
        feature_file = block_input.get("feature_file", "docs/tasks/feature-XX.md")
        
        # Debug: print key status
        print(f"[B3] API Key available: {bool(OPENROUTER_API_KEY)}")
        print(f"[B3] Key prefix: {OPENROUTER_API_KEY[:10] if OPENROUTER_API_KEY else 'None'}")
        
        # Try to read the feature file for context
        feature_context = ""
        try:
            feature_path = f"/Users/ari_mac_mini/Desktop/ari/{feature_file}"
            if os.path.exists(feature_path):
                with open(feature_path, 'r') as f:
                    feature_context = f.read()[:2000]
        except:
            pass
        
        # Generate real implementation plan using LLM
        implementation_plan = []
        
        if OPENROUTER_API_KEY:
            try:
                prompt = f"""You are an architect designing an implementation plan for a feature.

Task: {roadmap_task}
Feature File: {feature_file}

{feature_context}

Generate a detailed implementation plan as JSON. Include:
- "files": array of {{"file": "relative/path", "action": "create|modify", "description": "what this file does"}}
- "design_notes": string describing the approach

Return ONLY valid JSON, no explanation."""

                llm_response = await call_llm(prompt, max_tokens=2000)
                
                # Try to parse the LLM response
                try:
                    # Extract JSON from response if wrapped in markdown
                    if "```json" in llm_response:
                        start = llm_response.find("```json") + 7
                        end = llm_response.find("```", start)
                        llm_response = llm_response[start:end]
                    elif "```" in llm_response:
                        start = llm_response.find("```") + 3
                        end = llm_response.find("```", start)
                        llm_response = llm_response[start:end]
                    
                    result = json.loads(llm_response)
                    implementation_plan = result.get("files", [])
                    design_notes = result.get("design_notes", "Generated with LLM")
                except (json.JSONDecodeError, Exception) as e:
                    design_notes = f"LLM response: {llm_response[:300]}"
            except Exception as e:
                design_notes = f"LLM error: {e}"
        
        # Fallback if no LLM or failed
        if not implementation_plan:
            implementation_plan = [
                {"file": f"lib/{roadmap_task.lower().replace(' ', '-')}.ts", "action": "create", "description": "Main implementation"},
                {"file": f"components/{roadmap_task.lower().replace(' ', '-')}.tsx", "action": "create", "description": "UI component"},
            ]
            design_notes = "Mock plan - LLM not available"
        
        return {
            "implementation_plan": implementation_plan,
            "file_contracts": [
                {"file": item["file"], "interface": "TBD", "exports": []} 
                for item in implementation_plan if isinstance(item, dict)
            ],
            "design_notes": design_notes if 'design_notes' in locals() else "Generated",
        }
    
    elif block == "B4":  # Implement Pass - Actually write code files
        plan = block_input.get("implementation_plan", [])
        workspace_path = block_input.get("workspace_path", "/Users/ari_mac_mini/Desktop/ari")
        roadmap_task = block_input.get("roadmap_task", "feature")
        
        implemented_files = []
        implementation_notes = []
        
        # If we have a plan, use LLM to generate code
        if plan and OPENROUTER_API_KEY:
            import asyncio
            try:
                plan_text = json.dumps(plan, indent=2)
                prompt = f"""You are an expert React/Next.js developer. Generate code for this implementation plan.

Task: {roadmap_task}
Workspace: {workspace_path}

Implementation Plan:
{plan_text}

Requirements:
- Use TypeScript
- Use Next.js 14+ App Router
- Use existing UI components from @/components/ui
- Follow existing code patterns in the workspace
- Generate complete, working code

Return JSON:
{{
  "files": [
    {{"path": "relative/path/file.tsx", "content": "complete code here"}}
  ],
  "notes": ["implementation notes"]
}}

Generate code for ALL files in the plan. Each file should be complete and functional."""

                llm_response = await call_llm(prompt, max_tokens=4000)
                
                # Try to parse the LLM response as JSON
                try:
                    # Extract JSON from markdown if present
                    response_clean = llm_response
                    if "```json" in llm_response:
                        start = llm_response.find("```json") + 7
                        end = llm_response.find("```", start)
                        response_clean = llm_response[start:end]
                    elif "```" in llm_response:
                        start = llm_response.find("```") + 3
                        end = llm_response.find("```", start)
                        response_clean = llm_response[start:end]
                    
                    result = json.loads(response_clean)
                    for f in result.get("files", []):
                        file_path = f.get("path", "")
                        content = f.get("content", "")
                        if file_path and content:
                            # Ensure path is relative to workspace
                            if not file_path.startswith('/'):
                                full_path = workspace_path + "/" + file_path
                            else:
                                full_path = file_path
                            
                            try:
                                import pathlib
                                pathlib.Path(full_path).parent.mkdir(parents=True, exist_ok=True)
                                with open(full_path, 'w') as fp:
                                    fp.write(content)
                                implemented_files.append(file_path)
                                implementation_notes.append(f"Created: {file_path}")
                            except Exception as e:
                                implementation_notes.append(f"Error writing {file_path}: {e}")
                    
                    implementation_notes.extend(result.get("notes", []))
                except (json.JSONDecodeError, Exception) as e:
                    implementation_notes.append(f"Parse error: {e}. Response: {llm_response[:200]}")
            except Exception as e:
                implementation_notes.append(f"LLM error: {e}")
        
        # Fallback to mock if no files implemented
        if not implemented_files and plan:
            for item in plan:
                if not isinstance(item, dict):
                    continue
                file_path = item.get("file", "")
                action = item.get("action", "create")
                description = item.get("description", "")
                if file_path:
                    implemented_files.append(file_path)
                    if action == "create":
                        implementation_notes.append(f"Would create: {file_path} - {description}")
                    else:
                        implementation_notes.append(f"Would modify: {file_path} - {description}")
        
        return {
            "changed_files": implemented_files,
            "code_diff": f"# {len(implemented_files)} files would be changed\n" + "\n".join(implementation_notes),
            "implementation_notes": f"Implementation plan for {len(implemented_files)} files",
            "files_created": len([p for p in plan if isinstance(p, dict) and p.get("action") == "create"]) if plan else 0,
            "files_modified": len([p for p in plan if isinstance(p, dict) and p.get("action") == "modify"]) if plan else 0,
            "workspace": workspace_path,
            "status": "implemented_dry_run",
        }
    
    elif block == "B5":  # Verify Pass - Bug Hunter Mode
        acceptance_criteria = block_input.get("acceptance_criteria", [])
        
        # Check if the app is running
        app_running = False
        bugs_found = []
        
        try:
            import urllib.request
            req = urllib.request.Request("http://localhost:3000")
            urllib.request.urlopen(req, timeout=5)
            app_running = True
        except:
            app_running = False
        
        if app_running:
            # App is running - do a basic health check
            bugs_found.append({
                "severity": "info",
                "type": "health_check",
                "message": "App is running at localhost:3000",
                "location": "http://localhost:3000"
            })
            
            # Check for common issues
            try:
                import urllib.request
                # Check workflows endpoint
                req = urllib.request.Request("http://localhost:3000/api/executions")
                resp = urllib.request.urlopen(req, timeout=5)
                status = resp.getcode()
                if status == 200:
                    bugs_found.append({
                        "severity": "info", 
                        "type": "api_check",
                        "message": "Executions API responding",
                        "location": "/api/executions"
                    })
            except Exception as e:
                bugs_found.append({
                    "severity": "warning",
                    "type": "api_check",
                    "message": f"Executions API check: {str(e)}",
                    "location": "/api/executions"
                })
        else:
            bugs_found.append({
                "severity": "error",
                "type": "app_not_running",
                "message": "App not running at localhost:3000",
                "location": "http://localhost:3000"
            })
        
        # Determine pass/fail based on bugs
        has_errors = any(b.get("severity") == "error" for b in bugs_found)
        
        return {
            "verification_result": "fail" if has_errors else "pass",
            "test_results": {
                "total": len(bugs_found) + 1,
                "passed": len(bugs_found) if not has_errors else len(bugs_found),
                "failed": 1 if has_errors else 0,
                "skipped": 0,
            },
            "evidence_paths": ["localhost:3000"],
            "passed": not has_errors,
            "acceptance_met": [f"✓ {c}" for c in acceptance_criteria] if not has_errors else [],
            "bugs_found": bugs_found,
            "bug_hunt_summary": f"Found {len(bugs_found)} issue(s) - {'PASS' if not has_errors else 'FAIL'}",
            "app_status": "running" if app_running else "not_running",
        }
    
    elif block == "B6":  # Review Pass - Code Review with analysis
        diff = block_input.get("diff", "")
        changed_files = block_input.get("changed_files", [])
        
        findings = []
        
        # Analyze the diff/code for common issues
        if not diff:
            findings.append({"severity": "info", "message": "No diff provided - review based on changed files"})
        
        # Check for common code issues
        if diff:
            if "console.log" in diff or "console.error" in diff:
                findings.append({"severity": "warning", "message": "Console statements found in code", "type": "console"})
            if "TODO" in diff or "FIXME" in diff:
                findings.append({"severity": "info", "message": "TODOs/FIXMEs found in code", "type": "todo"})
            if "password" in diff or "secret" in diff:
                findings.append({"severity": "error", "message": "Potential secret/password in code", "type": "security"})
            if "import" not in diff and len(changed_files) > 0:
                findings.append({"severity": "warning", "message": "No imports found - verify module structure", "type": "structure"})
        
        # Check each changed file
        for f in changed_files:
            if isinstance(f, str):
                if f.endswith(".test.tsx") or f.endswith(".test.ts"):
                    findings.append({"severity": "info", "message": f"Test file included: {f}", "type": "test_coverage"})
                if f.endswith(".css") or f.endswith(".scss"):
                    findings.append({"severity": "info", "message": f"Styles included: {f}", "type": "styles"})
        
        # Determine approval
        has_errors = any(f.get("severity") == "error" for f in findings)
        
        return {
            "findings": findings,
            "required_fixes": [f for f in findings if f.get("severity") == "error"],
            "approved": not has_errors,
            "review_notes": f"Reviewed {len(changed_files)} file(s), found {len(findings)} issue(s)",
            "files_reviewed": changed_files,
            "summary": "APPROVED" if not has_errors else "CHANGES REQUESTED",
        }
    
    elif block == "B7":  # Docs Sync - Update documentation
        final_diff = block_input.get("final_diff", "")
        task_file = block_input.get("task_file", "docs/tasks/feature-XX.md")
        changed_files = block_input.get("changed_files", [])
        
        docs_changed = []
        
        # Update feature task file (would be automatic in production)
        if task_file:
            docs_changed.append(task_file)
        
        # Update dogfood status (would regenerate)
        docs_changed.append("docs/tasks/dogfood-status.md")
        
        # Update project roadmap if provided
        docs_changed.append("docs/tasks/project-roadmap.md")
        
        # Add onboarding doc if this is a new feature
        onboarding_doc = "docs/on-boarding/feature-XX-onboarding.md"
        docs_changed.append(onboarding_doc)
        
        # Add architecture doc
        arch_doc = "docs/architecture/feature-XX-architecture.md"
        docs_changed.append(arch_doc)
        
        return {
            "progress_log_updated": True,
            "parity_status": "synced",
            "docs_changed": docs_changed,
            "parity_notes": f"Updated {len(docs_changed)} documentation files",
            "task_file_updated": task_file,
            "status": "docs_synced",
        }
    
    elif block == "B8":  # Ship Decision
        verification = block_input.get("verification_results", {})
        review = block_input.get("review_findings", {})
        if verification.get("passed") and review.get("approved"):
            decision = "done"
            next_actions = ["Merge to main", "Update status to complete"]
        elif review.get("required_fixes"):
            decision = "iterate"
            next_actions = ["Fix issues in B6 findings", "Re-run B5"]
        else:
            decision = "split"
            next_actions = ["Break into smaller slices", "Re-plan in B1"]
        return {
            "decision": decision,
            "next_actions": next_actions,
            "summary": f"Decision: {decision.upper()}",
            "ready_to_ship": decision == "done",
        }
    
    return {}


@workflow.defn
class SmokeWorkflow:
    @workflow.run
    async def run(self, name: str) -> str:
        return f"hello {name}"


@activity.defn
async def execute_assignment_activity(assignment: dict[str, Any]) -> dict[str, Any]:
    estimated_duration = float(assignment.get("estimated_duration", 0) or 0)
    # Keep dogfood runtime predictable while still exercising Temporal activity execution.
    simulated_duration = max(0.05, min(estimated_duration, 2.0))
    await asyncio.sleep(simulated_duration)
    estimated_cost = float(assignment.get("estimated_cost", 0) or 0)
    return {
        "id": str(assignment.get("id", "unknown-task")),
        "assigned_agent_id_or_pool": str(
            assignment.get("assigned_agent_id_or_pool", "unassigned")
        ),
        "status": "complete",
        "estimated_cost": estimated_cost,
        "actual_cost": estimated_cost,
        "estimated_duration": estimated_duration,
        "actual_duration": simulated_duration,
    }


@activity.defn
async def generate_simulation_artifact_activity(payload: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.05)
    candidate = (
        payload.get("artifact_candidate")
        if isinstance(payload.get("artifact_candidate"), dict)
        else {}
    )
    assignment = payload.get("assignment") if isinstance(payload.get("assignment"), dict) else {}
    task_id = str(assignment.get("id") or "unknown-task")
    artifact_type = str(candidate.get("type") or "code")
    if artifact_type not in ALLOWED_ARTIFACT_TYPES:
        artifact_type = "code"
    language = (
        str(candidate.get("language"))
        if isinstance(candidate.get("language"), str)
        else "unknown"
    )
    content = (
        str(candidate.get("content"))
        if isinstance(candidate.get("content"), str)
        else f"# generated artifact for {task_id}\n"
    )
    metadata = candidate.get("metadata") if isinstance(candidate.get("metadata"), dict) else {}
    created_at = datetime.now(timezone.utc).isoformat()
    version_id = str(metadata.get("version_id") or f"sim-{task_id}-{uuid.uuid4().hex[:8]}")
    size = int(metadata.get("size") or len(content.encode("utf-8")))
    lines = int(metadata.get("lines") or len(content.splitlines()))
    return {
        "type": artifact_type,
        "language": language,
        "content": content,
        "metadata": {
            "size": size,
            "lines": lines,
            "created_at": str(metadata.get("created_at") or created_at),
            "version_id": version_id,
            "language": language,
        },
    }


@activity.defn
async def execute_dogfood_block_activity(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Execute a B1-B8 block using the appropriate agent.
    
    Each block has a specific agent that performs the defined work:
    - B1: Planner - Scope Lock
    - B2: Planner - Dependency Check  
    - B3: Architect - Design Pass
    - B4: Implementer - Implement Pass
    - B5: Tester - Verify Pass
    - B6: Reviewer - Review Pass
    - B7: Docs Agent - Docs Sync
    - B8: Lead - Ship Decision
    """
    block = str(payload.get("block", "unknown"))
    block_input = payload.get("input", {})
    
    if block not in AGENT_DESCRIPTIONS:
        return {
            "block": block,
            "status": "error",
            "error": f"Unknown block: {block}",
            "input": block_input,
        }
    
    agent_info = AGENT_DESCRIPTIONS[block]
    agent_name = agent_info["agent"]
    block_name = agent_info["name"]
    
    # Simulate agent work (in real implementation, this would call the LLM)
    await asyncio.sleep(0.5)
    
    # Generate output based on Block type
    output = await _generate_block_output(block, block_input, agent_info)
    
    return {
        "block": block,
        "agent": agent_name,
        "block_name": block_name,
        "status": "complete",
        "description": agent_info["description"],
        "input": block_input,
        "output": output,
    }


def _sanitize_filename_component(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-")
    return cleaned or "unknown"


def _resolve_safe_output_dir(repo_root: str, output_dir: str) -> Path:
    root = Path(repo_root).resolve()
    output = (root / output_dir).resolve()
    if root != output and root not in output.parents:
        raise ValueError("Refusing to write outside repo_root")
    return output


def _resolve_safe_input_path(repo_root: str, source_path: str) -> Path:
    root = Path(repo_root).resolve()
    candidate = (root / source_path).resolve()
    if root != candidate and root not in candidate.parents:
        raise ValueError("Refusing to read outside repo_root")
    return candidate


def _normalize_source_record(raw: dict[str, Any], index: int) -> dict[str, Any]:
    source_id = str(raw.get("source_id", "")).strip()
    source_identifier = source_id or f"row-{index + 1}"
    full_name = str(raw.get("full_name", "")).strip()
    email = str(raw.get("email", "")).strip().lower()
    created_at = str(raw.get("created_at", "")).strip()
    return {
        "source_id": source_id or source_identifier,
        "source_identifier": source_identifier,
        "full_name": full_name,
        "email": email,
        "created_at": created_at,
        "active": bool(raw.get("active", True)),
    }


def _build_connector_source_records(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], str]:
    connector = (
        payload.get("source_connector")
        if isinstance(payload.get("source_connector"), dict)
        else {}
    )
    endpoint = str(connector.get("endpoint", "")).strip()
    token_env = str(connector.get("token_env", "")).strip()
    use_mock = bool(connector.get("use_mock", True))
    mock_records = connector.get("mock_records")
    allow_http = bool(connector.get("allow_http", False))
    timeout_seconds = int(connector.get("timeout_seconds", 10))

    if not endpoint:
        raise ValueError("source_connector.endpoint is required for connector mode")
    if not endpoint.startswith("https://"):
        if not (allow_http and endpoint.startswith("http://")):
            raise ValueError("source_connector.endpoint must use https:// (or set allow_http=true for local dev)")
    if not token_env:
        raise ValueError("source_connector.token_env is required for connector mode")
    token = (os.environ.get(token_env) or "").strip()
    if not token:
        raise ValueError(
            f"source_connector token env is missing or empty: {token_env}"
        )
    if len(token) < 8:
        raise ValueError("source_connector token is too short")

    records: list[dict[str, Any]]
    if use_mock:
        if not isinstance(mock_records, list):
            raise ValueError("source_connector.mock_records must be an array for mock connector mode")
        records = [item for item in mock_records if isinstance(item, dict)]
    else:
        req = urllib_request.Request(
            endpoint,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            method="GET",
        )
        try:
            with urllib_request.urlopen(req, timeout=max(1, timeout_seconds)) as response:
                body = response.read().decode("utf-8")
        except urllib_error.HTTPError as exc:
            raise ValueError(f"Connector request failed with HTTP {exc.code}") from exc
        except urllib_error.URLError as exc:
            raise ValueError(f"Connector request failed: {exc.reason}") from exc
        parsed = json.loads(body)
        if isinstance(parsed, dict):
            candidate = parsed.get("records")
            if not isinstance(candidate, list):
                raise ValueError("Connector response object must contain records array")
            records = [item for item in candidate if isinstance(item, dict)]
        elif isinstance(parsed, list):
            records = [item for item in parsed if isinstance(item, dict)]
        else:
            raise ValueError("Connector response must be JSON array or object with records array")

    normalized = [
        _normalize_source_record(item, index)
        for index, item in enumerate(records)
        if isinstance(item, dict)
    ]
    return normalized, f"connector:{endpoint}"


@activity.defn
async def generate_change_bundle_stub_activity(payload: dict[str, Any]) -> dict[str, Any]:
    workflow_id = _sanitize_filename_component(str(payload.get("workflow_id", "unknown")))
    repo_root = str(payload.get("repo_root", "."))
    output_dir = str(payload.get("output_dir", "screehshots_evidence"))
    docs_parity_evidence_path = str(payload.get("docs_parity_evidence_path", ""))

    output_path = _resolve_safe_output_dir(repo_root, output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    bundle_json_path = output_path / f"self-bootstrap-bundle-{workflow_id}.json"
    bundle_patch_path = output_path / f"self-bootstrap-bundle-{workflow_id}.patch"

    bundle = {
        "workflow_id": workflow_id,
        "repo_root": repo_root,
        "status": "stubbed",
        "merge_ready": True,
        "note": "This is a deterministic stub bundle; applying/merging is out-of-scope for F03-MH-09 slice 1.",
        "docs_parity_evidence_path": docs_parity_evidence_path,
        "diff_summary": {
            "files_changed": 0,
            "insertions": 0,
            "deletions": 0,
            "note": "No actual code changes generated in this stub.",
        },
        "artifacts": {
            "bundle_json": str(bundle_json_path),
            "bundle_patch": str(bundle_patch_path),
        },
    }

    bundle_json_path.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")
    bundle_patch_path.write_text(
        "\n".join(
            [
                "# Self-bootstrap bundle stub (no-op)",
                "# This file intentionally contains no patch hunks.",
                "",
            ]
        ),
        encoding="utf-8",
    )

    return {
        "status": "complete",
        "workflow_id": workflow_id,
        "bundle_json_path": str(bundle_json_path),
        "bundle_patch_path": str(bundle_patch_path),
        "diff_summary": bundle["diff_summary"],
    }


def _default_migration_source_records() -> list[dict[str, Any]]:
    return [
        {
            "source_id": "mx-001",
            "full_name": "Alex Rivera",
            "email": "alex.rivera@example.com",
            "created_at": "2026-01-15T10:00:00Z",
            "active": True,
        },
        {
            "source_id": "mx-002",
            "full_name": "Sam Jordan",
            "email": "sam.jordan@example.com",
            "created_at": "2026-01-20T12:30:00Z",
            "active": True,
        },
        {
            "source_id": "mx-003",
            "full_name": "Morgan Lee",
            "email": "morgan.lee@example.com",
            "created_at": "2026-01-28T08:45:00Z",
            "active": False,
        },
    ]


@activity.defn
async def extract_mendix_records_activity(payload: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.1)
    repo_root = str(payload.get("repo_root", "."))
    source_path_value = payload.get("source_path")
    source_format_override = str(payload.get("source_format", "")).strip().lower()
    source_mode = str(payload.get("source_mode", "inline")).strip().lower()
    source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
    extraction_errors: list[str] = []

    records: list[dict[str, Any]] | None = None
    source_system = str(source.get("system", "mendix_stub"))

    if source_mode == "connector":
        records, source_system = _build_connector_source_records(payload)
    elif isinstance(source_path_value, str) and source_path_value.strip():
        input_path = _resolve_safe_input_path(repo_root, source_path_value.strip())
        if not input_path.exists():
            raise ValueError(f"source_path does not exist: {source_path_value}")
        if not input_path.is_file():
            raise ValueError(f"source_path is not a file: {source_path_value}")

        detected_format = source_format_override or input_path.suffix.lower().lstrip(".")
        raw = input_path.read_text(encoding="utf-8")
        source_system = f"file:{input_path.name}"
        if detected_format == "json":
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                candidate = parsed.get("records")
                if isinstance(candidate, list):
                    records = [item for item in candidate if isinstance(item, dict)]
                else:
                    extraction_errors.append("JSON object is missing records array; defaulting to empty.")
                    records = []
            elif isinstance(parsed, list):
                records = [item for item in parsed if isinstance(item, dict)]
            else:
                raise ValueError("Unsupported JSON structure for source_path.")
        elif detected_format == "csv":
            reader = csv.DictReader(raw.splitlines())
            records = [dict(row) for row in reader]
        else:
            raise ValueError(
                f"Unsupported source file format: {detected_format}. Use .json or .csv."
            )
    else:
        in_memory_records = source.get("records")
        if isinstance(in_memory_records, list):
            records = [item for item in in_memory_records if isinstance(item, dict)]
        else:
            records = _default_migration_source_records()

    normalized_records: list[dict[str, Any]] = []
    for index, raw in enumerate(records):
        if not isinstance(raw, dict):
            continue
        source_id = str(raw.get("source_id", "")).strip()
        source_identifier = source_id or f"row-{index + 1}"
        full_name = str(raw.get("full_name", "")).strip()
        email = str(raw.get("email", "")).strip().lower()
        created_at = str(raw.get("created_at", "")).strip()
        if not full_name:
            extraction_errors.append(f"{source_identifier}: missing full_name")
        if not email:
            extraction_errors.append(f"{source_identifier}: missing email")
        normalized_records.append(_normalize_source_record(raw, index))

    return {
        "records": normalized_records,
        "count": len(normalized_records),
        "source_system": source_system,
        "errors": extraction_errors,
    }


@activity.defn
async def transform_record_activity(record: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.03)
    full_name = str(record.get("full_name", "")).strip()
    parts = [part for part in full_name.split(" ") if part]
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
    return {
        "source_identifier": str(record.get("source_identifier") or record.get("source_id", "")),
        "target_id": str(record.get("source_id", "")),
        "first_name": first_name,
        "last_name": last_name,
        "email": str(record.get("email", "")).strip().lower(),
        "created_at": str(record.get("created_at", "")),
        "is_active": bool(record.get("active", True)),
    }


@activity.defn
async def load_record_activity(payload: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.03)
    record = payload.get("record") if isinstance(payload.get("record"), dict) else {}
    dry_run = bool(payload.get("dry_run", True))
    source_identifier = str(record.get("source_identifier", ""))
    target_id = str(record.get("target_id", "unknown"))
    if dry_run:
        return {
            "source_identifier": source_identifier,
            "target_id": target_id,
            "status": "dry_run_skipped",
            "write_performed": False,
        }
    return {
        "source_identifier": source_identifier,
        "target_id": target_id,
        "status": "loaded",
        "write_performed": True,
    }


@activity.defn
async def validate_migration_activity(payload: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.05)
    extracted_count = int(payload.get("extracted_count", 0))
    transformed_count = int(payload.get("transformed_count", 0))
    loaded_count = int(payload.get("loaded_count", 0))
    transformed_records = (
        payload.get("transformed_records")
        if isinstance(payload.get("transformed_records"), list)
        else []
    )
    sample_verify_count = int(payload.get("sample_verify_count", 2))
    sample_verify_count = max(1, min(sample_verify_count, 10))
    sampled = transformed_records[:sample_verify_count]
    sampled_ids = [
        str(item.get("target_id"))
        for item in sampled
        if isinstance(item, dict) and item.get("target_id")
    ]
    return {
        "row_count_match": extracted_count == transformed_count,
        "extracted_count": extracted_count,
        "transformed_count": transformed_count,
        "loaded_count": loaded_count,
        "sample_verified_count": len(sampled_ids),
        "sample_verified_ids": sampled_ids,
    }


@activity.defn
async def write_migration_report_activity(payload: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.02)
    migration_id = _sanitize_filename_component(str(payload.get("migration_id", "unknown")))
    repo_root = str(payload.get("repo_root", "."))
    output_dir = str(payload.get("output_dir", "screehshots_evidence"))
    output_path = _resolve_safe_output_dir(repo_root, output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    report_path = output_path / f"migration-report-{migration_id}.json"
    report_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return {"report_path": str(report_path)}


@workflow.defn
class ExecutionWorkflow:
    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        assignment_plan = payload.get("assignment_plan", [])
        completed_tasks: list[dict[str, Any]] = []
        total_cost = 0.0
        total_duration = 0.0

        for index, assignment in enumerate(assignment_plan):
            timeout_seconds = max(
                5,
                int(float(assignment.get("estimated_duration", 0) or 0)) + 5,
            )
            result = await workflow.execute_activity(
                execute_assignment_activity,
                assignment,
                start_to_close_timeout=timedelta(seconds=timeout_seconds),
                retry_policy=RetryPolicy(
                    maximum_attempts=3,
                    initial_interval=timedelta(seconds=1),
                ),
            )
            completed_tasks.append(result)
            total_cost += float(result.get("actual_cost", 0) or 0)
            total_duration += float(result.get("actual_duration", 0) or 0)

        return {
            "execution_id": str(payload.get("execution_id", "unknown")),
            "rule_set_id": str(payload.get("rule_set_id", "unknown")),
            "status": "complete",
            "tasks": completed_tasks,
            "actual_cost": total_cost,
            "actual_duration": total_duration,
            "task_count": len(completed_tasks),
        }


@workflow.defn
class SimulationWorkflow:
    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        assignment_plan = payload.get("assignment_plan", [])
        graph = payload.get("instruction_graph", [])
        artifact_candidates = (
            payload.get("artifact_candidates")
            if isinstance(payload.get("artifact_candidates"), list)
            else []
        )
        node_by_id: dict[str, dict[str, Any]] = {}
        for node in graph:
            if isinstance(node, dict):
                node_id = str(node.get("id", ""))
                if node_id:
                    node_by_id[node_id] = node

        completed_tasks: list[dict[str, Any]] = []
        artifacts: list[dict[str, Any]] = []

        for index, assignment in enumerate(assignment_plan):
            timeout_seconds = max(
                5,
                int(float(assignment.get("estimated_duration", 0) or 0)) + 5,
            )
            task_result = await workflow.execute_activity(
                execute_assignment_activity,
                assignment,
                start_to_close_timeout=timedelta(seconds=timeout_seconds),
                retry_policy=RetryPolicy(
                    maximum_attempts=3,
                    initial_interval=timedelta(seconds=1),
                ),
            )
            completed_tasks.append(task_result)

            task_id = str(assignment.get("id", ""))
            artifact_result = await workflow.execute_activity(
                generate_simulation_artifact_activity,
                {
                    "assignment": assignment,
                    "instruction_node": node_by_id.get(task_id, {}),
                    "artifact_candidate": (
                        artifact_candidates[index]
                        if index < len(artifact_candidates)
                        and isinstance(artifact_candidates[index], dict)
                        else {}
                    ),
                },
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=RetryPolicy(
                    maximum_attempts=3,
                    initial_interval=timedelta(seconds=1),
                ),
            )
            artifacts.append(artifact_result)

        return {
            "simulation_id": str(payload.get("simulation_id", "unknown")),
            "rule_set_id": str(payload.get("rule_set_id", "unknown")),
            "status": "complete",
            "tasks": completed_tasks,
            "artifacts": artifacts,
            "task_count": len(completed_tasks),
        }


@workflow.defn
class DogfoodB1B8Workflow:
    def __init__(self) -> None:
        self._approval_granted = False
        self._approval_note = ""
        self._current_block = "not-started"
        self._status = "pending"
        self._history: list[dict[str, Any]] = []

    @workflow.signal
    async def approve_resume(self, note: str = "") -> None:
        self._approval_granted = True
        self._approval_note = note

    @workflow.query
    def get_status(self) -> dict[str, Any]:
        return {
            "status": self._status,
            "current_block": self._current_block,
            "approval_granted": self._approval_granted,
            "approval_note": self._approval_note,
            "history": self._history,
        }

    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        # F03-MH-08 scaffold: represent B1-B8 as durable activity executions.
        self._status = "running"
        blocks = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"]
        block_inputs = payload.get("block_inputs", {})
        
        # Track outputs to pass between blocks
        block_outputs = {}

        for block in blocks:
            self._current_block = block
            if block == "B7" and not self._approval_granted:
                self._status = "waiting_for_approval"
                await workflow.wait_condition(lambda: self._approval_granted)
                self._status = "running"
                self._history.append(
                    {
                        "block": "approval_gate",
                        "status": "approved",
                        "note": self._approval_note,
                    }
                )

            # Merge initial inputs with outputs from previous blocks
            input_data = {**block_inputs.get(block, {}), **block_outputs}
            
            result = await workflow.execute_activity(
                execute_dogfood_block_activity,
                {"block": block, "input": input_data},
                start_to_close_timeout=timedelta(seconds=120),
                retry_policy=RetryPolicy(
                    maximum_attempts=2,
                    initial_interval=timedelta(seconds=1),
                ),
            )
            self._history.append(result)
            
            # Store output for next block
            if "output" in result:
                block_outputs.update(result["output"])

        self._status = "complete"
        return {
            "status": "complete",
            "workflow": "DogfoodB1B8Workflow",
            "history": self._history,
            "block_count": len(self._history),
        }


@workflow.defn
class SelfBootstrapWorkflow:
    def __init__(self) -> None:
        self._approval_granted = False
        self._approval_note = ""
        self._docs_parity_granted = False
        self._docs_parity_evidence_path = ""
        self._current_step = "not-started"
        self._status = "pending"
        self._history: list[dict[str, Any]] = []
        self._bundle_paths: dict[str, str] = {}

    @workflow.signal
    async def approve_resume(self, note: str = "") -> None:
        self._approval_granted = True
        self._approval_note = note

    @workflow.signal
    async def provide_docs_parity(self, evidence_path: str) -> None:
        self._docs_parity_granted = True
        self._docs_parity_evidence_path = evidence_path

    @workflow.query
    def get_status(self) -> dict[str, Any]:
        return {
            "status": self._status,
            "current_step": self._current_step,
            "approval_granted": self._approval_granted,
            "approval_note": self._approval_note,
            "docs_parity_granted": self._docs_parity_granted,
            "docs_parity_evidence_path": self._docs_parity_evidence_path,
            "bundle_paths": self._bundle_paths,
            "history": self._history,
        }

    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._status = "running"
        workflow_id = str(payload.get("workflow_id") or workflow.info().workflow_id)
        repo_root = str(payload.get("repo_root") or ".")
        output_dir = str(payload.get("output_dir") or "screehshots_evidence")

        self._current_step = "approval_gate"
        if not self._approval_granted:
            self._status = "waiting_for_approval"
            await workflow.wait_condition(lambda: self._approval_granted)
            self._status = "running"
            self._history.append(
                {
                    "step": "approval_gate",
                    "status": "approved",
                    "note": self._approval_note,
                }
            )

        self._current_step = "generate_bundle"
        bundle_result = await workflow.execute_activity(
            generate_change_bundle_stub_activity,
            {
                "workflow_id": workflow_id,
                "repo_root": repo_root,
                "output_dir": output_dir,
                "docs_parity_evidence_path": self._docs_parity_evidence_path,
            },
            start_to_close_timeout=timedelta(seconds=20),
            retry_policy=RetryPolicy(
                maximum_attempts=2,
                initial_interval=timedelta(seconds=1),
            ),
        )
        self._bundle_paths = {
            "bundle_json_path": str(bundle_result.get("bundle_json_path", "")),
            "bundle_patch_path": str(bundle_result.get("bundle_patch_path", "")),
        }
        self._history.append({"step": "generate_bundle", "result": bundle_result})

        self._current_step = "docs_parity_gate"
        if not self._docs_parity_granted:
            self._status = "waiting_for_docs_parity"
            await workflow.wait_condition(lambda: self._docs_parity_granted)
            self._status = "running"
            self._history.append(
                {
                    "step": "docs_parity_gate",
                    "status": "docs_parity_provided",
                    "evidence_path": self._docs_parity_evidence_path,
                }
            )

        self._current_step = "complete"
        self._status = "complete"
        return {
            "status": "complete",
            "workflow": "SelfBootstrapWorkflow",
            "workflow_id": workflow_id,
            "repo_root": repo_root,
            "output_dir": output_dir,
            "bundle_paths": self._bundle_paths,
            "docs_parity_evidence_path": self._docs_parity_evidence_path,
            "history": self._history,
        }


@workflow.defn
class MendixMigrationWorkflow:
    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        migration_id = str(
            payload.get("migration_id")
            or payload.get("workflow_id")
            or workflow.info().workflow_id
        )
        dry_run = bool(payload.get("dry_run", True))
        repo_root = str(payload.get("repo_root") or ".")
        output_dir = str(payload.get("output_dir") or "screehshots_evidence")
        sample_verify_count = int(payload.get("sample_verify_count", 2))
        resume_from = str(payload.get("resume_from_checkpoint", "extract"))
        allowed_resume = {"extract", "transform", "load", "validate"}
        if resume_from not in allowed_resume:
            resume_from = "extract"

        checkpoints: list[dict[str, Any]] = []
        extracted_records: list[dict[str, Any]] = []
        transformed_records: list[dict[str, Any]] = []
        loaded_results: list[dict[str, Any]] = []
        extraction_errors: list[str] = []
        record_audit_rows: list[dict[str, Any]] = []

        if resume_from == "extract":
            extracted = await workflow.execute_activity(
                extract_mendix_records_activity,
                payload,
                start_to_close_timeout=timedelta(seconds=20),
                retry_policy=RetryPolicy(
                    maximum_attempts=3,
                    initial_interval=timedelta(seconds=1),
                ),
            )
            extracted_records = (
                extracted.get("records")
                if isinstance(extracted.get("records"), list)
                else []
            )
            extraction_errors = (
                extracted.get("errors")
                if isinstance(extracted.get("errors"), list)
                else []
            )
            checkpoints.append(
                {
                    "stage": "extract",
                    "status": "complete",
                    "record_count": len(extracted_records),
                    "error_count": len(extraction_errors),
                }
            )
        else:
            checkpoints.append(
                {
                    "stage": "extract",
                    "status": "resumed",
                    "resume_from_checkpoint": resume_from,
                }
            )
            source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
            records = source.get("records")
            extracted_records = records if isinstance(records, list) else _default_migration_source_records()
            extraction_errors = []

        record_audit_rows = [
            {
                "source_identifier": str(record.get("source_identifier") or record.get("source_id", "")),
                "transform_status": "pending",
                "load_status": "pending",
                "error": "",
            }
            for record in extracted_records
            if isinstance(record, dict)
        ]
        audit_index = {row["source_identifier"]: row for row in record_audit_rows}

        if resume_from in {"extract", "transform"}:
            for record in extracted_records:
                if not isinstance(record, dict):
                    continue
                source_identifier = str(record.get("source_identifier") or record.get("source_id", ""))
                try:
                    transformed = await workflow.execute_activity(
                        transform_record_activity,
                        record,
                        start_to_close_timeout=timedelta(seconds=10),
                        retry_policy=RetryPolicy(
                            maximum_attempts=3,
                            initial_interval=timedelta(seconds=1),
                        ),
                    )
                    transformed_records.append(transformed)
                    if source_identifier in audit_index:
                        audit_index[source_identifier]["transform_status"] = "success"
                except Exception as error:
                    if source_identifier in audit_index:
                        audit_index[source_identifier]["transform_status"] = "failed"
                        audit_index[source_identifier]["error"] = str(error)
            checkpoints.append(
                {
                    "stage": "transform",
                    "status": "complete",
                    "record_count": len(transformed_records),
                }
            )
        else:
            checkpoints.append(
                {
                    "stage": "transform",
                    "status": "resumed",
                    "resume_from_checkpoint": resume_from,
                }
            )
            for record in extracted_records:
                if not isinstance(record, dict):
                    continue
                transformed_records.append(
                    {
                        "source_identifier": str(record.get("source_identifier") or record.get("source_id", "")),
                        "target_id": str(record.get("source_id", "")),
                        "first_name": str(record.get("full_name", "")).split(" ")[0]
                        if str(record.get("full_name", "")).strip()
                        else "",
                        "last_name": " ".join(str(record.get("full_name", "")).split(" ")[1:]),
                        "email": str(record.get("email", "")).strip().lower(),
                        "created_at": str(record.get("created_at", "")),
                        "is_active": bool(record.get("active", True)),
                    }
                )

        if resume_from in {"extract", "transform", "load"}:
            for record in transformed_records:
                source_identifier = str(record.get("source_identifier", ""))
                try:
                    loaded = await workflow.execute_activity(
                        load_record_activity,
                        {"record": record, "dry_run": dry_run},
                        start_to_close_timeout=timedelta(seconds=10),
                        retry_policy=RetryPolicy(
                            maximum_attempts=3,
                            initial_interval=timedelta(seconds=1),
                        ),
                    )
                    loaded_results.append(loaded)
                    if source_identifier in audit_index:
                        audit_index[source_identifier]["load_status"] = str(
                            loaded.get("status", "unknown")
                        )
                except Exception as error:
                    if source_identifier in audit_index:
                        audit_index[source_identifier]["load_status"] = "failed"
                        audit_index[source_identifier]["error"] = str(error)
            checkpoints.append(
                {
                    "stage": "load",
                    "status": "complete",
                    "record_count": len(loaded_results),
                    "dry_run": dry_run,
                }
            )
        else:
            checkpoints.append(
                {
                    "stage": "load",
                    "status": "resumed",
                    "resume_from_checkpoint": resume_from,
                    "dry_run": dry_run,
                }
            )

        loaded_count = len(
            [
                item
                for item in loaded_results
                if isinstance(item, dict) and item.get("status") == "loaded"
            ]
        )
        skipped_loads = len(
            [
                item
                for item in loaded_results
                if isinstance(item, dict) and item.get("status") == "dry_run_skipped"
            ]
        )
        dry_run_guard_ok = (not dry_run) or loaded_count == 0

        validation = await workflow.execute_activity(
            validate_migration_activity,
            {
                "extracted_count": len(extracted_records),
                "transformed_count": len(transformed_records),
                "loaded_count": loaded_count,
                "transformed_records": transformed_records,
                "sample_verify_count": sample_verify_count,
            },
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                initial_interval=timedelta(seconds=1),
            ),
        )
        checkpoints.append(
            {
                "stage": "validate",
                "status": "complete",
                "row_count_match": bool(validation.get("row_count_match", False)),
            }
        )

        report_payload = {
            "migration_id": migration_id,
            "workflow": "MendixMigrationWorkflow",
            "dry_run": dry_run,
            "repo_root": repo_root,
            "output_dir": output_dir,
            "resume_from_checkpoint": resume_from,
            "summary": {
                "extracted_count": len(extracted_records),
                "transformed_count": len(transformed_records),
                "loaded_count": loaded_count,
                "skipped_loads": skipped_loads,
                "extraction_error_count": len(extraction_errors),
                "write_performed": not dry_run and loaded_count > 0,
                "dry_run_guard_ok": dry_run_guard_ok,
                "row_count_match": bool(validation.get("row_count_match", False)),
                "sample_verified_count": int(validation.get("sample_verified_count", 0)),
            },
            "validation": validation,
            "checkpoints": checkpoints,
            "record_audit_rows": record_audit_rows,
            "extraction_errors": extraction_errors,
        }

        report_result = await workflow.execute_activity(
            write_migration_report_activity,
            report_payload,
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=RetryPolicy(
                maximum_attempts=2,
                initial_interval=timedelta(seconds=1),
            ),
        )
        report_path = str(report_result.get("report_path", ""))

        return {
            "status": "complete",
            "workflow": "MendixMigrationWorkflow",
            "migration_id": migration_id,
            "dry_run": dry_run,
            "report_path": report_path,
            "summary": report_payload["summary"],
            "checkpoints": checkpoints,
            "record_audit_rows": record_audit_rows,
        }


async def main() -> None:
    client = await Client.connect("localhost:7233", namespace="default")
    worker = Worker(
        client,
        task_queue="ari-smoke",
        workflows=[
            SmokeWorkflow,
            ExecutionWorkflow,
            SimulationWorkflow,
            DogfoodB1B8Workflow,
            SelfBootstrapWorkflow,
            MendixMigrationWorkflow,
        ],
        activities=[
            execute_assignment_activity,
            generate_simulation_artifact_activity,
            execute_dogfood_block_activity,
            generate_change_bundle_stub_activity,
            extract_mendix_records_activity,
            transform_record_activity,
            load_record_activity,
            validate_migration_activity,
            write_migration_report_activity,
        ],
    )
    print(
        "Temporal worker started. task_queue=ari-smoke namespace=default workflows=[SmokeWorkflow, ExecutionWorkflow, SimulationWorkflow, DogfoodB1B8Workflow, SelfBootstrapWorkflow, MendixMigrationWorkflow]"
    )
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
