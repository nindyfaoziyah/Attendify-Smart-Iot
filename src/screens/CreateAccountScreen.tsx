import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Dimensions, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserPlus, Mail, Lock, User, Phone, Book, ArrowLeft, Check, Loader, GraduationCap, Users, Eye, EyeOff, IdCard, ShieldCheck } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import AnimatedCard from '../components/ui/AnimatedCard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface CreateAccountScreenProps {
  navigation: any;
}

export default function CreateAccountScreen({ navigation }: CreateAccountScreenProps) {
  const { login } = useAuth();
  const { tokens, isLightTheme, themeColors } = useTheme();
  const themePrimary = themeColors && themeColors.length > 0 ? themeColors[Math.min(1, themeColors.length - 1)] : Colors.attendify.primary;
  const role = 'mahasiswa';
  const [formData, setFormData] = useState({
    fullName: '',
    identifier: '',
    email: '',
    phone: '',
    prodi: '',
    kelas: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nama lengkap harus diisi';
    }

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'NIM harus diisi';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email harus diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    // Phone is optional - only validate if filled
    if (formData.phone.trim() && !/^\d{10,12}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Nomor telepon tidak valid (10-12 digit)';
    }

    // Prodi and Kelas are optional for initial registration
    // Can be added later in profile

    if (!formData.password.trim()) {
      newErrors.password = 'Password harus diisi';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Konfirmasi password harus diisi';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Use centralized API_URL
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          username: formData.identifier,
          phone: formData.phone,
          password: formData.password,
          prodi: formData.prodi,
          kelas: formData.kelas,
          role: 'mahasiswa', // Public registration is forced to mahasiswa
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        const newUser = {
          fullName: formData.fullName,
          email: formData.email,
          nim: formData.identifier,
          prodi: formData.prodi,
          kelas: formData.kelas,
        };

        // Cache for legacy support if needed
        await AsyncStorage.setItem(`@user_${formData.identifier.trim().toLowerCase()}`, JSON.stringify(newUser));
        if (formData.email) {
          await AsyncStorage.setItem(`@user_${formData.email.trim().toLowerCase()}`, JSON.stringify(newUser));
        }
        
        console.log('Account created successfully in backend');
        
        login(role as any, {
          fullName: formData.fullName,
          email: formData.email,
          nim: formData.identifier,
          prodi: formData.prodi,
          kelas: formData.kelas,
        });
      } else {
        setErrors(prev => ({
          ...prev,
          general: result.message || 'Gagal membuat akun.',
        }));
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Gagal terhubung ke server. Coba lagi.',
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
        {/* Header with Back Button */}
        <View style={styles.headerSection}>
          <View style={styles.topRow}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: isLightTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.2)', borderColor: tokens.borderColor }]}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft color={tokens.textColor} size={24} />
            </TouchableOpacity>
          </View>
          
          <Image source={require('../assets/images/logo_attendify.png')} style={{ width: 300, height: 220, marginBottom: -40 }} resizeMode="contain" />
          <Text style={[styles.subtitle, { color: tokens.textColor }]}>Create Account</Text>
        </View>

        {/* Main Card Container */}
        <AnimatedCard variant={isLightTheme ? "surface" : "glass"} style={[styles.cardContainer, { borderColor: tokens.borderColor }]}>
          {/* Role Selector */}
          {/* Public Registration is only for Mahasiswa - Role Selector Removed */}

          {/* Error Message */}
          {errors.general && (
            <View style={[styles.errorBox, { backgroundColor: isLightTheme ? '#ffe5e5' : 'rgba(239, 68, 68, 0.1)', borderColor: isLightTheme ? '#ffcccc' : 'rgba(239, 68, 68, 0.2)' }]}>
              <Text style={[styles.errorText, { color: '#ef4444' }]}>❌ {errors.general}</Text>
            </View>
          )}

          {/* Input Fields */}
          <View style={styles.inputWrapper}>
            {/* Full Name */}
            <View style={[styles.inputContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }, errors.fullName && styles.inputContainerError]}>
              <User size={20} color={themePrimary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: tokens.textColor }]}
                placeholder="Nama Lengkap"
                placeholderTextColor={tokens.labelColor}
                value={formData.fullName}
                onChangeText={(text) => updateFormData('fullName', text)}
                editable={!isLoading}
              />
            </View>
            {errors.fullName && <Text style={styles.errorMsg}>{errors.fullName}</Text>}

            {/* NIM/NIP */}
            <View style={[styles.inputContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }, errors.identifier && styles.inputContainerError]}>
              <IdCard size={20} color={themePrimary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: tokens.textColor }]}
                placeholder={role === 'mahasiswa' ? 'NIM' : role === 'dosen' ? 'NIP' : 'Username'}
                placeholderTextColor={tokens.labelColor}
                value={formData.identifier}
                onChangeText={(text) => updateFormData('identifier', text)}
                editable={!isLoading}
              />
            </View>
            {errors.identifier && <Text style={styles.errorMsg}>{errors.identifier}</Text>}

            {/* Email */}
            <View style={[styles.inputContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }, errors.email && styles.inputContainerError]}>
              <Mail size={20} color={themePrimary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: tokens.textColor }]}
                placeholder="Email"
                placeholderTextColor={tokens.labelColor}
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
            {errors.email && <Text style={styles.errorMsg}>{errors.email}</Text>}

            {/* Phone (Optional) */}
            <View style={[styles.inputContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }, errors.phone && styles.inputContainerError]}>
              <Phone size={20} color={themePrimary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: tokens.textColor }]}
                placeholder="Nomor Telepon (Opsional)"
                placeholderTextColor={tokens.labelColor}
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>
            {errors.phone && <Text style={styles.errorMsg}>{errors.phone}</Text>}

            {/* Program Studi (Mahasiswa only, Optional) */}
            {role === 'mahasiswa' && (
              <>
                <View style={[styles.inputContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }, errors.prodi && styles.inputContainerError]}>
                  <GraduationCap size={20} color={themePrimary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: tokens.textColor }]}
                    placeholder="Program Studi (Opsional)"
                    placeholderTextColor={tokens.labelColor}
                    value={formData.prodi}
                    onChangeText={(text) => updateFormData('prodi', text)}
                    editable={!isLoading}
                  />
                </View>
                {errors.prodi && <Text style={styles.errorMsg}>{errors.prodi}</Text>}
              </>
            )}

            {/* Kelas (Mahasiswa only, Optional) */}
            {role === 'mahasiswa' && (
              <>
                <View style={[styles.inputContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }, errors.kelas && styles.inputContainerError]}>
                  <Users size={20} color={themePrimary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: tokens.textColor }]}
                    placeholder="Kelas (Opsional)"
                    placeholderTextColor={tokens.labelColor}
                    value={formData.kelas}
                    onChangeText={(text) => updateFormData('kelas', text)}
                    editable={!isLoading}
                  />
                </View>
                {errors.kelas && <Text style={styles.errorMsg}>{errors.kelas}</Text>}
              </>
            )}

            {/* Password */}
            <View style={[styles.inputContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }, errors.password && styles.inputContainerError]}>
              <Lock size={20} color={themePrimary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: tokens.textColor }]}
                placeholder="Password"
                placeholderTextColor={tokens.labelColor}
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? (
                  <Eye size={20} color={tokens.labelColor} />
                ) : (
                  <EyeOff size={20} color={tokens.labelColor} />
                )}
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorMsg}>{errors.password}</Text>}

            {/* Confirm Password */}
            <View style={[styles.inputContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor }, errors.confirmPassword && styles.inputContainerError]}>
              <Lock size={20} color={themePrimary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: tokens.textColor }]}
                placeholder="Konfirmasi Password"
                placeholderTextColor={tokens.labelColor}
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                {showConfirmPassword ? (
                  <Eye size={20} color={tokens.labelColor} />
                ) : (
                  <EyeOff size={20} color={tokens.labelColor} />
                )}
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorMsg}>{errors.confirmPassword}</Text>}
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.createButton, isLoading && styles.createButtonLoading]}
            onPress={handleCreateAccount}
            disabled={isLoading}
          >
            <LinearGradient
              colors={isLightTheme ? [themePrimary, themePrimary] : [themePrimary, themePrimary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {isLoading ? (
                <Loader size={20} color="#fff" />
              ) : (
                <>
                  <Text style={styles.createButtonText}>Create Account</Text>
                  <Check size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Terms & Conditions */}
          <Text style={[styles.termsText, { color: tokens.subTextColor }]}>
            By creating an account, you agree to our{' '}
            <Text style={[styles.termsLink, { color: isLightTheme ? themePrimary : '#60A5FA' }]}>Terms & Conditions</Text>
          </Text>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={[styles.signInText, { color: tokens.subTextColor }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} disabled={isLoading}>
              <Text style={[styles.signInLink, { color: isLightTheme ? themePrimary : '#60A5FA' }]}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </AnimatedCard>
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
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 0,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoText: {
    fontSize: 48,
  },
  brandName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
    marginTop: -10,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardContainer: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    marginHorizontal: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.attendify.surfaceVariant,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    gap: 8,
  },
  roleTabActive: {
    backgroundColor: 'rgba(30, 79, 168, 0.1)',
  },
  roleTabText: {
    color: Colors.attendify.neutral,
    fontWeight: '500',
    fontSize: 14,
  },
  roleTabTextActive: {
    color: Colors.attendify.primary,
    fontWeight: '700',
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 6,
    paddingHorizontal: 16,
    height: 52,
  },
  inputContainerError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeIcon: {
    padding: 4,
  },
  eyeText: {
    fontSize: 18,
  },
  errorMsg: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 16,
    fontWeight: '500',
  },
  createButton: {
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  createButtonLoading: {
    opacity: 0.7,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 13,
    color: Colors.attendify.neutral,
    textAlign: 'center',
    marginBottom: 16,
  },
  termsLink: {
    color: Colors.attendify.secondary,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: Colors.attendify.neutral,
    fontSize: 14,
  },
  signInLink: {
    color: Colors.attendify.secondary,
    fontWeight: 'bold',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
