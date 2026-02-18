/**
 * Codebase Indexer
 * Scans source files and stores them in vector DB with 'codebase' source type
 * These are protected - not overwritten by chat
 */

import { addCodebaseMemory, initializeRAG, getMemories } from '@/lib/rag'
import * as fs from 'fs'
import * as path from 'path'

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.md']
const IGNORE_DIRS = ['node_modules', '.next', 'dist', '.git', 'build', '.venv', '__pycache__']

interface FileResult {
  path: string
  content: string
  source: 'codebase'
}

/**
 * Scan directory recursively for source files
 */
function scanDirectory(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
        scanDirectory(fullPath, files)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (CODE_EXTENSIONS.includes(ext)) {
        files.push(fullPath)
      }
    }
  }
  
  return files
}

/**
 * Read file content (with size limit)
 */
function readFileContent(filePath: string, maxSize = 50000): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    // Truncate very large files
    if (content.length > maxSize) {
      return content.slice(0, maxSize) + '\n\n... [truncated]'
    }
    return content
  } catch (e) {
    return ''
  }
}

/**
 * Index all source files in a directory
 */
export async function indexCodebase(rootDir: string): Promise<{
  indexed: number
  errors: number
  skipped: number
}> {
  console.log('Initializing RAG...')
  await initializeRAG()
  
  console.log(`Scanning ${rootDir}...`)
  const files = scanDirectory(rootDir)
  console.log(`Found ${files.length} source files`)
  
  let indexed = 0
  let errors = 0
  let skipped = 0
  
  for (const file of files) {
    try {
      const content = readFileContent(file)
      if (!content.trim()) {
        skipped++
        continue
      }
      
      // Create a memory with file path as identifier prefix
      const relativePath = path.relative(rootDir, file)
      const id = `code_${Buffer.from(relativePath).toString('base64').slice(0, 20)}`
      
      // Use addCodebaseMemory - this is PROTECTED
      // The source type makes it separate from chat memories
      await addCodebaseMemory(content, relativePath, id)
      
      indexed++
      if (indexed % 50 === 0) {
        console.log(`Indexed ${indexed}/${files.length}...`)
      }
    } catch (e) {
      errors++
      console.error(`Error indexing ${file}:`, e)
    }
  }
  
  return { indexed, errors, skipped }
}

/**
 * Get all indexed codebase memories
 */
export async function getCodebaseMemories() {
  return getMemories('codebase')
}

// CLI execution
if (require.main === module) {
  const targetDir = process.argv[2] || process.cwd()
  console.log(`Indexing codebase: ${targetDir}`)
  
  indexCodebase(targetDir)
    .then(result => {
      console.log('\n=== Indexing Complete ===')
      console.log(`Indexed: ${result.indexed}`)
      console.log(`Errors: ${result.errors}`)
      console.log(`Skipped: ${result.skipped}`)
    })
    .catch(console.error)
}