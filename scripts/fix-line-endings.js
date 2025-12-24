const fs = require('fs');
const path = require('path');

function fixLineEndings(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, .git, etc.
      if (!['node_modules', 'dist', '.git', '.next', 'coverage'].includes(file)) {
        fixLineEndings(filePath);
      }
    } else {
      // Only process text files
      const ext = path.extname(file);
      const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml', '.env', '.txt', '.html', '.css', '.scss'];
      
      if (textExtensions.includes(ext) || file.startsWith('.env')) {
        try {
          let content = fs.readFileSync(filePath, 'utf8');
          // Convert CRLF to LF
          if (content.includes('\r\n')) {
            content = content.replace(/\r\n/g, '\n');
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed: ${filePath}`);
          }
        } catch (err) {
          console.error(`Error processing ${filePath}:`, err.message);
        }
      }
    }
  });
}

const srcDir = path.join(__dirname, '..', 'src');
console.log('Fixing line endings in src directory...');
fixLineEndings(srcDir);
console.log('Done!');

