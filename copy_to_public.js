const fs = require('fs');
const path = require('path');

// Locations where the images could be located
const searchPaths = [
  'c:\\Users\\wariy\\Downloads\\Slack Bot',
  'c:\\Users\\wariy\\Downloads\\Slack Bot\\documents',
  'c:\\Users\\wariy\\Downloads\\Slack Bot\\scripts',
  'C:\\Users\\wariy\\.gemini\\antigravity-ide\\brain\\5dfc795c-64fb-49d8-8173-efb85f4679e5'
];

// Target directory
const destDir = 'c:\\Users\\wariy\\Downloads\\Slack Bot\\showcase\\public\\images';

const filesToCopy = [
  { targetName: 'devlog_v1_5_poster.png', possibleSrcs: ['devlog_v1_5_poster_1783366127564.png', 'devlog_v1_5_poster.png'] },
  { targetName: 'fridge_ai_badge_logo.png', possibleSrcs: ['fridge_ai_badge_logo_1783366917724.png', 'fridge_ai_badge_logo.png'] },
  { targetName: 'fridgechef_banner.png', possibleSrcs: ['fridgechef_banner_1783329444256.png', 'fridgechef_banner.png'] },
  { targetName: 'devlog_poster.png', possibleSrcs: ['devlog_poster_1783329460587.png', 'devlog_poster.png'] }
];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

filesToCopy.forEach(file => {
  let found = false;

  for (const basePath of searchPaths) {
    for (const srcName of file.possibleSrcs) {
      const srcPath = path.join(basePath, srcName);
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(destDir, file.targetName);
        fs.copyFileSync(srcPath, destPath);
        console.log(`Successfully copied ${srcName} -> showcase/public/images/${file.targetName}`);
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    console.error(`Error: Could not locate image for ${file.targetName} in any path.`);
  }
});
