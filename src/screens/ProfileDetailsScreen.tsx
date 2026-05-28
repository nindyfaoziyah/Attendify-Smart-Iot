import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { ArrowLeft, User, Mail, Briefcase, Camera, IdCard, Phone, BookOpen, GraduationCap, Save, ChevronLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../components/CustomAlert';
import { API_URL } from '../../constants/Config';
import { getAuthToken } from '../services/authService';
import * as FileSystem from 'expo-file-system';

export default function ProfileDetailsScreen() {
  const navigation = useNavigation<any>();
  const { user, login, role } = useAuth();
  const { tokens, isLightTheme } = useTheme();

  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [prodi, setProdi] = useState(user?.prodi || '');
  const [kelas, setKelas] = useState(user?.kelas || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [idNumber, setIdNumber] = useState(user?.nim || '');

  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : '-';

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // Kurangi kualitas agar ukuran base64 lebih kecil
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatar(uri); // tampilkan preview lokal
      setChanged(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAuthToken();
      let finalAvatar = avatar;

      // Upload avatar hanya jika di native (bukan web) dan URI bukan URL atau base64
      if (
        Platform.OS !== 'web' &&
        avatar &&
        !avatar.startsWith('http') &&
        !avatar.startsWith('data:')
      ) {
        try {
          const base64 = await FileSystem.readAsStringAsync(avatar, {
            encoding: 'base64',
          });
          const base64Data = `data:image/jpeg;base64,${base64}`;

          const uploadRes = await fetch(`${API_URL}/profile/avatar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ avatar: base64Data }),
          });

          const uploadResult = await uploadRes.json();
          if (uploadResult.status === 'success') {
            finalAvatar = uploadResult.data.foto_profil;
          } else {
            throw new Error(uploadResult.message);
          }
        } catch (uploadErr) {
          console.error('Avatar upload error:', uploadErr);
          // Jangan gagalkan simpan profil hanya karena foto gagal
        }
      }

      // Update data profil (nama & phone)
      const profileRes = await fetch(`${API_URL}/profile/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone }),
      });

      const profileResult = await profileRes.json();

      if (profileResult.status === 'success') {
        const updatedUser = user
          ? { ...user, fullName: name, email, avatar: finalAvatar, prodi, kelas, phone, nim: idNumber }
          : { fullName: name, email, avatar: finalAvatar, prodi, kelas, phone, nim: idNumber };

        if (role) {
          login(role, updatedUser);
          showAlert('Berhasil', 'Perubahan profil berhasil disimpan.', 'success');
          setChanged(false);
          setAvatar(finalAvatar);
        }
      } else {
        showAlert('Gagal', profileResult.message || 'Gagal update profil.', 'error');
      }
    } catch (e: any) {
      console.error('Save error:', e);
      showAlert('Gagal', `Terjadi kesalahan saat menyimpan: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedBackground style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View 
            entering={FadeInDown.duration(600).springify()}
            style={styles.header}
          >
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft color={tokens.textColor} size={28} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Ubah Profil</Text>
            <View style={{ width: 44 }} />
          </Animated.View>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: tokens.borderColor }} />
                ) : (
                  <LinearGradient
                    colors={isLightTheme ? ['#1E4FA8', '#2D6CDF'] : ['#3B82F6', '#8B5CF6']}
                    style={styles.avatarGradient}
                  >
                    <User size={80} color="#fff" />
                  </LinearGradient>
                )}
              </TouchableOpacity>

              {/* Kamera icon - klik untuk ganti foto */}
              <TouchableOpacity
                onPress={pickImage}
                style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: isLightTheme ? '#1E4FA8' : '#3B82F6', padding: 8, borderRadius: 20 }}
              >
                <Camera size={16} color="#fff" />
              </TouchableOpacity>

              {/* Tombol hapus foto - hanya muncul jika ada foto */}
              {avatar ? (
                <TouchableOpacity
                  onPress={() => { setAvatar(''); setChanged(true); }}
                  style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', lineHeight: 14 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Card */}
          <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
            <View style={styles.fieldsContainer}>
              {/* Nama */}
              <View style={styles.field}>
                <View style={styles.fieldHeader}>
                  <User size={18} color={isLightTheme ? '#1E4FA8' : Colors.ai.primary} />
                  <Text style={[styles.fieldLabel, { color: tokens.labelColor }]}>Nama Lengkap</Text>
                </View>
                <View style={styles.fieldContent}>
                  <TextInput
                    style={[styles.input, { color: tokens.textColor, borderBottomColor: tokens.borderColor }]}
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      setChanged(true);
                    }}
                    placeholder="Masukkan nama lengkap"
                    placeholderTextColor={tokens.subTextColor}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.field}>
                <View style={styles.fieldHeader}>
                  <Mail size={18} color={isLightTheme ? '#1E4FA8' : Colors.ai.primary} />
                  <Text style={[styles.fieldLabel, { color: tokens.labelColor }]}>Email</Text>
                </View>
                <View style={styles.fieldContent}>
                  <TextInput
                    style={[styles.input, { color: tokens.textColor, borderBottomColor: tokens.borderColor }]}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setChanged(true);
                    }}
                    placeholder="email@example.com"
                    placeholderTextColor={tokens.subTextColor}
                    keyboardType="email-address"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* NIM / NIP */}
              <View style={styles.field}>
                <View style={styles.fieldHeader}>
                  <IdCard size={18} color={isLightTheme ? '#1E4FA8' : Colors.ai.primary} />
                  <Text style={[styles.fieldLabel, { color: tokens.labelColor }]}>
                    {role === 'dosen' ? 'NIP' : role === 'admin' ? 'Admin ID' : 'NIM'}
                  </Text>
                </View>
                <View style={styles.fieldContent}>
                  <TextInput
                    style={[styles.input, { color: tokens.subTextColor, borderBottomColor: tokens.borderColor }]}
                    value={idNumber}
                    editable={false}
                  />
                </View>
              </View>

              {/* Mahasiswa Only Fields */}
              {role === 'mahasiswa' && (
                <>
                  <View style={styles.field}>
                    <View style={styles.fieldHeader}>
                      <BookOpen size={18} color={isLightTheme ? '#1E4FA8' : Colors.ai.primary} />
                      <Text style={[styles.fieldLabel, { color: tokens.labelColor }]}>Program Studi</Text>
                    </View>
                    <View style={styles.fieldContent}>
                      <TextInput
                        style={[styles.input, { color: tokens.textColor, borderBottomColor: tokens.borderColor }]}
                        value={prodi}
                        onChangeText={(t) => {
                          setProdi(t);
                          setChanged(true);
                        }}
                        placeholder="Program Studi"
                        placeholderTextColor={tokens.subTextColor}
                        editable={!saving}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <View style={styles.fieldHeader}>
                      <GraduationCap size={18} color={isLightTheme ? '#1E4FA8' : Colors.ai.primary} />
                      <Text style={[styles.fieldLabel, { color: tokens.labelColor }]}>Kelas</Text>
                    </View>
                    <View style={styles.fieldContent}>
                      <TextInput
                        style={[styles.input, { color: tokens.textColor, borderBottomColor: tokens.borderColor }]}
                        value={kelas}
                        onChangeText={(t) => {
                          setKelas(t);
                          setChanged(true);
                        }}
                        placeholder="Kelas"
                        placeholderTextColor={tokens.subTextColor}
                        editable={!saving}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Dosen Only Fields */}
              {role === 'dosen' && (
                <View style={styles.field}>
                  <View style={styles.fieldHeader}>
                    <Phone size={18} color={isLightTheme ? '#1E4FA8' : Colors.ai.primary} />
                    <Text style={[styles.fieldLabel, { color: tokens.labelColor }]}>Nomor Telepon</Text>
                  </View>
                  <View style={styles.fieldContent}>
                    <TextInput
                      style={[styles.input, { color: tokens.textColor, borderBottomColor: tokens.borderColor }]}
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(t);
                        setChanged(true);
                      }}
                      placeholder="Nomor Telepon"
                      placeholderTextColor={tokens.subTextColor}
                      editable={!saving}
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.infoBox, { backgroundColor: isLightTheme ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }]}>
              <Text style={[styles.infoText, { color: tokens.labelColor }]}>
                ⚠️ Perubahan data akan tersimpan di profil akun Anda.
              </Text>
            </View>
          </BlurView>

          {/* Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.secondaryButtonText, { color: tokens.textColor }]}>Kembali</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          if (alertConfig.type === 'success') {
            navigation.goBack();
          }
        }}
      />
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: Platform.OS === 'web' ? 40 : 100,
  },
  fieldsContainer: {
    marginBottom: 10,
  },

  input: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 20 : Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },

  avatarSection: {
    alignItems: 'center',
    marginVertical: 20,
  },

  avatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  statusBadge: {
    marginTop: 10,
  },

  statusText: {
    color: Colors.ai.primary,
    fontWeight: '600',
  },

  card: {
    margin: 20,
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },

  field: {
    marginBottom: 20,
  },

  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },

  fieldLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  fieldContent: {
    marginTop: 0,
  },

  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  roleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  infoBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },

  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 40,
  },

  primaryButton: {
    flex: 2,
    backgroundColor: Colors.ai.primary,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Colors.ai.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});