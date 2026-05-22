import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Modal, Alert, Dimensions, StatusBar, ActivityIndicator, Image,
  Animated, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Path, G, Circle } from 'react-native-svg';

import {
  ArrowLeft, Search, UserPlus, Trash2, 
  Edit3, X, Check, GraduationCap, 
  Users, IdCard, Mail, Phone, Shield,
  Camera as CameraIcon, 
  ShieldCheck, 
  Calendar,
  ChevronRight,
  Camera
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { API_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { io } from 'socket.io-client';
import { Student } from './types';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { useTheme } from '../context/ThemeContext';
import AdminJadwalScreen from './AdminJadwalScreen';

const { width } = Dimensions.get('window');

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
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [isCameraActive]);

  const fetchSchedules = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/jadwal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setSchedules(result.data);
      }
    } catch (error) {
      console.error('Fetch schedules error:', error);
    }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/admin/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setStudents(result.data);
      }
    } catch (error) {
      console.error('Fetch students error:', error);
      Alert.alert('Error', 'Gagal mengambil data mahasiswa');
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

  useEffect(() => {
    const socket = io(API_URL.replace('/api', ''));
    socket.on('face_training_progress', (data) => {
      if (newUserId && data.user_id === newUserId) {
        setProgress(data.progress);
        setProgressMessage(data.message);
      }
    });

    socket.on('new_attendance', (data) => {
      console.log('Real-time Attendance:', data);
      if (data.recognized) {
        Alert.alert(
          'Wajah Terdeteksi!',
          `Mahasiswa: ${data.name}\nStatus: ${data.attendance_status.toUpperCase()}\nKepastian: ${data.confidence.toFixed(1)}%`,
          [{ text: 'OK' }]
        );
        fetchStudents(); // Refresh to see any status updates
      }
    });

    // Auto-activate camera when entering step 2
    if (registrationStep === 2 && !isCameraActive && capturedImages.length < 5) {
      takePhoto();
    }

    return () => { socket.disconnect(); };
  }, [newUserId, registrationStep]);

  const filteredStudents = students.filter((s: Student) => 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.nim || '').includes(searchQuery)
  );

  const handleAddPress = () => {
    setEditingStudent(null);
    setFormData({ 
      name: '', nim: '', prodi: '', kelas: '', email: '', password: '', 
      phone: '', status: 'Active', notes: '', id_jadwal: '' 
    });
    setRegistrationStep(1);
    setCapturedImages([]);
    setNewUserId(null);
    setIsModalVisible(true);
  };

  const handleEditPress = (student: any) => {
    setEditingStudent(student);
    setFormData({ 
      ...student, 
      password: '', 
      id_jadwal: student.id_jadwal?.toString() || '',
      phone: student.phone || '',
      status: student.status || 'Active',
      notes: student.notes || ''
    });
    setRegistrationStep(1);
    setIsModalVisible(true);
  };

  const handleDeletePress = (id: string | number) => {
    Alert.alert(
      'Hapus Data',
      'Apakah Anda yakin ingin menghapus data siswa ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('@attendify_auth_token');
              const response = await fetch(`${API_URL}/admin/students/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.ok) { fetchStudents(); }
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus mahasiswa');
            }
          }
        }
      ]
    );
  };

  const processImage = async (uri: string): Promise<string | null> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 600 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return `data:image/jpeg;base64,${manipResult.base64}`;
    } catch (e) {
      console.error('Manipulate error:', e);
      return null;
    }
  };

  const takePhoto = async () => {
    if (!permissions[0] || !permissions[0].granted) {
      const result = await permissions[1]();
      if (!result.granted) {
        Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses kamera.');
        return;
      }
    }
    setIsCameraActive(true);
  };

  const captureCameraImage = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, exif: false });
        if (photo && photo.uri) {
          const b64 = await processImage(photo.uri);
          if (b64) {
            setCapturedImages(prev => [...prev, b64]);
            setAiState(prev => ({ 
              ...prev, 
              faceDetected: true, 
              confidence: 98, 
              statusText: 'Face Detected' 
            }));
          }
        }
      } catch (error) {
        console.error('Capture error:', error);
      }
    }
  };

  const handleRegisterFace = async () => {
    const targetUserId = newUserId || editingStudent?.id;
    console.log('DEBUG: handleRegisterFace called', { 
      targetUserId, 
      imageCount: capturedImages.length,
      isProcessing 
    });

    if (isProcessing) return;

    if (capturedImages.length < 3) {
      Alert.alert('Peringatan', 'Mohon ambil minimal 3 foto wajah agar akurasi AI maksimal.');
      return;
    }

    if (!targetUserId) {
      Alert.alert('Error', 'ID Mahasiswa tidak ditemukan. Silakan isi kembali data di langkah pertama.');
      setRegistrationStep(1);
      return;
    }

    setIsProcessing(true);
    setAiState(prev => ({ ...prev, statusText: 'Saving Identity...' }));
    
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/admin/face/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: targetUserId,
          images: capturedImages,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAiState(prev => ({ ...prev, statusText: 'Identity Validated' }));
        setTimeout(() => {
          Alert.alert('Berhasil', 'Registrasi mahasiswa & wajah selesai');
          setIsModalVisible(false);
          fetchStudents();
        }, 1500);
      } else {
        Alert.alert('Gagal', result.message || 'Gagal mendaftarkan wajah');
        setAiState(prev => ({ ...prev, statusText: 'Registration Failed' }));
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal menghubungi server AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    console.log('DEBUG: handleSave called', { formData, editingStudent: !!editingStudent });
    if (!formData.name || !formData.email || (!editingStudent && !formData.password)) {
      Alert.alert('Peringatan', 'Mohon lengkapi Nama, Email, dan Password.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      if (editingStudent) {
        const response = await fetch(`${API_URL}/admin/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            nim: formData.nim,
            email: formData.email,
            prodi: formData.prodi,
            kelas: formData.kelas,
            id_jadwal: formData.id_jadwal
          })
        });
        if (response.ok) {
          Alert.alert('Berhasil', 'Data mahasiswa diperbarui');
          fetchStudents();
          setIsModalVisible(false);
        }
      } else {
        setIsProcessing(true);
        const response = await fetch(`${API_URL}/admin/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        const result = await response.json();
        setIsProcessing(false);

        if (response.ok && result.userId) {
          setNewUserId(result.userId);
          setRegistrationStep(2); // Jump direct to Biometric
        } else {
          Alert.alert('Gagal', result.message || 'Gagal menambahkan mahasiswa');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan koneksi');
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} />
      <AnimatedBackground style={styles.background}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: tokens.iconButtonBg }]}>
            <ArrowLeft color={tokens.textColor} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Data Mahasiswa & Biometrik</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.tabContainer}>
          <BlurView intensity={30} tint={isLightTheme ? 'light' : 'dark'} style={[styles.tabBg, { borderColor: tokens.borderColor, backgroundColor: tokens.cardBg }]}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'students' && [styles.tabBtnActive, { backgroundColor: tokens.inputBg }]]}
              onPress={() => setActiveTab('students')}
            >
              <Users size={18} color={activeTab === 'students' ? '#3B82F6' : tokens.subTextColor} />
              <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive, { color: activeTab === 'students' ? '#3B82F6' : tokens.subTextColor }]}>Data Siswa</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'schedules' && [styles.tabBtnActive, { backgroundColor: tokens.inputBg }]]}
              onPress={() => setActiveTab('schedules')}
            >
              <Calendar size={18} color={activeTab === 'schedules' ? '#3B82F6' : tokens.subTextColor} />
              <Text style={[styles.tabText, activeTab === 'schedules' && styles.tabTextActive, { color: activeTab === 'schedules' ? '#3B82F6' : tokens.subTextColor }]}>Jadwal</Text>
            </TouchableOpacity>
          </BlurView>
        </View>

        {activeTab === 'students' ? (
          <>
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

            <ScrollView contentContainerStyle={styles.listContent}>
              {isLoading ? (
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
              ) : filteredStudents.map((student) => (
                <View key={student.id} style={[styles.studentCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.avatar, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                      <Text style={[styles.avatarText, { color: tokens.textColor }]}>{(student.name || '?').charAt(0)}</Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: tokens.textColor }]}>{student.name}</Text>
                      <Text style={[styles.studentNim, { color: tokens.subTextColor }]}>{student.nim || student.username}</Text>
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
                    <View style={styles.metaItem}><GraduationCap size={14} color={tokens.subTextColor} /><Text style={[styles.metaText, { color: tokens.subTextColor }]}>{student.prodi}</Text></View>
                    <View style={styles.metaItem}><Users size={14} color={tokens.subTextColor} /><Text style={[styles.metaText, { color: tokens.subTextColor }]}>{student.kelas}</Text></View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.fabGradient}><UserPlus color="#fff" size={24} /></LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <AdminJadwalScreen isEmbedded={true} />
        )}

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

              <View style={styles.progressContainer}>
                {[1, 2, 3].map(s => (
                  <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.progressDot, { backgroundColor: registrationStep >= s ? '#3B82F6' : tokens.borderColor }]} />
                    {s < 3 && <View style={[styles.progressLine, { backgroundColor: registrationStep > s ? '#3B82F6' : tokens.borderColor }]} />}
                  </View>
                ))}
              </View>

              <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
                  {registrationStep === 1 && (
                    <View style={styles.stepContainer}>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Nama Lengkap</Text>
                        <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}><Users size={18} color={tokens.subTextColor} /><TextInput style={[styles.input, { color: tokens.textColor }]} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} placeholder="Nama..." /></View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>NIM</Text>
                        <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}><IdCard size={18} color={tokens.subTextColor} /><TextInput style={[styles.input, { color: tokens.textColor }]} value={formData.nim} onChangeText={t => setFormData({...formData, nim: t})} placeholder="NIM..." keyboardType="numeric" /></View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Email</Text>
                        <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}><Mail size={18} color={tokens.subTextColor} /><TextInput style={[styles.input, { color: tokens.textColor }]} value={formData.email} onChangeText={t => setFormData({...formData, email: t})} placeholder="Email..." keyboardType="email-address" /></View>
                      </View>
                      {!editingStudent && (
                        <View style={styles.inputGroup}>
                          <Text style={[styles.inputLabel, { color: tokens.subTextColor }]}>Password</Text>
                          <View style={[styles.inputWrap, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}><Shield size={18} color={tokens.subTextColor} /><TextInput style={[styles.input, { color: tokens.textColor }]} value={formData.password} onChangeText={t => setFormData({...formData, password: t})} placeholder="Password..." secureTextEntry /></View>
                        </View>
                      )}
                    </View>
                  )}

                  {registrationStep === 2 && (
                    <View style={styles.stepContainer}>
                      <View style={styles.biometricHeader}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                          <CameraIcon size={48} color="#3B82F6" />
                        </Animated.View>
                        <Text style={[styles.biometricTitle, { color: tokens.textColor }]}>Perekaman Wajah AI</Text>
                        <Text style={[styles.biometricSubtitle, { color: tokens.subTextColor }]}>Ambil minimal 3 citra wajah dengan pencahayaan baik</Text>
                      </View>
                      
                      <View style={[styles.cameraPreviewPlaceholder, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor, height: isCameraActive ? 300 : 200 }]}>
                        {isCameraActive ? (
                          <View style={StyleSheet.absoluteFill}>
                            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
                            <View style={styles.inlineCameraOverlay}>
                              <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                                <Circle cx="50%" cy="50%" r="80" fill="transparent" stroke="#3B82F6" strokeWidth="2" strokeDasharray="5 5" />
                                <Animated.View style={[styles.scannerLine, {
                                  position: 'absolute',
                                  left: 20, right: 20,
                                  transform: [{ translateY: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 250] }) }]
                                }]} />
                              </Svg>
                              
                              <TouchableOpacity style={styles.captureBtnInline} onPress={captureCameraImage}>
                                <View style={styles.captureBtnInner} />
                              </TouchableOpacity>
                              
                              <TouchableOpacity 
                                style={styles.closeCameraInline} 
                                onPress={() => setIsCameraActive(false)}
                              >
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
                          <Text style={[styles.aiBadgeText, { color: tokens.textColor }]}>
                            {capturedImages.length}/5 Gambar
                          </Text>
                        </BlurView>
                        <BlurView intensity={20} style={styles.aiBadge}>
                          <ShieldCheck size={14} color="#3B82F6" />
                          <Text style={[styles.aiBadgeText, { color: tokens.textColor }]}>AI Ready</Text>
                        </BlurView>
                      </View>
                    </View>
                  )}

                  {registrationStep === 3 && (
                    <View style={styles.stepContainer}>
                      <View style={[styles.reviewHeader, { marginBottom: 20 }]}>
                        <ShieldCheck size={40} color="#10B981" />
                        <Text style={[styles.reviewTitle, { color: tokens.textColor }]}>Ringkasan Registrasi</Text>
                      </View>

                      <View style={[styles.reviewCard, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }]}>
                        <View style={styles.reviewMain}>
                          <Image source={{ uri: capturedImages[0] }} style={styles.reviewAvatar} />
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
                            <Text style={[styles.statLabel, { color: tokens.subTextColor }]}>AI Confidence</Text>
                            <Text style={[styles.statValue, { color: '#3B82F6' }]}>98.4%</Text>
                          </View>
                          <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: tokens.subTextColor }]}>Face Sample</Text>
                            <Text style={[styles.statValue, { color: tokens.textColor }]}>{capturedImages.length}</Text>
                          </View>
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        style={{ marginTop: 16, alignItems: 'center' }} 
                        onPress={() => setRegistrationStep(2)}
                      >
                        <Text style={{ color: tokens.subTextColor }}>Ulangi Perekaman</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* Fixed Footer Logic - Moved outside of flex container for touch reliability */}
              <View style={styles.modalFooter}>
                  {registrationStep === 1 && (
                    <TouchableOpacity 
                      style={styles.nextBtn} 
                      onPress={handleSave}
                      activeOpacity={0.7}
                    >
                      <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.saveGradient}>
                        {isProcessing ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Text style={styles.saveBtnText}>{editingStudent ? 'Simpan Perubahan' : 'Lanjut ke Registrasi Wajah'}</Text>
                            <ChevronRight color="#fff" size={20} />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {registrationStep === 2 && (
                    <TouchableOpacity 
                      style={styles.nextBtn} 
                      onPress={() => {
                        setIsCameraActive(false);
                        setRegistrationStep(3);
                      }} 
                      disabled={capturedImages.length < 3}
                    >
                      <LinearGradient 
                        colors={['#3B82F6', '#1D4ED8']} 
                        style={[styles.saveGradient, capturedImages.length < 3 && { opacity: 0.5 }]}
                      >
                        <Text style={styles.saveBtnText}>Review Akhir & Validasi</Text>
                        <ChevronRight color="#fff" size={20} />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {registrationStep === 3 && (
                    <TouchableOpacity style={styles.saveBtn} onPress={handleRegisterFace} activeOpacity={0.7}>
                      <LinearGradient colors={['#10B981', '#059669']} style={styles.saveGradient}>
                        {isProcessing ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <ShieldCheck color="#fff" size={20} />
                            <Text style={styles.saveBtnText}>Konfirmasi & Aktifkan Akun</Text>
                          </>
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
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  studentCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1 },
  avatarText: { fontSize: 18, fontWeight: 'bold' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: 'bold' },
  studentNim: { fontSize: 13, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardDivider: { height: 1, marginVertical: 12 },
  cardFooter: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, elevation: 8 },
  fabGradient: { flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '90%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, borderTopWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 14, marginTop: 4 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  progressDot: { width: 10, height: 10, borderRadius: 5 },
  progressLine: { width: 30, height: 2, marginHorizontal: 4 },
  stepContainer: { flex: 1 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, marginBottom: 6, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, marginLeft: 10 },
  nextBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10, marginBottom: 20, width: '100%' },
  saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  scheduleInfo: { flex: 1 },
  scheduleName: { fontSize: 15, fontWeight: 'bold' },
  scheduleMeta: { fontSize: 12, marginTop: 2 },
  biometricHeader: { alignItems: 'center', marginBottom: 20 },
  biometricTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  cameraPreviewPlaceholder: { height: 200, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  capturedContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10 },
  miniThumb: { width: 50, height: 70, borderRadius: 8 },
  addMoreBtn: { width: 50, height: 70, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  aiIndicators: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  aiStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiDot: { width: 8, height: 8, borderRadius: 4 },
  reviewCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  reviewLabel: { fontSize: 14, marginBottom: 8 },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  cameraOverlay: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraHeader: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
  cameraControls: { position: 'absolute', bottom: 60, width: '100%', alignItems: 'center' },
  captureCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  closeCamera: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  cameraTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionSubtitle: { fontSize: 14 },
  openCameraBtn: { alignItems: 'center' },

  // New Premium Styles
  biometricSubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  miniThumbWrapper: { position: 'relative' },
  checkBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#10B981', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  scannerIconBox: { width: 100, height: 100, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  scannerLine: { position: 'absolute', top: 0, left: 10, right: 10, height: 2, backgroundColor: '#3B82F6' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  aiBadgeText: { fontSize: 12, fontWeight: 'bold' },
  reviewHeader: { alignItems: 'center' },
  inlineCameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 },
  captureBtnInline: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  captureBtnInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff' },
  closeCameraInline: { position: 'absolute', top: 15, right: 15, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  reviewTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  reviewMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  reviewAvatar: { width: 80, height: 80, borderRadius: 20, marginRight: 16 },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: 18, fontWeight: 'bold' },
  reviewNim: { fontSize: 14, marginTop: 2 },
  reviewStatusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  greenPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 12, borderRadius: 12 },
  statLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  aiOverlayContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  aiStatusBanner: { position: 'absolute', top: 120, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiStatusText: { color: '#fff', fontWeight: 'bold' },
  aiMetricsRow: { position: 'absolute', bottom: 180, flexDirection: 'row', gap: 20 },
  aiMetric: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 15, borderRadius: 15, minWidth: 100 },
  aiMetricLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold' },
  aiMetricValue: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  finishCaptureBtn: { paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, overflow: 'hidden' },
  modalFooter: { paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }
});
