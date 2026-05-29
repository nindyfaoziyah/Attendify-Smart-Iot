import React, { useState, useEffect } from 'react';

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Camera, Calendar, Clock, MapPin, Bell, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AttendanceChart } from '../components/AttendanceChart';
import ReportIssueModal from '../components/ReportIssueModal';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { useSocket } from '../context/SocketContext';
import AppModal from '../components/ui/AppModal';
import AIConfidenceBadge from '../components/ui/AIConfidenceBadge';
import StatusBadge from '../components/ui/StatusBadge';
import RealtimeIndicator from '../components/ui/RealtimeIndicator';
import * as Location from 'expo-location';
import { API_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  console.log('HomeScreen User Data:', JSON.stringify(user));
  const { tokens, isLightTheme, themeColors } = useTheme();
  const themePrimary = themeColors && themeColors.length > 0 ? themeColors[Math.min(1, themeColors.length - 1)] : Colors.ai.primary;
  const [showReportModal, setShowReportModal] = useState(false);
  const [lastAttendancePhoto, setLastAttendancePhoto] = useState<string | null>(null);
  const [hasScannedToday, setHasScannedToday] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState<any>(null);

  const userName = user?.fullName || 'Mahasiswa';
  const firstName = userName.split(' ')[0];
  const userProdi = user?.prodi || '-';

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    const handleNewAttendance = async (data: any) => {
      if (user && user.id && data.user_id === user.id) {
        setAttendanceSuccess(data);
        setLastAttendancePhoto(data.photo);
        setHasScannedToday(true);

        // Fetch GPS Location
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
            
            let locName = 'Kampus Area';
            if (reverseGeocode.length > 0) {
              const place = reverseGeocode[0];
              locName = [place.street, place.city].filter(Boolean).join(', ') || locName;
            }
            setUserLocation(locName);

            // Send GPS to backend
            await fetch(`${API_URL}/api/attendance/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: user?.id,
                latitude: loc.coords.latitude.toString(),
                longitude: loc.coords.longitude.toString(),
                location_name: locName
              })
            });
          }
        } catch(err) {
          console.error('Location error:', err);
        }
      }
    };

    const handleValidation = (data: any) => {
        if (user && user.id && data.receiver_id === user.id) {
            const statusMsg = data.approval_status === 'APPROVED' ? 'Telah Disetujui' : `Ditolak: ${data.rejection_reason}`;
            Alert.alert('Validasi Absensi', `Absensi Anda ${statusMsg}`);
        }
    };

    socket.on('ATTENDANCE_SUCCESS', handleNewAttendance);
    socket.on('ATTENDANCE_VALIDATION', handleValidation);

    return () => {
      socket.off('ATTENDANCE_SUCCESS', handleNewAttendance);
      socket.off('ATTENDANCE_VALIDATION', handleValidation);
    };
  }, [socket, user]);

  const [attendanceData, setAttendanceData] = useState<any[]>([
    { subject: 'Pemrograman Web', attendance: 85, total: 12, attended: 10 },
    { subject: 'Kecerdasan Buatan', attendance: 92, total: 12, attended: 11 },
    { subject: 'Mobile Programming', attendance: 78, total: 12, attended: 9 },
  ]);
  const [statsLastUpdated, setStatsLastUpdated] = useState<Date>(new Date());

  const fetchStats = async () => {
    if (!user || !user.id) return;
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/dashboard/stats/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        setHasScannedToday(data.data.alreadyScannedToday);
        if (data.data.stats && Array.isArray(data.data.stats)) {
          setAttendanceData(data.data.stats);
        }
        setStatsLastUpdated(new Date());
      }
    } catch (error) {
      console.log('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh setiap 30 detik
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleScan = () => {
    navigation.navigate('Scan');
  };

  const handleJadwal = () => {
    navigation.navigate('Jadwal');
  };

  const handleNotification = () => {
    navigation.navigate('Notification');
  };

  const handleESP32Camera = () => {
    navigation.navigate('ESP32Camera');
  };

  return (
    <AnimatedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={[styles.headerContainer, { paddingTop: Platform.OS === 'web' ? 40 : Math.max(insets.top, 50) + 10 }]}>
          <View style={styles.topRow}>
            <View style={styles.greetingBox}>
              <Text style={[styles.subGreeting, { color: tokens.subTextColor }]}>
                Selamat datang kembali,
              </Text>
              <Text style={[styles.greeting, { color: tokens.textColor }]} numberOfLines={1}>
                Halo, {firstName} 👋
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={[styles.notifBtn, { backgroundColor: tokens.iconButtonBg }]} 
                onPress={() => navigation.navigate('LaporanMasalah')}
              >
                <AlertTriangle color="#FBBF24" size={22} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.notifBtn, { backgroundColor: tokens.iconButtonBg }]} onPress={handleNotification}>
                <Bell color={isLightTheme ? '#374151' : '#fff'} size={22} />
                <View style={styles.notifDot} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={[styles.statusCard, { borderWidth: 1, borderColor: tokens.borderColor, backgroundColor: tokens.cardBg }]}>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: tokens.textColor }]}>Status Hari Ini</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.pulseDot, hasScannedToday && { backgroundColor: '#10B981' }]} />
              <Text style={[styles.statusBadgeText, hasScannedToday && { color: '#10B981' }]}>
                {hasScannedToday ? 'Sudah Absen' : 'Belum Absen'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: tokens.borderColor }]} />

          <View style={styles.statusDetails}>
            <View style={styles.detailItem}>
              {userLocation ? <MapPin color="#38BDF8" size={16} /> : <CheckCircle2 color="#4ADE80" size={16} />}
              <Text style={[styles.detailText, { color: tokens.subTextColor }]}>{userLocation || 'Tepat Waktu'}</Text>
            </View>
            <Text style={[styles.detailValue, { color: tokens.textColor }]}>{userLocation ? '' : '0%'}</Text>
          </View>
        </View>

        {/* Real-time Attendance Photo */}
        {lastAttendancePhoto && (
          <View style={styles.photoContainer}>
            <Text style={[styles.sectionTitle, { color: tokens.textColor, marginBottom: 10 }]}>Foto Kehadiran Terakhir</Text>
            <Image 
              source={{ uri: `${API_URL}/uploads/${lastAttendancePhoto}` }} 
              style={styles.attendancePhoto} 
            />
          </View>
        )}

        {/* Main Menu */}
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]} 
            onPress={handleScan}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
              <Camera color={isLightTheme ? themePrimary : "#60A5FA"} size={26} />
            </View>
            <Text style={[styles.menuLabel, { color: tokens.textColor }]}>Scan Wajah</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]} 
            onPress={handleJadwal}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
              <Calendar color={isLightTheme ? themePrimary : "#A78BFA"} size={26} />
            </View>
            <Text style={[styles.menuLabel, { color: tokens.textColor }]}>Jadwal</Text>
          </TouchableOpacity>
        </View>

        {/* Attendance Statistics */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>Statistik Absensi</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveText, { color: '#10B981' }]}>
              {statsLastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View style={[styles.chartWrapper, { borderColor: tokens.borderColor, backgroundColor: tokens.cardBg }]}>
          <AttendanceChart data={attendanceData} />
        </View>
      </ScrollView>

      <ReportIssueModal 
        visible={showReportModal} 
        onClose={() => setShowReportModal(false)} 
      />

      {/* Premium Attendance Success Popup */}
      <AppModal 
        visible={!!attendanceSuccess} 
        onClose={() => setAttendanceSuccess(null)}
        title="Validasi AI Berhasil"
      >
        {attendanceSuccess && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <CheckCircle2 size={50} color="#10B981" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: tokens.textColor, marginBottom: 8 }}>Absensi Berhasil</Text>
            
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <RealtimeIndicator label="AI Verified" color="#10B981" />
              {attendanceSuccess.confidence && (
                <AIConfidenceBadge confidence={attendanceSuccess.confidence} />
              )}
            </View>

            <View style={{ width: '100%', gap: 12, backgroundColor: isLightTheme ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: tokens.subTextColor }}>Waktu</Text>
                <Text style={{ color: tokens.textColor, fontWeight: 'bold' }}>
                  {new Date(attendanceSuccess.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: tokens.subTextColor }}>Lokasi</Text>
                <Text style={{ color: tokens.textColor, fontWeight: 'bold' }}>{userLocation || 'Gedung TI'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: tokens.subTextColor }}>Status AI</Text>
                <StatusBadge status={attendanceSuccess.approval_status || 'APPROVED'} size="small" />
              </View>
            </View>

            <TouchableOpacity 
              style={{ width: '100%', backgroundColor: '#10B981', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 }}
              onPress={() => setAttendanceSuccess(null)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Tutup</Text>
            </TouchableOpacity>
          </View>
        )}
      </AppModal>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingBottom: 120,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingBox: {
    flex: 1,
    paddingRight: 16,
  },
  subGreeting: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notifDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  statusCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  statusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  statusBadgeText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  statusDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuItem: {
    width: (width - 55) / 2,
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartWrapper: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 30,
    overflow: 'hidden',
  },
  photoContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  attendancePhoto: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    resizeMode: 'cover',
  },
});