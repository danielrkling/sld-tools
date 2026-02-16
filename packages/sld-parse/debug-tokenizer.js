const { tokenize } = require('./src/tokenize');

// Test what the tokenizer produces for <div>Hello</div>
const tokens = tokenize(['<div>Hello</div>'], new Set());
console.log('Tokens for <div>Hello</div>:');
console.log(JSON.stringify(tokens, null, 2));