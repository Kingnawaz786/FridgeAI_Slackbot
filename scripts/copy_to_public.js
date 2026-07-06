const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\wariy\\Downloads\\Slack Bot';
const destDir = 'c:\\Users\\wariy\\Downloads\\Slack Bot\\showcase\\public';

const filesToCopy = [
  'devlog_v1_5_poster.png',
  'fridge_ai_badge_logo.png',
  'fridgechef_banner.png',
  'devlog_poster.png'
];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

filesToCopy.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, file);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Successfully copied ${file} to public/`);
  } else {
    console.warn(`Warning: Source file not found: ${srcPath}`);
  }
});
