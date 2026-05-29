const fs = require('fs');
const path = 'backend/controllers/reportController.js';
let content = fs.readFileSync(path, 'utf8');

// For Excel
content = content.replace(
    /status: item\.status\.toUpperCase\(\)/g,
    "status: (item.status && item.status.trim() !== '') ? item.status.toUpperCase() : 'BELUM HADIR'"
);

// For PDF
content = content.replace(
    /doc\.text\(item\.status\.toUpperCase\(\), 420, y\);/g,
    "doc.text((item.status && item.status.trim() !== '') ? item.status.toUpperCase() : 'BELUM HADIR', 420, y);"
);

// For Schedule Stats endpoint
content = content.replace(
    /let originalStatus = \(item\.status \|\| \'\'\)\.trim\(\);/g,
    "let originalStatus = (item.status && item.status.trim() !== '') ? item.status.trim() : 'belum hadir';"
);

fs.writeFileSync(path, content);
console.log('Fixed reportController');
