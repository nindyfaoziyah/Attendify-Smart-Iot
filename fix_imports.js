const fs = require('fs');
const path = require('path');

const dirsToFix = [
  path.join(__dirname, 'src', 'components', 'ui'),
  path.join(__dirname, 'src', 'components', 'analytics')
];

dirsToFix.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes("'../context/ThemeContext'")) {
        content = content.replace(/'\.\.\/context\/ThemeContext'/g, "'../../context/ThemeContext'");
        fs.writeFileSync(filePath, content);
        console.log(`Fixed ${file}`);
      }
    }
  });
});
console.log('Done!');
