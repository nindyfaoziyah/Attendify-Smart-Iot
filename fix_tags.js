const fs = require('fs');
let c = fs.readFileSync('src/screens/ManageLecturersScreen.tsx', 'utf8');
const lines = c.split('\n');

lines[197] = lines[197].replace('</View>', '</BlurView>');
lines[251] = lines[251].replace('</View>', '</BlurView>');

fs.writeFileSync('src/screens/ManageLecturersScreen.tsx', lines.join('\n'));
console.log('Fixed tags');
