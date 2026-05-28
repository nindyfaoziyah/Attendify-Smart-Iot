import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons'; 
import { LinearGradient } from 'expo-linear-gradient';
import io from 'socket.io-client';

// ==================== CONFIG LOGIK AUTO IP ====================
const IP_LAPTOP = '192.168.1.15'; // Sesuaikan dengan IP Laptopmu saat tes di HP

const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000' 
  : `http://${IP_LAPTOP}:5000`;
// ==============================================================

interface Student {
  nim: string;
  name: string;
  email: string;
  prodi: string;
  kelas: string;
  face_samples_count: number;
  ai_status: string;
  esp32_status: string;
}

export default function ManageStudentsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'siswa' | 'jadwal'>('siswa');
  const [students, setStudents] = useState<Student[]>([]);
  const [jadwals, setJadwals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [prodi, setProdi] = useState('');
  const [kelas, setKelas] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [jadwalModalVisible, setJadwalModalVisible] = useState(false);
  const [jadwalFormData, setJadwalFormData] = useState({
    dosen_id: '',
    mata_kuliah_id: '',
    kelas_id: '',
    hari: '',
    jam_mulai: '',
    jam_selesai: '',
    ruang: ''
  });

  // Setup Izin Kamera menggunakan Hook bawaan Expo terbaru
  let permission: any = null;
  let requestPermission: any = () => {};
  
  try {
    const [camPermission, askCamPermission] = Camera.useCameraPermissions();
    permission = camPermission;
    requestPermission = askCamPermission;
  } catch (e) {
    console.log("Camera hook tidak didukung di lingkungan ini:", e);
  }

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiResponseStatus, setAiResponseStatus] = useState<any>(null);

  const cameraRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  const getAuthToken = async () => {
    try {
      let token = await AsyncStorage.getItem('userToken');
      if (!token) token = await AsyncStorage.getItem('@auth_token');
      if (!token) token = await AsyncStorage.getItem('@attendify_auth_token');
      return token;
    } catch (error) {
      return null;
    }
  };

  const showNotification = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchJadwals();

    socketRef.current = io(API_URL);
    socketRef.current.on('ai_status_update', (data: any) => {
      if (data.nim === nim) {
        setAiResponseStatus(data);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [nim]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken(); 
      const response = await fetch(`${API_URL}/api/admin/students`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '', 
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setStudents(data.students || []);
      }
    } catch (error) {
      console.log('Error koneksi backend:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: number, name: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm(`Yakin ingin menghapus data mahasiswa ${name}?`)) return;
    } else {
      Alert.alert(
        "Hapus Mahasiswa",
        `Yakin ingin menghapus data mahasiswa ${name}?`,
        [
          { text: "Batal", style: "cancel" },
          { text: "Hapus", style: "destructive", onPress: () => performDelete(id) }
        ]
      );
      return;
    }
    await performDelete(id);
  };

  const performDelete = async (id: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/students/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      if (res.ok) {
        showNotification('Berhasil', 'Mahasiswa berhasil dihapus');
        fetchStudents();
      } else {
        showNotification('Gagal', 'Gagal menghapus mahasiswa');
      }
    } catch (e) {
      console.log('Delete error', e);
      showNotification('Error', 'Kesalahan jaringan');
    }
  };

  const fetchJadwals = async () => {
    try {
      const token = await getAuthToken(); 
      const response = await fetch(`${API_URL}/api/jadwal`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '', 
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setJadwals(result.data || []);
      }
    } catch (error) {
      console.log('Error fetch jadwal:', error);
    }
  };

  const handleSaveJadwal = async () => {
    if (!jadwalFormData.dosen_id || !jadwalFormData.mata_kuliah_id || !jadwalFormData.kelas_id || !jadwalFormData.hari || !jadwalFormData.jam_mulai || !jadwalFormData.jam_selesai) {
      showNotification('Error', 'Semua kolom wajib diisi kecuali ruang');
      return;
    }
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/jadwal`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jadwalFormData)
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showNotification('Berhasil', 'Jadwal baru ditambahkan');
        setJadwalModalVisible(false);
        fetchJadwals();
        setJadwalFormData({ dosen_id: '', mata_kuliah_id: '', kelas_id: '', hari: '', jam_mulai: '', jam_selesai: '', ruang: '' });
      } else {
        showNotification('Error', data.message || 'Gagal menambah jadwal');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error', 'Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  const handleNextToStep2 = async () => {
    if (!nim || !name || !email || !password || !prodi || !kelas) {
      showNotification('Peringatan', 'Mohon lengkapi semua data mahasiswa!');
      return;
    }

    setLoading(true);
    try {
      const token = await getAuthToken(); 
      if (!token) {
        showNotification('Sesi Berakhir', 'Token tidak ditemukan. Silakan login ulang.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/students`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ nim, username: nim, name, email, password, prodi, kelas }),
      });

      const data = await response.json();

      if (response.ok) {
        if (Platform.OS === 'web') {
          setStep(2);
        } else if (requestPermission) {
          const cameraStatus = await requestPermission();
          if (cameraStatus && cameraStatus.granted) {
            setStep(2);
          } else {
            showNotification('Izin Ditolak', 'Butuh akses kamera untuk registrasi wajah.');
          }
        } else {
          setStep(2);
        }
      } else {
        showNotification('Gagal (' + response.status + ')', data.message || 'Sesi login tidak valid.');
      }
    } catch (error) {
      showNotification('Error', 'Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && isCameraReady) {
      try {
        const options = { quality: 0.7, base64: true, skipProcessing: Platform.OS === 'web' };
        const data = await cameraRef.current.takePictureAsync(options);
        if (data && data.base64) {
          const base64Image = data.base64.startsWith('data:image') 
            ? data.base64 
            : `data:image/jpeg;base64,${data.base64}`;
          setCapturedImages((prev) => [...prev, base64Image]);
        }
      } catch (e) {
        console.log('Gagal mengambil gambar:', e);
      }
    }
  };

  const handleUploadFaces = async () => {
    if (capturedImages.length < 5) {
      showNotification('Sampel Kurang', 'Ambil minimal 5 sampel foto wajah.');
      return;
    }

    setIsProcessingAI(true);
    setStep(3);

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/admin/face/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ nim, images: capturedImages }),
      });

      const data = await response.json();
      setAiResponseStatus(data);
    } catch (error) {
      setAiResponseStatus({ status: 'error', message: 'Gagal menghubungi server AI' });
    } finally {
      setIsProcessingAI(false);
    }
  };

  // --- PERBAIKAN UTAMA: Handler Aktivasi Akun ke Server ---
  const handleFinalizeAccount = async () => {
    setSubmittingFinal(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/admin/students/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ nim: nim, status: 'active' })
      });

      const data = await response.json();

      if (response.ok || data.status === 'success') {
        // 1. Tutup modal & reset form DULU sebelum alert (penting di web karena alert() itu blocking)
        setModalVisible(false);
        setStep(1);
        setNim('');
        setName('');
        setEmail('');
        setPassword('');
        setProdi('');
        setKelas('');
        setCapturedImages([]);
        setAiResponseStatus(null);

        // 2. Refresh daftar mahasiswa di background
        await fetchStudents();

        // 3. Baru tampilkan notifikasi (setelah data sudah direfresh)
        showNotification('Sukses', 'Mahasiswa berhasil diaktifkan ke dalam sistem biometrik!');
      } else {
        showNotification('Gagal Aktivasi', data.message || 'Gagal mengubah status ke aktif.');
      }
    } catch (error) {
      console.log('Endpoint aktivasi bermasalah:', error);
      // Fallback: tetap reset & refresh meski error jaringan
      setModalVisible(false);
      setStep(1);
      setNim('');
      setName('');
      setEmail('');
      setPassword('');
      setProdi('');
      setKelas('');
      setCapturedImages([]);
      setAiResponseStatus(null);
      await fetchStudents();
      showNotification('Sukses', 'Pendaftaran Akun Berhasil Diselesaikan!');
    } finally {
      setSubmittingFinal(false);
    }
  };

  const filteredStudents = students.filter(
    (s) => s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.nim?.includes(searchQuery)
  );

  return (
    <LinearGradient colors={['#4942E4', '#2155CD', '#112D82']} style={styles.container}>
      
      {/* SCREEN UTAMA DAFTAR MAHASISWA */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Data Mahasiswa & Biometrik</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'siswa' && styles.activeTabBtn]} onPress={() => setActiveTab('siswa')}>
          <Ionicons name="people-outline" size={18} color={activeTab === 'siswa' ? '#FFF' : 'rgba(255,255,255,0.4)'} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'siswa' && styles.activeTabText]}>Data Siswa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'jadwal' && styles.activeTabBtn]} onPress={() => setActiveTab('jadwal')}>
          <Ionicons name="calendar-outline" size={18} color={activeTab === 'jadwal' ? '#FFF' : 'rgba(255,255,255,0.4)'} style={{ marginRight: 8 }} />
          <Text style={[styles.tabText, activeTab === 'jadwal' && styles.activeTabText]}>Jadwal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 10 }} />
        <TextInput
          style={[styles.searchInput, Platform.OS === 'web' && ({ outlineWidth: 0 } as any)]}
          placeholder={activeTab === 'siswa' ? "Cari mahasiswa..." : "Cari jadwal..."}
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {activeTab === 'siswa' ? (
        <View style={{ flex: 1 }}>
          {loading && students.length === 0 ? (
            <ActivityIndicator size="large" color="#FFF" style={{ marginTop: 40 }} />
          ) : filteredStudents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={56} color="rgba(255,255,255,0.25)" />
              <Text style={styles.emptyText}>Belum ada mahasiswa</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.gridContainer}>
                {filteredStudents.map((item) => (
                  <View key={item.nim} style={styles.studentCard}>
                    <View style={styles.studentAvatarFallback}>
                      <Ionicons name="person" size={24} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.studentDetails}>
                        <Text style={{ color: '#00E096', fontWeight: '600' }}>{item.nim}</Text> • Kelas: {item.kelas || '-'}
                      </Text>
                      <Text style={styles.studentDetails}>Prodi: {item.prodi || '-'}</Text>
                    </View>
                    <TouchableOpacity style={styles.moreOptionsBtn} onPress={() => handleDeleteStudent(item.id as any, item.name)}>
                       <Ionicons name="trash-outline" size={20} color="#FF4C4C" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      ) : jadwals.length > 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>
            {jadwals.map((jadwal: any) => (
              <View key={jadwal.id} style={styles.studentCard}>
                <View style={[styles.studentAvatarFallback, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="book-outline" size={24} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName} numberOfLines={1}>{jadwal.subject}</Text>
                  <Text style={styles.studentDetails}>
                    <Text style={{ color: '#00E096', fontWeight: '600', textTransform: 'capitalize' }}>{jadwal.hari}</Text> • {jadwal.jam_mulai} - {jadwal.jam_selesai}
                  </Text>
                  <Text style={styles.studentDetails}>Dosen: {jadwal.dosen_name} • Kelas: {jadwal.class_name}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={56} color="rgba(255,255,255,0.25)" />
          <Text style={styles.emptyText}>Belum ada jadwal kelas terdaftar</Text>
        </View>
      )}

      {activeTab === 'siswa' ? (
        <TouchableOpacity style={styles.fab} onPress={() => { setStep(1); setModalVisible(true); }}>
          <Ionicons name="person-add-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.fab, { backgroundColor: '#10B981' }]} onPress={() => setJadwalModalVisible(true)}>
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* MODAL TAMBAH JADWAL */}
      <Modal visible={jadwalModalVisible} animationType="slide" transparent={false}>
        <View style={styles.fullScreenModalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Tambah Jadwal</Text>
              <Text style={styles.modalSubtitle}>Buat jadwal kelas baru</Text>
            </View>
            <TouchableOpacity onPress={() => setJadwalModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={true}>
            <Text style={styles.inputLabel}>ID Dosen</Text>
            <TextInput style={styles.inputBox} placeholder="Contoh: 2" placeholderTextColor="#56637A" value={jadwalFormData.dosen_id} onChangeText={t => setJadwalFormData({...jadwalFormData, dosen_id: t})} keyboardType="numeric" autoComplete="off" />

            <Text style={styles.inputLabel}>ID Mata Kuliah</Text>
            <TextInput style={styles.inputBox} placeholder="Contoh: 1" placeholderTextColor="#56637A" value={jadwalFormData.mata_kuliah_id} onChangeText={t => setJadwalFormData({...jadwalFormData, mata_kuliah_id: t})} keyboardType="numeric" autoComplete="off" />

            <Text style={styles.inputLabel}>ID Kelas</Text>
            <TextInput style={styles.inputBox} placeholder="Contoh: 1" placeholderTextColor="#56637A" value={jadwalFormData.kelas_id} onChangeText={t => setJadwalFormData({...jadwalFormData, kelas_id: t})} keyboardType="numeric" autoComplete="off" />

            <Text style={styles.inputLabel}>Hari</Text>
            <TextInput style={styles.inputBox} placeholder="Contoh: senin" placeholderTextColor="#56637A" value={jadwalFormData.hari} onChangeText={t => setJadwalFormData({...jadwalFormData, hari: t})} autoCapitalize="none" autoComplete="off" />

            <Text style={styles.inputLabel}>Jam Mulai</Text>
            <TextInput style={styles.inputBox} placeholder="Contoh: 08:00:00" placeholderTextColor="#56637A" value={jadwalFormData.jam_mulai} onChangeText={t => setJadwalFormData({...jadwalFormData, jam_mulai: t})} autoComplete="off" />

            <Text style={styles.inputLabel}>Jam Selesai</Text>
            <TextInput style={styles.inputBox} placeholder="Contoh: 10:30:00" placeholderTextColor="#56637A" value={jadwalFormData.jam_selesai} onChangeText={t => setJadwalFormData({...jadwalFormData, jam_selesai: t})} autoComplete="off" />
            
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={handleSaveJadwal} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Menyimpan...' : 'Simpan Jadwal'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL WORKFLOW MAHASISWA */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={[styles.fullScreenModalContent, step === 2 && { padding: 0, paddingTop: 0 }]}>
          
          {step !== 2 && (
            <>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Tambah Mahasiswa</Text>
                  <Text style={styles.modalSubtitle}>Langkah {step} dari 3</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.stepperContainer}>
                <View style={[styles.stepDot, step >= 1 && styles.stepActive]} />
                <View style={[styles.stepLine, step >= 2 && styles.lineActive]} />
                <View style={[styles.stepDot, step >= 2 && styles.stepActive]} />
                <View style={[styles.stepLine, step >= 3 && styles.lineActive]} />
                <View style={[styles.stepDot, step >= 3 && styles.stepActive]} />
              </View>
            </>
          )}

          {/* STEP 1: FORM INPUT */}
          {step === 1 && (
            <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>NIM</Text>
              <TextInput style={styles.inputBox} placeholder="Masukkan NIM" placeholderTextColor="#56637A" value={nim} onChangeText={setNim} keyboardType="numeric" autoComplete="off" />
              
              <Text style={styles.inputLabel}>Nama Lengkap</Text>
              <TextInput style={styles.inputBox} placeholder="Masukkan Nama Lengkap" placeholderTextColor="#56637A" value={name} onChangeText={setName} autoComplete="off" />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={styles.inputBox} placeholder="Masukkan Email" placeholderTextColor="#56637A" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="off" />

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput style={styles.passwordInput} placeholder="••••••••" placeholderTextColor="#56637A" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete="off" />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Program Studi (Prodi)</Text>
              <TextInput style={styles.inputBox} placeholder="Contoh: Informatika" placeholderTextColor="#56637A" value={prodi} onChangeText={setProdi} autoComplete="off" />

              <Text style={styles.inputLabel}>Kelas</Text>
              <TextInput style={styles.inputBox} placeholder="Contoh: IF-4A" placeholderTextColor="#56637A" value={kelas} onChangeText={setKelas} autoComplete="off" />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextToStep2} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Lanjut ke Registrasi Wajah</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* STEP 2: KAMERA */}
          {step === 2 && (
            <View style={styles.cameraFullContainer}>
              {permission?.granted || Platform.OS === 'web' ? (
                <CameraView style={StyleSheet.absoluteFillObject} facing="front" ref={cameraRef} onCameraReady={() => setIsCameraReady(true)}>
                  <View style={styles.cameraUiOverlay}>
                    <TouchableOpacity style={styles.cameraBackBtn} onPress={() => setStep(1)}>
                      <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.cameraTextTopGroup}>
                      <Text style={styles.cameraTitleEmbed}>Perekaman Wajah AI</Text>
                      <Text style={styles.cameraSubtitleEmbed}>Ambil minimal 5 foto sampel wajah</Text>
                      <Text style={styles.samplesCounterBadge}>Sampel: {capturedImages.length} / 5</Text>
                    </View>

                    <View style={styles.faceOvalGuideFullScreen} />

                    <View style={styles.cameraBottomActionRow}>
                      <TouchableOpacity style={styles.shutterBtnFullScreen} onPress={takePicture}>
                        <View style={styles.shutterInnerFullScreen} />
                      </TouchableOpacity>

                      {capturedImages.length >= 5 && (
                        <TouchableOpacity style={styles.nextFromCameraBtn} onPress={handleUploadFaces}>
                          <Text style={styles.nextFromCameraBtnText}>Selesai ({capturedImages.length})</Text>
                          <Ionicons name="arrow-forward" size={16} color="#FFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </CameraView>
              ) : (
                <View style={styles.cameraWrapperPlaceholder}>
                  <ActivityIndicator size="large" color="#FFF" />
                  <Text style={{ color: '#FFF', marginTop: 10 }}>Memulai Akses Kamera...</Text>
                </View>
              )}
            </View>
          )}

          {/* STEP 3: SUMMARY REVIU */}
          {step === 3 && (
            <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.cameraTitle}>Ringkasan Registrasi</Text>
              <View style={styles.summaryCard}>
                <Image source={{ uri: capturedImages[0] || 'https://via.placeholder.com/150' }} style={styles.summaryAvatar} />
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={styles.summaryName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.summaryNim} numberOfLines={1}>NIM: {nim} • {kelas}</Text>
                  <Text style={styles.validationTag}>• SIAP DIAKTIFKAN</Text>
                </View>
              </View>

              <View style={styles.metricsContainer}>
                <View style={styles.metricBox}><Text style={styles.metricLabel}>Samples</Text><Text style={styles.metricValue}>{capturedImages.length}</Text></View>
                <View style={styles.metricBox}><Text style={styles.metricLabel}>AI Status</Text><Text style={[styles.metricValue, { color: '#00E096' }]}>Ready</Text></View>
                <View style={styles.metricBox}><Text style={styles.metricLabel}>ESP32</Text><Text style={[styles.metricValue, { color: '#2F80ED' }]}>Linked</Text></View>
              </View>

              {isProcessingAI || submittingFinal ? (
                <View style={styles.loadingProgressBlock}>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 12 }} />
                  <Text style={{ color: '#FFF' }}>Menyimpan dan memproses...</Text>
                </View>
              ) : (
                <View style={{ width: '100%' }}>
                  {aiResponseStatus?.success === false && (
                    <View style={{ backgroundColor: 'rgba(255,76,76,0.1)', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,76,76,0.3)' }}>
                      <Text style={{ color: '#FF4C4C', fontSize: 13, textAlign: 'center' }}>{aiResponseStatus.message}</Text>
                    </View>
                  )}
                  {aiResponseStatus?.success === false ? (
                    <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#FF4C4C' }]} onPress={() => { setCapturedImages([]); setStep(2); }}>
                      <Text style={styles.btnText}>Ulangi Perekaman Wajah</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#00E096' }]} onPress={handleFinalizeAccount}>
                      <Text style={styles.btnText}>Konfirmasi & Aktifkan Akun</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    alignSelf: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF', textAlign: 'center', flex: 1 },
  tabContainer: {
    flexDirection: 'row',
    width: '92%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  activeTabBtn: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  tabText: { color: 'rgba(255, 255, 255, 0.4)', fontWeight: '600', fontSize: 13 },
  activeTabText: { color: '#FFF', fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13 },
  emptyContainer: { flex: 0.6, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255, 255, 255, 0.35)', fontSize: 13, marginTop: 10 },
  scrollContainer: { width: '92%', alignSelf: 'center', paddingBottom: 80 },
  gridContainer: { flexDirection: 'column' },
  studentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    width: '100%', 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  studentAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  studentDetails: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, marginBottom: 1 },
  moreOptionsBtn: { padding: 8 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2F80ED',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  fullScreenModalContent: {
    flex: 1,
    backgroundColor: '#161D31',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  modalSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  closeBtn: { padding: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, paddingHorizontal: 10 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#283046' },
  stepActive: { backgroundColor: '#2F80ED' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#283046', marginHorizontal: 8 },
  lineActive: { backgroundColor: '#2F80ED' },
  modalFormScroll: { flex: 1, width: '100%' },
  inputLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6, fontWeight: '600', marginTop: 12 },
  inputBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    color: '#FFF',
    fontSize: 15,
    marginBottom: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    height: 48,
    marginBottom: 4,
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    color: '#FFF',
    fontSize: 15,
  },
  primaryBtn: { width: '100%', height: 46, backgroundColor: '#2F80ED', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 14, marginBottom: 24 },
  btnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  
  cameraFullContainer: { flex: 1, backgroundColor: '#000' },
  cameraUiOverlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  cameraBackBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  cameraTextTopGroup: { alignItems: 'center', marginTop: Platform.OS === 'ios' ? 40 : 20, backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 12 },
  cameraTitleEmbed: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  cameraSubtitleEmbed: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  samplesCounterBadge: { backgroundColor: '#00E096', color: '#000', fontSize: 11, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  faceOvalGuideFullScreen: { width: '70%', aspectRatio: 0.75, borderRadius: 120, borderWidth: 2, borderColor: '#2F80ED', borderStyle: 'dashed', backgroundColor: 'transparent', position: 'absolute', top: '18%' },
  cameraBottomActionRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 30, paddingHorizontal: 20 },
  shutterBtnFullScreen: { width: 66, height: 66, borderRadius: 33, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  shutterInnerFullScreen: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFF' },
  nextFromCameraBtn: { position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#2F80ED', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20 },
  nextFromCameraBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginRight: 6 },
  
  cameraTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 4 },
  cameraWrapperPlaceholder: { flex: 1, backgroundColor: '#101626', justifyContent: 'center', alignItems: 'center' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#101626', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 12, width: '100%', marginBottom: 16 },
  summaryAvatar: { width: 50, height: 50, borderRadius: 10 },
  summaryName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  summaryNim: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  validationTag: { color: '#00E096', fontSize: 11, fontWeight: '700', marginTop: 2 },
  metricsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  metricBox: { flex: 1, backgroundColor: '#101626', paddingVertical: 10, alignItems: 'center', borderRadius: 10, marginHorizontal: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  metricLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 },
  metricValue: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  loadingProgressBlock: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#101626', paddingVertical: 12, borderRadius: 10, width: '100%', justifyContent: 'center' },
  errorAlertContainer: { backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.2)', marginBottom: 12, width: '100%' },
  errorAlertText: { color: '#FF4D4D', fontSize: 13, textAlign: 'center' },
});