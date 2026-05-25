import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Modal, Alert, Dimensions, StatusBar, ActivityIndicator, Image,
  Animated, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import {
  ArrowLeft, Search, UserPlus, Trash2,
  Edit3, X, Check, GraduationCap,
  Users, IdCard, Mail, Shield,
  Camera as CameraIcon,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Wifi,
  AlertCircle,
  Star,
  Clock,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { API_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { io as socketIO } from 'socket.io-client';
import { Student } from './types';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { useTheme } from '../context/ThemeContext';
import AdminJadwalScreen from './AdminJadwalScreen';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────
// Biometric Badge Component
// ─────────────────────────────────────────────────────
function BiometricBadge({ status, confidence }: { status?: string; confidence?: number }) {
  if (!status || status === 'NOT_REGISTERED') {
    return (
      <View style={[badge.wrap, { backgroundColor: 'rgba(100,100,100,0.15)' }]}>
        <AlertCircle size={11} color="#9CA3AF" />
        <Text style={[badge.text, { color: '#9CA3AF' }]}>Belum Terdaftar</Text>
      </View>
    );
  }
  if (status === 'VERIFIED') {
    const pct = confidence != null ? (confidence * 100).toFixed(1) : null;
    return (
      <View style={[badge.wrap, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
        <ShieldCheck size={11} color="#10B981" />
        <Text style={[badge.text, { color: '#10B981' }]}>
          Terverifikasi{pct ? ` · ${pct}%` : ''}
        </Text>
      </View>
    );
  }
  if (status === 'PENDING') {
    return (
      <View style={[badge.wrap, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
        <Clock size={11} color="#F59E0B" />
        <Text style={[badge.text, { color: '#F59E0B' }]}>Menunggu</Text>
      </View>
    );
  }
  return (
    <View style={[badge.wrap, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
      <AlertCircle size={11} color="#EF4444" />
      <Text style={[badge.text, { color: '#EF4444' }]}>Gagal</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontSize: 11, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────
// Premium Success Overlay
// ─────────────────────────────────────────────────────
function SuccessOverlay({ visible, data, onDone }: {
  visible: boolean;
  data: { name: string; nim: string; confidence_pct: number; face_image: string } | null;
  onDone: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        // Check draw
        Animated.timing(checkAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        // Particle burst
        Animated.timing(particleAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      });

      // Auto-close after 3.5 s
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onDone());
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      checkAnim.setValue(0);
      particleAnim.setValue(0);
    }
  }, [visible]);

  if (!visible || !data) return null;

  return (
    <Animated.View style={[successStyles.overlay, { opacity: opacityAnim }]}>
      <Animated.View style={[successStyles.card, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={['#064E3B', '#065F46', '#047857']} style={successStyles.gradient}>
          {/* Particles */}
          {[...Array(6)].map((_, i) => (
            <Animated.View
              key={i}
              style={[successStyles.particle, {
                left: 30 + i * 38,
                top: 20 + (i % 2) * 15,
                opacity: particleAnim,
                transform: [{
                  translateY: particleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30 - i * 5] })
                }]
              }]}
            />
          ))}

          {/* Check circle */}
          <Animated.View style={[successStyles.checkCircle, {
            transform: [{ scale: checkAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.15, 1] }) }]
          }]}>
            <Check size={36} color="#10B981" strokeWidth={3} />
          </Animated.View>

          <Text style={successStyles.title}>Biometrik Diaktifkan! 🎉</Text>
          <Text style={successStyles.name}>{data.name}</Text>
          <Text style={successStyles.nim}>NIM: {data.nim}</Text>

          {/* Stats row */}
          <View style={successStyles.statsRow}>
            <View style={successStyles.statItem}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={successStyles.statLabel}>AI Confidence</Text>
              <Text style={successStyles.statValue}>{data.confidence_pct?.toFixed(1) ?? '--'}%</Text>
            </View>
            <View style={successStyles.statDivider} />
            <View style={successStyles.statItem}>
              <ShieldCheck size={16} color="#10B981" />
              <Text style={successStyles.statLabel}>Status</Text>
              <Text style={successStyles.statValue}>VERIFIED</Text>
            </View>
            <View style={successStyles.statDivider} />
            <View style={successStyles.statItem}>
              <Wifi size={16} color="#60A5FA" />
              <Text style={successStyles.statLabel}>ESP32</Text>
              <Text style={successStyles.statValue}>Ready</Text>
            </View>
          </View>

          <Text style={successStyles.caption}>
            Mahasiswa kini dapat dikenali secara otomatis oleh sistem AI ESP32
          </Text>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const successStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  card: { width: width * 0.85, borderRadius: 28, overflow: 'hidden', elevation: 20 },
  gradient: { padding: 32, alignItems: 'center' },
  particle: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16,185,129,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: 'rgba(16,185,129,0.3)' },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  name: { color: '#10B981', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  nim: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 24 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 16, gap: 8 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
  statValue: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  caption: { color: 'rgba(255,255,255,0.55)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});

// ─────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────
export default function ManageStudentsScreen() {
  const navigation = useNavigation<any>();
  const { tokens, isLightTheme } = useTheme();

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'students' | 'schedules'>('students');

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', nim: '', prodi: '', kelas: '', email: '', password: '',
    phone: '', status: 'Active', notes: '', id_jadwal: ''
  });

  // Biometric Registration State
  const [registrationStep, setRegistrationStep] = useState(1);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [schedules, setSchedules] = useState<any[]>([]);
  const permissions = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [newUserId, setNewUserId] = useState<number | null>(null);

  // Success overlay
  const [successData, setSuccessData] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // AI Confidence from server (live)
  const [serverConfidence, setServerConfidence] = useState<number | null>(null);

  // AI Validation State
  const [aiState, setAiState] = useState({
    faceDetected: false,
    confidence: 0,
    statusText: 'Ready',
    isScanning: false,
    errorMessage: '',
    multipleFaces: false
  });

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCameraActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [isCameraActive]);

  // ── Socket.IO realtime events ─────────────────────────────
  useEffect(() => {
    const socket = socketIO(API_URL.replace('/api', ''), {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    // Face training progress bar
    socket.on('face_training_progress', (data: any) => {
      if (newUserId && data.user_id === newUserId) {
        setProgress(data.progress);
        setProgressMessage(data.message);
      }
    });

    // After registration: STUDENT_REGISTERED → instant table refresh
    socket.on('STUDENT_REGISTERED', (data: any) => {
      console.log('[Socket] STUDENT_REGISTERED:', data.name);
      fetchStudents(); // instant refresh without manual pull-to-refresh
    });

    // ESP32 live attendance → alert on admin screen
    socket.on('FACE_VERIFIED', (data: any) => {
      console.log('[Socket] FACE_VERIFIED:', data.name, data.confidence_label);
      Alert.alert(
        `🧠 Wajah Terdeteksi: ${data.name}`,
        `Status: ${data.status_label}\nKepastian AI: ${data.confidence_label}\nLokasi: ${data.location_name}`,
        [{ text: 'OK' }]
      );
      fetchStudents();
    });

    socket.on('new_attendance', (data: any) => {
      if (data.recognized) fetchStudents();
    });

    return () => { socket.disconnect(); };
  }, [newUserId]);

  // ── Auto trigger photo when landing on step 2 ────────────
  useEffect(() => {
    if (registrationStep === 2 && !isCameraActive && capturedImages.length < 5) {
      takePhoto();
    }
  }, [registrationStep]);

  // ── Data fetching ─────────────────────────────────────────
  const fetchSchedules = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const res = await fetch(`${API_URL}/jadwal`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (result.status === 'success') setSchedules(result.data);
    } catch (e) { console.error('Fetch schedules error:', e); }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const res = await fetch(`${API_URL}/admin/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.status === 'success') setStudents(result.data);
    } catch (e) {
      console.error('Fetch students error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchStudents();
      fetchSchedules();
    }, [])
  );

  const filteredStudents = students.filter((s: any) =>
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.nim || '').includes(searchQuery)
  );

  // ── Modal actions ─────────────────────────────────────────
  const handleAddPress = () => {
    setEditingStudent(null);
    setFormData({ name: '', nim: '', prodi: '', kelas: '', email: '', password: '', phone: '', status: 'Active', notes: '', id_jadwal: '' });
    setRegistrationStep(1);
    setCapturedImages([]);
    setNewUserId(null);
    setServerConfidence(null);
    setProgress(0);
    setProgressMessage('');
    setIsModalVisible(true);
  };

  const handleEditPress = (student: any) => {
    setEditingStudent(student);
    setFormData({ ...student, password: '', id_jadwal: student.id_jadwal?.toString() || '', phone: student.phone || '', status: student.status || 'Active', notes: student.notes || '' });
    setRegistrationStep(1);
    setIsModalVisible(true);
  };

  const handleDeletePress = (id: string | number) => {
    Alert.alert('Hapus Data', 'Apakah Anda yakin ingin menghapus data siswa ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('@attendify_auth_token');
            const res = await fetch(`${API_URL}/admin/students/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) fetchStudents();
          } catch { Alert.alert('Error', 'Gagal menghapus mahasiswa'); }
        }
      }
    ]);
  };

  // ── Camera & image helpers ────────────────────────────────
  const processImage = async (uri: string): Promise<string | null> => {
    try {
      const r = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 600 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return `data:image/jpeg;base64,${r.base64}`;
    } catch { return null; }
  };

  const takePhoto = async () => {
    if (!permissions[0] || !permissions[0].granted) {
      const result = await permissions[1]();
      if (!result.granted) { Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses kamera.'); return; }
    }
    setIsCameraActive(true);
  };

  const captureCameraImage = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, exif: false });
        if (photo?.uri) {
          const b64 = await processImage(photo.uri);
          if (b64) {
            setCapturedImages(prev => [...prev, b64]);
            setAiState(prev => ({ ...prev, faceDetected: true, confidence: 98, statusText: 'Face Detected' }));
          }
        }
      } catch (e) { console.error('Capture error:', e); }
    }
  };

  // ── Core registration handler ─────────────────────────────
  const handleRegisterFace = async () => {
    const targetUserId = newUserId || editingStudent?.id;
    if (isProcessing) return;
    if (capturedImages.length < 3) { Alert.alert('Peringatan', 'Mohon ambil minimal 3 foto wajah agar akurasi AI maksimal.'); return; }
    if (!targetUserId) { Alert.alert('Error', 'ID Mahasiswa tidak ditemukan.'); setRegistrationStep(1); return; }

    setIsProcessing(true);
    setProgress(5);
    setProgressMessage('Menghubungi server AI...');
    setAiState(prev => ({ ...prev, statusText: 'Saving Identity...' }));

    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const res = await fetch(`${API_URL}/admin/face/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: targetUserId, images: capturedImages }),
      });

      const result = await res.json();

      if (result.success) {
        const conf = result.data?.confidence_pct ?? result.data?.confidence_score * 100 ?? 98;
        setServerConfidence(conf);
        setAiState(prev => ({ ...prev, statusText: 'Identity Validated ✅' }));

        // Show premium success overlay then close modal
        setSuccessData({
          name: formData.name,
          nim: formData.nim,
          confidence_pct: conf,
          face_image: result.data?.face_image,
        });
        setIsModalVisible(false);
        setShowSuccess(true);
        // fetchStudents will be called by STUDENT_REGISTERED socket, but also trigger directly
        setTimeout(() => fetchStudents(), 500);
      } else {
        Alert.alert('Gagal', result.message || 'Gagal mendaftarkan wajah');
        setAiState(prev => ({ ...prev, statusText: 'Registration Failed' }));
      }
    } catch (e) {
      Alert.alert('Error', 'Gagal menghubungi server AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email || (!editingStudent && !formData.password)) {
      Alert.alert('Peringatan', 'Mohon lengkapi Nama, Email, dan Password.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      if (editingStudent) {
        const res = await fetch(`${API_URL}/admin/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: formData.name, nim: formData.nim, email: formData.email, prodi: formData.prodi, kelas: formData.kelas, id_jadwal: formData.id_jadwal })
        });
        if (res.ok) { Alert.alert('Berhasil', 'Data mahasiswa diperbarui'); fetchStudents(); setIsModalVisible(false); }
      } else {
        setIsProcessing(true);
        const res = await fetch(`${API_URL}/admin/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(formData)
        });
        const result = await res.json();
        setIsProcessing(false);
        if (res.ok && result.userId) {
          setNewUserId(result.userId);
          setRegistrationStep(2);
        } else {
          Alert.alert('Gagal', result.message || 'Gagal menambahkan mahasiswa');
        }
      }
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan koneksi');
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle={isLightTheme ? 'dark-content' : 'light-content'} />

      {/* Premium success overlay */}
      <SuccessOverlay
        visible={showSuccess}
        data={successData}
        onDone={() => { setShowSuccess(false); setSuccessData(null); }}
      />

      <AnimatedBackground style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: tokens.iconButtonBg }]}>
            <ArrowLeft color={tokens.textColor} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Data Mahasiswa & Biometrik</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <BlurView intensity={30} tint={isLightTheme ? 'light' : 'dark'} style={[styles.tabBg, { borderColor: tokens.borderColor, backgroundColor: tokens.cardBg }]}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'students' && [styles.tabBtnActive, { backgroundColor: tokens.inputBg }]]} onPress={() => setActiveTab('students')}>
              <Users size={18} color={activeTab === 'students' ? '#3B82F6' : tokens.subTextColor} />
              <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive, { color: activeTab === 'students' ? '#3B82F6' : tokens.subTextColor }]}>Data Siswa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'schedules' && [styles.tabBtnActive, { backgroundColor: tokens.inputBg }]]} onPress={() => setActiveTab('schedules')}>
              <Calendar size={18} color={activeTab === 'schedules' ? '#3B82F6' : tokens.subTextColor} />
              <Text style={[styles.tabText, activeTab === 'schedules' && styles.tabTextActive, { color: activeTab === 'schedules' ? '#3B82F6' : tokens.subTextColor }]}>Jadwal</Text>
            </TouchableOpacity>
          </BlurView>
        </View>

        {activeTab === 'students' ? (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={[styles.searchBar, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                <Search size={20} color={tokens.subTextColor} />
                <TextInput
                  style={[styles.searchInput, { color: tokens.textColor }]}
                  placeholder="Cari mahasiswa..."
                  placeholderTextColor={tokens.subTextColor}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Student List */}
            <ScrollView contentContainerStyle={styles.listContent}>
              {isLoading ? (
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
              ) : filteredStudents.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 60 }}>
                  <Users size={48} color={tokens.subTextColor} />
                  <Text style={{ color: tokens.subTextColor, marginTop: 12, fontSize: 15 }}>Belum ada mahasiswa</Text>
                </View>
              ) : filteredStudents.map((student: any) => (
                <View key={student.id} style={[styles.studentCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                  <View style={styles.cardHeader}>
                    {/* Avatar / face photo */}
                    <View style={[styles.avatarWrap, { borderColor: student.is_face_verified ? '#10B981' : tokens.borderColor }]}>
                      {student.face_image ? (
                        <Image
                          source={{ uri: `${API_URL.replace('/api', '')}/uploads/faces/${student.face_image}` }}
                          style={styles.avatarImg}
                        />
                      ) : (
                        <Text style={[styles.avatarText, { color: tokens.textColor }]}>
                          {(student.name || '?').charAt(0)}
                        </Text>
                      )}
                      {/* Verified dot */}
                      {student.is_face_verified === 1 && (
                        <View style={styles.verifiedDot}><Check size={8} color="#fff" /></View>
                      )}
                    </View>

                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: tokens.textColor }]}>{student.name}</Text>
                      <Text style={[styles.studentNim, { color: tokens.subTextColor }]}>{student.nim}</Text>
                      {/* Biometric Badge */}
                      <BiometricBadge status={student.biometric_status} confidence={student.confidence_score} />
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={() => handleEditPress(student)} style={[styles.actionBtn, { backgroundColor: tokens.inputBg }]}>
                        <Edit3 size={18} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeletePress(student.id)} style={[styles.actionBtn, { backgroundColor: tokens.inputBg }]}>
                        <Trash2 size={18} color="#F87171" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.cardDivider, { backgroundColor: tokens.borderColor }]} />
                  <View style={styles.cardFooter}>
                    <View style={styles.metaItem}><GraduationCap size={14} color={tokens.subTextColor} /><Text style={[styles.metaText, { color: tokens.subTextColor }]}>{student.prodi || '-'}</Text></View>
                    <View style={styles.metaItem}><Users size={14} color={tokens.subTextColor} /><Text style={[styles.metaText, { color: tokens.subTextColor }]}>{student.kelas || '-'}</Text></View>
                    {student.registered_at && (
                      <View style={styles.metaItem}>
                        <Clock size={14} color={tokens.subTextColor} />
                        <Text style={[styles.metaText, { color: tokens.subTextColor }]}>
                          {new Date(student.registered_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.fabGradient}>
                <UserPlus color="#fff" size={24} />
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <AdminJadwalScreen isEmbedded={true} />
        )}

        {/* Registration Modal */}
        <Modal visible={isModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <BlurView intensity={90} tint={isLightTheme ? 'light' : 'dark'} style={[styles.modalContent, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: tokens.textColor }]}>{editingStudent ? 'Edit' : 'Tambah'} Mahasiswa</Text>
                  <Text style={[styles.modalSubtitle, { color: tokens.subTextColor }]}>Langkah {registrationStep} dari 3</Text>
                </View>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}><X color={tokens.textColor} size={24} /></TouchableOpacity>
              </View>

              {/* Step indicator */}
              <View style={styles.progressContainer}>
                {[1, 2, 3].map(s => (
                  <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.progressDot, {
                      backgroundColor: registrationStep >= s ? '#3B82F6' : tokens.borderColor,
                      width: registrationStep === s ? 14 : 10,
                      height: registrationStep === s ? 14 : 10,
                      borderRadius: 7,
                    }]} />
                    {s < 3 && <View style={[styles.progressLine, { backgroundColor: registrationStep > s ? '#3B82F6' : tokens.borderColor }]} />}
                  </View>
                ))}
              </View>

              <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">

                  {/* ─── STEP 1: Info ─── */}
                  {registrationStep === 1 && (
                    <View style={styles.stepContainer}>
                      {[
                        { label: 'Nama Lengkap', key: 'name', icon: <Users size={18} color={tokens.subTextColor} />, placeholder: 'Nama lengkap mahasiswa...' },
                        { label: 'NIM', key: 'nim', icon: <IdCard size={18} color={tokens.subTextColor} />, placeholder: 'Nomor Induk Mahasiswa...', numeric: true },
                        { label: 'Email', key: 'email', icon: <Mail size={18} color={tokens.subTextColor} />, placeholder: 'Email aktif...', email: true },
                      ].map(field => (
                        <View key={field.key} style={styles.inputGroup}>
                          <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>{field.label}</Text>
                          <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                            {field.icon}
                            <TextInput
                              style={[styles.input, { color: tokens.textColor }]}
                              value={(formData as any)[field.key]}
                              onChangeText={t => setFormData({ ...formData, [field.key]: t })}
                              placeholder={field.placeholder}
                              placeholderTextColor={tokens.subTextColor}
                              keyboardType={field.numeric ? 'numeric' : field.email ? 'email-address' : 'default'}
                            />
                          </View>
                        </View>
                      ))}
                      {!editingStudent && (
                        <View style={styles.inputGroup}>
                          <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Password</Text>
                          <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                            <Shield size={18} color={tokens.subTextColor} />
                            <TextInput style={[styles.input, { color: tokens.textColor }]} value={formData.password} onChangeText={t => setFormData({ ...formData, password: t })} placeholder="Password..." placeholderTextColor={tokens.subTextColor} secureTextEntry />
                          </View>
                        </View>
                      )}
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Program Studi</Text>
                        <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                          <GraduationCap size={18} color={tokens.subTextColor} />
                          <TextInput style={[styles.input, { color: tokens.textColor }]} value={formData.prodi} onChangeText={t => setFormData({ ...formData, prodi: t })} placeholder="Prodi (contoh: Informatika)..." placeholderTextColor={tokens.subTextColor} />
                        </View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Kelas</Text>
                        <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                          <Users size={18} color={tokens.subTextColor} />
                          <TextInput style={[styles.input, { color: tokens.textColor }]} value={formData.kelas} onChangeText={t => setFormData({ ...formData, kelas: t })} placeholder="Kelas (contoh: IF-2B)..." placeholderTextColor={tokens.subTextColor} />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* ─── STEP 2: Biometric ─── */}
                  {registrationStep === 2 && (
                    <View style={styles.stepContainer}>
                      <View style={styles.biometricHeader}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                          <CameraIcon size={48} color="#3B82F6" />
                        </Animated.View>
                        <Text style={[styles.biometricTitle, { color: tokens.textColor }]}>Perekaman Wajah AI</Text>
                        <Text style={[styles.biometricSubtitle, { color: tokens.subTextColor }]}>Ambil minimal 3 foto – pencahayaan baik, wajah jelas</Text>
                      </View>

                      <View style={[styles.cameraPreviewPlaceholder, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor, height: isCameraActive ? 300 : 200 }]}>
                        {isCameraActive ? (
                          <View style={StyleSheet.absoluteFill}>
                            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
                            <View style={styles.inlineCameraOverlay}>
                              <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                                <Circle cx="50%" cy="50%" r="80" fill="transparent" stroke="#3B82F6" strokeWidth="2" strokeDasharray="10 5" />
                              </Svg>
                              <Animated.View style={[styles.scannerLine, {
                                position: 'absolute', left: 20, right: 20,
                                transform: [{ translateY: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 250] }) }]
                              }]} />
                              <TouchableOpacity style={styles.captureBtnInline} onPress={captureCameraImage}>
                                <View style={styles.captureBtnInner} />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.closeCameraInline} onPress={() => setIsCameraActive(false)}>
                                <X size={20} color="#fff" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : capturedImages.length > 0 ? (
                          <View style={styles.capturedContainer}>
                            {capturedImages.map((img, i) => (
                              <View key={i} style={styles.miniThumbWrapper}>
                                <Image source={{ uri: img }} style={styles.miniThumb} />
                                <View style={styles.checkBadge}><Check size={10} color="#fff" /></View>
                              </View>
                            ))}
                            {capturedImages.length < 5 && (
                              <TouchableOpacity style={styles.addMoreBtn} onPress={takePhoto}>
                                <CameraIcon size={24} color="#3B82F6" />
                                <Text style={{ fontSize: 10, color: '#3B82F6', marginTop: 4 }}>Add</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : (
                          <TouchableOpacity onPress={takePhoto} style={styles.openCameraBtn}>
                            <View style={styles.scannerIconBox}>
                              <CameraIcon size={40} color="#3B82F6" />
                              <Animated.View style={[styles.scannerLine, {
                                transform: [{ translateY: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 100] }) }]
                              }]} />
                            </View>
                            <Text style={{ color: tokens.textColor, marginTop: 16, fontWeight: '600' }}>Buka Kamera Biometrik</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.aiIndicators}>
                        <BlurView intensity={20} style={styles.aiBadge}>
                          <View style={[styles.aiDot, { backgroundColor: capturedImages.length >= 3 ? '#10B981' : '#3B82F6' }]} />
                          <Text style={[styles.aiBadgeText, { color: tokens.textColor }]}>{capturedImages.length}/5 Gambar</Text>
                        </BlurView>
                        <BlurView intensity={20} style={styles.aiBadge}>
                          <ShieldCheck size={14} color={capturedImages.length >= 3 ? '#10B981' : '#3B82F6'} />
                          <Text style={[styles.aiBadgeText, { color: tokens.textColor }]}>
                            {capturedImages.length >= 3 ? 'Siap Diproses' : 'AI Ready'}
                          </Text>
                        </BlurView>
                      </View>
                    </View>
                  )}

                  {/* ─── STEP 3: Review ─── */}
                  {registrationStep === 3 && (
                    <View style={styles.stepContainer}>
                      <View style={[styles.reviewHeader, { marginBottom: 20 }]}>
                        <LinearGradient colors={['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.05)']} style={styles.reviewIconBg}>
                          <ShieldCheck size={40} color="#10B981" />
                        </LinearGradient>
                        <Text style={[styles.reviewTitle, { color: tokens.textColor }]}>Ringkasan Registrasi</Text>
                      </View>

                      <View style={[styles.reviewCard, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                        <View style={styles.reviewMain}>
                          {capturedImages[0] && <Image source={{ uri: capturedImages[0] }} style={styles.reviewAvatar} />}
                          <View style={styles.reviewInfo}>
                            <Text style={[styles.reviewName, { color: tokens.textColor }]}>{formData.name}</Text>
                            <Text style={[styles.reviewNim, { color: tokens.subTextColor }]}>NIM: {formData.nim}</Text>
                            <View style={styles.reviewStatusBadge}>
                              <View style={styles.greenPulse} />
                              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: 'bold' }}>SIAP DIVALIDASI</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.statsGrid}>
                          <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: tokens.subTextColor }]}>Face Samples</Text>
                            <Text style={[styles.statValue, { color: tokens.textColor }]}>{capturedImages.length}</Text>
                          </View>
                          <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: tokens.subTextColor }]}>AI Status</Text>
                            <Text style={[styles.statValue, { color: '#10B981' }]}>Ready</Text>
                          </View>
                          <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: tokens.subTextColor }]}>ESP32</Text>
                            <Text style={[styles.statValue, { color: '#3B82F6' }]}>Linked</Text>
                          </View>
                        </View>
                      </View>

                      {/* Progress bar shown while processing */}
                      {isProcessing && (
                        <View style={[styles.progressBarWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                          <Text style={[styles.progressLabel, { color: tokens.textColor }]}>{progressMessage || 'Memproses...'}</Text>
                        </View>
                      )}

                      <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setRegistrationStep(2)}>
                        <Text style={{ color: tokens.subTextColor }}>← Ulangi Perekaman</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                </ScrollView>
              </View>

              {/* Footer buttons */}
              <View style={styles.modalFooter}>
                {registrationStep === 1 && (
                  <TouchableOpacity style={styles.nextBtn} onPress={handleSave} activeOpacity={0.7}>
                    <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.saveGradient}>
                      {isProcessing ? <ActivityIndicator color="#fff" /> : (
                        <><Text style={styles.saveBtnText}>{editingStudent ? 'Simpan Perubahan' : 'Lanjut ke Registrasi Wajah'}</Text><ChevronRight color="#fff" size={20} /></>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {registrationStep === 2 && (
                  <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={() => { setIsCameraActive(false); setRegistrationStep(3); }}
                    disabled={capturedImages.length < 3}
                  >
                    <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={[styles.saveGradient, capturedImages.length < 3 && { opacity: 0.5 }]}>
                      <Text style={styles.saveBtnText}>Review Akhir & Validasi</Text>
                      <ChevronRight color="#fff" size={20} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {registrationStep === 3 && (
                  <TouchableOpacity style={styles.saveBtn} onPress={handleRegisterFace} activeOpacity={0.7} disabled={isProcessing}>
                    <LinearGradient colors={['#10B981', '#059669']} style={[styles.saveGradient, isProcessing && { opacity: 0.7 }]}>
                      {isProcessing ? (
                        <><ActivityIndicator color="#fff" size="small" /><Text style={styles.saveBtnText}>Memproses AI...</Text></>
                      ) : (
                        <><ShieldCheck color="#fff" size={20} /><Text style={styles.saveBtnText}>Konfirmasi & Aktifkan Akun</Text></>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
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
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  tabContainer: { paddingHorizontal: 20, marginBottom: 20 },
  tabBg: { flexDirection: 'row', borderRadius: 16, padding: 6, borderWidth: 1 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 8 },
  tabBtnActive: { elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: { fontWeight: 'bold' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, borderRadius: 16, borderWidth: 1, gap: 12 },
  searchInput: { flex: 1, fontSize: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  studentCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 2, overflow: 'hidden', backgroundColor: 'rgba(59,130,246,0.1)' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 14 },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  verifiedDot: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  studentInfo: { flex: 1, gap: 3 },
  studentName: { fontSize: 16, fontWeight: 'bold' },
  studentNim: { fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardDivider: { height: 1, marginVertical: 12 },
  cardFooter: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, elevation: 8 },
  fabGradient: { flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '92%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, borderTopWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 14, marginTop: 4 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  progressDot: { borderRadius: 5 },
  progressLine: { width: 40, height: 2, marginHorizontal: 4 },
  stepContainer: { flex: 1 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, marginBottom: 6, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, marginLeft: 10 },
  nextBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10, marginBottom: 20, width: '100%' },
  saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, gap: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  modalFooter: { paddingTop: 8 },
  biometricHeader: { alignItems: 'center', marginBottom: 20 },
  biometricTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  biometricSubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 8 },
  cameraPreviewPlaceholder: { borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  capturedContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10 },
  miniThumb: { width: 56, height: 74, borderRadius: 10 },
  miniThumbWrapper: { position: 'relative' },
  checkBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#10B981', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  addMoreBtn: { width: 56, height: 74, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  aiIndicators: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  aiDot: { width: 8, height: 8, borderRadius: 4 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  aiBadgeText: { fontSize: 12, fontWeight: 'bold' },
  reviewHeader: { alignItems: 'center' },
  reviewIconBg: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  reviewTitle: { fontSize: 18, fontWeight: 'bold' },
  reviewCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  reviewMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  reviewAvatar: { width: 56, height: 56, borderRadius: 14, marginRight: 12 },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: 16, fontWeight: 'bold' },
  reviewNim: { fontSize: 13, marginTop: 2 },
  reviewStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  greenPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  reviewLabel: { fontSize: 14, marginBottom: 8 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11 },
  statValue: { fontSize: 15, fontWeight: 'bold' },
  progressBarWrap: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', height: 52, justifyContent: 'center', marginTop: 8 },
  progressBarFill: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: 'rgba(16,185,129,0.3)' },
  progressLabel: { textAlign: 'center', fontWeight: '600', fontSize: 13 },
  inlineCameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 16 },
  camera: { flex: 1 },
  captureBtnInline: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  captureBtnInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff' },
  closeCameraInline: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  scannerIconBox: { width: 100, height: 100, backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  scannerLine: { position: 'absolute', top: 0, left: 10, right: 10, height: 2, backgroundColor: '#3B82F6' },
  openCameraBtn: { alignItems: 'center' },
});
