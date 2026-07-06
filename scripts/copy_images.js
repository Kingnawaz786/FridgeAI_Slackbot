const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\wariy\\.gemini\\antigravity-ide\\brain\\5dfc795c-64fb-49d8-8173-efb85f4679e5';
const destDir = 'c:\\Users\\wariy\\Downloads\\Slack Bot';

const filesToCopy = [
  { src: 'devlog_v1_5_poster_1783366127564.png', dest: 'devlog_v1_5_poster.png' },
  { src: 'fridge_ai_badge_logo_1783366917724.png', dest: 'fridge_ai_badge_logo.png' }
];

filesToCopy.forEach(file => {
  const srcPath = path.join(srcDir, file.src);
  const destPath = path.join(destDir, file.dest);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Successfully copied ${file.src} to ${file.dest}`);
  } else {
    console.error(`Source file not found: ${srcPath}`);
  }
});
