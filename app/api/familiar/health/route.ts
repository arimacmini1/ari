import { NextResponse } from "next/server"

export async function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY)
  const hasGemini = Boolean(process.env.GEMINI_API_KEY)

  return NextResponse.json({
    providers: {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      gemini: hasGemini,
    },
  })
}
