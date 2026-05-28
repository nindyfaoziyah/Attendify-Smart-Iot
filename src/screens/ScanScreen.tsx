import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { X, CheckCircle, AlertCircle, ShieldAlert, Zap, Cpu } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [hasPermission, requestPermission] = useCameraPermissions();
const cameraRef = useRef<any>(null);
  const [hasManualPermission, setHasManualPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<'success' | 'failed' | null>(null);
  const [scanTime, setScanTime] = useState<string>('');
  const [lastScanTime, setLastScanTime] = useState(0);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();
  const { isLoggedIn } = useAuth();
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    checkManualPermission();
  }, []);

  // Polling setiap 5 detik untuk mensinkronisasi status izin dari dosen secara real-time
  useEffect(() => {
    if (permissionLoading) return;
    const interval = setInterval(() => {
      checkManualPermission();
      setPollCount(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [permissionLoading]);

  const checkManualPermission = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      if (token && isLoggedIn) {
        const response = await fetch(`${API_URL}/manual-scan/permission?_t=${Date.now()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setHasManualPermission(!!data.data?.enabled);
      }
    } catch (error) {
      console.log('Permission check error:', error);
    } finally {
      setPermissionLoading(false);
    }
  };

  const canScan = Date.now() - lastScanTime > 5000;

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();

      const timer = setTimeout(performScan, 3000);
      return () => clearTimeout(timer);
    }
  }, [scanning]);

  const performScan = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      
      let imageBase64 = '';
      if (cameraRef.current) {
        // Ambil foto betulan dari kamera HP dengan resolusi rendah agar ringan
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        imageBase64 = photo.base64;
      }

      if (!imageBase64) {
        setScanning(false);
        setResult('failed');
        alert('Gagal mengambil gambar dari kamera.');
        return;
      }
      
      const response = await fetch(`${API_URL}/iot/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: imageBase64,
          device_id: `mobile-manual-${Date.now()}`,
          mode: 'manual',
        }),
      });

      const data = await response.json();
      setScanning(false);
      
      if (data.status === 'matched') {
        setResult('success');
        setLastScanTime(Date.now());
        const now = new Date();
        setScanTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      } else {
        console.log('API Failed:', data.message);
        setResult('failed');
      }
    } catch (error) {
      console.log('Network Error:', error);
      setScanning(false);
      setResult('failed');
    }
  };

  if (!hasPermission) {
    return (
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.permissionContainer}>
        <View style={styles.permHeader}>
          <ShieldAlert size={64} color="#3B82F6" />
          <Text style={styles.permTitle}>Akses Kamera Diperlukan</Text>
          <Text style={styles.permissionText}>
            Attendify membutuhkan akses kamera untuk verifikasi wajah AI
          </Text>
        </View>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.btnText}>Izinkan Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permBack} onPress={() => navigation.goBack()}>
          <Text style={styles.permBackText}>Kembali</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  if (!hasPermission.granted) {
    return (
      <AnimatedBackground style={styles.permissionContainer}>
        <View style={styles.permHeader}>
          <ShieldAlert size={64} color="#3B82F6" />
          <Text style={styles.permTitle}>Akses Kamera Ditolak</Text>
          <Text style={styles.permissionText}>
            Izinkan akses kamera di pengaturan aplikasi
          </Text>
        </View>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.btnText}>Coba Lagi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permBack} onPress={() => navigation.goBack()}>
          <Text style={styles.permBackText}>Kembali</Text>
        </TouchableOpacity>
      </AnimatedBackground>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <CameraView style={styles.camera} facing="front" ref={cameraRef} />
      
      <View style={styles.overlay}>
        <View style={[styles.overlayTop, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
          <View style={styles.indicatorWrap}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>AI SCAN ACTIVE</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.middleArea}>
          <View style={styles.scannerBorder}>
            <View style={[styles.scanCorner, styles.topL]} />
            <View style={[styles.scanCorner, styles.topR]} />
            <View style={[styles.scanCorner, styles.botL]} />
            <View style={[styles.scanCorner, styles.botR]} />
            
            {scanning && (
              <Animated.View
                style={[
                  styles.scanLaser,
                  {
                    transform: [{
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 240]
                      })
                    }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(59, 130, 246, 0.5)', 'transparent']}
                  style={styles.laserGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              </Animated.View>
            )}
          </View>
          
          <View style={styles.instructionBox}>
            <Cpu size={16} color="rgba(59, 130, 246, 0.7)" />
            <Text style={styles.instructionText}>
              {permissionLoading 
                ? 'Memuat status izin...' 
                : !hasManualPermission 
                ? 'Membutuhkan izin manual dari dosen' 
                : scanning 
                ? 'MENGANALISIS WAJAH...' 
                : 'Posisikan wajah di kotak biru'}
            </Text>
          </View>
        </View>

        <View style={styles.bottomArea}>
          {result ? null : (
            <TouchableOpacity 
              style={[
                styles.startBtn,
                !hasManualPermission && styles.disabledBtn,
                !canScan && styles.cooldownBtn
              ]}
              onPress={() => {
                if (hasManualPermission && canScan) {
                  setScanning(true);
                } else if (!canScan) {
alert('Cooldown: Tunggu 5 detik sebelum scan lagi');
                } else {
alert('Izin Diperlukan: Hubungi dosen untuk scan manual');
                }
              }}
              disabled={!hasManualPermission || !canScan}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.btnGradient}
              >
                <Zap size={20} color="#fff" />
                <Text style={styles.btnText}>
                  {permissionLoading ? 'Loading...' 
                   : !hasManualPermission ? 'IZIN BELUM ADA' 
                   : !canScan ? 'COOLDOWN 5s' 
                   : 'SCAN MANUAL'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {result && (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.portal}>
            <LinearGradient
              colors={result === 'success' 
                ? ['rgba(16, 185, 129, 0.1)', 'rgba(6, 78, 59, 0.4)'] 
                : ['rgba(239, 68, 68, 0.1)', 'rgba(127, 29, 29, 0.4)']}
              style={styles.portalCard}
            >
              <View style={[
                styles.iconPortal, 
                { backgroundColor: result === 'success' 
                  ? 'rgba(16,185,129,0.2)' 
                  : 'rgba(239,68,68,0.2)' }
              ]}>
                {result === 'success' ? (
                  <CheckCircle color="#10B981" size={48} />
                ) : (
                  <AlertCircle color="#EF4444" size={48} />
                )}
              </View>

              <Text style={styles.portalTitle}>
                {result === 'success' ? 'ABSENSI BERHASIL' : 'SCAN GAGAL'}
              </Text>
              
              <Text style={styles.portalSub}>
                {result === 'success' 
                  ? `Wajah terdeteksi! Absensi tercatat pukul ${scanTime}` 
                  : 'Wajah tidak dikenali atau belum terdaftar. Pastikan wajah sudah didaftarkan dan pencahayaan cukup.'}
              </Text>

              <TouchableOpacity 
                style={[
                  styles.portalAction, 
                  { backgroundColor: result === 'success' ? '#10B981' : '#EF4444' }
                ]}
                onPress={() => {
                  setResult(null);
                  if (result === 'success') navigation.goBack();
                }}
              >
                <Text style={styles.actionText}>
                  {result === 'success' ? 'KE DASHBOARD' : 'COBA LAGI'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  permTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  permBack: {
    marginTop: 20,
  },
  permBackText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'space-between',
  },
  overlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  indicatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  middleArea: {
    alignItems: 'center',
  },
  scannerBorder: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
  },
  topL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 24,
  },
  topR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 24,
  },
  botL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 24,
  },
  botR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 24,
  },
  scanLaser: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    zIndex: 10,
  },
  laserGradient: {
    width: '100%',
    height: 40,
    marginTop: -20,
  },
  instructionBox: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bottomArea: {
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  startBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  cooldownBtn: {
    shadowColor: '#F59E0B',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  portal: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  portalCard: {
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconPortal: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  portalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  portalSub: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
    marginBottom: 24,
  },
  portalAction: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
