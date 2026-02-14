import { NextResponse } from "next/server"
import { z } from "zod"
import { getTraceFeatureFlags, updateTraceFeatureFlags } from "@/lib/trace-feature-flags"

const PatchSchema = z.object({
  compare_disabled: z.boolean().optional(),
  fork_disabled: z.boolean().optional(),
})

export async function GET() {
  return NextResponse.json({ flags: getTraceFeatureFlags() })
}

export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  return NextResponse.json({
    flags: updateTraceFeatureFlags(parsed.data),
  })
}
