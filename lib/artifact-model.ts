/**
 * Artifact Data Model & Schema Validation Framework
 * Feature: F04-MH-01
 * 
 * Defines artifact types, schema validation, versioning, and language detection
 * for the Output Simulator feature.
 */

export type ArtifactType =
  | 'code'
  | 'html'
  | 'json'
  | 'sql'
  | 'config'
  | 'test'
  | 'markdown'
  | 'svg'
  | 'dockerfile'
  | 'yaml';

export type ArtifactLanguage =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'sql'
  | 'html'
  | 'css'
  | 'json'
  | 'yaml'
  | 'dockerfile'
  | 'markdown'
  | 'svg'
  | 'unknown';

export interface ArtifactMetadata {
  size: number; // bytes
  lines: number;
  complexity_score?: number; // 0-10 heuristic
  language?: ArtifactLanguage;
  created_at: string; // ISO 8601
  version_id: string; // UUID or hash
}

export interface Artifact {
  type: ArtifactType;
  language?: ArtifactLanguage;
  content: string;
  metadata: ArtifactMetadata;
}

export interface ArtifactVersion {
  artifact: Artifact;
  timestamp: string; // ISO 8601
  checksum: string; // For diff comparison
}

/**
 * Artifact validator and schema handler
 */
export class ArtifactValidator {
  private static readonly MAX_ARTIFACT_SIZE = 100 * 1024; // 100KB

