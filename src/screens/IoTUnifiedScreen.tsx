import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { Cpu, Map, LayoutDashboard } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
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
    { key: 'sensor', label: 'Validasi', icon: Cpu },
    { key: 'map', label: 'Peta', icon: Map },
    { key: 'analytics', label: 'Statistik', icon: LayoutDashboard },
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
            style={{ padding: 8, marginLeft: -8 }}
          >
            <Ionicons name="chevron-back" color={tokens.textColor} size={24} />
          </TouchableOpacity>
          <Text style={[styles.mainTitle, { color: tokens.textColor, marginBottom: 0 }]}>IoT Sensor</Text>
        </View>
        
        <View style={styles.segmentContainer}>
          <View style={[styles.segmentBg, { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: isLightTheme ? '#F3F4F6' : '#1E293B' }]}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <TouchableOpacity 
                  key={tab.key} 
                  style={[styles.segmentBtn, isActive && [styles.segmentBtnActive, { backgroundColor: isLightTheme ? '#FFFFFF' : 'rgba(59,130,246,0.2)' }]]}
                  onPress={() => setActiveTab(tab.key as TabKey)}
                >
                  <Icon size={16} color={isActive ? '#3B82F6' : tokens.subTextColor} />
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive, { color: isActive ? '#3B82F6' : tokens.subTextColor }]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
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
