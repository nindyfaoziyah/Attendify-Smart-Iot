import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Mail, Send, ArrowLeft, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { DesignSystem } from '../../constants/DesignSystem';
import AnimatedButton from '../components/ui/AnimatedButton';
import AnimatedInput from '../components/ui/AnimatedInput';
import AnimatedCard from '../components/ui/AnimatedCard';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import { useTheme } from '../context/ThemeContext';

import { Dimensions } from 'react-native';
const { width } = Dimensions.get('window');

interface ForgotPasswordScreenProps {
  navigation: any;
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { tokens, isLightTheme, themeColors } = useTheme();
  const themePrimary = themeColors && themeColors.length > 0 ? themeColors[Math.min(1, themeColors.length - 1)] : DesignSystem.colors.primary;
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email harus diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Format email tidak valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendReset = async () => {
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Reset password sent to:', email);
      setIsSent(true);
      
      setTimeout(() => {
        Alert.alert(
          'Berhasil',
          'Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.',
          [
            {
              text: 'Kembali ke Login',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Gagal mengirim link reset. Coba lagi.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedBackground style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Image source={require('../assets/images/logo_attendify.png')} style={{ width: 300, height: 220, marginBottom: -40 }} resizeMode="contain" />
          <Text style={[styles.subtitle, { color: tokens.textColor, fontSize: 24, fontWeight: '700' }]}>Reset Password</Text>
          <Text style={[styles.brandSubtitle, { color: tokens.subTextColor }]}>Recover your account access</Text>
        </View>

        {/* Main Card */}
        <Animated.View 
          entering={FadeInUp.delay(200).springify()}
          style={styles.cardWrapper}
        >
          <AnimatedCard variant={isLightTheme ? "surface" : "glass"} style={[styles.mainCard, { borderColor: tokens.borderColor }]}>
            {/* Success Message */}
            {isSent && (
              <Animated.View 
                entering={ZoomIn.springify()}
                style={[styles.successAlert, { backgroundColor: isLightTheme ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}
              >
                <CheckCircle size={20} color="#10b981" />
                <Text style={[styles.successAlertText, { color: '#10b981' }]}>Link reset telah dikirim ke email!</Text>
              </Animated.View>
            )}

            {/* Error Message */}
            {errors.general && (
              <Animated.View 
                entering={FadeInDown.springify()}
                style={[styles.errorAlert, { backgroundColor: isLightTheme ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              >
                <AlertCircle size={18} color="#ef4444" />
                <Text style={[styles.errorAlertText, { color: '#ef4444' }]}>{errors.general}</Text>
              </Animated.View>
            )}

            {/* Description */}
            <Text style={[styles.descriptionText, { color: tokens.subTextColor }]}>
              Masukkan email terdaftar Anda untuk menerima instruksi reset password.
            </Text>

            {/* Email Input */}
            <AnimatedInput
              icon={Mail}
              label="Email Terdaftar"
              placeholder="Masukkan email Anda..."
              value={email}
              onChangeText={(text: string) => {
                setEmail(text);
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />


            {/* Send Button */}
            <Animated.View 
              entering={FadeInUp.delay(400).springify()}
              style={styles.buttonWrapper}
            >
              <AnimatedButton
                title={isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
                onPress={handleSendReset}
                loading={isLoading}
                disabled={isLoading}
              />
            </Animated.View>

            {/* Back to Login */}
            <View style={styles.backToLoginContainer}>
              <Text style={[styles.backToLoginText, { color: tokens.subTextColor }]}>Ingat password? </Text>
              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={styles.backToLoginLinkContainer}>
                  <Text style={[styles.backToLoginLink, { color: themePrimary }]}>Kembali ke login</Text>
                  <ArrowRight size={12} color={themePrimary} />
                </View>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        </Animated.View>
      </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
    paddingHorizontal: 0,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: DesignSystem.radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
    marginTop: -10,
    marginBottom: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardWrapper: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  mainCard: {
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  successAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  descriptionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
  },
  infoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginVertical: 20,
    lineHeight: 18,
    textAlign: 'center',
  },
  buttonWrapper: {
    marginVertical: 20,
  },
  backToLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  backToLoginText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  backToLoginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToLoginLink: {
    color: DesignSystem.colors.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
});
