const fs = require('fs');

let content = fs.readFileSync('src/screens/ManageStudentsScreen.tsx', 'utf8');

// 1. Add alertConfig to state
if (!content.includes('alertConfig')) {
  content = content.replace(
    /const \[activeTab, setActiveTab\] = useState<\'siswa\' \| \'jadwal\'>\(\'siswa\'\);/,
    `const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'confirm'; onConfirm?: () => void; }>({ visible: false, title: '', message: '', type: 'success' });\n  const [activeTab, setActiveTab] = useState<'siswa' | 'jadwal'>('siswa');`
  );
}

// 2. Replace showNotification implementation
content = content.replace(
  /const showNotification = \(title: string, message: string\) => \{[\s\S]*?\}\s*else\s*\{\s*Alert\.alert\(title, message\);\s*\}\s*\};/,
  `const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {\n    setAlertConfig({ visible: true, title, message, type });\n  };`
);

// 3. Replace handleDeleteStudent implementation
content = content.replace(
  /const handleDeleteStudent = async \(id: number, name: string\) => \{[\s\S]*?showNotification\('Error', 'Kesalahan jaringan'\);\s*\}\s*\};/,
  `const handleDeleteStudent = (id: number, name: string) => {
    setAlertConfig({
      visible: true,
      title: 'Hapus Mahasiswa',
      message: \`Yakin ingin menghapus data mahasiswa \${name}?\`,
      type: 'confirm',
      onConfirm: async () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        try {
          const res = await fetch(\`\${API_URL}/admin/students/\${id}\`, { method: 'DELETE' });
          if (res.ok) {
            showNotification('Berhasil', 'Mahasiswa berhasil dihapus', 'success');
            fetchStudents();
          } else {
            showNotification('Gagal', 'Gagal menghapus mahasiswa', 'error');
          }
        } catch (error) {
          showNotification('Error', 'Kesalahan jaringan', 'error');
        }
      }
    });
  };`
);

// 4. Add Modal UI before closing LinearGradient
if (!content.includes('alertOverlay')) {
  const alertModalCode = `
      {/* CUSTOM ALERT MODAL */}
      <Modal visible={alertConfig.visible} transparent={true} animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <View style={styles.alertActionRow}>
              {alertConfig.type === 'confirm' ? (
                <>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: 'transparent' }]} onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}>
                    <Text style={{ color: '#FFF' }}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: '#EF4444' }]} onPress={alertConfig.onConfirm}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Hapus</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.alertBtn, { backgroundColor: Colors.ai.primary, width: '100%' }]} onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>`;
  
  content = content.replace(/<\/LinearGradient>/, alertModalCode);
}

// 5. Add custom alert styles
if (!content.includes('alertBox')) {
  const alertStyles = `
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: '80%', padding: 24, borderRadius: 16, backgroundColor: '#1E293B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  alertTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  alertMessage: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 20 },
  alertActionRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 12 },
  alertBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 100 },`;
  
  content = content.replace(/const styles = StyleSheet\.create\(\{/, `const styles = StyleSheet.create({${alertStyles}`);
}

// 6. Fix header margin and back button background
content = content.replace(/styles\.header, \{ marginBottom: 24 \}/g, 'styles.header, { marginBottom: 32 }');
content = content.replace(/backButton: \{[\s\S]*?\},/, 'backButton: { padding: 8, borderRadius: 12, marginLeft: -8 },');

// 7. Fix modernActionBtn flexBasis for wrapping 2x2
content = content.replace(/modernActionBtn: \{ flexBasis: \'22%\'/g, 'modernActionBtn: { flexBasis: \'47%\', marginBottom: 10');

fs.writeFileSync('src/screens/ManageStudentsScreen.tsx', content);
console.log('Update finished.');
