import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, RefreshControl, Image, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Image as ImageIcon, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { API_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../context/SocketContext';
import AnimatedBackground from '../components/ui/AnimatedBackground';

export default function LaporanMasalahScreen() {
  const navigation = useNavigation();
  const { isLightTheme, tokens } = useTheme();
  const { socket } = useSocket();
  const [reports, setReports] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReports = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/reports/mahasiswa/me`, {
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
      socket.on('REPORT_STATUS_UPDATE', (data) => {
        // Find if the report belongs to this user (we could check receiver_id from data but let's just refresh)
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
    if (!title || !description || !category || !location) {
      if (Platform.OS === 'web') {
        window.alert('Harap isi semua field wajib.');
      } else {
        Alert.alert('Error', 'Harap isi semua field wajib.');
      }
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        title,
        description,
        category,
        location,
        image: null // Implement image picker if needed
      };
      
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/reports/mahasiswa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data?.status === 'success') {
        if (Platform.OS === 'web') {
          window.alert('Laporan berhasil dikirim!');
        } else {
          Alert.alert('Sukses', 'Laporan berhasil dikirim!');
        }
        setTitle('');
        setDescription('');
        setCategory('');
        setLocation('');
        fetchReports();
      } else {
        throw new Error(data?.message || 'Gagal mengirim laporan');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Gagal mengirim laporan');
      } else {
        Alert.alert('Error', error.message || 'Gagal mengirim laporan');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (approvalStatus: string) => {
    switch(approvalStatus) {
      case 'APPROVED': return { color: Colors.ai.success, text: 'Disetujui', icon: <CheckCircle size={14} color="#FFF" /> };
      case 'REJECTED': return { color: Colors.ai.error, text: 'Ditolak', icon: <XCircle size={14} color="#FFF" /> };
      case 'IN_PROGRESS': return { color: Colors.ai.secondary, text: 'Diproses', icon: <Clock size={14} color="#FFF" /> };
      default: return { color: Colors.ai.warning, text: 'Menunggu', icon: <AlertCircle size={14} color="#FFF" /> };
    }
  };

  return (
    <AnimatedBackground style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: tokens.cardBg, borderBottomColor: tokens.borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={tokens.textColor} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Laporan Masalah</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Form Section */}
        <View style={[styles.formCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>Buat Laporan Baru</Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: isLightTheme ? '#F1F5F9' : '#1E293B', color: tokens.textColor }]}
            placeholder="Judul Laporan (Contoh: AC Rusak)"
            placeholderTextColor={isLightTheme ? '#94A3B8' : '#64748B'}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.input, { backgroundColor: isLightTheme ? '#F1F5F9' : '#1E293B', color: tokens.textColor }]}
            placeholder="Kategori (Fasilitas, IoT, dll)"
            placeholderTextColor={isLightTheme ? '#94A3B8' : '#64748B'}
            value={category}
            onChangeText={setCategory}
          />

          <TextInput
            style={[styles.input, { backgroundColor: isLightTheme ? '#F1F5F9' : '#1E293B', color: tokens.textColor }]}
            placeholder="Lokasi (Contoh: Ruang 301)"
            placeholderTextColor={isLightTheme ? '#94A3B8' : '#64748B'}
            value={location}
            onChangeText={setLocation}
          />

          <TextInput
            style={[styles.textArea, { backgroundColor: isLightTheme ? '#F1F5F9' : '#1E293B', color: tokens.textColor }]}
            placeholder="Deskripsikan masalah dengan detail..."
            placeholderTextColor={isLightTheme ? '#94A3B8' : '#64748B'}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={[styles.submitButton, { backgroundColor: Colors.ai.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleSubmit} disabled={isSubmitting}>
            <Send color="#FFF" size={20} />
            <Text style={styles.submitButtonText}>{isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}</Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        <Text style={[styles.historyTitle, { color: tokens.textColor }]}>Riwayat Laporan Anda</Text>
        
        {reports.length === 0 ? (
          <Text style={[styles.emptyText, { color: isLightTheme ? '#64748B' : '#94A3B8' }]}>Belum ada laporan.</Text>
        ) : (
          reports.map((item, index) => {
            const badge = getStatusBadge(item.approval_status);
            return (
              <View key={index} style={[styles.historyCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyItemTitle, { color: tokens.textColor }]}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.color }]}>
                    {badge.icon}
                    <Text style={styles.badgeText}>{badge.text}</Text>
                  </View>
                </View>
                <Text style={[styles.historyCategory, { color: Colors.ai.primary }]}>{item.category} • {item.location}</Text>
                <Text style={[styles.historyDate, { color: isLightTheme ? '#64748B' : '#94A3B8' }]}>
                  {new Date(item.created_at).toLocaleString('id-ID')}
                </Text>
                
                {item.approval_status === 'REJECTED' && item.rejection_reason && (
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
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  formCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 16,
    minHeight: 100,
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
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  historyCategory: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
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
