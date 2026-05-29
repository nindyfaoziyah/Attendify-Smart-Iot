const fs = require('fs');
let c = fs.readFileSync('src/screens/ManageLecturersScreen.tsx', 'utf8');

c = c.replace(
  /<BlurView intensity=\{80\} tint=\{isLightTheme \? 'light' : 'dark'\} style=\{\[styles.modalContent, \{ backgroundColor: tokens.cardBg, borderColor: tokens.borderColor \}\]\}>/g,
  `<View style={[styles.modalContent, { backgroundColor: '#161D31' }]}>`
);
c = c.replace(/<\/BlurView>/g, '</View>');

fs.writeFileSync('src/screens/ManageLecturersScreen.tsx', c);
console.log('Fixed Modal Background');
