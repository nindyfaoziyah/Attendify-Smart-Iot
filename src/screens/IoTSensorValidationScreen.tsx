import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, Dimensions, StatusBar,
  Image, FlatList, Modal, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import {
  ArrowLeft, Cpu, Camera, ShieldCheck, 
  Activity, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Info, Clock, User, ChevronDown, Send
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '@/constants/Config';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Trash2, Camera as CameraIcon } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Prop added to support rendering inside the IoTUnifiedScreen without duplicate headers
export default function IoTSensorValidationScreen({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const navigation = useNavigation<any>();
  const { tokens, isLightTheme } = useTheme();
  const { token } = useAuth() as any;
  const [logs, setLogs] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [validationState, setValidationState] = useState<'idle' | 'starting' | 'waiting' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [isLaptopCameraActive, setIsLaptopCameraActive] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regStatus, setRegStatus] = useState<string[]>([]);
  
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollInterval = useRef<any>(null);

  useEffect(() => {
    fetchLogs();
    fetchAvailableUsers();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    if (isLive) loop.start();
    return () => loop.stop();
  }, [isLive]);

  const fetchLogs = async () => {
    // Integration point for logs
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/wajah/available-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (res.status === 'success') {
        setAvailableUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startValidation = async () => {
    if (!selectedUser) {
      Alert.alert('Peringatan', 'Pilih mahasiswa terlebih dahulu');
      return;
    }

    setValidationState('starting');
    try {
      const response = await fetch(`${API_URL}/wajah/start-session`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: selectedUser.id, device_id: 'ESP32-Cam-01' })
      });
      
      const res = await response.json();
      if (res.status === 'success') {
        setValidationState('waiting');
        startPolling();
      } else {
        setValidationState('error');
        Alert.alert('Gagal', res.message);
      }
    } catch (err) {
      setValidationState('error');
      console.error(err);
    }
  };

  const startPolling = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    pollInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/wajah/status/${selectedUser.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const res = await response.json();
        if (res.status === 'completed') {
          setValidationState('completed');
          setProgress(4);
          clearInterval(pollInterval.current);
        } else if (res.status === 'processing') {
          setProgress(res.progress);
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);
  };

  const closeModal = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    setIsModalVisible(false);
    setValidationState('idle');
    setProgress(0);
    setSelectedUser(null);
    setIsLaptopCameraActive(false);
    setCapturedImages([]);
    setRegStatus([]);
  };

  const switchToLaptopCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Izin Ditolak', 'Akses kamera diperlukan untuk pendaftaran wajah.');
        return;
      }
    }
    setIsLaptopCameraActive(true);
  };

  const captureLaptopPhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        
        if (photo && photo.base64) {
          const newImages = [...capturedImages, `data:image/jpeg;base64,${photo.base64}`];
          setCapturedImages(newImages);
        }
      } catch (err) {
        console.error('Capture error:', err);
        Alert.alert('Error', 'Gagal mengambil foto');
      }
    }
  };

  const handleRegisterLaptop = async (images: string[]) => {
    setIsRegistering(true);
    setRegStatus([]);
    
    try {
      const response = await fetch(`${API_URL}/admin/face/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: selectedUser.id || selectedUser.id_user,
          images: images
        })
      });
      
      const res = await response.json();
      if (res.success) {
        setValidationState('completed');
        setIsLaptopCameraActive(false);
      } else {
        Alert.alert('Gagal', res.message || 'Terjadi kesalahan saat pendaftaran');
        setCapturedImages([]); // Reset so they can try again
      }
    } catch (err) {
      console.error('Register error:', err);
      Alert.alert('Error', 'Gagal menghubungi server');
    } finally {
      setIsRegistering(false);
    }
  };

  const LogItem = ({ item }: any) => (
    <BlurView intensity={15} tint="dark" style={styles.logCard}>
      {/* ... previous log item UI ... */}
    </BlurView>
  );

  const BackgroundComponent = isEmbedded ? View : AnimatedBackground;

  return (
    <View style={styles.container}>
      {!isEmbedded && <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} />}
    <BackgroundComponent style={styles.background}>
        {!isEmbedded && (
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={[styles.backBtn, { backgroundColor: tokens.iconButtonBg }]}
            >
              <ArrowLeft color={tokens.textColor} size={24} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Validasi Sensor IoT</Text>
            <TouchableOpacity 
              onPress={() => setIsLive(!isLive)} 
              style={[styles.liveBtn, { borderColor: isLive ? '#10B981' : tokens.borderColor }]}
            >
              <Animated.View style={[styles.liveDot, { opacity: pulseAnim, backgroundColor: isLive ? '#10B981' : tokens.subTextColor }]} />
              <Text style={[styles.liveText, { color: isLive ? '#10B981' : tokens.subTextColor }]}>LIVE</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView contentContainerStyle={[styles.scrollContent, isEmbedded && { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.deviceGrid}>
            <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.deviceCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
              <Cpu size={24} color={Colors.ai.primary} />
              <View style={styles.deviceDetails}>
                <Text style={[styles.deviceTitle, { color: tokens.textColor }]}>ESP32-Cam-01</Text>
                <View style={styles.statusRow}>
                  <CheckCircle2 size={12} color="#10B981" />
                  <Text style={styles.statusOnline}>Online</Text>
                </View>
              </View>
            </BlurView>
          </View>

          <BlurView intensity={30} tint={isLightTheme ? 'light' : 'dark'} style={[styles.warningBanner, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
            <LinearGradient
              colors={isLightTheme ? ['rgba(59,130,246,0.05)', 'rgba(59,130,246,0.02)'] : ['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.05)']}
              style={styles.warningGradient}
            >
              <Info size={24} color={Colors.ai.primary} />
              <View style={styles.warningText}>
                <Text style={[styles.warningTitle, { color: tokens.textColor }]}>Validasi Wajah Via ESP32</Text>
                <Text style={[styles.warningDesc, { color: tokens.subTextColor }]}>Gunakan ESP32-CAM untuk mengambil data wajah mahasiswa baru untuk autentikasi sistem.</Text>
              </View>
            </LinearGradient>
            <TouchableOpacity style={[styles.validateLink, { borderTopColor: tokens.borderColor }]} onPress={() => setIsModalVisible(true)}>
              <Text style={styles.validateLinkText}>Mulai Validasi Sensor</Text>
              <ShieldCheck size={16} color={Colors.ai.primary} />
            </TouchableOpacity>
          </BlurView>

          <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>Log Deteksi Sistem</Text>
          <View style={[styles.emptyLogs, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
            <Activity size={48} color={tokens.subTextColor} opacity={0.3} />
            <Text style={[styles.emptyText, { color: tokens.subTextColor }]}>Menunggu data dari IoT device...</Text>
          </View>

        </ScrollView>
      </BackgroundComponent>

      {/* IoT Validation Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint={isLightTheme ? 'light' : 'dark'} style={[styles.modalContent, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tokens.textColor }]}>ESP32-CAM Validation</Text>
              <TouchableOpacity onPress={closeModal}>
                <XCircle color={tokens.textColor} size={24} />
              </TouchableOpacity>
            </View>

            {validationState === 'idle' ? (
              <View style={styles.modalBody}>
                <Text style={[styles.label, { color: tokens.subTextColor }]}>Pilih Mahasiswa:</Text>
                <ScrollView style={styles.userList}>
                  {availableUsers.map((user: any) => (
                    <TouchableOpacity 
                      key={user.id} 
                      style={[
                        styles.userItem, 
                        { backgroundColor: tokens.inputBg },
                        selectedUser?.id === user.id && { backgroundColor: Colors.ai.primary }
                      ]}
                      onPress={() => setSelectedUser(user)}
                    >
                      <User size={18} color={selectedUser?.id === user.id ? "#fff" : tokens.subTextColor} />
                      <Text style={[styles.userName, { color: tokens.subTextColor }, selectedUser?.id === user.id && {color: '#fff'}]}>{user.name}</Text>
                      {selectedUser?.id === user.id && <CheckCircle2 size={18} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.startBtn} onPress={startValidation}>
                  <LinearGradient colors={[Colors.ai.primary, Colors.ai.accentGlow]} style={styles.btnG}>
                    <Cpu size={20} color="#fff" />
                    <Text style={styles.btnText}>Aktifkan ESP32-CAM</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.statusBody}>
                <View style={[styles.progressCircle, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                   {validationState === 'completed' ? (
                     <CheckCircle2 size={80} color="#10B981" />
                   ) : (
                     <ActivityIndicator size="large" color={Colors.ai.primary} />
                   )}
                </View>
                <Text style={[styles.statusTitle, { color: tokens.textColor }]}>
                  {validationState === 'waiting' && `MENGAMBIL FOTO (${progress}/4)`}
                  {validationState === 'completed' && 'VALIDASI BERHASIL'}
                  {validationState === 'starting' && 'MEMULAI SESI...'}
                </Text>
                <Text style={[styles.statusSub, { color: tokens.subTextColor }]}>
                  {validationState === 'waiting' && 'Harap posisi wajah mahasiswa tepat di depan lensa ESP32-CAM. Jika tetap muter, pastikan ESP32 terhubung ke Wi-Fi yang sama.'}
                  {validationState === 'completed' && `Data wajah ${selectedUser?.name} telah masuk ke database.`}
                </Text>
                
                {validationState === 'waiting' && (
                  <TouchableOpacity 
                    style={[styles.fallbackBtn, { borderColor: tokens.borderColor }]} 
                    onPress={switchToLaptopCamera}
                  >
                    <Camera size={16} color={tokens.subTextColor} />
                    <Text style={[styles.fallbackBtnText, { color: tokens.subTextColor }]}>Beralih ke Kamera Laptop</Text>
                  </TouchableOpacity>
                )}
                
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(progress/4)*100}%` }]} />
                </View>

                {validationState === 'completed' && (
                  <TouchableOpacity style={styles.doneBtn} onPress={closeModal}>
                    <Text style={styles.doneBtnText}>Selesai</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isLaptopCameraActive && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', borderRadius: 32, overflow: 'hidden' }]}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="front"
                />
                  <View style={styles.cameraOverlay}>
                    {/* Header */}
                    <View style={styles.cameraHeader}>
                      <Text style={styles.cameraTitle}>Laptop Webcam Capture</Text>
                      <TouchableOpacity onPress={() => setIsLaptopCameraActive(false)} style={styles.cameraCloseBtn}>
                        <X color="#fff" size={24} />
                      </TouchableOpacity>
                    </View>

                    {Platform.OS === 'web' && !(window as any).isSecureContext && window.location.hostname !== 'localhost' && (
                      <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)', padding: 12, borderRadius: 12, marginHorizontal: 20 }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                          ⚠️ KAMERA DIBLOKIR BROWSER: Gunakan "localhost" atau HTTPS agar kamera diizinkan.
                        </Text>
                      </View>
                    )}

                    {/* Face Guide */}
                    <View style={styles.faceGuideContainer}>
                      <View style={styles.faceGuideFrame} />
                      <Text style={styles.guideText}>Posisikan wajah di dalam bingkai</Text>
                    </View>

                    {/* Captured Images Preview */}
                    {capturedImages.length > 0 && (
                      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {capturedImages.map((img, idx) => (
                            <View key={idx} style={{ marginRight: 10, borderRadius: 10, borderWidth: 2, borderColor: '#10B981', overflow: 'hidden' }}>
                              <Image source={{ uri: img }} style={{ width: 60, height: 80 }} />
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Progress */}
                    <View style={styles.cameraBottom}>
                      <View style={styles.captureInfo}>
                        <Text style={styles.captureProgressText}>FOTO TERAMBIL: {capturedImages.length}/4</Text>
                        <View style={styles.miniProgressContainer}>
                           {[0,1,2,3].map((i) => (
                             <View key={i} style={[styles.miniProgressDot, capturedImages.length > i && { backgroundColor: '#10B981' }]} />
                           ))}
                        </View>
                      </View>

                      <View style={styles.cameraActions}>
                        <TouchableOpacity 
                          style={styles.retakeBtn} 
                          onPress={() => setCapturedImages([])}
                          disabled={capturedImages.length === 0 || isRegistering}
                        >
                          <Trash2 color={capturedImages.length === 0 ? "rgba(255,255,255,0.2)" : "#fff"} size={20} />
                          <Text style={[styles.retakeBtnText, capturedImages.length === 0 && { color: 'rgba(255,255,255,0.2)' }]}>Ulangi</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.captureBtnMain} 
                          onPress={capturedImages.length >= 4 ? () => handleRegisterLaptop(capturedImages) : captureLaptopPhoto}
                          disabled={isRegistering || (capturedImages.length >= 4 && isRegistering)}
                        >
                          {isRegistering ? (
                            <ActivityIndicator color="#fff" />
                          ) : capturedImages.length >= 4 ? (
                            <View style={[styles.captureBtnInner, { backgroundColor: '#10B981' }]}>
                               <Send color="#fff" size={28} />
                            </View>
                          ) : (
                            <View style={styles.captureBtnInner}>
                               <CameraIcon color="#fff" size={32} />
                            </View>
                          )}
                        </TouchableOpacity>

                        <View style={{ width: 80 }} /> 
                      </View>
                    </View>
                  </View>
              </View>
            )}
          </BlurView>
        </View>
      </Modal>
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
    marginBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  liveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  deviceGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  deviceCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    gap: 12,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusOnline: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '500',
  },
  statusWarning: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '500',
  },
  warningBanner: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    marginBottom: 32,
  },
  warningGradient: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  warningDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 18,
  },
  validateLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59,130,246,0.1)',
  },
  validateLinkText: {
    color: Colors.ai.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyLogs: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    marginTop: 12,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 12,
  },
  userList: {
    flex: 1,
    marginBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
    gap: 12,
  },
  userItemSelected: {
    backgroundColor: Colors.ai.primary,
  },
  userName: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  startBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
  },
  btnG: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statusSub: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  fallbackBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.ai.primary,
  },
  doneBtn: {
    marginTop: 40,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    backgroundColor: '#10B981',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 20,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuideFrame: {
    width: 240,
    height: 320,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  guideText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraBottom: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 24,
    padding: 20,
  },
  captureInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  captureProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  miniProgressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  miniProgressDot: {
    width: 30,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cameraActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captureBtnMain: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: Colors.ai.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  retakeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
