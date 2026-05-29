const fs = require('fs');
let c = fs.readFileSync('src/screens/ManageLecturersScreen.tsx', 'utf8');

c = c.replace(
  /\} catch \(error\) \{\s*setAlertConfig\(\{ visible: true, title: 'Error', message: 'Gagal menghapus dosen', type: 'error' \}\);\s*\}\s*\}\s*\}\s*\]\s*\);\s*\};/g,
  `} catch (error) {
              setAlertConfig({ visible: true, title: 'Error', message: 'Gagal menghapus dosen', type: 'error' });
            }
      }
    });
  };`
);

fs.writeFileSync('src/screens/ManageLecturersScreen.tsx', c);
console.log('Fixed syntax');
