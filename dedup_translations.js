import fs from 'fs';

const content = fs.readFileSync('src/contexts/LanguageContext.jsx', 'utf-8');

// Find the sharedUiTranslations object
const startMarker = 'const sharedUiTranslations = {';
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf('};', startIdx) + 2;

const beforeDict = content.substring(0, startIdx + startMarker.length);
const dictContent = content.substring(startIdx + startMarker.length, endIdx - 2);
const afterDict = content.substring(endIdx);

// Parse and deduplicate the dictionary entries
const lines = dictContent.split('\n');
const seen = new Set();
const cleanedLines = [];

for (const line of lines) {
  // Extract the key from the line if it's a key-value pair
  const keyMatch = line.match(/"([^"]+)"\s*:/);
  if (keyMatch) {
    const key = keyMatch[1];
    if (!seen.has(key)) {
      seen.add(key);
      cleanedLines.push(line);
    }
  } else {
    cleanedLines.push(line);
  }
}

const newContent = beforeDict + '\n' + cleanedLines.join('\n') + '\n' + afterDict;
fs.writeFileSync('src/contexts/LanguageContext.jsx', newContent, 'utf-8');

console.log('✅ Removed duplicate keys from LanguageContext.jsx');
