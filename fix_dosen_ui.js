const fs = require('fs');

const file = 'src/screens/ManageLecturersScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldButton = `<LinearGradient
                    colors={['#A78BFA', '#7C3AED']}
                    style={styles.saveGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Check color="#fff" size={20} />
                    <Text style={styles.saveBtnText}>Simpan Data Dosen</Text>
                  </LinearGradient>`;
                  
const newButton = `<View style={[styles.saveGradient, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.saveBtnText}>Simpan Data Dosen</Text>
                  </View>`;

content = content.replace(oldButton, newButton);

fs.writeFileSync(file, content);
console.log('Fixed Simpan Data Dosen button');
