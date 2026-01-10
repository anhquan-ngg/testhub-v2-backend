const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else {
      copyFolderSync(path.join(from, element), path.join(to, element));
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
