import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Modal, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Clock, FileDown, FileSpreadsheet, Scan, MessageSquare, CheckSquare, Users, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { API_URL } from '../../constants/Config';

export default function DosenDetailSesiScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { tokens, isLightTheme } = useTheme();
  const { socket } = useSocket();

  const { scheduleItem } = route.params || { scheduleItem: { id: 1, subject: 'Pemrograman Web 2', class_name: 'IF-4A', ruang: 'Lab Komputer 1' } };

  const [students, setStudents] = useState<any[]>([]);
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
          id: student.id || student.user_id || index, 
          name: student.nama || "Unknown", 
          status: 'BELUM HADIR',
          nomor_ortu: student.no_wa_ortu || "6285775607738", 
        }));
        setStudents(formatted);
      }
    } catch (error) { 
      setStudents([
        { id: '1', name: 'Rian Hidayat', status: 'BELUM HADIR', nomor_ortu: '6281234567890' },
        { id: '2', name: 'Lestari Putri', status: 'BELUM HADIR', nomor_ortu: '6281234567891' },
        { id: '3', name: 'Andi Wijaya', status: 'HADIR', nomor_ortu: '6281234567892' },
        { id: '4', name: 'Dewi Lestari', status: 'BELUM HADIR', nomor_ortu: '6281234567893' },
        { id: '5', name: 'Bambang Pamungkas', status: 'BELUM HADIR', nomor_ortu: '6281234567894' },
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

  // 🔴 PERBAIKAN LOGIKA TOMBOL SCAN (SEKARANG BISA AKTIF TERUS DAN DIHENTIKAN MANUAL)
  const fetchRealtimeScan = async () => {
    // Jika tombol sedang aktif (merah), maka matikan pemindaian saat diklik
    if (isScanning) {
      setIsScanning(false);
      showToast("🛑 Pemindaian IoT dihentikan oleh Dosen.");
      return;
    }

    // Jika sedang mati (biru), maka mulai pemindaian
    try {
      setIsScanning(true);
      showToast("📡 Mengaktifkan sensor kamera IoT...");
      
      const response = await fetch(`${API_URL}/iot/trigger-scan`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jadwal_id: scheduleItem.id })
      });
      const data = await response.json();
      
      // Catatan: isScanning TIDAK LAGI DI-FALSE-KAN DISINI. Biarkan tombol tetap menyala.
      if (data.status === 'success') {
        showToast("📸 Kamera kelas aktif! Silakan mahasiswa menghadap ke sensor...");
      } else if (data.status === 'simulation') {
        showToast("💡 Alat fisik terputus. Menjalankan mode uji coba simulasi...");
      }
    } catch (error) {
      setIsScanning(false);
      showToast("❌ Gagal terhubung ke gateway server.");
    }
  };

  const allowManualScan = (studentId: any, studentName: string) => {
    setStudents(prev => prev.map(s => String(s.id) === String(studentId) ? { ...s, status: 'HADIR' } : s));
    showToast(`🔹 Status ${studentName} diubah menjadi HADIR secara manual.`);
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

            {/* 🔴 PERBAIKAN TAMPILAN TOMBOL SCAN */}
            <TouchableOpacity 
              style={[
                styles.primaryScanButton, 
                isScanning && { backgroundColor: '#EF4444', shadowColor: '#EF4444' } // Tombol jadi merah saat aktif
              ]} 
              onPress={fetchRealtimeScan}
            >
              <Scan size={20} color="#FFFFFF" />
              <Text style={styles.primaryScanButtonText}>
                {isScanning ? 'Hentikan Pemindaian' : 'Trigger IoT Scan'}
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
                  
                  <TouchableOpacity 
                    onPress={() => allowManualScan(student.id, student.name)} 
                    disabled={isHadir}
                    style={[styles.iconButtonWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }, isHadir && { opacity: 0.25 }]}
                  >
                    <CheckSquare size={18} color="#60A5FA" />
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