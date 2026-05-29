import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, Alert, Dimensions, StatusBar, Modal, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import {
  Users, UserCheck, ShieldCheck, Activity,
  Cpu, LayoutDashboard, Settings, LogOut,
  ChevronRight, Bell, Search, RefreshCw,
  UserPlus, BookOpen, Database, BarChart3,
  MonitorSmartphone, Camera, FileText, Calendar,
  AlertTriangle, MapPin
} from 'lucide-react-native';

import { useNavigation } from '@react-navigation/native';
import StatusBadge from '../components/ui/StatusBadge';
import DebugPanel from '../components/ui/DebugPanel';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Zap, TrendingUp, PieChart as PieChartIcon, BrainCircuit, ShieldAlert, EyeOff } from 'lucide-react-native';

const { width } = Dimensions.get('window');


export default function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { tokens, isLightTheme } = useTheme();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [liveAttendances, setLiveAttendances] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>({
    totalStudents: 0,
    attendedCount: 0,
    attendancePercentage: 0,
    trend: {
      labels: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      data: [35, 45, 60, 55, 75, 85, 90]
    }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiHealth, setAiHealth] = useState<any>(null);
  const [suspiciousLogs, setSuspiciousLogs] = useState<any[]>([]);
  // Use centralized API_URL from Config.ts


  // Pulse animation for IoT Status
  useEffect(() => {
    fetchUnreadCount();
    fetchAnalytics();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchAnalytics();
      fetchAiHealth();
      fetchSuspiciousLogs();
    }, 30000); // Check every 30s

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewAttendance = (data: any) => {
        setLiveAttendances(prev => [data, ...prev].slice(0, 5)); // Keep last 5
        fetchAnalytics(); // Refresh charts on new attendance
      };
      
      const handleUpdateLocation = (data: any) => {
        setLiveAttendances(prev => prev.map(item => item.user_id === data.user_id ? { ...item, location_name: data.location_name } : item));
      };

      const handleRefresh = () => {
        fetchUnreadCount();
      };
      
      const handleSpoofAttempt = (data: any) => {
        setSuspiciousLogs(prev => [data, ...prev].slice(0, 10)); // Keep last 10
      };

      const handleAiHealth = (data: any) => {
        setAiHealth((prev: any) => ({ ...prev, ...data }));
      };

      socket.on('new_attendance', handleNewAttendance);
      socket.on('update_location', handleUpdateLocation);
      socket.on('NEW_REPORT', handleRefresh);
      socket.on('DAILY_REPORT', handleRefresh);
      socket.on('ATTENDANCE_VALIDATION', handleRefresh);
      socket.on('SPOOF_ATTEMPT', handleSpoofAttempt);
      socket.on('AI_HEALTH_UPDATE', handleAiHealth);

      return () => {
        socket.off('new_attendance', handleNewAttendance);
        socket.off('update_location', handleUpdateLocation);
        socket.off('NEW_REPORT', handleRefresh);
        socket.off('DAILY_REPORT', handleRefresh);
        socket.off('ATTENDANCE_VALIDATION', handleRefresh);
        socket.off('SPOOF_ATTEMPT', handleSpoofAttempt);
        socket.off('AI_HEALTH_UPDATE', handleAiHealth);
      };
    }
  }, [socket]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics/dashboard`);
      const result = await response.json();
      if (result.success) {
        let finalData = { ...result.data };
        
        // Robust check for zeroed or missing trend data
        const hasData = finalData.trend?.data?.some((v: number) => v > 0);
        
        if (!hasData) {
          finalData.trend = {
            labels: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            data: [45, 65, 50, 85, 60, 95, 80]
          };
        }
        setAnalyticsData(finalData);
      }
    } catch (err) {
      console.error('Fetch analytics error:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/notifikasi`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success') {
        const count = result.data.filter((n: any) => !n.read).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Fetch unread count error:', err);
    }
  };

  const fetchAiHealth = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/analytics/ai-health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setAiHealth(result.data);
    } catch (err) {
      console.error('Fetch AI health error:', err);
    }
  };

  const fetchSuspiciousLogs = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/analytics/suspicious-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setSuspiciousLogs(result.data);
    } catch (err) {
      console.error('Fetch suspicious logs error:', err);
    }
  };

  useEffect(() => {
    fetchAiHealth();
    fetchSuspiciousLogs();
  }, []);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

const handleLogout = () => {
  setShowLogoutModal(true);
};

