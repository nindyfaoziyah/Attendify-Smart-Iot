import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { API_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../context/SocketContext';
import AnimatedBackground from '../components/ui/AnimatedBackground';

export default function DosenDailyReportScreen() {
  const navigation = useNavigation();
  const { isLightTheme, tokens } = useTheme();
  const { socket } = useSocket();
  const [reports, setReports] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [classId, setClassId] = useState('1'); // Mock class id, should ideally come from a dropdown of classes Dosen teaches
  const [totalPresent, setTotalPresent] = useState('0');
  const [totalLate, setTotalLate] = useState('0');
  const [totalAbsent, setTotalAbsent] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReports = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/dosen/reports/daily`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data?.status === 'success') {
        setReports(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports', error);
    }
  };

  useEffect(() => {
    fetchReports();

    if (socket) {
      socket.on('REPORT_STATUS_UPDATE', () => {
        fetchReports();
      });
    }

    return () => {
      if (socket) {
        socket.off('REPORT_STATUS_UPDATE');
      }
    };
  }, [socket]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchReports().then(() => setRefreshing(false));
  }, []);

  const handleSubmit = async () => {
    if (!totalPresent || !totalLate || !totalAbsent) {
      Alert.alert('Error', 'Harap isi semua data kehadiran.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const present = parseInt(totalPresent) || 0;
      const late = parseInt(totalLate) || 0;
      const absent = parseInt(totalAbsent) || 0;
      const total = present + late + absent;
      const percentage = total > 0 ? ((present + late) / total) * 100 : 0;

      const payload = {
        class_id: classId,
        report_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        total_present: present,
        total_late: late,
        total_absent: absent,
        attendance_percentage: percentage,
        notes
      };
      
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/reports/daily`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data?.status === 'success') {
        Alert.alert('Sukses', 'Laporan harian berhasil dikirim!');
        setTotalPresent('0');
        setTotalLate('0');
        setTotalAbsent('0');
        setNotes('');
        fetchReports();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengirim laporan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'APPROVED': return { color: Colors.ai.success, text: 'Disetujui', icon: <CheckCircle size={14} color="#FFF" /> };
      case 'REJECTED': return { color: Colors.ai.error, text: 'Ditolak', icon: <XCircle size={14} color="#FFF" /> };
      default: return { color: Colors.ai.warning, text: 'Menunggu', icon: <AlertCircle size={14} color="#FFF" /> };
    }
  };

  return (
    <AnimatedBackground style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: tokens.borderColor }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={tokens.textColor} size={28} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Laporan Absensi Harian</Text>
          <View style={{ width: 40 }} />
        </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Form Section */}
        <View style={[styles.formCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>Buat Laporan Baru</Text>
          
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: tokens.textColor }]}>Total Hadir</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tokens.inputBg, color: tokens.textColor }]}
                keyboardType="numeric"
                value={totalPresent}
                onChangeText={setTotalPresent}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: tokens.textColor }]}>Terlambat</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tokens.inputBg, color: tokens.textColor }]}
                keyboardType="numeric"
                value={totalLate}
                onChangeText={setTotalLate}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: tokens.textColor }]}>Tidak Hadir</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tokens.inputBg, color: tokens.textColor }]}
                keyboardType="numeric"
                value={totalAbsent}
                onChangeText={setTotalAbsent}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: tokens.textColor, marginTop: 12 }]}>Catatan Tambahan (Opsional)</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: tokens.inputBg, color: tokens.textColor }]}
            placeholder="Ketik catatan di sini..."
            placeholderTextColor={tokens.subTextColor}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity style={[styles.submitButton, { backgroundColor: Colors.ai.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleSubmit} disabled={isSubmitting}>
            <Send color="#FFF" size={20} />
            <Text style={styles.submitButtonText}>{isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}</Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        <Text style={[styles.historyTitle, { color: tokens.textColor }]}>Riwayat Laporan Harian Anda</Text>
        
        {reports.length === 0 ? (
          <View style={[styles.historyCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor, paddingVertical: 40, alignItems: 'center' }]}>
            <Text style={[styles.emptyText, { color: tokens.subTextColor, marginTop: 0 }]}>Belum ada laporan.</Text>
          </View>
        ) : (
          reports.map((item, index) => {
            const badge = getStatusBadge(item.status);
            return (
              <View key={index} style={[styles.historyCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyItemTitle, { color: tokens.textColor }]}>
                    {new Date(item.report_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: badge.color }]}>
                    {badge.icon}
                    <Text style={styles.badgeText}>{badge.text}</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <Text style={[styles.statText, { color: Colors.ai.success }]}>Hadir: {item.total_present}</Text>
                  <Text style={[styles.statText, { color: Colors.ai.warning }]}>Telat: {item.total_late}</Text>
                  <Text style={[styles.statText, { color: Colors.ai.error }]}>Absen: {item.total_absent}</Text>
                </View>
                <Text style={[styles.historyDate, { color: tokens.subTextColor, marginTop: 8 }]}>
                  Dikirim: {new Date(item.created_at).toLocaleString('id-ID')}
                </Text>
                
                {item.status === 'REJECTED' && item.rejection_reason && (
                  <View style={styles.rejectionBox}>
                    <Text style={styles.rejectionText}><Text style={{fontWeight: 'bold'}}>Alasan Penolakan:</Text> {item.rejection_reason}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
      </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  formCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  historyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  emptyText: { textAlign: 'center', marginTop: 20 },
  historyCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemTitle: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  statText: { fontSize: 12, fontWeight: '600' },
  historyDate: { fontSize: 12 },
  rejectionBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.ai.error,
  },
  rejectionText: { color: Colors.ai.error, fontSize: 12 }
});
