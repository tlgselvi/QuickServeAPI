const fs = require('fs');
const path = require('path');

// Markdown dosyalarını düzelt
const markdownFiles = [
  'README.md',
  'API_DOCUMENTATION.md', 
  'CHANGELOG.md',
  'RELEASE_NOTES_v3.0.0.md',
  'replit.md'
];

function fixMarkdownFormatting(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix 1: Headers should be surrounded by blank lines
  content = content.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');
  content = content.replace(/(#{1,6}\s[^\n]+)\n([^\n#\s])/g, '$1\n\n$2');
  
  // Fix 2: Lists should be surrounded by blank lines
  content = content.replace(/([^\n])\n(\s*[-*+]\s)/g, '$1\n\n$2');
  content = content.replace(/(\s*[-*+]\s[^\n]+)\n([^\n\s-*+#])/g, '$1\n\n$2');
  
  // Fix 3: Fenced code blocks should be surrounded by blank lines
  content = content.replace(/([^\n])\n(```)/g, '$1\n\n$2');
  content = content.replace(/(```[^\n]*\n[^`]*```)\n([^\n])/g, '$1\n\n$2');
  
  // Fix 4: Files should end with a single newline
  if (!content.endsWith('\n')) {
    content += '\n';
  }
  
  // Fix 5: Remove excessive newlines (more than 2 consecutive)
  content = content.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${filePath}`);
}

// Ana dizinde markdown dosyalarını düzelt
markdownFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  fixMarkdownFormatting(filePath);
});

console.log('Markdown formatting fixes completed!');
