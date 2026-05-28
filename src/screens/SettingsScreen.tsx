import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { UserCog, ChevronLeft, ChevronRight, Shield, Info, HelpCircle, Palette, MessageSquare, Send, X, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { useTheme, DEFAULT_GRADIENT } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AnimatedBackground from '../components/ui/AnimatedBackground';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { isDarkMode, themeColors, setThemeColors, isLightTheme, tokens } = useTheme();
  const { role, user } = useAuth();

  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const gradients = [
    { name: 'Default', colors: DEFAULT_GRADIENT },
    { name: 'Blue', colors: ['#0f172a', '#1e3a8a', '#3b82f6', '#60a5fa', '#3b82f6', '#1e3a8a', '#0f172a'] },
    { name: 'Purple', colors: ['#1e1b4b', '#4c1d95', '#7c3aed', '#a78bfa', '#7c3aed', '#4c1d95', '#1e1b4b'] },
    { name: 'Pink', colors: ['#4c0519', '#be123c', '#e11d48', '#fb7185', '#e11d48', '#be123c', '#4c0519'] },
    { name: 'Grey', colors: ['#020617', '#0f172a', '#1e293b', '#334155', '#1e293b', '#0f172a', '#020617'] },
    { name: 'Putih Tulang', colors: ['#fdfaf5', '#f5f0e6', '#fdfaf5', '#f5f0e6', '#fdfaf5', '#f5f0e6', '#fdfaf5'] },
    { name: 'Hitam', colors: ['#000000', '#121212', '#000000', '#121212', '#000000', '#121212', '#000000'] },
  ];

  const submitReport = async () => {
    if (!reportMessage.trim()) {
      Alert.alert('Error', 'Pesan tidak boleh kosong');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const userId = (user as any)?.id || (user as any)?.id_user || 1;
      const userRole = role || 'unknown';

      const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          role: userRole,
          message: reportMessage
        })
      });

      const result = await response.json();
      if (result.status === 'success') {
        Alert.alert('Sukses', 'Laporan berhasil dikirim');
        setReportMessage('');
        setIsReportModalVisible(false);
      } else {
        Alert.alert('Error', result.message || 'Gagal mengirim laporan');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Terjadi kesalahan jaringan');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleDevFeature = (name: string) => {
    Alert.alert('Info', `Fitur ${name} akan tersedia pada versi pembaruan mendatang.`);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback based on role
      if (role === 'admin') {
        navigation.navigate('AdminMain');
      } else if (role === 'dosen') {
        navigation.navigate('DosenDashboard');
      } else {
        navigation.navigate('MainTabs');
      }
    }
  };

  return (
    <AnimatedBackground style={styles.container}>
      <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }]}
        >
          <ChevronLeft size={28} color={tokens.textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.textColor }]}>Pengaturan</Text>
        <TouchableOpacity onPress={() => handleDevFeature('Pusat Bantuan')}>
          <HelpCircle size={24} color={tokens.subTextColor} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.settingsGroup}>
          <Text style={[styles.groupTitle, { color: tokens.labelColor }]}>Keamanan & Akun</Text>
          <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { borderColor: tokens.borderColor }]}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('ProfileDetails')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <UserCog size={20} color="#38BDF8" />
                </View>
                <Text style={[styles.settingItemText, { color: tokens.textColor }]}>Detail Profil</Text>
              </View>
              <ChevronRight size={20} color={tokens.subTextColor} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.noBorder]}
              onPress={() => navigation.navigate('PrivacySecurity')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Shield size={20} color="#10B981" />
                </View>
                <Text style={[styles.settingItemText, { color: tokens.textColor }]}>Privasi & Keamanan</Text>
              </View>
              <ChevronRight size={20} color={tokens.subTextColor} />
            </TouchableOpacity>
          </BlurView>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={[styles.groupTitle, { color: tokens.labelColor }]}>Tampilan</Text>
          <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { borderColor: tokens.borderColor }]}>
            <View style={[styles.settingItem, styles.noBorder, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                  <Palette size={20} color="#EC4899" />
                </View>
                <Text style={[styles.settingItemText, { color: tokens.textColor }]}>Tema Warna</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, width: '100%' }}>
                {gradients.map((grad, index) => {
                  const isSelected = themeColors && themeColors[0] === grad.colors[0];
                  const isLight = grad.colors[0] === '#ffffff' || grad.colors[0] === '#fdfaf5';
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setThemeColors(grad.colors)}
                      style={{ alignItems: 'center', marginRight: 16 }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          borderWidth: 2.5,
                          borderColor: isSelected
                            ? (isLight ? '#6b7280' : '#ffffff')
                            : (isLight ? 'rgba(0,0,0,0.15)' : 'transparent'),
                          overflow: 'hidden',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <LinearGradient colors={grad.colors as unknown as readonly [string, string, ...string[]]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                        {isSelected && (
                          <Check size={20} color={isLight ? '#374151' : '#ffffff'} strokeWidth={3} />
                        )}
                      </View>
                      <Text style={{
                        color: isLight ? (isLightTheme ? '#374151' : 'rgba(255,255,255,0.6)') : 'rgba(255,255,255,0.6)',
                        fontSize: 10,
                        marginTop: 6,
                        fontWeight: isSelected ? '700' : '400',
                      }}>{grad.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </BlurView>
        </View>

        {role !== 'admin' && (
          <View style={styles.settingsGroup}>
            <Text style={[styles.groupTitle, { color: tokens.labelColor }]}>Bantuan</Text>
            <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { borderColor: tokens.borderColor }]}>
              <TouchableOpacity
                style={[styles.settingItem, styles.noBorder]}
                onPress={() => setIsReportModalVisible(true)}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <MessageSquare size={20} color="#F59E0B" />
                  </View>
                  <Text style={[styles.settingItemText, { color: tokens.textColor }]}>Laporkan Masalah</Text>
                </View>
                <ChevronRight size={20} color={tokens.subTextColor} />
              </TouchableOpacity>
            </BlurView>
          </View>
        )}

        <View style={styles.settingsGroup}>
          <Text style={[styles.groupTitle, { color: tokens.labelColor }]}>Lainnya</Text>
          <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { borderColor: tokens.borderColor }]}>
            <TouchableOpacity
              style={[styles.settingItem, styles.noBorder]}
              onPress={() => navigation.navigate('AboutAttendify')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: tokens.iconButtonBg }]}>
                  <Info size={20} color={tokens.subTextColor} />
                </View>
                <Text style={[styles.settingItemText, { color: tokens.textColor }]}>Tentang Attendify</Text>
              </View>
              <Text style={[styles.versionText, { color: tokens.labelColor }]}>v1.0.4</Text>
            </TouchableOpacity>
          </BlurView>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={[styles.copyright, { color: tokens.labelColor }]}>© 2026 SmartFace System. All rights reserved.</Text>
        </View>

      </ScrollView>

      <Modal visible={isReportModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint={isLightTheme ? 'light' : 'dark'} style={[styles.modalContent, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: tokens.textColor }]}>Laporkan Masalah</Text>
                <TouchableOpacity onPress={() => setIsReportModalVisible(false)}>
                  <X size={24} color={tokens.textColor} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.textInput, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor, color: tokens.textColor }]}
                placeholder="Deskripsikan masalah Anda..."
                placeholderTextColor={tokens.subTextColor}
                multiline
                numberOfLines={5}
                value={reportMessage}
                onChangeText={setReportMessage}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={submitReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Send size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Kirim Laporan</Text>
                  </>
                )}
              </TouchableOpacity>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  settingsGroup: { marginBottom: 32 },
  groupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden'
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  noBorder: { borderBottomWidth: 0 },
  settingItemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  settingItemText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  versionText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' },
  copyright: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    marginTop: 10,
    marginBottom: 40
  },
  logoutBtn: {
    marginTop: 32,
    marginBottom: 24,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden'
  },
  logoutGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: Platform.OS === 'web' ? 32 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 32 : 0,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 500,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    minHeight: 120,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: Colors.ai.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
