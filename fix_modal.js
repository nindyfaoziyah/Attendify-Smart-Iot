const fs = require('fs');
let content = fs.readFileSync('src/screens/ManageStudentsScreen.tsx', 'utf8');

content = content.replace(/,\s*\{\s*backgroundColor:\s*tokens\.background\s*\}\]/g, ']');
content = content.replace(/\[styles\.fullScreenModalContent\]/g, 'styles.fullScreenModalContent');

content = content.replace(/,\s*\{\s*color:\s*tokens\.textColor\s*\}\]/g, ']');
content = content.replace(/\[styles\.modalTitle\]/g, 'styles.modalTitle');
content = content.replace(/\[styles\.inputLabel\]/g, 'styles.inputLabel');
content = content.replace(/\[styles\.passwordInput\]/g, 'styles.passwordInput');

content = content.replace(/,\s*\{\s*color:\s*tokens\.subTextColor\s*\}\]/g, ']');
content = content.replace(/\[styles\.modalSubtitle\]/g, 'styles.modalSubtitle');

content = content.replace(/,\s*\{\s*backgroundColor:\s*tokens\.iconButtonBg\s*\}\]/g, ']');
content = content.replace(/\[styles\.closeBtn\]/g, 'styles.closeBtn');

content = content.replace(/,\s*\{\s*backgroundColor:\s*tokens\.cardBg,\s*borderColor:\s*tokens\.borderColor,\s*color:\s*tokens\.textColor\s*\}\]/g, ']');
content = content.replace(/\[styles\.inputBox\]/g, 'styles.inputBox');

content = content.replace(/,\s*\{\s*backgroundColor:\s*tokens\.cardBg,\s*borderColor:\s*tokens\.borderColor\s*\}\]/g, ']');
content = content.replace(/\[styles\.passwordContainer\]/g, 'styles.passwordContainer');

content = content.replace(/color=\{tokens\.subTextColor\}/g, 'color="#56637A"');
content = content.replace(/color=\{tokens\.textColor\}/g, 'color="#FFF"');
content = content.replace(/placeholderTextColor=\{tokens\.subTextColor\}/g, 'placeholderTextColor="#56637A"');

fs.writeFileSync('src/screens/ManageStudentsScreen.tsx', content);
console.log('Done reverting modal theme');
