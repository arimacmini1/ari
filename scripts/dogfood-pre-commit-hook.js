#!/usr/bin/env node
/**
 * Dogfood Workflow Pre-Commit Hook
 * 
 * This script runs before git commit to enforce B1-B8 workflow.
 * 
 * Install as pre-commit hook:
 *   cp scripts/dogfood-pre-commit-hook.js .git/hooks/pre-commit
 *   chmod +x .git/hooks/pre-commit
 * 
 * Or use husky:
 *   npx husky add .husky/pre-commit "node scripts/dogfood-pre-commit-hook.js"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = '/Users/ari_mac_mini/Desktop/ari';
const BLOCK_NAMES = [
  "Scope Lock", "Dependency Check", "Design Pass", "Implement Pass",
  "Verify Pass", "Review Pass", "Docs Sync", "Ship Decision"
];

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8'
    });
    return output.trim().split('\n').filter(f => f && f.includes('feature'));
  } catch (e) {
    return [];
  }
}

function validateFeatureFile(content, filePath) {
  const errors = [];
  const warnings = [];
  
  // Check all blocks present
  for (let i = 0; i < BLOCK_NAMES.length; i++) {
    const blockId = `B${i + 1}`;
    const blockPattern = new RegExp(`${blockId}[\\s_-]`, 'i');
    if (!blockPattern.test(content)) {
      warnings.push(`Missing ${blockId} (${BLOCK_NAMES[i]})`);
    }
  }
  
  // B5 MUST have screenshot evidence
  const b5Pattern = /B5[\s_-]completed[^\n]*Evidence:\s*([^\n]+\.(?:png|jpg|jpeg))/i;
  const b5Match = content.match(b5Pattern);
  
  if (!b5Match) {
    errors.push(`B5 MUST include screenshot evidence (evidence/screenshots/{task}-B5.png)`);
  } else {
    const evidencePath = b5Match[1].trim();
    const fullPath = path.join(PROJECT_ROOT, evidencePath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`B5 screenshot missing: ${evidencePath}`);
    }
  }
  
  return { errors, warnings };
}

// Main
const stagedFiles = getStagedFiles();

if (stagedFiles.length === 0) {
  console.log('🐕 No feature files staged - skipping dogfood check');
  process.exit(0);
}

console.log(`\n🐕 Dogfood Workflow Pre-Commit Check\n`);
console.log(`Checking ${stagedFiles.length} staged file(s)...\n`);

let hasErrors = false;

for (const file of stagedFiles) {
  const fullPath = path.join(PROJECT_ROOT, file);
  
  if (!fs.existsSync(fullPath)) continue;
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const { errors, warnings } = validateFeatureFile(content, fullPath);
  
  if (errors.length > 0 || warnings.length > 0) {
    console.log(`\n⚠️  ${file}`);
    
    for (const error of errors) {
      console.log(`   ❌ ${error}`);
      hasErrors = true;
    }
    for (const warning of warnings) {
      console.log(`   ⚠️  ${warning}`);
    }
  }
}

if (hasErrors) {
  console.log(`\n❌ COMMIT BLOCKED\n`);
  console.log(`🔴 Fix errors before committing.\n`);
  console.log(`💡 Tip: For B5, add evidence file and reference it as:`);
  console.log(`   Evidence: evidence/screenshots/feature-XX-B5.png\n`);
  process.exit(1);
}

console.log(`✅ All checks passed\n`);
process.exit(0);
