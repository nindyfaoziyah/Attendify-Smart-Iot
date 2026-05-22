import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Image,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  UserCheck,
  UserX,
  Clock,
  Camera as CameraIcon,
  Upload,
  RefreshCw,
  Trash2,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Plus,
  X,
  History,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '@/constants/Config';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { io } from 'socket.io-client';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

type FaceStatus = 'NOT_REGISTERED' | 'PENDING' | 'VERIFIED' | 'FAILED';

interface Student {
  id_user: number;
  nama: string;
  email?: string;
  role: string;
  prodi: string;
  kelas: string;
  verification_status: FaceStatus | null;
  last_trained: string | null;
  face_image: string | null;
}

export default function AdminFaceRegistrationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tokens, isLightTheme } = useTheme();
  const { logout } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FaceStatus | 'ALL'>('ALL');
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);

  // ── Fetch Students ───────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/admin/face/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      console.log('Fetched Students JSON:', json);
      if (response.status === 401) {
        Alert.alert('Sesi Berakhir', 'Sesi Anda telah berakhir. Silakan login kembali.', [
          { text: 'OK', onPress: logout }
        ]);
        return;
      }
      if (json.success) {
        setStudents(json.data);
      } else {
        setError(json.message || 'Gagal memuat data');
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setError('Gagal menghubungi server. Pastikan backend aktif.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle navigation params
  useEffect(() => {
    const studentId = route.params?.studentId;
    if (studentId && students.length > 0) {
      // Use string comparison to avoid type mismatch (number vs string)
      const student = students.find(s => String(s.id_user) === String(studentId));
      if (student) {
        setSelectedStudent(student);
        setCapturedImages([]);
        setIsModalVisible(true);
        // Clear param after use
        navigation.setParams({ studentId: undefined });
      }
    }
  }, [students, route.params?.studentId]);

  // ── Socket.io ────────────────────────────────────────────
  useEffect(() => {
    const socket = io(API_URL.replace('/api', ''));
    
    socket.on('face_training_progress', (data) => {
      if (selectedStudent && data.user_id === selectedStudent.id_user) {
        setProgress(data.progress);
        setProgressMessage(data.message);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedStudent]);

  // ── Image Handling ───────────────────────────────────────
  
  const processImage = async (uri: string): Promise<string | null> => {
    try {
      // Scale down image drastically to maximum 800px width/height and heavy compression.
      // This prevents backend canvas parsing/RAM Out Of Memory errors and network payload bloat.
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 600 } }], // Scaling proportional to width 600
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return `data:image/jpeg;base64,${manipResult.base64}`;
    } catch (e) {
      console.error('Manipulate error:', e);
      return null;
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.5, 
    });

    if (!result.canceled) {
      setIsProcessing(true);
      setProgressMessage('Menyiapkan ukuran gambar...');
      
      const compressed: string[] = [];
      for (const asset of result.assets) {
        const b64 = await processImage(asset.uri);
        if (b64) compressed.push(b64);
      }
      
      setCapturedImages(prev => [...prev, ...compressed]);
      setIsProcessing(false);
    }
  };

  const takePhoto = async () => {
    if (!permission || !permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses kamera untuk mengambil foto wajah.');
        return;
      }
    }
    setIsCameraActive(true);
  };

  const captureCameraImage = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5, // Native quality, we compress later to control dimension.
          exif: false,
        });
        
        if (photo && photo.uri) {
          const b64 = await processImage(photo.uri);
          if (b64) {
            setCapturedImages(prev => [...prev, b64]);
            if (capturedImages.length >= 4) {
              setIsCameraActive(false);
            }
          }
        }
      } catch (error) {
        console.error('Capture error:', error);
        Alert.alert('Error', 'Gagal mengambil foto');
      }
    }
  };

  const removeImage = (index: number) => {
    const updated = [...capturedImages];
    updated.splice(index, 1);
    setCapturedImages(updated);
  };

  // ── API Actions ──────────────────────────────────────────
  const handleRegister = async () => {
    if (capturedImages.length < 3) {
      Alert.alert('Peringatan', 'Mohon unggah minimal 3 foto untuk akurasi yang lebih baik');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Menyiapkan data...');

    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/admin/face/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedStudent?.id_user,
          images: capturedImages,
        }),
      });

      let json;
      try {
        const textResponse = await response.text();
        console.log("RAW SERVER RESPONSE:", textResponse); // We will see this in the logs! 
        json = JSON.parse(textResponse);
      } catch (jsonError: any) {
        throw new Error(`Server Response Error: ${jsonError.message}. Response was not valid JSON.`);
      }

      if (json.success) {
        Alert.alert('Berhasil', 'Pendaftaran wajah berhasil diselesaikan');
        setIsModalVisible(false);
        fetchStudents();
      } else {
        Alert.alert('Gagal', json.message || 'Terjadi kesalahan saat pendaftaran');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Gagal menghubungi server');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (student: Student) => {
    Alert.alert(
      'Konfirmasi Hapus',
      `Apakah Anda yakin ingin menghapus data wajah ${student.nama}? Mahasiswa ini tidak akan bisa melakukan absensi biometrik.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('@attendify_auth_token');
              const response = await fetch(`${API_URL}/admin/face/delete/${student.id_user}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const json = await response.json();
              if (json.success) {
                fetchStudents();
              }
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus data');
            }
          }
        }
      ]
    );
  };

  // ── Filtering ────────────────────────────────────────────
  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (s.kelas && s.kelas.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'ALL' || s.verification_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: FaceStatus | null) => {
    switch (status) {
      case 'VERIFIED': return '#22c55e';
      case 'PENDING': return '#f59e0b';
      case 'FAILED': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const getStatusLabel = (status: FaceStatus | null) => {
    switch (status) {
      case 'VERIFIED': return 'Terverifikasi';
      case 'PENDING': return 'Menunggu';
      case 'FAILED': return 'Gagal';
      default: return 'Belum Terdaftar';
    }
  };

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={[styles.backButton, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}
            >
              <ArrowLeft color={tokens.textColor} size={24} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Pendaftaran Wajah</Text>
            <TouchableOpacity 
              onPress={fetchStudents} 
              style={[styles.refreshButton, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}
            >
              <RefreshCw color={tokens.textColor} size={20} />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.searchContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
            <Search color={tokens.subTextColor} size={20} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: tokens.textColor }]}
              placeholder="Cari mahasiswa atau kelas..."
              placeholderTextColor={tokens.subTextColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.filterContainer}
          >
            {(['ALL', 'VERIFIED', 'NOT_REGISTERED', 'PENDING', 'FAILED'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status)}
                style={[
                  styles.filterTab,
                  { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor },
                  filterStatus === status && [styles.filterTabActive, { backgroundColor: isLightTheme ? '#1E4FA8' : '#3B82F6', borderColor: isLightTheme ? '#1E4FA8' : '#3B82F6' }]
                ]}
              >
                <Text style={[
                  styles.filterTabText,
                  { color: tokens.textColor },
                  filterStatus === status && styles.filterTabTextActive
                ]}>
                  {status === 'ALL' ? 'Semua' : 
                   status === 'NOT_REGISTERED' ? 'Belum' : 
                   status === 'VERIFIED' ? 'Terverifikasi' : status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* STUDENT LIST */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={isLightTheme ? '#1E4FA8' : '#3b82f6'} />
            <Text style={[styles.loadingText, { color: tokens.subTextColor }]}>Memuat data mahasiswa...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <AlertCircle color="#ef4444" size={48} />
            <Text style={[styles.emptyText, { color: '#ef4444', marginTop: 12 }]}>{error}</Text>
            <TouchableOpacity 
              onPress={fetchStudents} 
              style={[styles.retryBtn, { backgroundColor: isLightTheme ? '#1E4FA8' : '#3b82f6' }]}
            >
              <Text style={styles.retryBtnText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <TouchableOpacity
                  key={student.id_user}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedStudent(student);
                    setCapturedImages([]);
                    setIsModalVisible(true);
                  }}
                >
                  <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.studentCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                    <View style={styles.studentInfo}>
                      <View style={styles.avatarContainer}>
                        {student.face_image ? (
                          <Image 
                            source={{ uri: `${API_URL.replace('/api', '')}/uploads/faces/${student.face_image}` }} 
                            style={styles.avatar} 
                          />
                        ) : (
                          <View style={[styles.avatarPlaceholder, { backgroundColor: tokens.borderColor }]}>
                            <UserX color={tokens.subTextColor} size={30} />
                          </View>
                        )}
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(student.verification_status), borderColor: tokens.cardBg }]} />
                      </View>
                      
                      <View style={styles.details}>
                        <Text style={[styles.studentName, { color: tokens.textColor }]} numberOfLines={1}>
                          {student.nama}
                        </Text>
                        <Text style={[styles.studentClass, { color: tokens.subTextColor }]}>
                          {student.kelas || 'N/A'} • {student.prodi || 'N/A'}
                        </Text>
                        <View style={styles.statusBadge}>
                          <Text style={[styles.statusLabel, { color: getStatusColor(student.verification_status) }]}>
                            {getStatusLabel(student.verification_status)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                        {student.verification_status === 'VERIFIED' ? (
                          <TouchableOpacity onPress={() => handleDelete(student)} style={[styles.deleteBtn, { backgroundColor: isLightTheme ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.1)' }]}>
                            <Trash2 color="#ef4444" size={20} />
                          </TouchableOpacity>
                        ) : (
                          <ChevronRight color={tokens.subTextColor} size={20} />
                        )}
                      </View>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <AlertCircle color={tokens.subTextColor} size={48} />
                <Text style={[styles.emptyText, { color: tokens.subTextColor }]}>Tidak ada mahasiswa ditemukan</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* REGISTRATION MODAL */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => !isProcessing && setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint={isLightTheme ? 'light' : 'dark'} style={[styles.modalContent, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor, borderWidth: 1 }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: tokens.textColor }]}>
                    Registrasi Wajah
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: tokens.subTextColor }]}>
                    {selectedStudent?.nama}
                  </Text>
                </View>
                {!isProcessing && (
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X color={tokens.textColor} size={24} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView contentContainerStyle={styles.modalBody}>
                {isProcessing ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="large" color={isLightTheme ? '#1E4FA8' : '#3b82f6'} />
                    <Text style={[styles.processingText, { color: tokens.textColor }]}>{progress}%</Text>
                    <Text style={[styles.processingMessage, { color: tokens.subTextColor }]}>{progressMessage}</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: tokens.borderColor }]}>
                      <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: isLightTheme ? '#1E4FA8' : '#3B82F6' }]} />
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.captureOptions}>
                      <TouchableOpacity 
                        style={[styles.optionButton, { flex: 2 }]} 
                        onPress={takePhoto}
                      >
                        <LinearGradient colors={isLightTheme ? ['#1E4FA8', '#2D6CDF'] : ['#3b82f6', '#2563eb']} style={[styles.optionIcon, { width: '100%', height: 80 }]}>
                          <CameraIcon color="#fff" size={32} />
                          <Text style={[styles.optionText, { color: '#fff', marginTop: 8 }]}>Buka Kamera</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
                        <View style={[styles.optionIcon, { backgroundColor: tokens.inputBg, borderWidth: 1, borderColor: tokens.borderColor }]}>
                          <Upload color={tokens.textColor} size={24} />
                        </View>
                        <Text style={[styles.optionText, { color: tokens.textColor }]}>Galeri</Text>
                      </TouchableOpacity>
                    </View>

                    {Platform.OS === 'web' && !(window as any).isSecureContext && window.location.hostname !== 'localhost' && (
                      <View style={[styles.alertBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', borderWidth: 1 }]}>
                        <AlertCircle color="#ef4444" size={20} />
                        <Text style={[styles.alertText, { color: '#ef4444' }]}>
                          Kamera diblokir karena Anda mengakses melalui IP. Gunakan "localhost" atau HTTPS.
                        </Text>
                      </View>
                    )}

                    <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>
                      Foto Terpilih ({capturedImages.length})
                    </Text>
                    
                    <View style={styles.imageGrid}>
                      {capturedImages.map((img, index) => (
                        <View key={index} style={styles.imageWrapper}>
                          <Image source={{ uri: img }} style={styles.gridImage} resizeMode="cover" />
                          <TouchableOpacity 
                            style={styles.removeImageBtn}
                            onPress={() => removeImage(index)}
                          >
                            <X color="#fff" size={12} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {capturedImages.length < 5 && (
                        <TouchableOpacity style={[styles.addImageBtn, { borderColor: tokens.borderColor }]} onPress={takePhoto}>
                          <Plus color={tokens.subTextColor} size={24} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={[styles.alertBox, { backgroundColor: isLightTheme ? 'rgba(30, 79, 168, 0.05)' : 'rgba(59, 130, 246, 0.05)' }]}>
                      <ShieldCheck color={isLightTheme ? '#1E4FA8' : '#3b82f6'} size={20} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.alertText, { color: isLightTheme ? '#1E4FA8' : '#bfdbfe', marginLeft: 0 }]}>
                          Pastikan pencahayaan cukup, wajah tidak tertutup, dan menghadap lurus ke depan.
                        </Text>
                        <Text style={[styles.alertSubText, { color: tokens.subTextColor, marginTop: 4 }]}>
                          💡 Tip: Hindari penggunaan kacamata atau masker saat registrasi awal.
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>

              {!isProcessing && (
                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={[styles.cancelBtn, { borderColor: tokens.borderColor, backgroundColor: tokens.iconButtonBg }]} 
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: tokens.textColor }]}>Batal</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.submitBtn, 
                      capturedImages.length < 3 && styles.submitBtnDisabled
                    ]} 
                    onPress={handleRegister}
                    disabled={capturedImages.length < 3}
                  >
                    <LinearGradient
                      colors={capturedImages.length >= 3 ? (isLightTheme ? ['#1E4FA8', '#2D6CDF'] : ['#3b82f6', '#2563eb']) : ['#94a3b8', '#64748b']}
                      style={styles.submitBtnGradient}
                    >
                      <Text style={styles.submitBtnText}>Simpan & Latih</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </BlurView>
          </View>
        </Modal>
        
        {/* LIVE CAMERA MODAL */}
        <Modal
          visible={isCameraActive}
          animationType="fade"
          transparent={false}
          onRequestClose={() => setIsCameraActive(false)}
        >
          <View style={styles.cameraContainer}>
            <CameraView 
              ref={cameraRef}
              style={styles.camera}
              facing="front"
            />
              <View style={styles.cameraOverlay}>
                <View style={styles.cameraHeader}>
                  <TouchableOpacity 
                    onPress={() => setIsCameraActive(false)}
                    style={styles.closeCameraBtn}
                  >
                    <X color="#fff" size={28} />
                  </TouchableOpacity>
                  <Text style={styles.cameraTitle}>Posisikan Wajah</Text>
                  <View style={{ width: 40 }} />
                </View>

                <View style={styles.faceGuide}>
                  <View style={styles.guideFrame} />
                </View>

                <View style={styles.cameraFooter}>
                  <Text style={styles.captureCount}>
                    {capturedImages.length} / 5 Foto Terambil
                  </Text>
                  <TouchableOpacity 
                    style={styles.captureBtn}
                    onPress={captureCameraImage}
                  >
                    <View style={styles.captureBtnInner} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.doneCameraBtn}
                    onPress={() => setIsCameraActive(false)}
                  >
                    <Text style={styles.doneCameraBtnText}>Selesai</Text>
                  </TouchableOpacity>
                </View>
              </View>
          </View>
        </Modal>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  filterContainer: {
    paddingBottom: 5,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterTabActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  filterTabText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#3b82f6',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  studentCard: {
    marginBottom: 15,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    overflow: 'hidden',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  details: {
    flex: 1,
    marginLeft: 15,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  studentClass: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    marginLeft: 10,
  },
  deleteBtn: {
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: height * 0.8,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalBody: {
    paddingBottom: 20,
  },
  captureOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  imageWrapper: {
    width: 90,
    height: 90,
    margin: 5,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 15,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  addImageBtn: {
    width: 90,
    height: 90,
    margin: 5,
    borderRadius: 15,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  alertSubText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  cancelBtn: {
    flex: 1,
    height: 55,
    borderRadius: 15,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    height: 55,
    borderRadius: 15,
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 24,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 20,
  },
  closeCameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  faceGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: width * 0.7,
    height: width * 0.9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 150,
    borderStyle: 'dashed',
  },
  cameraFooter: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  doneCameraBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  doneCameraBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  processingText: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 20,
  },
  processingMessage: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 30,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
