import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, TrendingUp, Users, Clock, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import AnalyticsCard from '../components/analytics/AnalyticsCard';
import HourlyHeatmap from '../components/analytics/HourlyHeatmap';

const { width } = Dimensions.get('window');

export default function AnalyticsCommandCenterScreen({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { tokens, isLightTheme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      
      // Fetch both dashboard stats (for KPIs) and heatmap data
      const [dashRes, heatRes] = await Promise.all([
        fetch(`${API_URL}/analytics/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/analytics/heatmap`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const dashData = await dashRes.json();
      const heatData = await heatRes.json();

      if (dashData.success && heatData.success) {
        setData({
          ...dashData.data,
          ...heatData.data
        });
      }
    } catch (error) {
      console.error('Analytics Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return (
       <AnimatedBackground style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <ActivityIndicator size="large" color="#8B5CF6" />
       </AnimatedBackground>
     );
  }

  // Calculate some derived metrics
  const totalLate = data?.lateDistribution?.find((l: any) => l.status_telat === 'ya')?.count || 0;
  const totalOnTime = data?.lateDistribution?.find((l: any) => l.status_telat === 'tidak')?.count || 0;
  const totalRecords = totalLate + totalOnTime;
  const latePercent = totalRecords > 0 ? Math.round((totalLate / totalRecords) * 100) : 0;
  
  // Find busiest hour
  let busiestHour = { hour: 0, count: 0 };
  if (data?.hourly?.length > 0) {
    busiestHour = data.hourly.reduce((max: any, cur: any) => cur.count > max.count ? cur : max);
  }

  const BackgroundComponent = isEmbedded ? View : AnimatedBackground;

  return (
    <BackgroundComponent style={styles.container}>
      {/* Floating Header */}
      {!isEmbedded && (
        <BlurView intensity={40} tint={isLightTheme ? 'light' : 'dark'} style={[styles.header, { borderColor: tokens.borderColor, backgroundColor: tokens.cardBg }]}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { backgroundColor: tokens.iconButtonBg }]}>
              <ChevronLeft size={24} color={tokens.textColor} />
           </TouchableOpacity>
           <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Command Center</Text>
              <Text style={[styles.headerSub, { color: tokens.subTextColor }]}>Enterprise Analytics Insights</Text>
           </View>
        </BlurView>
      )}

      <ScrollView contentContainerStyle={[styles.scrollContent, isEmbedded && { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
        
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
           <AnalyticsCard 
             title="Total Attendance" 
             value={data?.attendedCount || 0} 
             subtitle="Today's active students"
             icon={<Users size={20} color="#3B82F6" />}
             color="#3B82F6"
             trend="up"
             trendValue="12%"
           />
           <AnalyticsCard 
             title="Lateness Rate" 
             value={`${latePercent}%`} 
             subtitle="Total repeated lates"
             icon={<AlertTriangle size={20} color="#EF4444" />}
             color="#EF4444"
             trend={latePercent > 10 ? 'up' : 'down'}
             trendValue="2.1%"
           />
        </View>

        <View style={styles.kpiGrid}>
           <AnalyticsCard 
             title="Peak Hour" 
             value={busiestHour.hour ? `${busiestHour.hour}:00` : '--:--'} 
             subtitle={`Highest density (${busiestHour.count} scans)`}
             icon={<Clock size={20} color="#8B5CF6" />}
             color="#8B5CF6"
           />
           <AnalyticsCard 
             title="AI Verification" 
             value="98.4%" 
             subtitle="Success Rate"
             icon={<ShieldCheck size={20} color="#10B981" />}
             color="#10B981"
             trend="up"
             trendValue="0.5%"
           />
        </View>

        {/* Heatmap Section */}
        <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>Campus Activity Intensity</Text>
        <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.chartCard, { borderColor: tokens.borderColor, backgroundColor: tokens.cardBg }]}>
           <Text style={[styles.chartSub, { color: tokens.subTextColor, marginBottom: 16 }]}>Hourly attendance density map (Mon - Fri)</Text>
           {data?.hourly && <HourlyHeatmap data={data.hourly} />}
        </BlurView>

        {/* Actionable Insights */}
        <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>AI Generated Insights</Text>
        <View style={{ gap: 12 }}>
           {data?.insights?.map((insight: string, idx: number) => (
             <BlurView key={idx} intensity={10} tint={isLightTheme ? 'light' : 'dark'} style={[styles.insightCard, { borderColor: tokens.borderColor, backgroundColor: tokens.cardBg }]}>
                <TrendingUp size={18} color="#8B5CF6" />
                <Text style={{ color: tokens.textColor, flex: 1, fontSize: 13, lineHeight: 20 }}>{insight}</Text>
             </BlurView>
           ))}
           {busiestHour.count > 0 && (
              <BlurView intensity={10} tint={isLightTheme ? 'light' : 'dark'} style={[styles.insightCard, { borderColor: tokens.borderColor, backgroundColor: tokens.cardBg }]}>
                 <Clock size={18} color="#F59E0B" />
                 <Text style={{ color: tokens.textColor, flex: 1, fontSize: 13, lineHeight: 20 }}>
                   Predicted peak congestion is around {busiestHour.hour}:00. Ensure IoT cameras are properly optimized for high throughput.
                 </Text>
              </BlurView>
           )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </BackgroundComponent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120, // To clear absolute header
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 10,
    overflow: 'hidden'
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  chartCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  chartSub: {
    fontSize: 12,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  }
});
