import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'solid' | 'glass';
  padding?: number;
}

export default function AppCard({ children, style, variant = 'glass', padding = 16 }: AppCardProps) {
  const { tokens, isLightTheme } = useTheme();

  const baseStyle: ViewStyle = {
    padding,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.borderColor,
    overflow: 'hidden',
  };

  if (variant === 'glass') {
    return (
      <View style={[baseStyle, { backgroundColor: tokens.cardBg }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[baseStyle, { backgroundColor: tokens.cardBg }, style]}>
      {children}
    </View>
  );
}
