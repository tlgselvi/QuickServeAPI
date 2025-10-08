#!/usr/bin/env node

/**
 * AgentBridge Compatibility Check
 * Verifies that all agents are compatible with Dese-ProDev-Rules
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = join(projectRoot, filePath);
  if (existsSync(fullPath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - Missing: ${filePath}`, 'red');
    return false;
  }
}

function checkPackageJson() {
  const packagePath = join(projectRoot, 'package.json');
  if (!existsSync(packagePath)) {
    log('❌ package.json not found', 'red');
    return false;
  }

  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    // Check if this is a workspace - check sub-projects instead
    if (pkg.workspaces && pkg.workspaces.length > 0) {
      log('ℹ️  Workspace detected, checking sub-projects...', 'blue');
      
      let allSubProjectsValid = true;
      for (const workspace of pkg.workspaces) {
        const subPackagePath = join(projectRoot, workspace, 'package.json');
        if (existsSync(subPackagePath)) {
          try {
            const subPkg = JSON.parse(readFileSync(subPackagePath, 'utf8'));
            const requiredDeps = ['vitest', 'eslint', 'prettier'];
            const missingDeps = requiredDeps.filter(dep => 
              !subPkg.dependencies?.[dep] && !subPkg.devDependencies?.[dep]
            );

            if (missingDeps.length > 0) {
              log(`⚠️  ${workspace}: Missing dependencies: ${missingDeps.join(', ')}`, 'yellow');
              allSubProjectsValid = false;
            } else {
              log(`✅ ${workspace}: Dependencies OK`, 'green');
            }
          } catch (error) {
            log(`❌ Error reading ${workspace}/package.json: ${error.message}`, 'red');
            allSubProjectsValid = false;
          }
        }
      }
      
      if (allSubProjectsValid) {
        log('✅ All workspace projects have required dependencies', 'green');
        return true;
      } else {
        log('⚠️  Some workspace projects missing dependencies', 'yellow');
        return false;
      }
    }

    // Check required dependencies for non-workspace
    const requiredDeps = ['vitest', 'eslint', 'prettier'];
    const missingDeps = requiredDeps.filter(dep => 
      !pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]
    );

    if (missingDeps.length > 0) {
      log(`❌ Missing dependencies: ${missingDeps.join(', ')}`, 'red');
      return false;
    }

    // Check scripts
    const requiredScripts = ['test', 'lint'];
    const missingScripts = requiredScripts.filter(script => !pkg.scripts?.[script]);

    if (missingScripts.length > 0) {
      log(`❌ Missing scripts: ${missingScripts.join(', ')}`, 'red');
      return false;
    }

    log('✅ package.json configuration valid', 'green');
    return true;
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, 'red');
    return false;
  }
}

function checkEnvironmentFiles() {
  const envFiles = ['.env', '.env.example', '.env.local'];
  let foundEnv = false;

  for (const envFile of envFiles) {
    if (existsSync(join(projectRoot, envFile))) {
      foundEnv = true;
      break;
    }
  }

  if (!foundEnv) {
    log('⚠️  No environment file found (.env, .env.example, .env.local)', 'yellow');
    return false;
  }

  log('✅ Environment file found', 'green');
  return true;
}

function checkCursorConfig() {
  const cursorDir = join(projectRoot, '.cursor');
  if (!existsSync(cursorDir)) {
    log('❌ .cursor directory not found', 'red');
    return false;
  }

  const rulesFile = join(cursorDir, 'rules', 'Dese-ProDev-Rules.yaml');
  const bridgeFile = join(cursorDir, 'AgentBridge.yaml');

  const rulesExists = checkFile('.cursor/rules/Dese-ProDev-Rules.yaml', 'Dese-ProDev-Rules.yaml');
  const bridgeExists = checkFile('.cursor/AgentBridge.yaml', 'AgentBridge.yaml');

  return rulesExists && bridgeExists;
}

function checkProjectStructure() {
  const requiredDirs = ['src', 'tests'];
  let allDirsExist = true;

  for (const dir of requiredDirs) {
    if (!existsSync(join(projectRoot, dir))) {
      log(`⚠️  Directory missing: ${dir}`, 'yellow');
      allDirsExist = false;
    }
  }

  return allDirsExist;
}

function main() {
  log('\n🔍 AgentBridge Compatibility Check', 'bold');
  log('=====================================\n', 'blue');

  const checks = [
    { name: 'Cursor Configuration', fn: checkCursorConfig },
    { name: 'Package.json', fn: checkPackageJson },
    { name: 'Environment Files', fn: checkEnvironmentFiles },
    { name: 'Project Structure', fn: checkProjectStructure }
  ];

  let passedChecks = 0;
  const totalChecks = checks.length;

  for (const check of checks) {
    log(`\n📋 ${check.name}:`, 'blue');
    if (check.fn()) {
      passedChecks++;
    }
  }

  log('\n📊 Summary:', 'bold');
  log(`Passed: ${passedChecks}/${totalChecks} checks`, 
      passedChecks === totalChecks ? 'green' : 'yellow');

  if (passedChecks === totalChecks) {
    log('\n🎉 All compatibility checks passed! AgentBridge is ready.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some checks failed. Please review the issues above.', 'yellow');
    process.exit(1);
  }
}

// Run the compatibility check
main();
