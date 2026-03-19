const fs = require('fs');
const file = 'api.js';
let content = fs.readFileSync(file, 'utf8');

const s1 = content.indexOf('toggle:');
if (s1 !== -1) {
    const e1 = content.indexOf('// Import deck with flashcards', s1);
    const replacement = '';
    content = content.substring(0, s1) + replacement + content.substring(e1);
}
fs.writeFileSync(file, content);
console.log('API fixed');
