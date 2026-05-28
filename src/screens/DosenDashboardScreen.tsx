import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { API_URL } from '../../constants/Config';
import { Bell, FileText, AlertTriangle, ArrowRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { BlurView } from 'expo-blur';
import ReportIssueModal from '../components/ReportIssueModal';
import { useAuth } from '../context/AuthContext';

export default function DosenDashboardScreen() {
  const navigation = useNavigation<any>();
  const { tokens, isLightTheme } = useTheme();
  const { user } = useAuth();
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [iotOnline, setIotOnline] = useState(false);
  const [namaDosen, setNamaDosen] = useState(user?.fullName || "Bapak/Ibu Dosen");

  // Get real user ID from context. If missing, it will fetch without ID (preventing wrong schedules)
  const dosenId = user?.id; 

  useEffect(() => {
    // Sync name if context updates later
    if (user?.fullName) setNamaDosen(user.fullName);
    
    if (dosenId) {
        fetchSchedules();
    }
    checkIotStatus();
    const interval = setInterval(() => {
      checkIotStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, dosenId]);

  const fetchSchedules = async () => {
    try {
      const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
      const currentDay = days[new Date().getDay()];

      const response = await fetch(`${API_URL}/jadwal?dosen_id=${dosenId}&hari=${currentDay}`);
      const data = await response.json();
      if (data?.data && Array.isArray(data.data)) {
        setSchedules(data.data);
      }
    } catch (error) { console.log('FETCH JADWAL ERROR'); }
  };

  const checkIotStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/test`);
      const data = await response.json();
      setIotOnline(!!data?.success);
    } catch (error) { setIotOnline(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} />
      <AnimatedBackground style={styles.background}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {/* HEADER UTAMA */}
          <View style={styles.topHeader}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.headerSub, { color: tokens.subTextColor }]}>Selamat datang,</Text>
                <Text style={[styles.headerTitle, { color: tokens.textColor }]} numberOfLines={1}>{namaDosen}</Text>
                
                {/* Status IoT Minimalis */}
                <View style={styles.iotPill}>
                  <View style={[styles.iotDot, { backgroundColor: iotOnline ? '#4ADE80' : '#EF4444' }]} />
                  <Text style={[styles.iotText, { color: iotOnline ? '#4ADE80' : '#EF4444' }]}>
                    Kamera IoT {iotOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.actionHeader}>
                <TouchableOpacity style={[styles.reportBtn, { borderColor: isLightTheme ? '#1E4FA8' : '#FBBF24' }]} onPress={() => navigation.navigate('DosenDailyReport')}>
                  <FileText size={16} color={isLightTheme ? '#1E4FA8' : '#FBBF24'} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reportBtn, { borderColor: isLightTheme ? '#EF4444' : '#FCA5A5' }]} onPress={() => setShowReportModal(true)}>
                  <AlertTriangle size={16} color={isLightTheme ? '#EF4444' : '#FCA5A5'} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.notifBtn, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]} onPress={() => navigation.navigate('Notification')}>
                   <Bell size={18} color={tokens.textColor} />
                   <View style={styles.notifBadge} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* DAFTAR JADWAL HARI INI */}
          <View style={styles.scheduleContainer}>
            <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>Jadwal Mengajar Hari Ini</Text>
            
            {schedules.length === 0 ? (
              <View style={[styles.scheduleCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor, alignItems: 'center', paddingVertical: 40 }]}>
                <Text style={{ color: tokens.subTextColor, fontSize: 15, marginTop: 10 }}>Tidak ada jadwal mengajar hari ini.</Text>
              </View>
            ) : (
              schedules.map((item: any) => (
                <BlurView key={item.id} intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.scheduleCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                  <Text style={[styles.subject, { color: tokens.textColor }]}>{item.subject || 'Mata Kuliah'}</Text>
                  <Text style={[styles.meta, { color: tokens.subTextColor }]}>{item.class_name || '-'} | Ruang: {item.ruang || '-'}</Text>
                  <Text style={[styles.time, { color: isLightTheme ? '#1E4FA8' : '#60A5FA' }]}>{(item.jam_mulai || '00:00')} - {(item.jam_selesai || '00:00')}</Text>
                  
                  {/* Tombol ke Ruang Kelas Absensi */}
                  <TouchableOpacity 
                    style={[styles.startBtn, { backgroundColor: isLightTheme ? '#1E4FA8' : '#2563EB' }]} 
                    onPress={() => navigation.navigate('DosenDetailSesi', { scheduleItem: item, namaDosen })}
                  >
                    <Text style={styles.startBtnText}>Masuk Sesi Kelas</Text>
                    <ArrowRight size={16} color="white" />
                  </TouchableOpacity>
                </BlurView>
              ))
            )}
          </View>

        </ScrollView>
        
        {/* 🌟 PERBAIKAN: Modal hanya dirender jika showReportModal bernilai true */}
        {showReportModal && (
          <ReportIssueModal visible={showReportModal} onClose={() => setShowReportModal(false)} />
        )}
        
      </AnimatedBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  background: { flex: 1 }, 
  scroll: { paddingBottom: 50 },
  topHeader: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 20 },
  
  /* 🌟 PERBAIKAN: Position relative dan zIndex yang ditinggikan agar bisa diklik */
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 9999,
    elevation: 99
  },
  actionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    position: 'relative',
    zIndex: 9999,
    elevation: 99
  },
  
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 }, 
  headerSub: { fontSize: 13 },
  iotPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  iotDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  iotText: { fontSize: 11, fontWeight: 'bold' },
  notifBtn: { padding: 8, borderRadius: 10, position: 'relative', borderWidth: 1 },
  notifBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, backgroundColor: '#EF4444', borderRadius: 4, borderWidth: 1, borderColor: '#1E293B' },
  reportBtn: { borderWidth: 1, padding: 8, borderRadius: 10 },
  scheduleContainer: { paddingHorizontal: 20 }, 
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  scheduleCard: { padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1 },
  subject: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 }, 
  meta: { fontSize: 13, marginBottom: 4 },
  time: { fontWeight: 'bold', fontSize: 14, marginBottom: 15 },
  startBtn: { padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});