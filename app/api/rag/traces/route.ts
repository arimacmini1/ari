import { NextResponse } from "next/server"
import { searchSimilarTraces } from "@/lib/rag"

export async function POST(req: Request) {
  const body = (await req.json()) as { query?: string; limit?: number }
  
  if (!body.query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 })
  }
  
  try {
    const results = await searchSimilarTraces(body.query, body.limit ?? 5)
    return NextResponse.json({ results })
  } catch (e) {
    console.error("Search traces error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")
  const limit = parseInt(searchParams.get("limit") || "5")
  
  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 })
  }
  
  try {
    const results = await searchSimilarTraces(query, limit)
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
