#!/usr/bin/env node
/**
 * Dogfood Workflow CI Checker
 * 
 * Validates that feature files follow B1-B8 workflow progress.
 * Run as: node scripts/dogfood-ci-check.js
 * 
 * ENFORCEMENT:
 * - B5 entries MUST have evidence paths
 * - Evidence files MUST exist on disk
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BLOCK_NAMES = [
  "Scope Lock",        // B1
  "Dependency Check",  // B2
  "Design Pass",       // B3
  "Implement Pass",    // B4
  "Verify Pass",       // B5
  "Review Pass",       // B6
  "Docs Sync",         // B7
  "Ship Decision",     // B8
];

// Project root - adjust as needed
const PROJECT_ROOT = '/Users/ari_mac_mini/Desktop/ari';

function validateFeatureFile(content, filePath) {
  const errors = [];
  const warnings = [];
  
  // Check for each block's progress entry
  for (let i = 0; i < BLOCK_NAMES.length; i++) {
    const blockId = `B${i + 1}`;
    const blockName = BLOCK_NAMES[i];
    
    // Look for block ID in content (case insensitive)
    const blockPattern = new RegExp(`${blockId}[\\s_-]`, 'i');
    if (!blockPattern.test(content)) {
      warnings.push(`Missing ${blockId} (${blockName}) progress entry`);
    }
  }
  
  // B5 SPECIFIC CHECK: Must have screenshot evidence
  const b5Pattern = /B5[\s_-]completed[^\n]*Evidence:\s*([^\n]+\.(?:png|jpg|jpeg))/i;
  const b5Match = content.match(b5Pattern);
  
  if (!b5Match) {
    errors.push(`B5 (Verify Pass) MUST include screenshot evidence. Format: "Evidence: evidence/screenshots/{task}-B5.png"`);
  } else {
    // Extract evidence path and verify file exists
    const evidencePath = b5Match[1].trim();
    const fullPath = path.join(PROJECT_ROOT, evidencePath);
    
    if (!fs.existsSync(fullPath)) {
      errors.push(`B5 screenshot does NOT exist: ${evidencePath}`);
    } else {
      // Verify it's actually an image by checking extension
      const ext = path.extname(fullPath).toLowerCase();
      if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
        errors.push(`B5 evidence must be an image (.png, .jpg), got: ${ext}`);
      }
    }
  }
  
  // Check for "DONE" or "done" markers - but allow if B5 has valid evidence
  const doneBlocks = content.match(/B\d+.*(?:done|complete|shipped)/gi) || [];
  if (doneBlocks.length > 0 && doneBlocks.length < BLOCK_NAMES.length) {
    warnings.push("Some blocks marked done but not all - workflow may be incomplete");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Find feature files
const dirs = [
  '/Users/ari_mac_mini/Desktop/ari/docs',
  '/Users/ari_mac_mini/Desktop/ari/docs/Ari-v3.0/tasks'
];

function findFiles() {
  const files = [];
  
  for (const baseDir of dirs) {
    if (!fs.existsSync(baseDir)) continue;
    
    function walk(currentDir) {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        
        if (item.isDirectory()) {
          walk(fullPath);
        } else if (item.isFile() && item.name.includes('feature') && item.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    }
    
    walk(baseDir);
  }
  
  return files;
}

const featureFiles = findFiles();
const results = [];

console.log(`\n🐕 Dogfood Workflow CI Checker\n`);
console.log(`Checking ${featureFiles.length} feature file(s)...\n`);

for (const file of featureFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const validation = validateFeatureFile(content, file);
  
  results.push({
    file,
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
  });
  
  // Print results
  let relativePath = file.replace(PROJECT_ROOT + '/', '');
  
  if (validation.valid && validation.warnings.length === 0) {
    console.log(`✅ ${relativePath}`);
  } else {
    console.log(`\n⚠️  ${relativePath}`);
    
    for (const error of validation.errors) {
      console.log(`   ❌ ${error}`);
    }
    for (const warning of validation.warnings) {
      console.log(`   ⚠️  ${warning}`);
    }
  }
}

// Summary
const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
const validCount = results.filter(r => r.valid && r.warnings.length === 0).length;

console.log(`\n--- Summary ---`);
console.log(`Total files: ${results.length}`);
console.log(`Valid: ${validCount}`);
console.log(`Warnings: ${totalWarnings}`);
console.log(`Errors: ${totalErrors}\n`);

// Exit with error if there are validation errors
if (totalErrors > 0) {
  console.log(`❌ CI check FAILED - ${totalErrors} error(s) found\n`);
  console.log(`🔴 B5 verification requires EVIDENCE FILE to exist!\n`);
  process.exit(1);
} else if (totalWarnings > 0) {
  console.log(`⚠️  CI check passed with ${totalWarnings} warning(s)\n`);
  process.exit(0);
} else {
  console.log(`✅ CI check PASSED\n`);
  process.exit(0);
}