  /**
   * Validate artifact structure and content
   */
  static validate(artifact: Artifact): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!artifact.type) errors.push('Missing artifact type');
    if (!artifact.content) errors.push('Missing artifact content');
    if (!artifact.metadata) errors.push('Missing artifact metadata');

    // Check size limit
    const sizeBytes = new TextEncoder().encode(artifact.content).length;
    if (sizeBytes > this.MAX_ARTIFACT_SIZE) {
      errors.push(
        `Artifact exceeds size limit (${sizeBytes} > ${this.MAX_ARTIFACT_SIZE} bytes)`
      );
    }

    // Type-specific validation
    if (artifact.type === 'json') {
      const jsonErr = this.validateJson(artifact.content);
      if (jsonErr) errors.push(`JSON validation: ${jsonErr}`);
    } else if (artifact.type === 'sql') {
      const sqlErr = this.validateSql(artifact.content);
      if (sqlErr) warnings.push(`SQL validation: ${sqlErr}`);
    } else if (artifact.type === 'html') {
      const htmlErr = this.validateHtml(artifact.content);
      if (htmlErr) warnings.push(`HTML validation: ${htmlErr}`);
    } else if (artifact.type === 'code') {
      if (artifact.language === 'python') {
        const pyErr = this.validatePython(artifact.content);
        if (pyErr) warnings.push(`Python validation: ${pyErr}`);
      }
    }

    // Metadata validation
    if (!artifact.metadata.created_at) errors.push('Missing created_at timestamp');
    if (!artifact.metadata.version_id) errors.push('Missing version_id');
    if (artifact.metadata.size !== sizeBytes) {
      warnings.push(
        `Metadata size mismatch: reported ${artifact.metadata.size}, actual ${sizeBytes}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate JSON content
   */
  private static validateJson(content: string): string | null {
    try {
      JSON.parse(content);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid JSON';
    }
  }

  /**
   * Basic SQL validation (checks for common syntax errors)
   */
  private static validateSql(content: string): string | null {
    const trimmed = content.trim().toUpperCase();
    const validStarts = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];
    if (!validStarts.some((start) => trimmed.startsWith(start))) {
      return 'SQL does not start with recognized keyword';
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of content) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return 'Unbalanced parentheses';
    }
    if (parenCount !== 0) return 'Unbalanced parentheses';

    return null;
  }

  /**
   * Basic HTML validation (tag balance check)
   */
  private static validateHtml(content: string): string | null {
    // Simple check: count opening and closing tags
    const openTags = (content.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (content.match(/<\/[^>]*>/g) || []).length;

    if (openTags !== closeTags) {
      return `Unbalanced HTML tags (${openTags} opening, ${closeTags} closing)`;
    }

    return null;
  }

  /**
   * Basic Python validation (checks for syntax readiness via AST-level heuristics)
   */
  private static validatePython(content: string): string | null {
    // Check for balanced braces, brackets, parentheses
    const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
    const stack: string[] = [];

    for (const char of content) {
      if (pairs[char]) {
        stack.push(pairs[char]);
      } else if (Object.values(pairs).includes(char)) {
        if (stack.length === 0 || stack[stack.length - 1] !== char) {
          return 'Unbalanced braces/brackets/parentheses';
        }
        stack.pop();
      }
    }

    if (stack.length > 0) {
      return 'Unbalanced braces/brackets/parentheses';
    }

    return null;
  }
}

/**
 * Language detector for artifacts
 */
export class LanguageDetector {
  /**
   * Detect language from artifact content and metadata
   * First tries file extension hint, then heuristics
   */
  static detect(content: string, artifactType: ArtifactType, hint?: string): ArtifactLanguage {
    // Try hint first (from task metadata or file extension)
    if (hint) {
      const detected = this.fromExtension(hint);
      if (detected !== 'unknown') return detected;
    }

    // Type-based detection
    switch (artifactType) {
      case 'code':
        return this.detectCodeLanguage(content);
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      case 'sql':
        return 'sql';
      case 'yaml':
        return 'yaml';
      case 'dockerfile':
        return 'dockerfile';
      case 'markdown':
        return 'markdown';
      case 'svg':
        return 'svg';
      case 'config':
        return this.detectConfigLanguage(content);
      case 'test':
        return this.detectCodeLanguage(content);
      default:
        return 'unknown';
    }
  }

  private static fromExtension(hint: string): ArtifactLanguage {
    const lower = hint.toLowerCase();
    if (lower.includes('python') || lower.endsWith('.py')) return 'python';
    if (lower.includes('javascript') || lower.endsWith('.js')) return 'javascript';
    if (lower.includes('typescript') || lower.endsWith('.ts')) return 'typescript';
    if (lower.includes('sql') || lower.endsWith('.sql')) return 'sql';
    if (lower.includes('html') || lower.endsWith('.html')) return 'html';
    if (lower.includes('css') || lower.endsWith('.css')) return 'css';
    if (lower.includes('json') || lower.endsWith('.json')) return 'json';
    if (lower.includes('yaml') || lower.endsWith('.yml')) return 'yaml';
    if (lower.includes('dockerfile')) return 'dockerfile';
    if (lower.includes('markdown') || lower.endsWith('.md')) return 'markdown';
    if (lower.includes('svg') || lower.endsWith('.svg')) return 'svg';
    return 'unknown';
  }

  private static detectCodeLanguage(content: string): ArtifactLanguage {
    const lower = content.toLowerCase();

    // Check for Python patterns
    if (lower.includes('def ') || lower.includes('import ') || lower.includes('class ')) {
      if (lower.includes('async def') || lower.includes('await ')) return 'python';
      if (!lower.includes('function') && !lower.includes('const ')) return 'python';
    }

    // Check for JavaScript/TypeScript patterns
    if (lower.includes('function ') || lower.includes('const ') || lower.includes('let ')) {
      if (lower.includes('interface ') || lower.includes(': string') || lower.includes(': number')) {
        return 'typescript';
      }
      return 'javascript';
    }

    return 'unknown';
  }

  private static detectConfigLanguage(content: string): ArtifactLanguage {
    const lower = content.toLowerCase();
    if (lower.includes('key:') || lower.includes('- ')) return 'yaml';
    if (content.includes('{') && content.includes('}')) return 'json';
    if (lower.includes('ini') || lower.includes('[')) return 'unknown'; // .ini format
    return 'yaml'; // Default config language
  }
}

/**
 * Artifact versioning store (in-memory, MVP)
 * Stores up to 5 versions per artifact ID
 */
export class ArtifactVersionStore {
  private store: Map<string, ArtifactVersion[]> = new Map();
  private readonly MAX_VERSIONS = 5;

  /**
   * Store a new artifact version
   * Returns the version_id assigned
   */
  addVersion(artifactId: string, artifact: Artifact): string {
    const versions = this.store.get(artifactId) || [];

    // Add new version
    const version: ArtifactVersion = {
      artifact,
      timestamp: new Date().toISOString(),
      checksum: this.computeChecksum(artifact.content),
    };

    versions.push(version);

    // Keep only last MAX_VERSIONS
    if (versions.length > this.MAX_VERSIONS) {
      versions.shift();
    }

    this.store.set(artifactId, versions);
    return artifact.metadata.version_id;
  }

  /**
   * Retrieve all versions for an artifact
   */
  getVersions(artifactId: string): ArtifactVersion[] {
    return this.store.get(artifactId) || [];
  }

  /**
   * Retrieve a specific version by index (0 = oldest, -1 = newest)
   */
  getVersion(artifactId: string, index: number): ArtifactVersion | null {
    const versions = this.store.get(artifactId);
    if (!versions) return null;
    if (index < 0) {
      return versions[versions.length + index] || null;
    }
    return versions[index] || null;
  }

  /**
   * Clear all versions for an artifact
   */
  clear(artifactId: string): void {
    this.store.delete(artifactId);
  }

  /**
   * Get all stored artifact IDs
   */
  getAllIds(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Compute simple checksum for diff comparison
   */
  private computeChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}

/**
 * Artifact factory for creating well-formed artifacts
 */
export class ArtifactFactory {
  static create(
    type: ArtifactType,
    content: string,
    options?: {
      language?: ArtifactLanguage;
      versionId?: string;
      languageHint?: string;
    }
  ): Artifact {
    const sizeBytes = new TextEncoder().encode(content).length;
    const lines = content.split('\n').length;
    const language =
      options?.language ||
      LanguageDetector.detect(content, type, options?.languageHint);

    return {
      type,
      language,
      content,
      metadata: {
        size: sizeBytes,
        lines,
        complexity_score: this.estimateComplexity(content, type, language),
        language,
        created_at: new Date().toISOString(),
        version_id: options?.versionId || this.generateVersionId(),
      },
    };
  }

  private static estimateComplexity(
    content: string,
    type: ArtifactType,
    language: ArtifactLanguage
  ): number {
    // Simple heuristic: count lines and keyword density
    const lines = content.split('\n').length;
    const keywords = (content.match(/\b(if|else|for|while|switch|try|catch|class|def|function)\b/gi) || [])
      .length;

    let score = Math.min(10, Math.floor((lines + keywords) / 10));
    return Math.max(1, score);
  }

  private static generateVersionId(): string {
    return `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
