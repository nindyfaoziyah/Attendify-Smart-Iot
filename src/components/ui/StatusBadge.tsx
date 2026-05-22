import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { CheckCircle, XCircle, Clock, AlertCircle, ShieldAlert, EyeOff } from 'lucide-react-native';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const getStatusConfig = (status: string) => {
  const s = status?.toUpperCase() || 'UNKNOWN';
  switch(s) {
    case 'VERIFIED':
    case 'APPROVED': 
      return { color: '#10B981', text: s === 'VERIFIED' ? 'Verified' : 'Disetujui', icon: CheckCircle };
    case 'REJECTED': 
      return { color: '#EF4444', text: 'Ditolak', icon: XCircle };
    case 'IN_PROGRESS': 
    case 'PENDING':
    case 'REVIEW_REQUIRED':
      return { color: '#F59E0B', text: s === 'REVIEW_REQUIRED' ? 'Perlu Review' : 'Menunggu', icon: Clock };
    case 'UNKNOWN_FACE':
      return { color: '#6B7280', text: 'Wajah Tak Dikenal', icon: EyeOff };
    case 'SPOOF_ATTEMPT':
    case 'SPOOF_DETECTED':
      return { color: '#E11D48', text: 'Spoof Terdeteksi', icon: ShieldAlert };
    case 'OUT_OF_ZONE':
      return { color: '#8B5CF6', text: 'Tidak Terdeteksi', icon: ShieldAlert };
    case 'RESOLVED':
      return { color: '#059669', text: 'Selesai', icon: CheckCircle };
    default: 
      return { color: '#F59E0B', text: 'Menunggu', icon: AlertCircle };
  }
};

export default function StatusBadge({ status, size = 'medium', style }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, iconSize: 10 },
    medium: { paddingHorizontal: 10, paddingVertical: 4, fontSize: 11, iconSize: 14 },
    large: { paddingHorizontal: 14, paddingVertical: 6, fontSize: 14, iconSize: 18 }
  };

  const currSize = sizeStyles[size];

  return (
    <View style={[styles.badge, { backgroundColor: `${config.color}20` }, style]}>
      <Icon size={currSize.iconSize} color={config.color} />
      <Text style={[styles.text, { color: config.color, fontSize: currSize.fontSize }]}>
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start'
  },
  text: {
    fontWeight: '700',
  }
});