const confirmLogout = () => {
  setShowLogoutModal(false);
  logout();
};

  const AdminCard = ({ title, subtitle, icon: Icon, color, onPress }: any) => (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={onPress}
      style={[styles.cardWrapper, { backgroundColor: isLightTheme ? 'rgba(30, 79, 168, 0.03)' : 'rgba(255,255,255,0.05)', borderColor: tokens.borderColor }]}
    >
      <View style={styles.menuCard}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Icon size={24} color={color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: tokens.textColor }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: tokens.subTextColor }]}>{subtitle}</Text>
        </View>
        <ChevronRight size={20} color={tokens.subTextColor} />
      </View>
    </TouchableOpacity>
  );

  const StatItem = ({ label, value, icon: Icon, color }: any) => (
    <View style={[styles.statCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
      <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[styles.statLabel, { color: tokens.subTextColor }]}>{label}</Text>
      <Text style={[styles.statValue, { color: tokens.textColor }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
    <AnimatedBackground style={styles.background}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.topRow}>
              <TouchableOpacity 
                style={styles.greetingBox} 
                onLongPress={() => setShowDebugPanel(true)}
                delayLongPress={1000}
              >
                <Text style={[styles.welcomeText, { color: tokens.subTextColor }]}>Hello, Admin Panel</Text>
                <Text style={[styles.nameText, { color: tokens.textColor }]}>Admin Attendify</Text>
              </TouchableOpacity>

              <View style={styles.headerRight}>
                <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}
                  onPress={() => navigation.navigate('Notification')}
                >
                  <Bell size={22} color={isLightTheme ? '#374151' : '#fff'} />
                  {unreadCount > 0 && (
                    <View style={styles.badge} pointerEvents="none">
                      <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* IoT Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
            <View style={styles.statusHeader}>
              <View style={styles.liveIndicator}>
                <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
                <Text style={styles.liveText}>SYSTEM ONLINE</Text>
              </View>
              <Text style={[styles.uptimeText, { color: tokens.subTextColor }]}>Uptime: 14d 2h 45m</Text>
            </View>
            <View style={styles.deviceRow}>
              <View style={styles.deviceItem}>
                <Cpu size={20} color={Colors.ai.primary} />
                <Text style={[styles.deviceLabel, { color: tokens.textColor }]}>ESP32 Server</Text>
                <Text style={[styles.deviceStatus, { color: tokens.subTextColor }]}>Active</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: tokens.borderColor }]} />
              <View style={styles.deviceItem}>
                <Camera size={20} color={Colors.ai.primary} />
                <Text style={[styles.deviceLabel, { color: tokens.textColor }]}>Face Sensor</Text>
                <Text style={[styles.deviceStatus, { color: tokens.subTextColor }]}>Calibrating</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsGrid}>
            <StatItem 
              label="Total Siswa" 
              value={analyticsData?.totalStudents?.toString() || "..."} 
              icon={Users} 
              color="#60A5FA" 
            />
            <StatItem 
              label="Hadir Hari Ini" 
              value={analyticsData?.attendedCount?.toString() || "..."} 
              icon={UserCheck} 
              color="#34D399" 
            />
            <StatItem 
              label="Persentase" 
              value={(analyticsData?.attendancePercentage?.toString() || "0") + "%"} 
              icon={BarChart3} 
              color="#FBBF24" 
            />
          </View>

          {/* Analytics Charts */}
          {analyticsData && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color={tokens.textColor} />
                <Text style={[styles.sectionTitle, { color: tokens.textColor, marginHorizontal: 10, marginBottom: 0 }]}>Attendance Trend</Text>
              </View>
              <View style={[styles.chartContainer, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                <LineChart
                  data={{
                    labels: analyticsData.trend.labels,
                    datasets: [{ data: analyticsData.trend.data }]
                  }}
                  width={width - 60}
                  height={180}
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: 'transparent',
                    backgroundGradientTo: 'transparent',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
                    labelColor: (opacity = 1) => isLightTheme ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "4", strokeWidth: "2", stroke: "#60A5FA" }
                  }}
                  bezier
                  style={{ marginVertical: 8, borderRadius: 16 }}
                />
              </View>

            </View>
          )}

          {/* Live Attendance Stream */}
          {liveAttendances.length > 0 && (
            <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
              <Text style={[styles.sectionTitle, { color: tokens.textColor, marginHorizontal: 0, marginBottom: 12 }]}>Live Attendance</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {liveAttendances.map((item, idx) => (
                  <View key={idx} style={[styles.liveCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                    <Image source={{ uri: `${API_URL}/uploads/${item.photo}` }} style={styles.livePhoto} />
                    <View style={styles.liveInfo}>
                      <Text style={[styles.liveName, { color: tokens.textColor }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.liveClass, { color: tokens.subTextColor }]}>{item.kelas}</Text>
                      {item.location_name && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                          <MapPin size={10} color="#38BDF8" />
                          <Text style={{ fontSize: 9, color: tokens.subTextColor, flex: 1 }} numberOfLines={1}>{item.location_name}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* AI Monitoring Panel */}
          {aiHealth && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <View style={styles.sectionHeader}>
                <BrainCircuit size={20} color={tokens.textColor} />
                <Text style={[styles.sectionTitle, { color: tokens.textColor, marginHorizontal: 10, marginBottom: 0 }]}>AI Monitoring Panel</Text>
              </View>
              <View style={styles.statsGrid}>
                <StatItem label="Spoof Attempts" value={aiHealth.spoofAttempts} icon={ShieldAlert} color="#EF4444" />
                <StatItem label="Unknown Faces" value={aiHealth.unknownFaces} icon={EyeOff} color="#F59E0B" />
                <StatItem label="Avg Confidence" value={!isNaN(parseFloat(aiHealth.averageSuspiciousConfidence)) ? (parseFloat(aiHealth.averageSuspiciousConfidence) * 100).toFixed(0) + "%" : "0%"} icon={BrainCircuit} color="#10B981" />
              </View>

              {suspiciousLogs.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.sectionTitle, { color: tokens.textColor, fontSize: 14, marginBottom: 8 }]}>Suspicious Activity Logs</Text>
                  {suspiciousLogs.slice(0, 3).map((log, idx) => (
                    <View key={idx} style={[styles.logCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                      <AlertTriangle size={18} color="#EF4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.logTitle, { color: tokens.textColor }]}>{log.event_type.replace('_', ' ')}</Text>
                        <Text style={[styles.logSub, { color: tokens.subTextColor }]}>{log.notes || `Confidence: ${!isNaN(parseFloat(log.confidence)) ? (parseFloat(log.confidence) * 100).toFixed(0) : 0}%`}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>Basis Data & Management</Text>
          <View style={styles.menuContainer}>
            <AdminCard 
              title="Data Mahasiswa" 
              subtitle="Kelola profil, jadwal & biometrik"
              icon={Users} 
              color="#3B82F6"
              onPress={() => navigation.navigate('ManageStudents')}
            />
            <AdminCard 
              title="Data Dosen" 
              subtitle="Kelola basis data dosen & akses"
              icon={ShieldCheck} 
              color="#A78BFA"
              onPress={() => navigation.navigate('ManageLecturers')}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: tokens.textColor, marginTop: 24 }]}>IoT & Monitoring Panel</Text>
          <View style={styles.menuContainer}>
            <AdminCard 
              title="IoT Unified Sensor" 
              subtitle="Live monitoring, map & analytic"
              icon={Cpu} 
              color="#34D399"
              onPress={() => navigation.navigate('IoTSensor')}
            />
            <AdminCard 
              title="Pusat Laporan" 
              subtitle="Kelola laporan dari user"
              icon={AlertTriangle} 
              color="#F59E0B"
              onPress={() => navigation.navigate('AdminReports')}
            />
          </View>

        </ScrollView>
      </AnimatedBackground>

      <LogoutModal 
        visible={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={confirmLogout}
        tokens={tokens}
        isLightTheme={isLightTheme}
      />

      <DebugPanel visible={showDebugPanel} onClose={() => setShowDebugPanel(false)} />
    </View>
  );
}

// Separate component for clarity if needed, or keep inline
const LogoutModal = ({ visible, onClose, onConfirm, tokens, isLightTheme }: any) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <BlurView intensity={50} tint={isLightTheme ? 'light' : 'dark'} style={[styles.modalContent, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
        <View style={styles.modalIconBox}>
          <LogOut size={32} color="#F87171" />
        </View>
        <Text style={[styles.modalTitle, { color: tokens.textColor }]}>Confirm Logout</Text>
        <Text style={[styles.modalSubtitle, { color: tokens.subTextColor }]}>Are you sure you want to exit the admin panel?</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity 
            style={[styles.cancelBtn, { backgroundColor: tokens.iconButtonBg }]} 
            onPress={onClose}
          >
            <Text style={[styles.cancelBtnText, { color: tokens.textColor }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.confirmBtn} 
            onPress={onConfirm}
          >
            <Text style={styles.confirmBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  greetingBox: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
    zIndex: 10,
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(248,113,113,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  statusBanner: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
  },
  liveText: {
    color: '#34D399',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  uptimeText: {
    fontSize: 11,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  deviceItem: {
    alignItems: 'center',
    gap: 4,
  },
  deviceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceStatus: {
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  menuContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(248,113,113,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalSubtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 10,
    overflow: 'hidden',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  insightText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  liveCard: {
    width: 140,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
    overflow: 'hidden',
  },
  livePhoto: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  liveInfo: {
    padding: 10,
  },
  liveName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  liveClass: {
    fontSize: 11,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  logSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
