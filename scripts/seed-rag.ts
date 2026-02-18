/**
 * Seed initial memories for Ari's RAG system
 * Run once to populate the database with foundational knowledge
 */

import { batchAddMemories, initializeRAG } from './lib/rag'

const initialMemories = [
  { content: "Ari is an AI Engineering Interface - a post-IDE control center for orchestrating AI agents", source: "memory" as const },
  { content: "Ari uses a canvas-based workflow for designing and executing agent orchestrations", source: "memory" as const },
  { content: "Ari supports multiple AI providers including OpenAI, Anthropic, Gemini, and OpenRouter", source: "memory" as const },
  { content: "Ari has a copilot chat interface for natural language interaction", source: "memory" as const },
  { content: "Ari stores memories using pgvector for semantic search capabilities", source: "memory" as const },
  { content: "Ari can execute code, manage projects, and coordinate multiple agents", source: "memory" as const },
  { content: "Drew is the user and creator of Ari", source: "memory" as const },
]

async function seed() {
  console.log("Initializing RAG...")
  await initializeRAG()
  
  console.log("Seeding initial memories...")
  const ids = await batchAddMemories(initialMemories)
  
  console.log(`Seeded ${ids.length} initial memories:`, ids)
  console.log("Done!")
}

seed().catch(console.error)
