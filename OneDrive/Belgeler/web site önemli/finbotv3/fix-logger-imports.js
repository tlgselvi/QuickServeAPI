const fs = require('fs');
const path = require('path');

// Logger import'unu eklemek için dosyaları bul
const serverDir = './QuickServeAPI/server';
const filesToFix = [];

function findTsFiles(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsFiles(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Logger kullanılıyor ama import edilmemiş
      if (content.includes('logger.') && !content.includes("from './utils/logger.ts'") && !content.includes("from '../utils/logger.ts'") && !content.includes("from '../../utils/logger.ts'") && !content.includes("from '../../../utils/logger.ts'")) {
        filesToFix.push(filePath);
      }
    }
  }
}

findTsFiles(serverDir);

console.log('Logger import\'u eklenmesi gereken dosyalar:');
filesToFix.forEach(file => console.log(file));

// Her dosyayı düzelt
filesToFix.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Import satırlarını bul
  const lines = content.split('\n');
  let importIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      importIndex = i;
    } else if (lines[i].trim() === '' && importIndex !== -1) {
      break;
    }
  }
  
  // Relative path hesapla
  const relativePath = path.relative(path.dirname(filePath), path.join(serverDir, 'utils', 'logger.ts'));
  const importPath = relativePath.replace(/\\/g, '/').replace(/\.ts$/, '');
  
  // Logger import'unu ekle
  if (importIndex !== -1) {
    lines.splice(importIndex + 1, 0, `import { logger } from '${importPath}';`);
  } else {
    lines.unshift(`import { logger } from '${importPath}';`);
  }
  
  const newContent = lines.join('\n');
  fs.writeFileSync(filePath, newContent);
  console.log(`Fixed: ${filePath}`);
});

console.log('Logger import\'ları düzeltildi!');
