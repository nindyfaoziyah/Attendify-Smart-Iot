const fs = require('fs');

const file = 'src/screens/ManageStudentsScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Insert alert styles if not present
if (!content.includes("alertBox: {")) {
  const alertStyles = `
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: '80%', padding: 24, borderRadius: 16, backgroundColor: '#1E293B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  alertTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  alertMessage: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 20 },
  alertActionRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 12 },
  alertBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 100 },`;
  
  content = content.replace(/const styles = StyleSheet\.create\(\{/, \`const styles = StyleSheet.create({\${alertStyles}\`);
  fs.writeFileSync(file, content);
  console.log('Fixed ManageStudentsScreen styles');
} else {
  console.log('Styles already present in ManageStudentsScreen');
}
