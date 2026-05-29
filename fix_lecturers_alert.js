const fs = require('fs');

const file = 'src/screens/ManageLecturersScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add alertConfig state
if (!content.includes('alertConfig')) {
  content = content.replace(
    /const \[activeTab, setActiveTab\] = useState<\'dosen\' \| \'jadwal\'>\(\'dosen\'\);/,
    `const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'confirm'; onConfirm?: () => void; }>({ visible: false, title: '', message: '', type: 'success' });\n  const [activeTab, setActiveTab] = useState<'dosen' | 'jadwal'>('dosen');`
  );
}

// 2. Replace simple Alert.alert calls
content = content.replace(
  /Alert\.alert\('Error',\s*'Gagal mengambil data dosen'\);/g,
  "setAlertConfig({ visible: true, title: 'Error', message: 'Gagal mengambil data dosen', type: 'error' });"
);
content = content.replace(
  /Alert\.alert\('Error',\s*'Gagal menghapus dosen'\);/g,
  "setAlertConfig({ visible: true, title: 'Error', message: 'Gagal menghapus dosen', type: 'error' });"
);
content = content.replace(
  /Alert\.alert\('Error',\s*'Lengkapi data yang wajib diisi \(Nama, NIP, Email, dan Password untuk data baru\)'\);/g,
  "setAlertConfig({ visible: true, title: 'Error', message: 'Lengkapi data yang wajib diisi (Nama, NIP, Email, dan Password untuk data baru)', type: 'error' });"
);
content = content.replace(
  /Alert\.alert\('Berhasil',\s*editingLecturer \? 'Data dosen berhasil diperbarui' : `Dosen \$\{formData\.name\} berhasil ditambahkan dengan NIP \$\{formData\.nip\}`\);/g,
  "setAlertConfig({ visible: true, title: 'Berhasil', message: editingLecturer ? 'Data dosen berhasil diperbarui' : `Dosen \${formData.name} berhasil ditambahkan dengan NIP \${formData.nip}`, type: 'success' });"
);
content = content.replace(
  /Alert\.alert\('Gagal',\s*result\.message \|\| 'Terjadi kesalahan saat menyimpan data'\);/g,
  "setAlertConfig({ visible: true, title: 'Gagal', message: result.message || 'Terjadi kesalahan saat menyimpan data', type: 'error' });"
);
content = content.replace(
  /Alert\.alert\('Error',\s*'Terjadi kesalahan koneksi'\);/g,
  "setAlertConfig({ visible: true, title: 'Error', message: 'Terjadi kesalahan koneksi', type: 'error' });"
);

// 3. Replace multi-line confirmation Alert.alert for Hapus Data
content = content.replace(
  /Alert\.alert\([\s\S]*?'Hapus Data',[\s\S]*?'Apakah Anda yakin ingin menghapus data dosen ini\?',[\s\S]*?text: 'Hapus',[\s\S]*?onPress: async \(\) => \{[\s\S]*?try \{/g,
  `setAlertConfig({
      visible: true,
      title: 'Hapus Data',
      message: 'Apakah Anda yakin ingin menghapus data dosen ini?',
      type: 'confirm',
      onConfirm: async () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        try {`
);
content = content.replace(
  /fetchLecturers\(\);\s*\}\s*catch \([^)]+\) \{\s*console\.error\('Delete error:', error\);\s*setAlertConfig\(\{ visible: true, title: 'Error', message: 'Gagal menghapus dosen', type: 'error' \}\);\s*\}\s*\}\s*\}\s*\]\s*\);/g,
  `fetchLecturers();
        } catch (error) {
          console.error('Delete error:', error);
          setAlertConfig({ visible: true, title: 'Error', message: 'Gagal menghapus dosen', type: 'error' });
        }
      }
    });`
);

// 4. Inject Modal Component
if (!content.includes('CUSTOM ALERT MODAL')) {
  const modalCode = `
      {/* CUSTOM ALERT MODAL */}
      <Modal visible={alertConfig.visible} transparent={true} animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <View style={styles.alertActionRow}>
              {alertConfig.type === 'confirm' ? (
                <>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: 'transparent' }]} onPress={() => setAlertConfig(prev => ({...prev, visible: false}))}>
                    <Text style={{ color: '#FFF' }}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: '#EF4444' }]} onPress={alertConfig.onConfirm}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Hapus</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.alertBtn, { backgroundColor: Colors.ai.primary, width: '100%' }]} onPress={() => setAlertConfig(prev => ({...prev, visible: false}))}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>`;
  content = content.replace(/<\/LinearGradient>/, modalCode);
}

// 5. Inject Modal Styles
if (!content.includes('alertBox: {')) {
  const alertStyles = `
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: '80%', padding: 24, borderRadius: 16, backgroundColor: '#1E293B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  alertTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  alertMessage: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 20 },
  alertActionRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 12 },
  alertBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 100 },`;
  
  content = content.replace(/const styles = StyleSheet\.create\(\{/, `const styles = StyleSheet.create({${alertStyles}`);
}

fs.writeFileSync(file, content);
console.log('Fixed ManageLecturersScreen alerts');
