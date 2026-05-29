const fs = require('fs');
let c = fs.readFileSync('src/screens/ManageLecturersScreen.tsx', 'utf8');

c = c.replace(/<TouchableOpacity[^>]*navigation\.goBack\(\)[^>]*>\s*<ArrowLeft[^>]*>\s*<\/TouchableOpacity>/s, 
  `<TouchableOpacity 
    onPress={() => navigation.goBack()} 
    style={{ padding: 8, marginLeft: -8 }}
  >
    <Ionicons name="chevron-back" color={tokens.textColor} size={28} />
  </TouchableOpacity>`);

if (!c.includes("import { Ionicons }")) {
  c = c.replace("import { Colors } from '@/constants/Colors';", "import { Colors } from '@/constants/Colors';\nimport { Ionicons } from '@expo/vector-icons';");
}

fs.writeFileSync('src/screens/ManageLecturersScreen.tsx', c);
console.log('ManageLecturersScreen updated');
