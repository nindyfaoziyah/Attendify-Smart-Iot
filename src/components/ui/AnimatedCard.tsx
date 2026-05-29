import React from 'react';
import {
  View, StyleSheet, ViewStyle, Pressable, StyleProp
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, useSharedValue,
  useAnimatedStyle, withSpring
} from 'react-native-reanimated';
import { DesignSystem } from '../../../constants/DesignSystem';
import { useTheme } from '../../context/ThemeContext';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'glass' | 'gradient' | 'surface';
  gradient?: [string, string, string?];
  delay?: number;
  enableScale?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  onPress,
  variant = 'glass',
  gradient,
  delay = 0,
  enableScale = true,
}) => {
  const { tokens } = useTheme();
  const scaleValue = useSharedValue(1);
  
  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePressIn = () => {
    if (enableScale) {
      scaleValue.value = withSpring(1.02, {
        damping: 10,
        mass: 1,
        overshootClamping: false,
      });
    }
  };

  const handlePressOut = () => {
    if (enableScale) {
      scaleValue.value = withSpring(1, {
        damping: 10,
        mass: 1,
        overshootClamping: false,
      });
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'gradient':
        return undefined;
      case 'surface':
      case 'glass':
      default:
        return tokens.cardBg;
    }
  };

const getGradientColors = (): readonly [string, string] | readonly [string, string, string] => {
    if (gradient) return gradient as unknown as readonly [string, string, string];
    if (variant === 'gradient') {
      return DesignSystem.gradients.primary;
    }
    return [DesignSystem.colors.glass, DesignSystem.colors.surfaceVariant];
  };

  const content = (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={[animatedScaleStyle]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      <View
        style={[
          styles.card,
          variant === 'gradient' ? styles.gradientCard : styles.glassCard,
          style,
        ]}
      >
        {(variant === 'glass' || variant === 'surface') && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: getBackgroundColor(),
                borderColor: tokens.borderColor,
                borderWidth: 1,
                borderRadius: DesignSystem.radius.lg,
              },
            ]}
          />
        )}
        {variant === 'gradient' && (
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: DesignSystem.radius.lg }]}
          />
        )}
        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );

  if (onPress) {
    return content;
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: DesignSystem.radius.lg,
    overflow: 'hidden',
  },
  gradientCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  glassCard: {
    borderWidth: 1,
    borderColor: DesignSystem.colors.glassBorder,
  },
  content: {
    zIndex: 1,
  },
});

export default AnimatedCard;
