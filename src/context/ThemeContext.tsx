import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_GRADIENT = ['#0B1E5F', '#1E4FA8', '#2D6CDF', '#6846C1', '#2D6CDF', '#1E4FA8', '#0B1E5F'];

// Helper: detect if the first gradient color is a light color
export const isColorLight = (hex: string): boolean => {
  try {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
  } catch {
    return false;
  }
};

export interface ThemeTokens {
  textColor: string;      // main text
  subTextColor: string;   // secondary / muted text
  labelColor: string;     // form labels, group titles
  cardBg: string;         // card / blur surface
  borderColor: string;    // card borders
  inputBg: string;        // text input background
  iconButtonBg: string;   // top-right icon button bg
}

const DARK_TOKENS: ThemeTokens = {
  textColor: '#ffffff',
  subTextColor: 'rgba(255,255,255,0.7)',
  labelColor: 'rgba(255,255,255,0.5)',
  cardBg: 'rgba(0,0,0,0.3)',
  borderColor: 'rgba(255,255,255,0.15)',
  inputBg: 'rgba(0,0,0,0.25)',
  iconButtonBg: 'rgba(0,0,0,0.2)',
};

const LIGHT_TOKENS: ThemeTokens = {
  textColor: '#1e293b',        // slate-800 — readable, not full black
  subTextColor: '#475569',     // slate-600 — gentle grey
  labelColor: '#64748b',       // slate-500 — section labels
  cardBg: 'rgba(255,255,255,0.75)',  // white card, distinct on frosted bg
  borderColor: 'rgba(0,0,0,0.09)',   // subtle but visible border
  inputBg: 'rgba(255,255,255,0.6)',  // input field bg
  iconButtonBg: 'rgba(0,0,0,0.07)', // icon button bg
};

interface ThemeContextType {
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  themeColors: string[];
  setThemeColors: (colors: string[]) => void;
  isLightTheme: boolean;
  tokens: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkModeState] = useState(true);
  const [themeColors, setThemeColorsState] = useState<string[]>(DEFAULT_GRADIENT);
  const [isLoading, setIsLoading] = useState(true);
  const isLightTheme = themeColors.length > 0 ? isColorLight(themeColors[0]) : false;
  const tokens: ThemeTokens = isLightTheme ? LIGHT_TOKENS : DARK_TOKENS;

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        if (savedTheme !== null) {
          setIsDarkModeState(savedTheme === 'dark');
        }
        const savedGradient = await AsyncStorage.getItem('@attendify_theme');
        if (savedGradient) {
          const parsed = JSON.parse(savedGradient);
          if (parsed && parsed.gradient) {
            setThemeColorsState(parsed.gradient);
          }
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  const setIsDarkMode = async (isDark: boolean) => {
    try {
      setIsDarkModeState(isDark);
      await AsyncStorage.setItem('appTheme', isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setThemeColors = async (colors: string[]) => {
    try {
      const expandedColors = colors.length < 7 ? [...colors, ...[...colors].reverse(), colors[0]].slice(0, 7) : colors;
      setThemeColorsState(expandedColors);
      await AsyncStorage.setItem('@attendify_theme', JSON.stringify({ gradient: expandedColors }));
    } catch (error) {
      console.error('Error saving gradient theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, themeColors, setThemeColors, isLightTheme, tokens }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
