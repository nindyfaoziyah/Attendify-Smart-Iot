const fs = require('fs');
let content = fs.readFileSync('src/screens/ManageStudentsScreen.tsx', 'utf8');
content = content.replace(/io\(API_URL\)/g, "io(API_URL.replace('/api', ''))");
fs.writeFileSync('src/screens/ManageStudentsScreen.tsx', content);
console.log('Done 2');
