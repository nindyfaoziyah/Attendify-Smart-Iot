import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { Cpu, Map, LayoutDashboard, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AnimatedBackground from '../components/ui/AnimatedBackground';

// Import child screens
import IoTSensorValidationScreen from './IoTSensorValidationScreen';
import LiveMapScreen from './LiveMapScreen';
import AnalyticsCommandCenterScreen from './AnalyticsCommandCenterScreen';

const { width } = Dimensions.get('window');

type TabKey = 'sensor' | 'map' | 'analytics';

export default function IoTUnifiedScreen() {
  const { tokens, isLightTheme } = useTheme();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabKey>('sensor');

  const tabs = [
    { key: 'sensor', label: 'Live Monitoring', icon: Cpu },
    { key: 'map', label: 'Live Attendance Map', icon: Map },
    { key: 'analytics', label: 'Analytics Command Center', icon: LayoutDashboard },
  ];

  return (
    <AnimatedBackground style={styles.container}>
      {/* 
        We use an extreme zIndex header for the segmented control 
        so the child screens can safely scroll under it.
      */}
      <View style={[styles.headerContainer, { paddingTop: Platform.OS === 'ios' ? 50 : 30 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: tokens.iconButtonBg }]}
          >
            <ArrowLeft color={tokens.textColor} size={24} />
          </TouchableOpacity>
          <Text style={[styles.mainTitle, { color: tokens.textColor, marginBottom: 0 }]}>IoT Sensor</Text>
        </View>
        
        <View style={styles.segmentContainer}>
          <BlurView intensity={30} tint={isLightTheme ? 'light' : 'dark'} style={[styles.segmentBg, { borderColor: tokens.borderColor, backgroundColor: tokens.cardBg }]}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <TouchableOpacity 
                  key={tab.key} 
                  style={[styles.segmentBtn, isActive && [styles.segmentBtnActive, { backgroundColor: isLightTheme ? '#fff' : 'rgba(255,255,255,0.1)' }]]}
                  onPress={() => setActiveTab(tab.key as TabKey)}
                >
                  <Icon size={16} color={isActive ? '#3B82F6' : tokens.subTextColor} />
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive, { color: isActive ? '#3B82F6' : tokens.subTextColor }]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </BlurView>
        </View>
      </View>

      <View style={styles.contentArea}>
        {activeTab === 'sensor' && <IoTSensorValidationScreen isEmbedded={true} />}
        {activeTab === 'map' && <LiveMapScreen isEmbedded={true} />}
        {activeTab === 'analytics' && <AnalyticsCommandCenterScreen isEmbedded={true} />}
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    zIndex: 100,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentContainer: {
    paddingBottom: 5,
  },
  segmentBg: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '500',
  },
  segmentTextActive: {
    fontWeight: 'bold',
  },
  contentArea: {
    flex: 1,
  }
});
