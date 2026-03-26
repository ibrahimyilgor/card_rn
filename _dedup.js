const fs = require('fs');
let content = fs.readFileSync('src/screens/GameScreen.js', 'utf8');
const nl = content.includes('\r\n') ? '\r\n' : '\n';
const t = '\t';

const styleBlock = [
  t + 'questionTtsBtn: {',
  t + t + 'position: "absolute",',
  t + t + 'top: 8,',
  t + t + 'right: 8,',
  t + t + 'padding: 4,',
  t + t + 'zIndex: 10,',
  t + '},',
].join(nl);

const first = content.indexOf(styleBlock);
const second = content.indexOf(styleBlock, first + 1);
if (second !== -1) {
  content = content.slice(0, second) + content.slice(second + styleBlock.length + nl.length);
  console.log('duplicate removed');
} else {
  console.log('no duplicate found');
}
fs.writeFileSync('src/screens/GameScreen.js', content, 'utf8');
