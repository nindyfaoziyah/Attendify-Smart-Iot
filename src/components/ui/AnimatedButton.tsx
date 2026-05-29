import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { DesignSystem } from '@/constants/DesignSystem';
import { useTheme } from '../../context/ThemeContext';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  gradient?: (string[])[];
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
  loading = false,
  icon,
  gradient,
}) => {
  const { themeColors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const onPressIn = () => {
    scale.value = 0.95;
  };

  const onPressOut = () => {
    scale.value = 1;
  };

  const getColors = () => {
    switch (variant) {
      case 'success':
        return gradient || DesignSystem.gradients.success;
      case 'danger':
        return ['#EF4444', '#DC2626'];
      case 'secondary':
        return ['#6B7280', '#4B5563'];
      default:
        return gradient || (themeColors && themeColors.length > 0 ? [
          themeColors[Math.min(1, themeColors.length - 1)],
          themeColors[Math.min(2, themeColors.length - 1)]
        ] : DesignSystem.gradients.primary);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <Animated.View style={[animatedStyle, styles.inner]}>
        <LinearGradient
          colors={getColors() as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            {loading ? (
              <Animated.View style={[styles.loaderSpinner]} />
            ) : icon ? (
              <>
                {icon}
                <Text style={[styles.text, textStyle]}>{title}</Text>
              </>
            ) : (
              <Text style={[styles.text, textStyle]}>{title}</Text>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: DesignSystem.radius.lg,
    overflow: 'hidden',
    ...DesignSystem.shadows.button,
  },
  disabled: {
    opacity: 0.5,
  },
  inner: {
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loaderSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

export default AnimatedButton;

