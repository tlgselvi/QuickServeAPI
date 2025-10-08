#!/usr/bin/env node

/**
 * Dese ProDev Setup Script
 * Automatically sets up AgentBridge v2 with Dese-ProDev-Rules
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
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
  bold: '\x1b[1m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    log(`📁 Created directory: ${dirPath}`, 'cyan');
  }
}

function createFile(filePath, content, description) {
  const fullPath = join(projectRoot, filePath);
  
  if (existsSync(fullPath)) {
    log(`⚠️  File already exists: ${filePath}`, 'yellow');
    return false;
  }

  try {
    writeFileSync(fullPath, content, 'utf8');
    log(`✅ Created: ${description}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error creating ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

function updatePackageJson() {
  const packagePath = join(projectRoot, 'package.json');
  
  if (!existsSync(packagePath)) {
    log('❌ package.json not found. Please run this script from project root.', 'red');
    return false;
  }

  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    // Add required scripts if they don't exist
    const requiredScripts = {
      'agent:check': 'node scripts/agent-compat-check.mjs',
      'agent:setup': 'node scripts/setup-prodev.mjs',
      'dev:full': 'pnpm run dev && pnpm run agent:check'
    };

    let updated = false;
    for (const [script, command] of Object.entries(requiredScripts)) {
      if (!pkg.scripts?.[script]) {
        pkg.scripts = pkg.scripts || {};
        pkg.scripts[script] = command;
        updated = true;
        log(`📝 Added script: ${script}`, 'cyan');
      }
    }

    if (updated) {
      writeFileSync(packagePath, JSON.stringify(pkg, null, 2), 'utf8');
      log('✅ Updated package.json with agent scripts', 'green');
    } else {
      log('ℹ️  package.json already has required scripts', 'blue');
    }

    return true;
  } catch (error) {
    log(`❌ Error updating package.json: ${error.message}`, 'red');
    return false;
  }
}

function createDeseProDevRules() {
  const content = `name: Dese ProDev Default
version: 1.2
description: Unified professional ruleset compatible with all Cursor Agents

rules:
  - id: stack
    type: preference
    value:
      frontend: "React 18 + TypeScript + Vite + Tailwind"
      backend: "Node.js + Express + PostgreSQL (Drizzle ORM)"
      testing: "Vitest + Supertest"
      packaging: "pnpm"
      infra: "Docker + Render"

  - id: ai_behavior
    type: control
    value:
      plan_before_write: true
      confirm_before_overwrite: true
      max_context_depth: high
      auto_comment_code: true
      auto_DoD_checklist: true
      logging_level: minimal

  - id: project_profiles
    type: context
    value:
      FinBot:  {priority: high, modules: ["Accounts","Transactions","Budgets","Scenario","AI Personas"]}
      MuBot:   {priority: medium, modules: ["Profit","Costs","Forecasting"]}
      SmartPool: {priority: high, modules: ["Sensors","Dosing","WiFi","Dashboard"]}

  - id: quality
    type: enforcement
    value:
      test_required: true
      coverage_min: 70
      lint_before_commit: true
      audit_log_required: true
      security_scan_on_build: true

  - id: git_policy
    type: control
    value:
      branch_model: "main, dev, feature/*, fix/*"
      conventional_commits: true
      auto_worktree: true
      cleanup_merged_branches: true
      protect_main: true

  - id: env
    type: system
    value:
      node: ">=20.19"
      database: "PostgreSQL"
      dotenv_required: true
      drizzle_config_required: true
      auto_env_validation: true`;

  return createFile(
    '.cursor/rules/Dese-ProDev-Rules.yaml',
    content,
    'Dese-ProDev-Rules.yaml'
  );
}

function createAgentBridge() {
  const content = `name: AgentBridge
description: Synchronizes Dese-ProDev-Rules with active Agents (FinBot, MuBot, SmartPool)
version: 1.0

bridge:
  load_rules_on_start: true
  sync_frequency: "on_project_open"
  notify_on_conflict: true
  apply_scope:
    - .cursor/rules
    - .cursor/commands
    - src/config/*
    - package.json
  verify_agent_context:
    check_ai_model: "gpt-5"
    check_memory_enabled: true
    check_browser_enabled: true
    check_git_integration: true
  actions_on_sync:
    - run: "pnpm lint"
    - run: "pnpm test"
    - run: "node scripts/agent-compat-check.mjs"
    - run: "git status"`;

  return createFile(
    '.cursor/AgentBridge.yaml',
    content,
    'AgentBridge.yaml'
  );
}

function createAgentCompatCheck() {
  const content = `#!/usr/bin/env node

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
  green: '\\x1b[32m',
  red: '\\x1b[31m',
  yellow: '\\x1b[33m',
  blue: '\\x1b[34m',
  reset: '\\x1b[0m',
  bold: '\\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(\`\${colors[color]}\${message}\${colors.reset}\`);
}

function checkFile(filePath, description) {
  const fullPath = join(projectRoot, filePath);
  if (existsSync(fullPath)) {
    log(\`✅ \${description}\`, 'green');
    return true;
  } else {
    log(\`❌ \${description} - Missing: \${filePath}\`, 'red');
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
    
    // Check required dependencies
    const requiredDeps = ['vitest', 'eslint', 'prettier'];
    const missingDeps = requiredDeps.filter(dep => 
      !pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]
    );

    if (missingDeps.length > 0) {
      log(\`❌ Missing dependencies: \${missingDeps.join(', ')}\`, 'red');
      return false;
    }

    // Check scripts
    const requiredScripts = ['test', 'lint'];
    const missingScripts = requiredScripts.filter(script => !pkg.scripts?.[script]);

    if (missingScripts.length > 0) {
      log(\`❌ Missing scripts: \${missingScripts.join(', ')}\`, 'red');
      return false;
    }

    log('✅ package.json configuration valid', 'green');
    return true;
  } catch (error) {
    log(\`❌ Error reading package.json: \${error.message}\`, 'red');
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
      log(\`⚠️  Directory missing: \${dir}\`, 'yellow');
      allDirsExist = false;
    }
  }

  return allDirsExist;
}

function main() {
  log('\\n🔍 AgentBridge Compatibility Check', 'bold');
  log('=====================================\\n', 'blue');

  const checks = [
    { name: 'Cursor Configuration', fn: checkCursorConfig },
    { name: 'Package.json', fn: checkPackageJson },
    { name: 'Environment Files', fn: checkEnvironmentFiles },
    { name: 'Project Structure', fn: checkProjectStructure }
  ];

  let passedChecks = 0;
  const totalChecks = checks.length;

  for (const check of checks) {
    log(\`\\n📋 \${check.name}:\`, 'blue');
    if (check.fn()) {
      passedChecks++;
    }
  }

  log('\\n📊 Summary:', 'bold');
  log(\`Passed: \${passedChecks}/\${totalChecks} checks\`, 
      passedChecks === totalChecks ? 'green' : 'yellow');

  if (passedChecks === totalChecks) {
    log('\\n🎉 All compatibility checks passed! AgentBridge is ready.', 'green');
    process.exit(0);
  } else {
    log('\\n⚠️  Some checks failed. Please review the issues above.', 'yellow');
    process.exit(1);
  }
}

// Run the compatibility check
main();`;

  return createFile(
    'scripts/agent-compat-check.mjs',
    content,
    'agent-compat-check.mjs'
  );
}

function main() {
  log('\n🚀 Dese ProDev Setup - AgentBridge v2', 'bold');
  log('=====================================\n', 'blue');

  // Ensure required directories exist
  ensureDir(join(projectRoot, '.cursor'));
  ensureDir(join(projectRoot, '.cursor/rules'));
  ensureDir(join(projectRoot, 'scripts'));

  const setupSteps = [
    { name: 'Dese-ProDev-Rules.yaml', fn: createDeseProDevRules },
    { name: 'AgentBridge.yaml', fn: createAgentBridge },
    { name: 'agent-compat-check.mjs', fn: createAgentCompatCheck },
    { name: 'package.json scripts', fn: updatePackageJson }
  ];

  let successCount = 0;
  const totalSteps = setupSteps.length;

  for (const step of setupSteps) {
    log(`\n📋 Setting up ${step.name}:`, 'blue');
    if (step.fn()) {
      successCount++;
    }
  }

  log('\n📊 Setup Summary:', 'bold');
  log(`Completed: ${successCount}/${totalSteps} steps`, 
      successCount === totalSteps ? 'green' : 'yellow');

  if (successCount === totalSteps) {
    log('\n🎉 AgentBridge v2 setup completed successfully!', 'green');
    log('\n📋 Next steps:', 'cyan');
    log('1. Restart Cursor', 'blue');
    log('2. Go to Rules & Memories section', 'blue');
    log('3. Import Dese-ProDev-Rules.yaml', 'blue');
    log('4. Run: pnpm run agent:check', 'blue');
    log('\n✨ Your agents are now under unified management!', 'green');
  } else {
    log('\n⚠️  Some setup steps failed. Please review the issues above.', 'yellow');
  }
}

// Run the setup
main();

