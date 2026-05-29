import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Shield, Lock, CheckCircle2, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacySecurityScreen() {
  const navigation = useNavigation<any>();
  const { tokens, isLightTheme } = useTheme();

  const features = [
    { icon: '🔐', title: 'Enkripsi Data', description: 'Data Anda terenkripsi end-to-end' },
    { icon: '👤', title: 'Autentikasi Wajah', description: 'Keamanan biometrik canggih' },
    { icon: '🛡️', title: 'Keamanan Akun', description: 'Perlindungan lapisan ganda' },
  ];

  return (
    <AnimatedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={{ padding: 8, marginLeft: -8 }}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" color={tokens.textColor} size={28} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Privasi & Keamanan</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.shieldIcon, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}>
            <Shield size={60} color={tokens.textColor} strokeWidth={1.5} />
          </View>
        </View>

        {/* Main Card */}
        <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.cardContainer, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
          {/* Title */}
          <Text style={[styles.cardTitle, { color: tokens.textColor }]}>Fitur Segera Hadir 🔒</Text>

          {/* Description */}
          <Text style={[styles.description, { color: tokens.subTextColor }]}>
            Kami sedang menyiapkan sistem keamanan terbaik untuk melindungi data Anda.
          </Text>

          {/* Features List */}
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={[styles.featureItem, { borderBottomColor: tokens.borderColor }]}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: tokens.textColor }]}>{feature.title}</Text>
                  <Text style={[styles.featureDescription, { color: tokens.subTextColor }]}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: isLightTheme ? 'rgba(30, 79, 168, 0.1)' : 'rgba(45, 108, 223, 0.1)' }]}>
            <Text style={[styles.statusText, { color: isLightTheme ? '#1E4FA8' : Colors.attendify.secondary }]}>✨ Coming Soon</Text>
          </View>
        </BlurView>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.secondaryButtonText, { color: tokens.textColor }]}>Kembali</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton}>
            <LinearGradient
              colors={isLightTheme ? ['#1E4FA8', '#2D6CDF'] : [Colors.attendify.primary, Colors.attendify.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Bell size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Beritahu Saya</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  shieldIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  cardContainer: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
