/**
 * RAG Benchmark Script - Quick performance check
 */

import { searchMemories } from '../lib/rag'

const TEST_QUERIES = [
  "What is Ari?",
  "How do I use the copilot?",
  "Tell me about memory",
]

async function main() {
  console.log('\n=== RAG Performance Benchmark ===\n')
  
  // Warm up
  await searchMemories("test", 5)
  
  const iterations = 20
  const results: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    const q = TEST_QUERIES[i % TEST_QUERIES.length]
    const start = Date.now()
    await searchMemories(q, 5)
    const duration = Date.now() - start
    results.push(duration)
  }
  
  const avg = results.reduce((a, b) => a + b, 0) / results.length
  const sorted = results.sort((a, b) => a - b)
  
  console.log(`Search queries: ${iterations}`)
  console.log(`Average: ${avg.toFixed(2)}ms`)
  console.log(`Min: ${Math.min(...results)}ms`)
  console.log(`Max: ${Math.max(...results)}ms`)
  console.log(`P95: ${sorted[Math.floor(iterations * 0.95)]}ms`)
  console.log('\n✓ Benchmark complete')
}

main().catch(console.error)
