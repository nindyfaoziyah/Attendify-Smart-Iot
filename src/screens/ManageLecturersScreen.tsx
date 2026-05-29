import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Modal, Alert, Dimensions, StatusBar, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import {
  ArrowLeft, Search, UserPlus, Trash2, 
  Edit3, Filter, X, Check, ShieldCheck, 
  UserCheck, Briefcase, Mail, Phone, IdCard,
  Eye, EyeOff
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '@/constants/Config';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function ManageLecturersScreen() {
  const navigation = useNavigation<any>();
  const { tokens, isLightTheme } = useTheme();
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', nip: '', jabatan: '', email: '', phone: '', password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const fetchLecturers = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success' && Array.isArray(result.data)) {
        const dosenOnly = result.data.filter((u: any) => u.role === 'dosen');
        setLecturers(dosenOnly);
      } else {
        setLecturers([]);
      }
    } catch (error) {
      console.error('Fetch lecturers error:', error);
      Alert.alert('Error', 'Gagal mengambil data dosen');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchLecturers();
    }, [])
  );


  const filteredLecturers = lecturers.filter(l => 
    (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (l.nip || '').includes(searchQuery)
  );

  const handleAddPress = () => {
    setEditingLecturer(null);
    setFormData({ name: '', nip: '', jabatan: '', email: '', phone: '', password: '' });
    setIsModalVisible(true);
  };

  const handleEditPress = (lecturer: any) => {
    setEditingLecturer(lecturer);
    setFormData({ ...lecturer, password: '' }); // Password ignored for edit for now
    setIsModalVisible(true);
  };


  const handleDeletePress = (id: string) => {
    Alert.alert(
      'Hapus Data',
      'Apakah Anda yakin ingin menghapus data dosen ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('@attendify_auth_token');
              const response = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.ok) {
                fetchLecturers();
              }
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus dosen');
            }
          }
        }

      ]
    );
  };

  const handleSave = async () => {
    if (!formData.name || !formData.nip || !formData.email || (!editingLecturer && !formData.password)) {
      Alert.alert('Error', 'Lengkapi data yang wajib diisi (Nama, NIP, Email, dan Password untuk data baru)');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      let response;
      
      if (editingLecturer) {
        response = await fetch(`${API_URL}/users/${editingLecturer.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            nip: formData.nip,
            email: formData.email,
            role: 'dosen'
          })
        });
      } else {
        response = await fetch(`${API_URL}/register/admin-dosen`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            nip: formData.nip,
            email: formData.email,
            password: formData.password,
            role: 'dosen'
          })
        });
      }

      const result = await response.json();
      if (response.ok || result.status === 'success') {
        Alert.alert('Berhasil', editingLecturer ? 'Data dosen berhasil diperbarui' : `Dosen ${formData.name} berhasil ditambahkan dengan NIP ${formData.nip}`);
        fetchLecturers();
        setIsModalVisible(false);
      } else {
        Alert.alert('Gagal', result.message || 'Terjadi kesalahan saat menyimpan data');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Terjadi kesalahan koneksi');
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} />
      <AnimatedBackground style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ padding: 8, marginLeft: -8 }}
          >
            <Ionicons name="chevron-back" color={tokens.textColor} size={28} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Basis Data Dosen</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.searchBar, { borderColor: tokens.borderColor }]}>
            <Search size={20} color={tokens.subTextColor} />
            <TextInput
              style={[styles.searchInput, { color: tokens.textColor }]}
              placeholder="Cari nama atau NIP..."
              placeholderTextColor={tokens.subTextColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={tokens.subTextColor} />
              </TouchableOpacity>
            )}
          </BlurView>
        </View>

        {/* Lecturer List */}
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#A78BFA" />
              <Text style={[styles.loadingText, { color: tokens.subTextColor }]}>Memuat data...</Text>
            </View>
          ) : filteredLecturers.length > 0 ? (
            filteredLecturers.map(lecturer => (
              <BlurView 
                key={lecturer.id} 
                intensity={15} 
                tint={isLightTheme ? 'light' : 'dark'} 
                style={[styles.lecturerCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}>
                    <ShieldCheck size={24} color={tokens.textColor} />
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: tokens.textColor }]}>{lecturer.name || 'Unknown'}</Text>
                    <Text style={[styles.nip, { color: tokens.subTextColor }]}>{lecturer.nip || '-'}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      onPress={() => handleEditPress(lecturer)} 
                      style={[styles.actionBtn, { backgroundColor: tokens.iconButtonBg }]}
                    >
                      <Edit3 size={18} color={Colors.ai.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeletePress(lecturer.id)} 
                      style={[styles.actionBtn, { backgroundColor: tokens.iconButtonBg }]}
                    >
                      <Trash2 size={18} color="#F87171" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={[styles.cardDivider, { backgroundColor: tokens.borderColor }]} />
                
                <View style={styles.cardFooter}>
                  <View style={styles.metaItem}>
                    <Briefcase size={14} color={tokens.subTextColor} />
                    <Text style={[styles.metaText, { color: tokens.subTextColor }]}>{lecturer.jabatan || '-'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Mail size={14} color={tokens.subTextColor} />
                    <Text style={[styles.metaText, { color: tokens.subTextColor }]} numberOfLines={1}>{lecturer.email || '-'}</Text>
                  </View>
                </View>
              </BlurView>
            ))
          ) : (
            <View style={styles.centerContainer}>
              <Briefcase size={48} color={tokens.subTextColor} opacity={0.3} />
              <Text style={[styles.emptyText, { color: tokens.subTextColor }]}>Tidak ada data dosen</Text>
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
          <LinearGradient
            colors={['#A78BFA', '#7C3AED']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <UserPlus color="#fff" size={24} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Add/Edit Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint={isLightTheme ? 'light' : 'dark'} style={[styles.modalContent, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: tokens.textColor }]}>
                  {editingLecturer ? 'Edit Data Dosen' : 'Tambah Dosen Baru'}
                </Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <X color={tokens.textColor} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Nama Lengkap (Gelar)</Text>
                  <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                    <UserCheck size={20} color={tokens.subTextColor} />
                    <TextInput
                      style={[styles.input, { color: tokens.textColor }]}
                      value={formData.name}
                      onChangeText={text => setFormData({...formData, name: text})}
                      placeholder="Contoh: Dr. John Doe, M.Kom"
                      placeholderTextColor={tokens.subTextColor}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>NIP / Nomor Induk</Text>
                  <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                    <IdCard size={20} color={tokens.subTextColor} />
                    <TextInput
                      style={[styles.input, { color: tokens.textColor }]}
                      value={formData.nip}
                      onChangeText={text => setFormData({...formData, nip: text})}
                      placeholder="Masukkan NIP..."
                      placeholderTextColor={tokens.subTextColor}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Jabatan Akademik</Text>
                  <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                    <Briefcase size={20} color={tokens.subTextColor} />
                    <TextInput
                      style={[styles.input, { color: tokens.textColor }]}
                      value={formData.jabatan}
                      onChangeText={text => setFormData({...formData, jabatan: text})}
                      placeholder="Lektor, Asisten Ahli, dll..."
                      placeholderTextColor={tokens.subTextColor}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Email</Text>
                    <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                      <Mail size={18} color={tokens.subTextColor} />
                      <TextInput
                        style={[styles.input, { marginLeft: 8, color: tokens.textColor }]}
                        value={formData.email}
                        onChangeText={text => setFormData({...formData, email: text})}
                        placeholder="email@..."
                        placeholderTextColor={tokens.subTextColor}
                        keyboardType="email-address"
                      />
                    </View>
                  </View>
                </View>

                {!editingLecturer && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Password Awal</Text>
                      <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                        <ShieldCheck size={18} color={tokens.subTextColor} />
                        <TextInput
                          style={[styles.input, { marginLeft: 8, color: tokens.textColor }]}
                          value={formData.password}
                          onChangeText={text => setFormData({...formData, password: text})}
                          placeholder="Password untuk dosen ini..."
                          placeholderTextColor={tokens.subTextColor}
                          secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                          {showPassword ? (
                            <EyeOff size={20} color={tokens.subTextColor} />
                          ) : (
                            <Eye size={20} color={tokens.subTextColor} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.infoBox, { backgroundColor: isLightTheme ? 'rgba(167, 139, 250, 0.1)' : 'rgba(167, 139, 250, 0.05)', borderColor: 'rgba(167, 139, 250, 0.3)' }]}>
                      <Text style={[styles.infoText, { color: isLightTheme ? '#6D28D9' : '#C4B5FD' }]}>
                        💡 <Text style={[styles.infoTextBold, { color: isLightTheme ? '#5B21B6' : '#A78BFA' }]}>Tips Login:</Text> Dosen dapat login menggunakan:
                        {'\n'}• Email: {formData.email || '(email yang diisi)'}
                        {'\n'}• NIP: {formData.nip || '(NIP yang diisi)'}
                        {'\n'}• Password: (password yang diatur di sini)
                      </Text>
                    </View>
                  </>
                )}


                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <View style={[styles.saveGradient, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.saveBtnText}>Simpan Data Dosen</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </BlurView>
          </View>
        </Modal>
      </AnimatedBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  lecturerCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nip: {
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDivider: {
    height: 1,
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalForm: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  row: {
    flexDirection: 'row',
  },
  saveBtn: {
    marginTop: 20,
    marginBottom: 40,
    borderRadius: 18,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 0,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 22,
  },
  infoTextBold: {
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
