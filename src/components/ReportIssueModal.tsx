import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, 
  TouchableOpacity, TextInput, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Send, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { API_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from './CustomAlert';
import { useTheme } from '../context/ThemeContext';

interface ReportIssueModalProps {
  visible: boolean;
  onClose: () => void;
  adminId?: number; // Target admin ID
}

export default function ReportIssueModal({ visible, onClose, adminId = 1 }: ReportIssueModalProps) {
  const { tokens, isLightTheme } = useTheme();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const handleSubmit = async () => {
    if (!title || !message) {
      Alert.alert('Error', 'Harap isi judul dan pesan laporan');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      console.log('Sending report with token:', token ? 'Token exists' : 'Token MISSING');
      const response = await fetch(`${API_URL}/notifikasi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: adminId,
          title: `LAPORAN: ${title}`,
          message: message,
          type: 'informasi'
        })
      });

      const result = await response.json();
      if (result.status === 'success') {
        showAlert('Laporan Terkirim!', 'Admin akan segera meninjau pesan Anda.', 'success');
      } else {
        showAlert('Gagal', result.message || 'Gagal mengirim laporan', 'error');
      }
    } catch (err) {
      showAlert('Error', 'Koneksi ke server gagal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertClose = () => {
    setAlertConfig({ ...alertConfig, visible: false });
    if (alertConfig.type === 'success') {
      setTitle('');
      setMessage('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={30} tint={isLightTheme ? 'light' : 'dark'} style={styles.blurContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={[styles.gradientCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <AlertTriangle size={20} color="#FBBF24" />
                  <Text style={[styles.title, { color: tokens.textColor }]}>Laporkan Masalah</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={tokens.subTextColor} />
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                <Text style={[styles.label, { color: tokens.subTextColor }]}>Judul Laporan</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: tokens.inputBg, color: tokens.textColor, borderColor: tokens.borderColor }]}
                  placeholder="Contoh: Kamera Rusak, Jadwal Salah"
                  placeholderTextColor={tokens.labelColor}
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={[styles.label, { color: tokens.subTextColor }]}>Pesan / Detail</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: tokens.inputBg, color: tokens.textColor, borderColor: tokens.borderColor }]}
                  placeholder="Jelaskan masalah yang Anda alami..."
                  placeholderTextColor={tokens.labelColor}
                  multiline={true}
                  numberOfLines={4}
                  value={message}
                  onChangeText={setMessage}
                />

                <TouchableOpacity 
                  style={styles.submitBtn} 
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={[Colors.ai.primary, Colors.ai.accentGlow]}
                    style={styles.submitGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Send size={18} color="#fff" />
                        <Text style={styles.submitText}>Kirim Laporan</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={handleAlertClose}
              />
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  blurContainer: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  gradientCard: {
    padding: 28,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    gap: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: -8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  successText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  successSubtext: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  }
});
