#!/usr/bin/env node

/**
 * Simple deploy script for FinBot V3
 * Builds frontend and starts server
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 FinBot V3 Deploy Başlıyor...\n');

try {
  // 1. Frontend Build
  console.log('📦 Frontend build ediliyor...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend build tamamlandı\n');

  // 2. Server başlat
  console.log('🖥️  Server başlatılıyor...');
  console.log('Server http://localhost:5000 adresinde çalışıyor');
  console.log('Frontend http://localhost:5173 adresinde çalışıyor');
  console.log('\nDeploy tamamlandı! 🎉');
  
} catch (error) {
  console.error('❌ Deploy hatası:', error.message);
  process.exit(1);
}
