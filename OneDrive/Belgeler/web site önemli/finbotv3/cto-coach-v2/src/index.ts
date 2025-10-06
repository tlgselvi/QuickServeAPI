import { Command } from 'commander';
import chalk from 'chalk';
import { prepareSprint } from './commands/prepare.js';
import { auditProject } from './commands/audit.js';
import { optimizeProject } from './commands/optimize.js';
import { releaseProject } from './commands/release.js';

const program = new Command();
program.name('cto-coach').description('Tolga Yazılım CTO Koçu v2 CLI').version('0.1.0');

program
  .command('hazirla')
  .description('Sprint planı + DoD + risk analizi üret')
  .option('-p, --project <name>', 'Proje adı', process.env.PROJECT_NAME || 'FinBot')
  .option('-s, --sprint <number>', 'Sprint numarası (1: Temel Geliştirme, 2: Monitoring ve Scaling)', '1')
  .option('--plan <type>', 'Özel plan türü (sprint2, audit, optimize)', '')
  .action(prepareSprint);

program
  .command('audit')
  .description('Güvenlik ve gizlilik kontrol listesi + patch')
  .option('-p, --project <name>', 'Proje adı', process.env.PROJECT_NAME || 'FinBot')
  .action(auditProject);

program
  .command('optimize')
  .description('Hedef metrik (P95, bundle, LCP) → ölçüm + düzeltme')
  .option('-p, --project <name>', 'Proje adı', process.env.PROJECT_NAME || 'FinBot')
  .action(optimizeProject);

program
  .command('release')
  .description('README/PR/Release notes üret')
  .option('-p, --project <name>', 'Proje adı', process.env.PROJECT_NAME || 'FinBot')
  .action(releaseProject);

program.parse();
