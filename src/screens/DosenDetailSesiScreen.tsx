import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Modal, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Clock, FileDown, FileSpreadsheet, MessageSquare, Users, AlertTriangle, CheckCircle, ShieldCheck, ShieldOff } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../constants/Config';

export default function DosenDetailSesiScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { tokens, isLightTheme } = useTheme();
  const { socket } = useSocket();

  const { scheduleItem } = route.params || { scheduleItem: { id: 1, subject: 'Pemrograman Web 2', class_name: 'IF-4A', ruang: 'Lab Komputer 1' } };

  const [students, setStudents] = useState<any[]>([]);
  const [isGrantingAll, setIsGrantingAll] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(15);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    startSession();
    const interval = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewAttendance = (data: any) => {
      setStudents(prev => prev.map(s => 
        (s.name === data.name || s.id === data.user_id) ? { ...s, status: 'HADIR' } : s
      ));
      showToast(`✨ ${data.name || 'Mahasiswa'} terdeteksi hadir via IoT!`);
    };
    socket.on('new_attendance', handleNewAttendance);
    return () => { socket.off('new_attendance', handleNewAttendance); };
  }, [socket]);

  const startSession = async () => {
    try {
      const response = await fetch(`${API_URL}/kelas/${scheduleItem.kelas_id}/mahasiswa`);
      const data = await response.json();
      if (data?.students && Array.isArray(data.students)) {
        const formatted = data.students.map((student: any, index: number) => ({
          id: student.id_user || student.id || student.user_id || index, 
          name: student.nama || "Unknown", 
          status: 'BELUM HADIR',
          nomor_ortu: student.no_wa_ortu || "6285775607738",
          scanPermission: !!student.scanPermission,
        }));
        setStudents(formatted);
      }
    } catch (error) { 
      setStudents([
        { id: '6', name: 'Rian Hidayat', status: 'BELUM HADIR', nomor_ortu: '6281234567890', scanPermission: false },
        { id: '7', name: 'Lestari Putri', status: 'BELUM HADIR', nomor_ortu: '6281234567891', scanPermission: false },
        { id: '8', name: 'Andi Wijaya', status: 'HADIR', nomor_ortu: '6281234567892', scanPermission: false },
        { id: '9', name: 'Dewi Lestari', status: 'BELUM HADIR', nomor_ortu: '6281234567893', scanPermission: false },
        { id: '10', name: 'Bambang Pamungkas', status: 'BELUM HADIR', nomor_ortu: '6281234567894', scanPermission: false },
      ]);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleExportPDF = async () => {
    try {
      showToast("📄 Memproses dokumen PDF... Mohon tunggu.");
      const pdfUrl = `${API_URL}/reports/pdf?jadwal_id=${scheduleItem.id}`;
      await Linking.openURL(pdfUrl);
    } catch (error) {
      showToast("❌ Gagal mengunduh berkas PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      showToast("📊 Memproses spreadsheet Excel... Mohon tunggu.");
      const excelUrl = `${API_URL}/reports/excel?jadwal_id=${scheduleItem.id}`;
      await Linking.openURL(excelUrl);
    } catch (error) {
      showToast("❌ Gagal mengunduh berkas Excel.");
    }
  };

  // Toggle izin scan manual untuk semua mahasiswa
  const toggleManualScanAll = async () => {
    if (isGrantingAll) return;
    
    // Jika ada minimal satu yang punya permission, kita anggap sedang aktif dan mau dinonaktifkan
    const hasActivePermission = students.some(s => s.scanPermission);
    
    if (hasActivePermission) {
      // Nonaktifkan di database
      await disableAllScan();
    } else {
      // Aktifkan
      await allowAllScan();
    }
  };

  // Matikan izin scan manual untuk semua mahasiswa di database
  const disableAllScan = async () => {
    setIsGrantingAll(true);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      let count = 0;
      for (const student of students) {
        // Hapus pengecekan lokal (!student.scanPermission) agar backend dipaksa mematikan semua
        try {
          const res = await fetch(`${API_URL}/manual-scan/disable`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ user_id: student.id }),
          });
          const d = await res.json();
          if (d.status === 'success') count++;
        } catch {}
      }
      setStudents(prev => prev.map(s => ({ ...s, scanPermission: false })));
      showToast('🛑 Scan manual mahasiswa dinonaktifkan.');
    } catch (error) {
      showToast('❌ Gagal menonaktifkan scan manual');
    } finally {
      setIsGrantingAll(false);
    }
  };  // Izinkan mahasiswa tertentu untuk scan manual (memanggil API real)
  // Toggle izin scan manual untuk satu mahasiswa tertentu (memanggil API real)
  const toggleIndividualScan = async (studentId: any, studentName: string, currentlyAllowed: boolean) => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const endpoint = currentlyAllowed ? `${API_URL}/manual-scan/disable` : `${API_URL}/manual-scan/allow`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: studentId }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStudents(prev => prev.map(s =>
          String(s.id) === String(studentId) ? { ...s, scanPermission: !currentlyAllowed } : s
        ));
        showToast(currentlyAllowed 
          ? `🛑 Izin scan dicabut untuk ${studentName}`
          : `✅ Izin scan diberikan ke ${studentName} (5 menit)`
        );
      } else {
        showToast(`❌ Gagal: ${data.message || 'Tidak dapat memproses'}`);
      }
    } catch (error) {
      showToast(`❌ Error: Gagal terhubung ke server`);
    }
  };

  // Izinkan semua mahasiswa yang belum hadir untuk scan manual
  const allowAllScan = async () => {
    const belumHadir = students.filter(s => s.status !== 'HADIR');
    if (belumHadir.length === 0) {
      showToast('✅ Semua mahasiswa sudah hadir!');
      return;
    }
    setIsGrantingAll(true);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      let count = 0;
      for (const student of belumHadir) {
        try {
          const res = await fetch(`${API_URL}/manual-scan/allow`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ user_id: student.id }),
          });
          const d = await res.json();
          if (d.status === 'success') count++;
        } catch {}
      }
      setStudents(prev => prev.map(s =>
        s.status !== 'HADIR' ? { ...s, scanPermission: true } : s
      ));
      showToast(`✅ Izin scan diberikan ke ${count}/${belumHadir.length} mahasiswa (5 menit)`);
    } catch (error) {
      showToast('❌ Gagal memberi izin ke semua mahasiswa');
    } finally {
      setIsGrantingAll(false);
    }
  };

  const sendIndividualReport = (student: any) => {
    const pesan = `*LAPORAN KEHADIRAN MAHASISWA - ATTENDIFY*

Yth. Orang Tua/Wali dari *${student.name}*,

Menginformasikan bahwa putra/putri Bapak/Ibu pada mata kuliah berikut:

• *Mata Kuliah:* ${scheduleItem.subject}
• *Kelas/Prodi:* ${scheduleItem.class_name || 'IF-4A'}
• *Ruangan:* ${scheduleItem.ruang || 'Lab Komputer 1'}
• *Status Presensi:* *${student.status}*

Laporan lengkap kelas ini dapat dilihat pada PDF berikut:
${API_URL}/reports/pdf?jadwal_id=${scheduleItem.id}

Terima kasih atas perhatian Anda.`;
    
    showToast(`💬 Membuka WhatsApp untuk ${student.name}...`);
    
    const waUrl = `https://api.whatsapp.com/send?phone=${student.nomor_ortu}&text=${encodeURIComponent(pesan)}`;
    
    if (Platform.OS === 'web') {
      window.open(waUrl, '_blank');
    } else {
      Linking.canOpenURL(waUrl)
        .then((supported) => {
          if (supported) return Linking.openURL(waUrl);
          showToast("❌ Aplikasi WhatsApp tidak terpasang.");
        })
        .catch(() => showToast("❌ Gagal membuka WhatsApp."));
    }
  };

  const confirmFinishSession = () => {
    setIsConfirmVisible(false);
    navigation.goBack();
  };

  const totalHadir = students.filter(s => s.status === 'HADIR').length;

  return (
    <View style={styles.container}>
      <AnimatedBackground style={styles.background}>
        
        {toastMessage && (
          <View style={styles.toastWrapper}>
            <BlurView intensity={60} tint="light" style={styles.toastBlur}>
              <CheckCircle size={18} color="#10B981" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </BlurView>
          </View>
        )}

        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Ruang Kelas Presensi</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <BlurView intensity={30} tint="dark" style={styles.mainGlassCard}>
            <Text style={styles.subjectText}>{scheduleItem.subject}</Text>
            <Text style={styles.subSubjectText}>{scheduleItem.class_name || 'IF-4A'} • Ruang: {scheduleItem.ruang || 'Lab 1'}</Text>
            
            <View style={styles.timerRow}>
              <Clock size={16} color="#60A5FA" />
              <Text style={styles.timerText}>Durasi Sesi Berjalan: <Text style={{fontWeight: 'bold', color: '#60A5FA'}}>{sessionDuration}s</Text></Text>
            </View>

            {/* Tombol utama: Izinkan Semua Scan Manual */}
            <TouchableOpacity 
              style={[
                styles.primaryScanButton, 
                students.some(s => s.scanPermission) && { backgroundColor: '#EF4444', shadowColor: '#EF4444' }
              ]} 
              onPress={toggleManualScanAll}
              disabled={isGrantingAll}
            >
              <ShieldCheck size={20} color="#FFFFFF" />
              <Text style={styles.primaryScanButtonText}>
                {isGrantingAll
                  ? 'Memproses...'
                  : students.some(s => s.scanPermission)
                  ? 'Nonaktifkan Scan Manual (Semua)'
                  : 'Izinkan Scan Manual (Semua)'}
              </Text>
            </TouchableOpacity>
            <View style={styles.exportSection}>
              <Text style={styles.sectionSubHeading}>Unduh Dokumen Berkas</Text>
              <View style={styles.exportGrid}>
                <TouchableOpacity style={[styles.exportBtn, styles.pdfColor]} onPress={handleExportPDF}>
                  <FileDown size={18} color="#EF4444" />
                  <Text style={[styles.exportBtnText, {color: '#FCA5A5'}]}>Export PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportBtn, styles.excelColor]} onPress={handleExportExcel}>
                  <FileSpreadsheet size={18} color="#10B981" />
                  <Text style={[styles.exportBtnText, {color: '#A7F3D0'}]}>Export Excel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>

          <View style={styles.listSectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Users size={16} color="#94A3B8" />
              <Text style={styles.listTitle}>Daftar Mahasiswa Kelas</Text>
            </View>
            <Text style={styles.counterText}>{totalHadir}/{students.length} Hadir</Text>
          </View>

          {students.map((student) => {
            const isHadir = student.status === 'HADIR';
            return (
              <View key={student.id} style={styles.studentItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <View style={[styles.badgeContainer, isHadir ? styles.badgeHadir : styles.badgeBelum]}>
                    <Text style={[styles.badgeText, isHadir ? { color: '#34D399' } : { color: '#FCA5A5' }]}>
                      {student.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRowContainer}>
                  <TouchableOpacity 
                    onPress={() => sendIndividualReport(student)} 
                    style={[styles.iconButtonWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}
                  >
                    <MessageSquare size={18} color="#34D399" />
                  </TouchableOpacity>
                  
                  {/* Tombol Izinkan Scan Manual per-mahasiswa */}
                  <TouchableOpacity 
                    onPress={() => toggleIndividualScan(student.id, student.name, !!student.scanPermission)} 
                    disabled={isHadir}
                    style={[
                      styles.iconButtonWrapper,
                      student.scanPermission
                        ? { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' }
                        : { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
                      isHadir && { opacity: 0.25 }
                    ]}
                  >
                    {student.scanPermission
                      ? <ShieldCheck size={18} color="#10B981" />
                      : <ShieldOff size={18} color="#60A5FA" />
                    }
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity style={styles.dangerCloseButton} onPress={() => setIsConfirmVisible(true)}>
            <Text style={styles.dangerCloseButtonText}>Selesaikan Sesi Kelas</Text>
          </TouchableOpacity>

        </ScrollView>

        <Modal animationType="fade" transparent={true} visible={isConfirmVisible} onRequestClose={() => setIsConfirmVisible(false)}>
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint="dark" style={styles.modalBlurBackground}>
              <View style={styles.modalCard}>
                <View style={styles.alertIconCircle}>
                  <AlertTriangle size={28} color="#FBBF24" />
                </View>
                <Text style={styles.modalTitle}>Selesaikan Sesi?</Text>
                <Text style={styles.modalDescription}>Apakah Anda yakin ingin mengakhiri kelas ini? Seluruh data rekap presensi mahasiswa akan langsung disimpan ke database.</Text>
                <View style={styles.modalActionRow}>
                  <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIsConfirmVisible(false)}>
                    <Text style={styles.cancelModalBtnText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmModalBtn} onPress={confirmFinishSession}>
                    <Text style={styles.confirmModalBtnText}>Ya, Selesai</Text>
                  </TouchableOpacity>
                </View>
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
  topBar: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backButton: { padding: 10, borderRadius: 50, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' },
  topBarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 60 },
  mainGlassCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 10 },
  subjectText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subSubjectText: { color: '#94A3B8', fontSize: 14, marginTop: 4, fontWeight: '500' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'flex-start' },
  timerText: { color: '#CBD5E1', fontSize: 13 },
  primaryScanButton: { backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 16, marginTop: 20, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  primaryScanButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  allowAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 13, borderRadius: 16, marginTop: 10, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  allowAllButtonText: { color: '#10B981', fontSize: 14, fontWeight: '700' },
  exportSection: { marginTop: 22, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingTop: 15 },
  sectionSubHeading: { color: '#64748B', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  exportGrid: { flexDirection: 'row', gap: 12 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1, cursor: 'pointer' },
  pdfColor: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  excelColor: { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  exportBtnText: { fontSize: 13, fontWeight: '600' },
  listSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 12, paddingHorizontal: 4 },
  listTitle: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  counterText: { color: '#60A5FA', fontSize: 13, fontWeight: '700', backgroundColor: 'rgba(96, 165, 250, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  studentItemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  studentName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  badgeContainer: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6 },
  badgeHadir: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  badgeBelum: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  actionRowContainer: { flexDirection: 'row', gap: 10 },
  iconButtonWrapper: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  dangerCloseButton: { marginTop: 25, paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.06)', cursor: 'pointer' },
  dangerCloseButtonText: { color: '#FCA5A5', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBlurBackground: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { width: '85%', maxWidth: 360, backgroundColor: '#1E293B', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  alertIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalDescription: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', cursor: 'pointer' },
  cancelModalBtnText: { color: '#94A3B8', fontWeight: '600', fontSize: 14 },
  confirmModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#EF4444', cursor: 'pointer' },
  confirmModalBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  toastWrapper: { position: 'absolute', top: 30, left: '5%', right: '5%', zIndex: 9999, alignItems: 'center', justifyContent: 'center' },
  toastBlur: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255, 255, 255, 0.93)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.6)' },
  toastText: { color: '#0F172A', fontSize: 13, fontWeight: '600' }
});