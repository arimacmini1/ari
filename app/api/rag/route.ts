import { NextResponse } from "next/server"
import { initializeRAG, pruneMemories, getMemoryStats } from "@/lib/rag"

// Initialize RAG on startup
initializeRAG().catch(console.error)

export async function POST(req: Request) {
  const body = (await req.json()) as { action?: string; olderThanDays?: number; similarityThreshold?: number }
  
  try {
    switch (body.action) {
      case "prune": {
        const deleted = await pruneMemories(
          body.olderThanDays ?? 90,
          body.similarityThreshold ?? 0.5
        )
        return NextResponse.json({ deleted, message: `Pruned ${deleted} old memories` })
      }
      
      case "stats": {
        const stats = await getMemoryStats()
        return NextResponse.json(stats)
      }
      
      default:
        return NextResponse.json({ error: "Unknown action. Use 'prune' or 'stats'." }, { status: 400 })
    }
  } catch (e) {
    console.error("RAG admin error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  // Return stats on GET request too
  try {
    const stats = await getMemoryStats()
    return NextResponse.json(stats)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
