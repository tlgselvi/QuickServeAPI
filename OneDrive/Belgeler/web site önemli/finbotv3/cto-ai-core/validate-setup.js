#!/usr/bin/env node

/**
 * CTO-AI Core Validation Script
 * Validates the setup of CTO-AI Core integration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating CTO-AI Core setup...\n');

// Check core files
const corePath = path.join(__dirname, 'shared');
const coreFiles = ['context.json', 'policies.yaml'];

let allValid = true;

console.log('📁 Checking core files...');
for (const file of coreFiles) {
  const filePath = path.join(corePath, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} missing`);
    allValid = false;
  }
}

// Check project links
console.log('\n🔗 Checking project links...');
const projects = [
  { name: 'cto-core', path: path.join(__dirname, '..', 'cto-coach-v2', '.ctocore-link') },
  { name: 'fin-bot', path: path.join(__dirname, '..', 'finbotv3', '.ctocore-link') }
];

for (const project of projects) {
  if (fs.existsSync(project.path)) {
    try {
      const linkData = JSON.parse(fs.readFileSync(project.path, 'utf8'));
      if (linkData.project_id === project.name) {
        console.log(`   ✅ ${project.name} link valid`);
      } else {
        console.log(`   ❌ ${project.name} invalid project ID`);
        allValid = false;
      }
    } catch (error) {
      console.log(`   ❌ ${project.name} invalid JSON`);
      allValid = false;
    }
  } else {
    console.log(`   ⚠️  ${project.name} link missing`);
  }
}

// Check Cursor settings
console.log('\n🎯 Checking Cursor settings...');
const cursorSettings = [
  { name: 'cto-core', path: path.join(__dirname, '..', 'cto-coach-v2', '.cursor', 'settings.json') },
  { name: 'fin-bot', path: path.join(__dirname, '..', 'finbotv3', '.cursor', 'settings.json') }
];

for (const setting of cursorSettings) {
  if (fs.existsSync(setting.path)) {
    try {
      const settingsData = JSON.parse(fs.readFileSync(setting.path, 'utf8'));
      if (settingsData.ctoAI?.coreIntegration) {
        console.log(`   ✅ ${setting.name} Cursor settings valid`);
      } else {
        console.log(`   ❌ ${setting.name} Cursor integration disabled`);
        allValid = false;
      }
    } catch (error) {
      console.log(`   ❌ ${setting.name} invalid Cursor settings`);
      allValid = false;
    }
  } else {
    console.log(`   ⚠️  ${setting.name} Cursor settings missing`);
  }
}

// Summary
console.log('\n📊 Validation Summary:');
if (allValid) {
  console.log('   ✅ CTO-AI Core setup is valid and ready!');
  console.log('\n🚀 Next steps:');
  console.log('   1. Restart Cursor IDE');
  console.log('   2. Test AI context sharing');
  console.log('   3. Verify cross-project insights');
} else {
  console.log('   ❌ Setup validation failed');
  console.log('\n🔧 Fix the issues above and run validation again');
}

console.log('\n📍 Core path:', corePath);
