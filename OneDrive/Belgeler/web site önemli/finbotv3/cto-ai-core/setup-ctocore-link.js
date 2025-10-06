#!/usr/bin/env node

/**
 * CTO-AI Core Setup Script
 * Automates the setup of CTO-AI Core integration across projects
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class CTOCoreSetup {
  constructor() {
    this.homeDir = os.homedir();
    this.corePath = path.join(process.cwd(), 'shared');
    this.projects = {
      'cto-core': {
        path: path.join(process.cwd(), '..', 'cto-coach-v2'),
        type: 'ai-coaching',
        version: '2.0.0'
      },
      'fin-bot': {
        path: path.join(process.cwd(), '..', 'finbotv3'),
        type: 'financial-ai', 
        version: '3.0.0'
      }
    };
  }

  /**
   * Main setup function
   */
  async setup() {
    console.log('🚀 Setting up CTO-AI Core integration...\n');

    try {
      // 1. Create shared directory structure
      await this.createSharedStructure();
      
      // 2. Setup context and policies
      await this.setupSharedConfig();
      
      // 3. Link projects
      await this.linkProjects();
      
      // 4. Setup Cursor integration
      await this.setupCursorIntegration();
      
      // 5. Validate setup
      await this.validateSetup();
      
      console.log('\n✅ CTO-AI Core setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Restart Cursor IDE');
      console.log('   2. Verify AI context sharing in both projects');
      console.log('   3. Test cross-project AI insights');
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Create shared directory structure
   */
  async createSharedStructure() {
    console.log('📁 Creating shared directory structure...');
    
    const directories = [
      this.corePath,
      path.join(this.corePath, 'contexts'),
      path.join(this.corePath, 'logs'),
      path.join(this.corePath, 'cache'),
      path.join(this.corePath, 'backups')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✓ Created: ${dir}`);
      } else {
        console.log(`   ✓ Exists: ${dir}`);
      }
    }
  }

  /**
   * Setup shared configuration files
   */
  async setupSharedConfig() {
    console.log('\n⚙️  Setting up shared configuration...');

    // Context file
    const contextFile = path.join(this.corePath, 'context.json');
    const contextData = {
      organization: "CTO-AI",
      owner: "Tolga Selvi",
      version: "1.0.0",
      created_at: new Date().toISOString(),
      shared_env: {
        DB_URL: "postgres://user:pass@localhost:5432/core",
        LOG_LEVEL: "info",
        AI_PROVIDER: "openai",
        AI_MODEL: "gpt-4",
        CACHE_TTL: 3600
      },
      active_projects: Object.keys(this.projects),
      project_configs: {},
      ai_context: {
        shared_memories: [],
        cross_project_insights: [],
        performance_metrics: {
          response_time: "<2s",
          accuracy: ">95%",
          user_satisfaction: ">4.5/5"
        }
      }
    };

    // Add project configs
    for (const [projectId, config] of Object.entries(this.projects)) {
      contextData.project_configs[projectId] = {
        type: config.type,
        access_level: projectId === 'cto-core' ? 'full' : 'read-write',
        last_sync: new Date().toISOString()
      };
    }

    fs.writeFileSync(contextFile, JSON.stringify(contextData, null, 2));
    console.log(`   ✓ Created: ${contextFile}`);

    // Policies file
    const policiesFile = path.join(this.corePath, 'policies.yaml');
    const policiesData = `version: 1.0.0
created_at: "${new Date().toISOString()}"

permissions:
  - project: cto-core
    access: full
    description: "AI coaching and sprint management system"
    
  - project: fin-bot
    access: read-write
    description: "Financial AI assistant with advanced analytics"

rules:
  code_style: 
    standard: "typescript"
    linting: "eslint"
    
  security:
    scan: enabled
    level: high
    
  ai_governance:
    prompt_review: cto-ai-core
    model_validation: required
`;

    fs.writeFileSync(policiesFile, policiesData);
    console.log(`   ✓ Created: ${policiesFile}`);
  }

  /**
   * Link projects to CTO-AI Core
   */
  async linkProjects() {
    console.log('\n🔗 Linking projects...');

    for (const [projectId, config] of Object.entries(this.projects)) {
      const linkFile = path.join(config.path, '.ctocore-link');
      
      if (!fs.existsSync(config.path)) {
        console.log(`   ⚠️  Project path not found: ${config.path}`);
        continue;
      }

      const linkData = {
        core_path: this.corePath,
        project_id: projectId,
        project_type: config.type,
        version: config.version,
        last_sync: new Date().toISOString(),
        capabilities: this.getProjectCapabilities(projectId),
        dependencies: this.getProjectDependencies(projectId),
        api_endpoints: this.getProjectEndpoints(projectId),
        shared_context: this.getProjectContext(projectId)
      };

      fs.writeFileSync(linkFile, JSON.stringify(linkData, null, 2));
      console.log(`   ✓ Linked: ${projectId} -> ${linkFile}`);
    }
  }

  /**
   * Setup Cursor IDE integration
   */
  async setupCursorIntegration() {
    console.log('\n🎯 Setting up Cursor IDE integration...');

    for (const [projectId, config] of Object.entries(this.projects)) {
      const cursorDir = path.join(config.path, '.cursor');
      const settingsFile = path.join(cursorDir, 'settings.json');

      if (!fs.existsSync(config.path)) continue;

      // Create .cursor directory
      if (!fs.existsSync(cursorDir)) {
        fs.mkdirSync(cursorDir, { recursive: true });
      }

      // Create or update settings
      const settings = {
        "ctoAI.coreIntegration": true,
        "ctoAI.sharedContext": path.join(this.corePath, 'context.json'),
        "ctoAI.projectId": projectId,
        "ctoAI.lastSync": new Date().toISOString(),
        "typescript.preferences.includePackageJsonAutoImports": "auto",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": true
        }
      };

      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
      console.log(`   ✓ Cursor settings: ${projectId}`);
    }
  }

  /**
   * Validate setup
   */
  async validateSetup() {
    console.log('\n🔍 Validating setup...');

    // Check core files
    const coreFiles = ['context.json', 'policies.yaml'];
    for (const file of coreFiles) {
      const filePath = path.join(this.corePath, file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✓ Core file exists: ${file}`);
      } else {
        throw new Error(`Core file missing: ${file}`);
      }
    }

    // Check project links
    for (const [projectId, config] of Object.entries(this.projects)) {
      const linkFile = path.join(config.path, '.ctocore-link');
      if (fs.existsSync(linkFile)) {
        try {
          const linkData = JSON.parse(fs.readFileSync(linkFile, 'utf8'));
          if (linkData.project_id === projectId) {
            console.log(`   ✓ Project link valid: ${projectId}`);
          } else {
            throw new Error(`Invalid project ID in link file: ${projectId}`);
          }
        } catch (error) {
          throw new Error(`Invalid link file: ${linkFile}`);
        }
      } else {
        console.log(`   ⚠️  Project link missing: ${projectId}`);
      }
    }

    // Test core path resolution
    console.log(`   ✓ Core path: ${this.corePath}`);
  }

  /**
   * Get project capabilities
   */
  getProjectCapabilities(projectId) {
    const capabilities = {
      'cto-core': ['sprint_planning', 'audit', 'optimization', 'release_management'],
      'fin-bot': ['ai_analysis', 'automated_reporting', 'smart_notifications', 'scenario_analysis', 'real_time_dashboard']
    };
    return capabilities[projectId] || [];
  }

  /**
   * Get project dependencies
   */
  getProjectDependencies(projectId) {
    const dependencies = {
      'cto-core': ['typescript', 'node'],
      'fin-bot': ['openai', 'drizzle-orm', 'react', 'typescript']
    };
    return dependencies[projectId] || [];
  }

  /**
   * Get project API endpoints
   */
  getProjectEndpoints(projectId) {
    const endpoints = {
      'cto-core': {
        sprint: '/hazirla',
        audit: '/audit', 
        optimize: '/optimize',
        release: '/release'
      },
      'fin-bot': {
        ai_analysis: '/api/ai/analyze',
        notifications: '/api/ai/notifications',
        reports: '/api/ai/reports',
        scenarios: '/api/ai/scenarios'
      }
    };
    return endpoints[projectId] || {};
  }

  /**
   * Get project shared context
   */
  getProjectContext(projectId) {
    const contexts = {
      'cto-core': {
        ai_models: ['gpt-4'],
        planning_types: ['sprint', 'audit', 'optimization', 'release']
      },
      'fin-bot': {
        ai_models: ['gpt-4', 'gpt-3.5-turbo'],
        analysis_types: ['trend', 'risk', 'recommendation', 'health', 'forecast'],
        notification_channels: ['dashboard', 'email', 'push']
      }
    };
    return contexts[projectId] || {};
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new CTOCoreSetup();
  setup.setup().catch(console.error);
}

module.exports = CTOCoreSetup;