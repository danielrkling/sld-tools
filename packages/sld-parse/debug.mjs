// Simple script to understand tokenization
import { tokenize } from './src/tokenize.js';
import { rawTextElements } from './src/util.js';

// Simulate the exact test case
const strings = ['\n      <div>\n        <span>text</span>\n      </div>\n    '];
const tokens = tokenize(strings, rawTextElements);

console.log('Input string:');
console.log(JSON.stringify(strings[0]));
console.log('\nTokens:');
tokens.forEach((token, i) => {
  console.log(`${i}: ${JSON.stringify(token)}`);
});