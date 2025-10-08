#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const EXCLUDED_DIRS = ['node_modules', 'dist', 'coverage', '.git', 'backup_*'];
const EXCLUDED_FILES = ['*.test.*', '*.spec.*', 'logger.ts', 'replace-console-logs.js'];

// File extensions to process
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Console.log patterns to replace
const CONSOLE_PATTERNS = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
    description: 'console.log -> logger.info'
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    description: 'console.debug -> logger.debug'
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    description: 'console.warn -> logger.warn'
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    description: 'console.error -> logger.error'
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    description: 'console.info -> logger.info'
  }
];

// Statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: 0,
  errors: 0
};

// Check if file should be excluded
function shouldExcludeFile(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  
  // Check excluded directories
  for (const excludedDir of EXCLUDED_DIRS) {
    if (relativePath.includes(excludedDir)) {
      return true;
    }
  }
  
  // Check excluded files
  for (const excludedFile of EXCLUDED_FILES) {
    if (relativePath.includes(excludedFile.replace('*', ''))) {
      return true;
    }
  }
  
  return false;
}

// Check if file has the correct extension
function hasCorrectExtension(filePath) {
  return FILE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

// Add logger import if needed
function addLoggerImport(content) {
  // Check if logger is already imported
  if (content.includes('import') && content.includes('logger')) {
    return content;
  }
  
  // Find the last import statement
  const importRegex = /^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length;
    
    // Add logger import after the last import
    const loggerImport = "\nimport { logger } from '../utils/logger';\n";
    return content.slice(0, insertIndex) + loggerImport + content.slice(insertIndex);
  } else {
    // Add logger import at the beginning
    return "import { logger } from '../utils/logger';\n" + content;
  }
}

// Process a single file
function processFile(filePath) {
  try {
    stats.filesProcessed++;
    
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let fileReplacements = 0;
    
    // Apply console.log replacements
    for (const pattern of CONSOLE_PATTERNS) {
      const matches = modifiedContent.match(pattern.pattern);
      if (matches) {
        modifiedContent = modifiedContent.replace(pattern.pattern, pattern.replacement);
        fileReplacements += matches.length;
        console.log(`  ✓ ${pattern.description}: ${matches.length} replacements`);
      }
    }
    
    // If any replacements were made, add logger import and save file
    if (fileReplacements > 0) {
      modifiedContent = addLoggerImport(modifiedContent);
      
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      stats.filesModified++;
      stats.replacements += fileReplacements;
      
      console.log(`  📝 Modified: ${fileReplacements} replacements`);
    } else {
      console.log(`  ⏭️  No console.log statements found`);
    }
    
  } catch (error) {
    stats.errors++;
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
  }
}

// Recursively find and process files
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      if (!shouldExcludeFile(itemPath)) {
        processDirectory(itemPath);
      }
    } else if (stat.isFile() && hasCorrectExtension(itemPath) && !shouldExcludeFile(itemPath)) {
      console.log(`\n📁 Processing: ${path.relative(PROJECT_ROOT, itemPath)}`);
      processFile(itemPath);
    }
  }
}

// Main execution
function main() {
  console.log('🚀 Starting console.log replacement...\n');
  console.log('📋 Configuration:');
  console.log(`  Project Root: ${PROJECT_ROOT}`);
  console.log(`  File Extensions: ${FILE_EXTENSIONS.join(', ')}`);
  console.log(`  Excluded Dirs: ${EXCLUDED_DIRS.join(', ')}`);
  console.log(`  Excluded Files: ${EXCLUDED_FILES.join(', ')}\n`);
  
  // Process the project
  processDirectory(PROJECT_ROOT);
  
  // Print summary
  console.log('\n📊 Summary:');
  console.log(`  Files Processed: ${stats.filesProcessed}`);
  console.log(`  Files Modified: ${stats.filesModified}`);
  console.log(`  Total Replacements: ${stats.replacements}`);
  console.log(`  Errors: ${stats.errors}`);
  
  if (stats.replacements > 0) {
    console.log('\n✅ Console.log replacement completed successfully!');
    console.log('💡 Remember to test your application after these changes.');
  } else {
    console.log('\nℹ️  No console.log statements found to replace.');
  }
}

// Run the script
main();

export { processFile, processDirectory, stats };
