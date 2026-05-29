const fs = require('fs');
let c = fs.readFileSync('src/screens/ProfileDetailsScreen.tsx', 'utf8');

c = c.replace(/borderBottomColor: tokens\.borderColor/g, 'borderColor: tokens.borderColor');
c = c.replace(/paddingHorizontal: 0,/g, 'paddingHorizontal: 16,\n    borderRadius: 12,\n    borderWidth: 1,\n    backgroundColor: "rgba(128,128,128,0.1)",');
c = c.replace(/borderBottomWidth: 1,/g, '');
c = c.replace(/borderBottomColor: 'rgba\\(255,255,255,0\\.1\\)',/g, '');

fs.writeFileSync('src/screens/ProfileDetailsScreen.tsx', c);
console.log('Fixed Profile');
