import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { MapPin, Clock, Calendar, BookOpen, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { AttendanceChart } from '../components/AttendanceChart';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

interface ScheduleItem {
  id: number;
  subject: string;
  time: string;
  room: string;
  status: string;
  lecturer: string;
  attendance: number;
  total: number;
  attended: number;
}

export default function JadwalScreen() {
  const navigation = useNavigation<any>();
  const { tokens, isLightTheme } = useTheme();
  const { user } = useAuth();
  
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchSchedules();
    // Auto-refresh setiap 30 detik
    const interval = setInterval(() => {
      fetchSchedules(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSchedules = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/jadwal`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.data)) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayName = days[new Date().getDay()].toLowerCase();
        
        let filtered = data.data.filter((item: any) => 
          item.hari && String(item.hari).toLowerCase() === todayName
        );
        
        if (user && user.kelas) {
          filtered = filtered.filter((item: any) => 
            String(item.class_name).toLowerCase() === String(user.kelas).toLowerCase()
          );
        }
        
        // Format schedule data dynamically
        const formatted = filtered.map((item: any) => {
          let status = 'Upcoming';
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const nowStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;
          
          if (nowStr >= item.jam_mulai && nowStr <= item.jam_selesai) {
            status = 'Ongoing';
          } else if (nowStr > item.jam_selesai) {
            status = 'Finished';
          }
          
          return {
            id: item.id,
            subject: item.subject,
            time: `${item.jam_mulai.substring(0, 5)} - ${item.jam_selesai.substring(0, 5)}`,
            room: item.ruang,
            status: status,
            lecturer: item.dosen_name,
            attendance: Math.round((item.attended_count / (item.total_students || 1)) * 100),
            total: item.total_students || 1,
            attended: item.attended_count || 0,
          };
        });
        setSchedules(formatted);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.log('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Finished': return { bg: 'rgba(156, 163, 175, 0.15)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.3)' };
      case 'Ongoing':  return { bg: 'rgba(16, 185, 129, 0.15)',  text: '#10B981', border: 'rgba(16, 185, 129, 0.4)' };
      case 'Upcoming': return { bg: 'rgba(234, 179, 8, 0.15)',  text: '#d97706', border: 'rgba(234, 179, 8, 0.4)' };
      default:         return { bg: tokens.cardBg, text: tokens.textColor, border: tokens.borderColor };
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getTodayString = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const today = new Date();
    const dayName = days[today.getDay()];
    const dateNum = today.getDate();
    const monthName = months[today.getMonth()];
    const year = today.getFullYear();
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  };

  return (
    <AnimatedBackground style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.iconBtn, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}
          >
            <ArrowLeft color={tokens.textColor} size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: tokens.textColor }]}>Jadwal Kuliah</Text>
            <Text style={[styles.subtitle, { color: tokens.subTextColor }]}>
              {getTodayString()}
            </Text>
          </View>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveText, { color: tokens.subTextColor }]}>
              Update {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.ai.primary} />
          <Text style={[styles.loadingText, { color: tokens.subTextColor }]}>Memuat jadwal kuliah...</Text>
        </View>
      ) : schedules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar color={tokens.subTextColor} size={64} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: tokens.textColor }]}>Tidak ada jadwal kuliah</Text>
          <Text style={[styles.emptySubText, { color: tokens.subTextColor }]}>
            Kelas {user?.kelas || '-'} belum memiliki jadwal terdaftar hari ini.
          </Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {schedules.map((item) => {
            const statusStyle = getStatusColor(item.status);
            const isExpanded = expandedId === item.id;

            return (
              <View key={item.id}>
                <BlurView
                  intensity={20}
                  tint={isLightTheme ? 'light' : 'dark'}
                  style={[styles.card, { borderColor: tokens.borderColor }]}
                >
                  {/* Left indicator bar */}
                  <View style={[styles.cardIndicator, { backgroundColor: statusStyle.text }]} />
                  
                  <View style={styles.cardMain}>
                    {/* Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.subjectRow}>
                        <View style={[styles.iconContainer, { backgroundColor: isLightTheme ? 'rgba(59,130,246,0.12)' : 'rgba(45,108,223,0.15)' }]}>
                          <BookOpen color={Colors.ai.primary} size={20} />
                        </View>
                        <Text style={[styles.subject, { color: tokens.textColor }]} numberOfLines={1}>
                          {item.subject}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                        <View style={[styles.dot, { backgroundColor: statusStyle.text }]} />
                        <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
                      </View>
                    </View>

                    {/* Lecturer */}
                    <Text style={[styles.lecturer, { color: tokens.subTextColor }]}>{item.lecturer}</Text>
                    
                    <View style={[styles.divider, { backgroundColor: tokens.borderColor }]} />
                    
                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.infoCol}>
                        <View style={styles.infoRow}>
                          <Clock size={14} color={tokens.subTextColor} />
                          <Text style={[styles.infoText, { color: tokens.subTextColor }]}>{item.time}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <MapPin size={14} color={tokens.subTextColor} />
                          <Text style={[styles.infoText, { color: tokens.subTextColor }]}>{item.room}</Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.detailBtn, { backgroundColor: tokens.cardBg, borderWidth: 1, borderColor: tokens.borderColor }]}
                        onPress={() => toggleExpand(item.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp color={tokens.subTextColor} size={20} />
                        ) : (
                          <ChevronDown color={tokens.subTextColor} size={20} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </BlurView>

                {isExpanded && (
                  <BlurView
                    intensity={20}
                    tint={isLightTheme ? 'light' : 'dark'}
                    style={[styles.expandedCard, { borderColor: tokens.borderColor }]}
                  >
                    <AttendanceChart
                      data={[{
                        subject: item.subject,
                        attendance: item.attendance,
                        total: item.total,
                        attended: item.attended,
                      }]}
                      title={`Grafik Absensi ${item.subject}`}
                      showLegend={false}
                    />
                  </BlurView>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    cursor: 'pointer',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardIndicator: {
    width: 6,
    opacity: 0.7,
  },
  cardMain: {
    flex: 1,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subject: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  lecturer: {
    fontSize: 13,
    marginLeft: 46,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    marginBottom: 14,
    marginLeft: 46,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 46,
  },
  infoCol: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  expandedCard: {
    borderRadius: 20,
    marginLeft: 12,
    marginRight: 12,
    marginBottom: 16,
    marginTop: -8,
    borderWidth: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
