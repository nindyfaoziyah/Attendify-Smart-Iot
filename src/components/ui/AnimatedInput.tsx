import React, { useRef, useEffect } from 'react';
import {
  TextInput, View, StyleSheet, ViewStyle,
  TextInputProps, Animated, Platform, Text, TouchableOpacity
} from 'react-native';
import { BlurView } from 'expo-blur';
import { DesignSystem } from '../../../constants/DesignSystem';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

interface AnimatedInputProps extends TextInputProps {
  icon?: LucideIcon;
  iconColor?: string;
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  floatingLabel?: boolean;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  icon: Icon,
  iconColor,
  label,
  error,
  containerStyle,
  floatingLabel = false,
  placeholder,
  ...props
}) => {
  const { tokens, isLightTheme } = useTheme();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const styleId = 'animated-input-autofill-fix';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus, 
          input:-webkit-autofill:active {
            transition: background-color 5000s ease-in-out 0s !important;
            -webkit-text-fill-color: white !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: DesignSystem.animation.duration,
      useNativeDriver: false,
    }).start();
    props.onFocus?.({} as any);
  };

  const handleBlur = () => {
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: DesignSystem.animation.duration,
      useNativeDriver: false,
    }).start();
    setIsFocused(false);
    props.onBlur?.({} as any);
  };

  const glowInterpolation = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      'rgba(30, 79, 168, 0)',
      'rgba(30, 79, 168, 0.3)',
    ],
  });

  const borderColorAnimation = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      tokens.borderColor,
      isLightTheme ? '#1E4FA8' : DesignSystem.colors.primary,
    ],
  });

  const effectiveIconColor = iconColor || (isLightTheme ? '#1E4FA8' : DesignSystem.colors.primary);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && floatingLabel && (
        <Text style={[
          styles.label,
          isFocused || hasValue ? styles.labelFloat : styles.labelDefault,
        ]}>
          {label}
        </Text>
      )}
      
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            shadowColor: glowInterpolation as any,
            shadowOpacity: 1,
          },
        ]}
      >
        <BlurView intensity={DesignSystem.blur} style={styles.blur}>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor },
              error ? styles.errorBorder : styles.defaultBorder,
              isFocused && styles.focusedBorder,
            ]}
          >
            {Icon && (
              <Icon
                size={20}
                color={isFocused ? (isLightTheme ? '#1E4FA8' : DesignSystem.colors.primary) : effectiveIconColor}
                style={styles.icon}
              />
            )}
            <TextInput
              {...props}
              placeholder={label && floatingLabel ? '' : placeholder}
              placeholderTextColor={tokens.labelColor}
              style={[
                styles.input,
                { 
                  paddingLeft: Icon ? 40 : 16, 
                  paddingRight: props.rightIcon ? 44 : 16, 
                  color: tokens.textColor,
                  ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})
                } as any,
              ]}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChangeText={(text) => {
                setHasValue(!!text);
                props.onChangeText?.(text);
              }}
              secureTextEntry={props.secureTextEntry}
              editable={props.editable !== false}
            />
            {props.rightIcon && (() => {
              const RightIcon = props.rightIcon;
              return (
                <TouchableOpacity onPress={props.onRightIconPress} style={styles.rightIconContainer}>
                  <RightIcon size={20} color={tokens.subTextColor} />
                </TouchableOpacity>
              );
            })()}
          </View>
        </BlurView>
      </Animated.View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: DesignSystem.spacing.md,
  },
  label: {
    fontSize: DesignSystem.typography.caption,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    fontWeight: '500',
  },
  labelFloat: {
    fontSize: DesignSystem.typography.caption,
    color: DesignSystem.colors.primary,
    fontWeight: '600',
  },
  labelDefault: {
    fontSize: DesignSystem.typography.body,
    color: 'rgba(255,255,255,0.5)',
  },
  inputWrapper: {
    borderRadius: DesignSystem.radius.md,
    overflow: 'hidden',
    ...DesignSystem.shadows.card,
  },
  blur: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: DesignSystem.radius.md,
    borderWidth: 1,
  },
  defaultBorder: {
    borderColor: DesignSystem.colors.glassBorder,
  },
  focusedBorder: {
    borderColor: DesignSystem.colors.primary,
  },
  errorBorder: {
    borderColor: DesignSystem.colors.error,
  },
  icon: {
    position: 'absolute',
    left: 12,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: DesignSystem.typography.body,
    color: '#FFF',
    fontWeight: '500',
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: DesignSystem.typography.caption,
    color: DesignSystem.colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default AnimatedInput;
