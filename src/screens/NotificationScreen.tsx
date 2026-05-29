import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Platform
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import {
  Bell,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  CheckCheck,
  ChevronLeft
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import { useSocket } from '../context/SocketContext';

const { width } = Dimensions.get('window');

interface Notification {
  id: number | string;
  title: string;
  message: string;
  time: string;
  type: string;
  read: boolean;
  isReport?: boolean;
}

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const { role } = useAuth();
  const { tokens, isLightTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      
      const requests = [
        fetch(`${API_URL}/notifikasi`, { headers: { 'Authorization': `Bearer ${token}` } })
      ];

      if (role === 'admin') {
        requests.push(
          fetch(`${API_URL}/admin/reports`, { headers: { 'Authorization': `Bearer ${token}` } })
        );
      }

      const responses = await Promise.all(requests);
      const notifResult = await responses[0].json();
      
      let allNotifs: Notification[] = [];
      
      if (notifResult.status === 'success') {
        allNotifs = [...notifResult.data];
      }

      if (role === 'admin' && responses.length > 1) {
        const reportResult = await responses[1].json();
        if (reportResult.status === 'success') {
          const reports = reportResult.data.map((r: any) => ({
            id: `report_${r.id}`,
            title: `Laporan: ${r.sender_name || 'Sistem'} (${r.sender_role || 'User'})`,
            message: r.description || r.title,
            time: r.created_at,
            type: 'warning',
            read: r.status !== 'PENDING',
            isReport: true
          }));
          allNotifs = [...allNotifs, ...reports];
        }
      }

      // Sort by newest first
      allNotifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setNotifications(allNotifs);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const { socket } = useSocket();

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      const handleNewNotification = () => {
        fetchNotifications();
      };
      
      socket.on('NEW_REPORT', handleNewNotification);
      socket.on('ATTENDANCE_SUCCESS', handleNewNotification);
      socket.on('DAILY_REPORT', handleNewNotification);
      socket.on('REPORT_STATUS_UPDATE', handleNewNotification);
      socket.on('ATTENDANCE_VALIDATION', handleNewNotification);

      return () => {
        socket.off('NEW_REPORT', handleNewNotification);
        socket.off('ATTENDANCE_SUCCESS', handleNewNotification);
        socket.off('DAILY_REPORT', handleNewNotification);
        socket.off('REPORT_STATUS_UPDATE', handleNewNotification);
        socket.off('ATTENDANCE_VALIDATION', handleNewNotification);
      }
    }
  }, [socket]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const getTypeColors = (type: string) => {
    switch (type) {
      case 'ATTENDANCE_SUCCESS':
      case 'success':
        return {
          bg: isLightTheme ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.15)',
          border: isLightTheme ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.3)',
          icon: '#22C55E',
        };
      case 'REPORT_STATUS_UPDATE':
      case 'warning':
        return {
          bg: isLightTheme ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.15)',
          border: isLightTheme ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.3)',
          icon: '#EAB308',
        };
      case 'INFO':
      case 'NEW_REPORT':
      case 'info':
        return {
          bg: isLightTheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
          border: isLightTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)',
          icon: '#3B82F6',
        };
      case 'ATTENDANCE_VALIDATION':
      case 'error':
        return {
          bg: isLightTheme ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)',
          border: isLightTheme ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)',
          icon: '#EF4444',
        };
      default:
        return {
          bg: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
          border: isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
          icon: tokens.textColor,
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ATTENDANCE_SUCCESS':
      case 'success':
        return <CheckCircle2 size={20} color={getTypeColors(type).icon} />;
      case 'REPORT_STATUS_UPDATE':
      case 'warning':
        return <AlertCircle size={20} color={getTypeColors(type).icon} />;
      case 'ATTENDANCE_VALIDATION':
      case 'error':
        return <AlertCircle size={20} color={getTypeColors(type).icon} />;
      default:
        return <MessageSquare size={20} color={getTypeColors(type).icon} />;
    }
  };

  const handlePressNotification = async (item?: Notification) => {
    try {
      if (!item) {
        // Mark all as read logic
        const token = await AsyncStorage.getItem('@attendify_auth_token');
        await fetch(`${API_URL}/notifikasi/read`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ id_notif: null }) // assuming backend supports mark all
        });
        fetchNotifications();
        return;
      }

      const id = item.id;
      
      // Navigate based on item type
      const navigateToTarget = () => {
        if (item.isReport || item.type === 'NEW_REPORT') {
          if (role === 'admin') navigation.navigate('AdminReports', { tab: 'facility' });
        } else if (item.type === 'DAILY_REPORT' || item.title.includes('Harian')) {
          if (role === 'admin') navigation.navigate('AdminReports', { tab: 'daily' });
          else if (role === 'dosen') navigation.navigate('DosenDailyReport');
        }
      };

      if (typeof id === 'string' && id.startsWith('report_')) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        navigateToTarget();
        return;
      }

      if (!item.read) {
        const token = await AsyncStorage.getItem('@attendify_auth_token');
        await fetch(`${API_URL}/notifikasi/read`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ id_notif: id })
        });
        fetchNotifications();
      }
      
      navigateToTarget();
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' ' + 
           date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatedBackground style={styles.container}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} />
      
      <View style={[
        styles.innerContainer, 
        Platform.OS === 'web' && [styles.webContainer, { backgroundColor: isLightTheme ? '#FFFFFF' : '#1E293B' }]
      ]}>
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.duration(600).springify()}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ChevronLeft color={tokens.textColor} size={28} />
              </TouchableOpacity>
              
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.title, { color: tokens.textColor }]}>Notifikasi</Text>
                <Text style={[styles.subtitle, { color: tokens.subTextColor }]}>
                   {unreadCount > 0 ? `${unreadCount} pesan baru` : `Semua telah dibaca`}
                </Text>
              </View>
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity 
                onPress={handlePressNotification}
                style={[styles.readAllBtn, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}
              >
                <CheckCheck color={Colors.ai.primary} size={22} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

      {/* ScrollView Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.textColor} />
        }
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.ai.primary} />
          </View>
        ) : (
          notifications.length > 0 ? (
            notifications.map((item, index) => (
              <Animated.View key={item.id} entering={SlideInUp.delay(index * 100).springify()}>
                <View
                  style={[styles.notificationCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }, !item.read && styles.unreadCard]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handlePressNotification(item)}
                    style={styles.notificationContent}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: getTypeColors(item.type).bg,
                          borderColor: getTypeColors(item.type).border,
                        },
                      ]}
                    >
                      {getTypeIcon(item.type)}
                    </View>

                    <View style={styles.textContent}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.notifTitle,
                            { color: tokens.textColor },
                            !item.read && styles.titleBold,
                          ]}
                        >
                          {item.title}
                        </Text>
                        {!item.read && <View style={styles.unreadDot} />}
                      </View>

                      <Text style={[styles.message, { color: tokens.subTextColor }]} numberOfLines={3}>
                        {item.message}
                      </Text>

                      <View style={styles.timeRow}>
                        <Clock size={12} color={tokens.subTextColor} />
                        <Text style={[styles.time, { color: tokens.subTextColor }]}>{formatTime(item.time)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Bell color={tokens.subTextColor} size={64} opacity={0.5} />
              <Text style={[styles.emptyText, { color: tokens.textColor }]}>Tidak ada notifikasi</Text>
              <Text style={[styles.emptySubtext, { color: tokens.subTextColor }]}>
                Laporan dari mahasiswa atau dosen akan muncul di sini.
              </Text>
            </View>
          )
        )}
        </ScrollView>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1 },
  webContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    marginVertical: 20,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerInfo: { flex: 1, paddingLeft: 12 },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500'
  },
  readAllBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  notificationCard: {
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  unreadCard: {
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleBold: { fontWeight: '800' },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.ai.primary,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  centerContainer: {
    marginTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
