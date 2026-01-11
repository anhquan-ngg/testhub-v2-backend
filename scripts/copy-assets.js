const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isFile()) {
      try {
        fs.copyFileSync(fromPath, toPath);
      } catch (err) {
        if (err.code === 'EBUSY') {
          console.warn(`⚠️ Warning: Skipping locked file: ${element}`);
        } else {
          throw err;
        }
      }
    } else {
      copyFolderSync(fromPath, toPath);
    }
  });
}

const srcDir = path.join(__dirname, '../generated');
const destDir = path.join(__dirname, '../dist/generated');

try {
  if (fs.existsSync(srcDir)) {
    copyFolderSync(srcDir, destDir);
    console.log('✅ Copied generated assets to dist/generated');
  } else {
    console.warn('⚠️ Warning: generated directory not found at', srcDir);
  }
} catch (err) {
  console.error('❌ Error copying assets:', err);
  process.exit(1);
}
