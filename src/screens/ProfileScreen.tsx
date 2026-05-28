import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { User, Settings, LogOut, ChevronRight, BookOpen, GraduationCap, Phone, Mail, Shield, Edit3, IdCard } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAuthToken } from '../services/authService';
import { API_URL } from '../../constants/Config';
import AnimatedBackground from '../components/ui/AnimatedBackground';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { logout, user, role, login } = useAuth();
  const { tokens, isLightTheme } = useTheme();

  // Refresh profile data from server on mount
  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;

        const response = await fetch(`${API_URL}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (result.status === 'success' && role) {
          const userData = result.data;
          login(role, {
            fullName: userData.name,
            email: userData.email,
            nim: userData.nim || userData.username || user?.nim,
            prodi: userData.prodi,
            kelas: userData.kelas,
            phone: userData.phone,
            avatar: userData.foto_profil || undefined,
          });
        }
      } catch (error) {
        console.error('❌ Failed to refresh profile:', error);
      }
    };
    refreshProfile();
  }, []);

  const userName = user?.fullName || 'User';
  const roleLabel = role === 'dosen' ? 'Dosen' : role === 'admin' ? 'Administrator' : 'Mahasiswa';
  const userProdi = user?.prodi || (role === 'mahasiswa' ? 'S1 Informatika' : '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => { setShowLogoutModal(true); };
  const confirmLogout = () => {
    try {
      setIsLoggingOut(true);
      setShowLogoutModal(false);
      logout();
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  const dividerStyle = { borderTopWidth: 1, borderTopColor: tokens.borderColor };

  return (
    <AnimatedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarContainer} />
          ) : (
            <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.avatarContainer}>
              <User size={50} color="#fff" />
            </LinearGradient>
          )}

          <Text style={[styles.name, { color: tokens.textColor }]}>{userName}</Text>

          <View style={[styles.roleBadge, { backgroundColor: isLightTheme ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: isLightTheme ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.15)' }]}>
            <Text style={[styles.role, { color: isLightTheme ? '#2563eb' : '#E2E8F0' }]}>
              {roleLabel}{userProdi && role !== 'admin' ? ` - ${userProdi}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.menuWrapper}>

          {/* ── CARD 1: Identitas ── */}
          <Text style={[styles.cardTitle, { color: tokens.labelColor }]}>Identitas Akun</Text>
          <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { borderColor: tokens.borderColor }]}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                  <IdCard size={20} color="#60A5FA" />
                </View>
                <View>
                  <Text style={[styles.menuItemLabel, { color: tokens.labelColor }]}>
                    {role === 'mahasiswa' ? 'NIM' : role === 'dosen' ? 'NIP' : 'Admin ID'}
                  </Text>
                  <Text style={[styles.menuItemValue, { color: tokens.textColor }]}>
                    {user?.nim || (role === 'admin' ? 'ADM-2024-001' : '-')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.menuItem, dividerStyle]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <Shield size={20} color="#34D399" />
                </View>
                <View>
                  <Text style={[styles.menuItemLabel, { color: tokens.labelColor }]}>Status Akun</Text>
                  <Text style={[styles.menuItemValue, { color: tokens.textColor }]}>{roleLabel}</Text>
                </View>
              </View>
            </View>
          </BlurView>

          {/* ── CARD 2: Detail Informasi ── */}
          <Text style={[styles.cardTitle, { color: tokens.labelColor }]}>
            {role === 'mahasiswa' ? 'Data Akademik' : 'Informasi Kontak'}
          </Text>
          <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { borderColor: tokens.borderColor }]}>
            {role === 'mahasiswa' ? (
              <>
                <View style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                      <BookOpen size={20} color="#A78BFA" />
                    </View>
                    <View>
                      <Text style={[styles.menuItemLabel, { color: tokens.labelColor }]}>Program Studi</Text>
                      <Text style={[styles.menuItemValue, { color: tokens.textColor }]}>{userProdi || '-'}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.menuItem, dividerStyle]}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                      <GraduationCap size={20} color="#FBBF24" />
                    </View>
                    <View>
                      <Text style={[styles.menuItemLabel, { color: tokens.labelColor }]}>Kelas</Text>
                      <Text style={[styles.menuItemValue, { color: tokens.textColor }]}>{user?.kelas || '-'}</Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                      <Mail size={20} color="#A78BFA" />
                    </View>
                    <View>
                      <Text style={[styles.menuItemLabel, { color: tokens.labelColor }]}>Email Terdaftar</Text>
                      <Text style={[styles.menuItemValue, { color: tokens.textColor }]}>{user?.email || '-'}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.menuItem, dividerStyle]}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                      <Phone size={20} color="#FBBF24" />
                    </View>
                    <View>
                      <Text style={[styles.menuItemLabel, { color: tokens.labelColor }]}>Nomor Telepon</Text>
                      <Text style={[styles.menuItemValue, { color: tokens.textColor }]}>{user?.phone || '-'}</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </BlurView>

          {/* ── CARD 3: Pengaturan & Aksi ── */}
          <Text style={[styles.cardTitle, { color: tokens.labelColor }]}>Pengaturan & Akun</Text>
          <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { borderColor: tokens.borderColor }]}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('ProfileDetails')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                  <Edit3 size={20} color="#60A5FA" />
                </View>
                <Text style={[styles.menuItemText, { color: tokens.textColor }]}>Ubah Profil</Text>
              </View>
              <ChevronRight size={20} color={tokens.subTextColor} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, dividerStyle]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(156,163,175,0.15)' }]}>
                  <Settings size={20} color="#9CA3AF" />
                </View>
                <Text style={[styles.menuItemText, { color: tokens.textColor }]}>Pengaturan Aplikasi</Text>
              </View>
              <ChevronRight size={20} color={tokens.subTextColor} />
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.logoutGradient}>
            <LogOut size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout dari Akun</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint={isLightTheme ? 'light' : 'dark'} style={[styles.modalContainer, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor, borderWidth: 1 }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <LogOut size={32} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: tokens.textColor }]}>Konfirmasi Logout</Text>
            <Text style={[styles.modalMessage, { color: tokens.subTextColor }]}>Apakah Anda yakin ingin keluar dari akun Anda?</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtnCancel, { backgroundColor: tokens.iconButtonBg }]} 
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnCancelText, { color: tokens.textColor }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalBtnLogout} 
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    paddingTop: Platform.OS === 'web' ? 40 : 80,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  profileHeader: { alignItems: 'center', marginBottom: 36 },

  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  name: { fontSize: 26, fontWeight: 'bold' },

  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },

  role: { fontSize: 14, fontWeight: '600' },

  menuWrapper: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  card: {
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemText: { 
    fontSize: 16, 
    fontWeight: '500' 
  },
  menuItemLabel: {
    fontSize: 11,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItemValue: {
    fontSize: 15,
    fontWeight: '600',
  },

  logoutBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 4,
  },

  logoutGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 17,
    gap: 10,
  },

  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnLogout: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalBtnLogoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});