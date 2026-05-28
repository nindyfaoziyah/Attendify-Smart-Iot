import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { BarChart3 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface AttendanceData {
  subject: string;
  attendance: number;
  total: number;
  attended: number;
}

interface AttendanceChartProps {
  data: AttendanceData[];
  title?: string;
  showLegend?: boolean;
  containerStyle?: any;
}

export const AttendanceChart: React.FC<AttendanceChartProps> = ({ 
  data, 
  title,
  showLegend = true,
  containerStyle 
}) => {
  const { tokens, isLightTheme } = useTheme();
  const maxValue = 100;

  const getColor = (percentage: number) => {
    if (percentage >= 80) return '#22C55E';
    if (percentage >= 60) return '#EAB308';
    return '#EF4444';
  };

  return (
    <View style={containerStyle}>
      {title && (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <BarChart3 color={Colors.ai.primary} size={20} />
            <Text style={[styles.title, { color: tokens.textColor }]}>{title}</Text>
          </View>
        </View>
      )}

      <View style={[styles.chartContainer, {
        backgroundColor: isLightTheme ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
        borderColor: tokens.borderColor,
      }]}>
        {data.map((item, index) => {
          const barColor = getColor(item.attendance);

          return (
            <View key={index} style={styles.chartRow}>
              <View style={styles.labelCol}>
                <Text style={[styles.label, { color: tokens.textColor }]} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Text style={[styles.meta, { color: tokens.subTextColor }]}>
                  {item.attended}/{item.total} kelas
                </Text>
              </View>

              <View style={[styles.barSection, {
                backgroundColor: isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)',
              }]}>
                <LinearGradient
                  colors={[barColor, `${barColor}80`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.bar, { width: `${item.attendance}%` }]}
                />
                <Text style={styles.barText}>{item.attendance}%</Text>
              </View>
            </View>
          );
        })}
      </View>

      {showLegend && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={[styles.legendText, { color: tokens.subTextColor }]}>Baik (≥80%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
            <Text style={[styles.legendText, { color: tokens.subTextColor }]}>Cukup (60-79%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.legendText, { color: tokens.subTextColor }]}>Kurang (&lt;60%)</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  chartRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 24,
    gap: 8,
  },
  labelCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
  },
  barSection: {
    width: '100%',
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  bar: {
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  barText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    position: 'absolute',
    left: 8,
  },
  legend: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
});
