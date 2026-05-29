import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Zap, Code2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';

export default function AboutAttendifyScreen() {
  const navigation = useNavigation<any>();
  const { tokens, isLightTheme } = useTheme();

  return (
    <AnimatedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft color={tokens.textColor} size={28} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Tentang Attendify</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={[styles.logoContainer, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}>
            <Zap size={50} color={tokens.textColor} strokeWidth={2} />
          </View>
          <Text style={[styles.appName, { color: tokens.textColor }]}>ATTENDIFY</Text>
        </View>

        {/* Description Card */}
        <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: tokens.textColor }]}>Tentang Kami</Text>
          <Text style={[styles.description, { color: tokens.subTextColor }]}>
            Attendify adalah aplikasi absensi berbasis IoT dan face recognition untuk mempermudah proses kehadiran.
          </Text>

          {/* Key Features */}
          <View style={styles.featureBox}>
            <View style={[styles.featureRow, { borderBottomColor: tokens.borderColor }]}>
              <View style={styles.featureIcon}>
                <Text style={styles.iconText}>🤖</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: tokens.textColor }]}>Face Recognition</Text>
                <Text style={[styles.featureDesc, { color: tokens.subTextColor }]}>Teknologi pengenalan wajah terdepan</Text>
              </View>
            </View>

            <View style={[styles.featureRow, { borderBottomColor: tokens.borderColor }]}>
              <View style={styles.featureIcon}>
                <Text style={styles.iconText}>🌐</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: tokens.textColor }]}>IoT Integration</Text>
                <Text style={[styles.featureDesc, { color: tokens.subTextColor }]}>Koneksi IoT yang seamless dan aman</Text>
              </View>
            </View>

            <View style={[styles.featureRow, { borderBottomColor: tokens.borderColor }]}>
              <View style={styles.featureIcon}>
                <Text style={styles.iconText}>⚡</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: tokens.textColor }]}>Real-time Tracking</Text>
                <Text style={[styles.featureDesc, { color: tokens.subTextColor }]}>Pelacakan kehadiran secara real-time</Text>
              </View>
            </View>
          </View>
        </BlurView>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <BlurView intensity={10} tint={isLightTheme ? 'light' : 'dark'} style={[styles.infoBadge, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
            <View style={[styles.badgeIcon, { backgroundColor: tokens.iconButtonBg }]}>
              <Code2 size={20} color={isLightTheme ? '#1E4FA8' : Colors.attendify.primary} />
            </View>
            <View style={styles.badgeContent}>
              <Text style={[styles.badgeLabel, { color: tokens.labelColor }]}>Versi Aplikasi</Text>
              <Text style={[styles.badgeValue, { color: tokens.textColor }]}>v1.0.4</Text>
            </View>
          </BlurView>

          <BlurView intensity={10} tint={isLightTheme ? 'light' : 'dark'} style={[styles.infoBadge, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
            <View style={[styles.badgeIcon, { backgroundColor: tokens.iconButtonBg }]}>
              <Zap size={20} color={isLightTheme ? '#1E4FA8' : Colors.attendify.secondary} />
            </View>
            <View style={styles.badgeContent}>
              <Text style={[styles.badgeLabel, { color: tokens.labelColor }]}>Developer</Text>
              <Text style={[styles.badgeValue, { color: tokens.textColor }]}>Attendify Team</Text>
            </View>
          </BlurView>
        </View>

        {/* Status Section */}
        <BlurView intensity={10} tint={isLightTheme ? 'light' : 'dark'} style={[styles.statusCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor, borderStyle: 'dashed' }]}>
          <Text style={styles.statusIcon}>✨</Text>
          <Text style={[styles.statusTitle, { color: tokens.textColor }]}>Konten Lengkap Segera Hadir</Text>
          <Text style={[styles.statusDesc, { color: tokens.subTextColor }]}>
            Lebih banyak fitur dan informasi akan ditambahkan segera.
          </Text>
        </BlurView>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButtonBottom}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={isLightTheme ? ['#1E4FA8', '#2D6CDF'] : [Colors.attendify.primary, Colors.attendify.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Kembali</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  featureBox: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 14,
    marginTop: 2,
  },
  iconText: {
    fontSize: 28,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    marginHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeContent: {
    flex: 1,
  },
  badgeLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  statusIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  backButtonBottom: {
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 40,
  },
  buttonGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
