const fs = require('fs');

let content = fs.readFileSync('src/screens/ManageStudentsScreen.tsx', 'utf8');

// 1. Fix handleDownload url
content = content.replace(
  /const url = `\/reports\/\$\{type\}\?jadwal_id=\$\{selectedJadwalInfo\.id\}&class_id=\$\{selectedJadwalInfo\.kelas_id\}`;/,
  'const url = `${API_URL}/reports/${type}?jadwal_id=${selectedJadwalInfo.id}&class_id=${selectedJadwalInfo.kelas_id}`;'
);

// 2. Fix metricBox flex
content = content.replace(
  /width: \'48%\', marginBottom: 12, backgroundColor/g,
  'width: \'48%\', marginBottom: 12, flex: undefined, backgroundColor'
);
content = content.replace(
  /width: \'48%\', backgroundColor/g,
  'width: \'48%\', flex: undefined, backgroundColor'
);
content = content.replace(
  /flexDirection: \'row\', flexWrap: \'wrap\', justifyContent: \'space-between\', marginBottom: 24/g,
  'flexDirection: \'row\', flexWrap: \'wrap\', justifyContent: \'space-between\', marginBottom: 24, paddingHorizontal: 4'
);

fs.writeFileSync('src/screens/ManageStudentsScreen.tsx', content);
console.log('Update finished 3.');
