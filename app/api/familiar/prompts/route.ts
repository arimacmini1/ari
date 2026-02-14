import { NextResponse } from "next/server"
import {
  DEFAULT_COPILOT_PROMPT_ID,
  listCopilotPrompts,
} from "@/lib/copilot/prompt-registry"

export async function GET() {
  return NextResponse.json({
    defaultPromptId: DEFAULT_COPILOT_PROMPT_ID,
    prompts: listCopilotPrompts(),
  })
}
