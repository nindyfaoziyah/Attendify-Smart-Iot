const fs = require('fs');

const file = 'src/screens/ManageLecturersScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Ionicons
if (!content.includes("import { Ionicons }")) {
  content = content.replace("import { Colors } from '@/constants/Colors';", "import { Colors } from '@/constants/Colors';\nimport { Ionicons } from '@expo/vector-icons';");
}

// 2. Fix back button
const oldBackBtn = `<TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backBtn, { backgroundColor: tokens.iconButtonBg }]}
          >
            <ArrowLeft color={tokens.textColor} size={24} />
          </TouchableOpacity>`;
const newBackBtn = `<TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ padding: 8, marginLeft: -8 }}
          >
            <Ionicons name="chevron-back" color={tokens.textColor} size={28} />
          </TouchableOpacity>`;
if (content.includes(oldBackBtn)) {
  content = content.replace(oldBackBtn, newBackBtn);
} else {
  // Try regex if exact match fails due to spaces
  content = content.replace(/<TouchableOpacity\s+onPress=\{\(\) => navigation\.goBack\(\)\}\s+style=\{\[styles\.backBtn, \{ backgroundColor: tokens\.iconButtonBg \}\]\}\s*>\s*<ArrowLeft color=\{tokens\.textColor\} size=\{24\} \/>\s*<\/TouchableOpacity>/, newBackBtn);
}

// 3. Fix Simpan Data Dosen
const oldSaveBtn = `<LinearGradient
                    colors={['#A78BFA', '#7C3AED']}
                    style={styles.saveGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Check color="#fff" size={20} />
                    <Text style={styles.saveBtnText}>Simpan Data Dosen</Text>
                  </LinearGradient>`;
const newSaveBtn = `<View style={[styles.saveGradient, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.saveBtnText}>Simpan Data Dosen</Text>
                  </View>`;
if (content.includes(oldSaveBtn)) {
  content = content.replace(oldSaveBtn, newSaveBtn);
} else {
  content = content.replace(/<LinearGradient\s+colors=\{\['#A78BFA', '#7C3AED'\]\}\s+style=\{styles\.saveGradient\}\s+start=\{\{ x: 0, y: 0 \}\}\s+end=\{\{ x: 1, y: 0 \}\}\s*>\s*<Check color="#fff" size=\{20\} \/>\s*<Text style=\{styles\.saveBtnText\}>Simpan Data Dosen<\/Text>\s*<\/LinearGradient>/, newSaveBtn);
}

// 4. Fix infoBox border
const oldInfoBox = `  infoBox: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },`;
const newInfoBox = `  infoBox: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 0,
  },`;
if (content.includes(oldInfoBox)) {
  content = content.replace(oldInfoBox, newInfoBox);
}

fs.writeFileSync(file, content);
console.log('Fixed ManageLecturersScreen accurately');
