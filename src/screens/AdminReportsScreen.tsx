import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar, ActivityIndicator,
  RefreshControl, Dimensions, Alert, Platform, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, AlertTriangle, User,
  Clock, CheckCircle, CheckCircle2, MessageSquare, XCircle
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { API_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { useTheme } from '../context/ThemeContext';

import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/ui/StatusBadge';

interface ReportEntry {
  id: number;
  user_id: number;
  role: string;
  title?: string;
  message?: string; // For old compatibility, mapped from description or notes
  status: string;
  approval_status: string;
  rejection_reason?: string;
  created_at: string;
  user_name: string | null;
  type: 'facility' | 'daily'; // To distinguish
  // Extra fields for daily report
  total_present?: number;
  total_late?: number;
  total_absent?: number;
  class_name?: string;
  prodi?: string;
  location?: string;
}

export default function AdminReportsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tokens, isLightTheme } = useTheme();
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'facility' | 'daily'>('facility');
  
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'confirm' | 'error';
    onConfirm?: () => void;
  }>({ visible: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    if (route.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route.params?.tab]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      
      const endpoint = activeTab === 'facility' ? '/admin/reports' : '/admin/reports/daily';
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success') {
        const mappedData = result.data.map((item: any) => ({
          ...item,
          type: activeTab,
          message: activeTab === 'facility' ? item.description : item.notes,
          role: activeTab === 'facility' ? item.sender_role : 'dosen',
          user_name: activeTab === 'facility' ? item.sender_name : item.dosen_name,
          approval_status: item.approval_status || item.status,
          class_name: item.nama_kelas,
          prodi: item.prodi,
          location: item.location
        }));
        setReports(mappedData);
        setError(null);
      } else {
        setError(result.message || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
      setError('Network error. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();

    if (socket) {
      const handleRefresh = () => fetchReports();
      socket.on('NEW_REPORT', handleRefresh);
      socket.on('DAILY_REPORT', handleRefresh);
      
      return () => {
        socket.off('NEW_REPORT', handleRefresh);
        socket.off('DAILY_REPORT', handleRefresh);
      }
    }
  }, [activeTab, socket]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [activeTab]);

  const handleApproval = async (id: number, approval_status: string, rejection_reason?: string) => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const endpoint = activeTab === 'facility' 
        ? `/admin/reports/${id}/status` 
        : `/admin/reports/daily/${id}/status`;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approval_status, rejection_reason, status: approval_status === 'APPROVED' ? 'resolved' : 'pending' })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        setAlertConfig({ visible: true, title: 'Sukses', message: 'Status laporan berhasil diperbarui', type: 'success' });
        fetchReports();
      } else {
        setAlertConfig({ visible: true, title: 'Error', message: result.message || 'Gagal mengubah status', type: 'error' });
      }
    } catch (error) {
      setAlertConfig({ visible: true, title: 'Error', message: 'Terjadi kesalahan jaringan', type: 'error' });
    }
  };

  const confirmApproval = (id: number, approval_status: string) => {
    if (approval_status === 'REJECTED') {
      Alert.prompt('Tolak Laporan', 'Masukkan alasan penolakan:', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Tolak', onPress: (reason) => handleApproval(id, 'REJECTED', reason) }
      ]);
    } else {
      setAlertConfig({
        visible: true,
        title: 'Konfirmasi',
        message: 'Tandai laporan ini sebagai Disetujui?',
        type: 'confirm',
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          handleApproval(id, 'APPROVED');
        }
      });
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const ReportItem = ({ item }: { item: ReportEntry }) => {
    const dt = formatDateTime(item.created_at);
    const isResolved = item.approval_status === 'APPROVED';
    const isRejected = item.approval_status === 'REJECTED';

    return (
      <View style={styles.cardWrapper}>
        <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <View style={[styles.avatarMini, { backgroundColor: isResolved ? '#10B981' : isRejected ? '#EF4444' : Colors.ai.primary }]}>
                <User size={18} color="#fff" />
              </View>
              <View>
                <Text style={[styles.userName, { color: tokens.textColor }]}>{item.user_name || 'Pengguna Tidak Dikenal'}</Text>
                <Text style={[styles.userRole, { color: tokens.subTextColor }]}>{(item.role || '').toUpperCase()}</Text>
              </View>
            </View>
            <StatusBadge status={item.approval_status} size="small" />
          </View>

          <View style={styles.cardBody}>
            {item.title && <Text style={[styles.titleText, { color: tokens.textColor, fontWeight: 'bold', marginBottom: 5 }]}>{item.title}</Text>}
            <Text style={[styles.messageText, { color: tokens.textColor }]}>{item.message}</Text>
            
            {item.type === 'daily' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                 <Text style={{ color: Colors.ai.success, fontSize: 12, fontWeight: '600' }}>Hadir: {item.total_present}</Text>
                 <Text style={{ color: Colors.ai.warning, fontSize: 12, fontWeight: '600' }}>Telat: {item.total_late}</Text>
                 <Text style={{ color: Colors.ai.error, fontSize: 12, fontWeight: '600' }}>Absen: {item.total_absent}</Text>
              </View>
            )}

            {item.type === 'facility' && item.location && (
              <Text style={{ color: tokens.subTextColor, fontSize: 13, marginTop: 10, fontWeight: '500' }}>
                📍 Ruangan: {item.location}
              </Text>
            )}

            {item.type === 'daily' && item.class_name && (
              <Text style={{ color: tokens.subTextColor, fontSize: 13, marginTop: item.total_present !== undefined ? 6 : 10, fontWeight: '500' }}>
                📚 Kelas: {item.class_name} ({item.prodi || 'Tidak diketahui'})
              </Text>
            )}

            <View style={[styles.detailsGrid, { borderTopColor: tokens.borderColor, marginTop: 10 }]}>
              <View style={styles.detailItem}>
                <Clock size={14} color={tokens.subTextColor} />
                <Text style={[styles.detailText, { color: tokens.subTextColor }]}>{dt.date} • {dt.time}</Text>
              </View>
            </View>
            
            {isRejected && item.rejection_reason && (
               <Text style={{ color: Colors.ai.error, marginTop: 10, fontSize: 12 }}>Alasan Ditolak: {item.rejection_reason}</Text>
            )}
          </View>

          {item.approval_status === 'PENDING' && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={[styles.resolveButton, { flex: 1, borderColor: 'rgba(16, 185, 129, 0.3)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]} 
                onPress={() => confirmApproval(item.id, 'APPROVED')}
              >
                <CheckCircle2 size={18} color="#10B981" />
                <Text style={[styles.resolveButtonText, { color: '#10B981' }]}>Setujui</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.resolveButton, { flex: 1, borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]} 
                onPress={() => confirmApproval(item.id, 'REJECTED')}
              >
                <XCircle size={18} color="#EF4444" />
                <Text style={[styles.resolveButtonText, { color: '#EF4444' }]}>Tolak</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      </View>
    );
  };

  return (
    <AnimatedBackground style={styles.container}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={tokens.textColor} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <AlertTriangle size={20} color="#F59E0B" />
          <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Pusat Laporan</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'facility' && { backgroundColor: Colors.ai.primary }]}
          onPress={() => setActiveTab('facility')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'facility' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)' }]}>Masalah Fasilitas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'daily' && { backgroundColor: Colors.ai.primary }]}
          onPress={() => setActiveTab('daily')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'daily' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)' }]}>Harian Dosen</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.ai.primary} />
          <Text style={styles.loadingText}>Memuat laporan...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AlertTriangle size={48} color="#F87171" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReports}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={({ item }) => <ReportItem item={item} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ai.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={64} color={tokens.subTextColor} opacity={0.3} />
              <Text style={[styles.emptyText, { color: tokens.textColor }]}>Tidak Ada Laporan</Text>
            </View>
          }
        />
      )}

      <Modal visible={alertConfig.visible} transparent={true} animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={[styles.alertBox, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
            <Text style={[styles.alertTitle, { color: tokens.textColor }]}>{alertConfig.title}</Text>
            <Text style={[styles.alertMessage, { color: tokens.subTextColor }]}>{alertConfig.message}</Text>
            <View style={styles.alertActionRow}>
              {alertConfig.type === 'confirm' ? (
                <>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: 'transparent' }]} onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}>
                    <Text style={{ color: tokens.subTextColor }}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: Colors.ai.primary }]} onPress={alertConfig.onConfirm}>
                    <Text style={{ color: '#FFF' }}>Setujui</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.alertBtn, { backgroundColor: Colors.ai.primary, width: '100%' }]} onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}>
                  <Text style={{ color: '#FFF' }}>Tutup</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20 },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  headerTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  listContent: { padding: 20, paddingBottom: 40 },
  cardWrapper: { borderRadius: 24, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  card: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarMini: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 16, fontWeight: '700' },
  userRole: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginTop: 2 },
  cardBody: { marginBottom: 16 },
  messageText: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  titleText: { fontSize: 16, fontWeight: 'bold' },
  detailsGrid: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: 1 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12 },
  resolveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  resolveButtonText: { fontWeight: 'bold', fontSize: 14 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16 },
  errorText: { marginTop: 16, fontSize: 16, textAlign: 'center', marginBottom: 24 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.ai.primary },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { flex: 1, height: 400, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 4, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabText: { fontWeight: 'bold', fontSize: 14 },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1 },
  alertTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  alertMessage: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  alertActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  alertBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});
