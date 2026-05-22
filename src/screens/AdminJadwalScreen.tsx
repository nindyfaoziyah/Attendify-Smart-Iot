import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Animated,
  Dimensions,
  TextInput,
  Linking,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Users,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Clock,
  FileX,
  AlertCircle,
  Sparkles,
  Search,
  Send,
  X,
  Calendar,
  MapPin,
  BookOpen,
  TrendingUp,
  Filter,
  ChevronDown,
  Download,
  MessageCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AnimatedBackground from '../components/ui/AnimatedBackground';
import * as FileSystem from 'expo-file-system';
import { Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import * as XLSX from 'xlsx';
import { useTheme } from '../context/ThemeContext';

import * as Print from 'expo-print';

const { width, height } = Dimensions.get('window');

type StatusType = 'Hadir' | 'Telat' | 'Izin' | 'Alfa';

const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const dayLabels: Record<string, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
};

// ============================================================
// DESIGN SYSTEM - Modern Light Theme
// ============================================================
const statusColor: Record<string, string> = {
  Hadir: '#22c55e',
  Telat: '#f59e0b',
  Izin: '#3b82f6',
  Alfa: '#ef4444',
  hadir: '#22c55e',
  terlambat: '#f59e0b',
  izin: '#3b82f6',
  alfa: '#ef4444',
};

const statusLabel: Record<string, string> = {
  hadir: 'Hadir',
  terlambat: 'Telat',
  izin: 'Izin',
  alfa: 'Alfa',
};

// ============================================================
// ANIMATED COMPONENTS
// ============================================================

const FadeInView = ({ children, delay = 0, style }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
};

const ScalePress = ({ children, onPress, style, disabled = false }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }], width: '100%' }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const SkeletonShimmer = () => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const { tokens } = useTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={[styles.skeletonCard, { backgroundColor: tokens.cardBg }]}>
      <View style={[styles.skeletonLine, { width: '60%', height: 20, marginBottom: 12, backgroundColor: tokens.borderColor }]} />
      <View style={[styles.skeletonLine, { width: '40%', height: 14, marginBottom: 8, backgroundColor: tokens.borderColor }]} />
      <View style={[styles.skeletonLine, { width: '80%', height: 14, backgroundColor: tokens.borderColor }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
            backgroundColor: 'rgba(255,255,255,0.1)',
          },
        ]}
      />
    </View>
  );
};

// ============================================================
// TOAST COMPONENT
// ============================================================

const Toast = ({ visible, message, type = 'success', onHide }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(onHide, 3000);
      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -30, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const bgColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        { opacity, transform: [{ translateY }], backgroundColor: bgColor },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// ============================================================
// HELPER COMPONENTS
// ============================================================

const AnimatedInfoCard = ({ children, delay = 0 }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

const AnimatedStatCard = ({ index, color, number, label, icon }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const { tokens, isLightTheme } = useTheme();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity,
          transform: [{ scale }],
          borderLeftColor: color,
          backgroundColor: isLightTheme ? 'rgba(30, 79, 168, 0.05)' : 'rgba(15, 23, 42, 0.6)'
        },
      ]}
    >
      {icon}
      <Text style={[styles.statNumber, { color: tokens.textColor }]}>{number}</Text>
      <Text style={[styles.statLabel, { color: tokens.subTextColor }]}>{label}</Text>
    </Animated.View>
  );
};

const ColoredIcon = ({ icon: Icon, size, color }: any) => {
  return <Icon size={size} color={color} />;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminJadwalScreen({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const navigation = useNavigation<any>();
  const { tokens, isLightTheme } = useTheme();

  // ── State ────────────────────────────────────────────────
  const [selectedDay, setSelectedDay] = useState('senin');
  const [jadwalPerHari, setJadwalPerHari] = useState<Record<string, any[]>>({});
  const [selectedJadwal, setSelectedJadwal] = useState<any>(null);
  const [absensiData, setAbsensiData] = useState<any[]>([]);
  const [loadingJadwal, setLoadingJadwal] = useState(true);
  const [loadingAbsensi, setLoadingAbsensi] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nama' | 'tanggal'>('nama');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [detailAnim] = useState(new Animated.Value(0));
  const [headerScaleAnim] = useState(new Animated.Value(1));
  const [headerOpacityAnim] = useState(new Animated.Value(1));
  const [selectedKelasId, setSelectedKelasId] = useState<any>(null);
  const [selectedKelas, setSelectedKelas] = useState('');

  // ── Effect Set Selected Kelas Default ────────────────────
  useEffect(() => {
    if (absensiData.length > 0) {
      const classes = Array.from(new Set(absensiData.map((item: any) => item.nama_kelas || item.kelas).filter(Boolean))) as string[];
      if (classes.length > 0 && !selectedKelas) {
        setSelectedKelas(classes[0]);
      }
    } else {
      setSelectedKelas('');
    }
  }, [absensiData]);

  // ── Fetch Jadwal ─────────────────────────────────────────
  const fetchJadwal = useCallback(async () => {
    setLoadingJadwal(true);
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/jadwal`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (json.status === 'success' && json.data) {
        const grouped: Record<string, any[]> = {};
        for (const j of json.data) {
          const hari = (j.hari || 'senin').toLowerCase();
          if (!grouped[hari]) grouped[hari] = [];
          grouped[hari].push(j);
        }
        setJadwalPerHari(grouped);
      }
    } catch (error) {
      console.error('Error fetching jadwal:', error);
      showToast('Gagal memuat jadwal', 'error');
    } finally {
      setLoadingJadwal(false);
    }
  }, []);

  // ── Fetch Absensi ────────────────────────────────────────
  const fetchAbsensi = useCallback(async (jadwalId: number, kelasId: number) => {
    setLoadingAbsensi(true);
    const DUMMY_ABSENSI = [
      { id_absensi: 1, name: 'Budi Santoso', nim: '210001', nama_mk: 'Pemrograman Web', kelas: 'A', tanggal: new Date().toISOString(), waktu_datang: '08:00', status: 'hadir' },
      { id_absensi: 2, name: 'Siti Aminah', nim: '210002', nama_mk: 'Pemrograman Web', kelas: 'A', tanggal: new Date().toISOString(), waktu_datang: '08:15', status: 'terlambat' },
      { id_absensi: 3, name: 'Andi Wijaya', nim: '210003', nama_mk: 'Pemrograman Web', kelas: 'B', tanggal: new Date().toISOString(), waktu_datang: '-', status: 'alfa' },
      { id_absensi: 4, name: 'Rina Melati', nim: '210004', nama_mk: 'Pemrograman Web', kelas: 'C', tanggal: new Date().toISOString(), waktu_datang: '-', status: 'izin' },
      { id_absensi: 5, name: 'Tono Subagyo', nim: '210005', nama_mk: 'Pemrograman Web', kelas: 'A', tanggal: new Date().toISOString(), waktu_datang: '07:55', status: 'hadir' },
      { id_absensi: 6, name: 'Dewi Lestari', nim: '210006', nama_mk: 'Pemrograman Web', kelas: 'B', tanggal: new Date().toISOString(), waktu_datang: '08:05', status: 'hadir' },
    ];

    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/absensi?jadwal_id=${jadwalId}&class_id=${kelasId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (json.status === 'success' && json.data && json.data.length > 0) {
        setAbsensiData(json.data);
      } else {
        setAbsensiData(DUMMY_ABSENSI);
      }
    } catch (error) {
      console.error('Error fetching absensi:', error);
      showToast('Menggunakan data dummy karena gagal memuat', 'info');
      setAbsensiData(DUMMY_ABSENSI);
    } finally {
      setLoadingAbsensi(false);
    }
  }, []);

  useEffect(() => {
    fetchJadwal();
  }, [fetchJadwal]);

  // ── Toast Helper ─────────────────────────────────────────
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast({ ...toast, visible: false });

  // ── Select Jadwal ────────────────────────────────────────
  const handleSelectJadwal = (jadwal: any) => {
    setSelectedJadwal(jadwal);
    fetchAbsensi(jadwal.id, jadwal.kelas_id);
    Animated.timing(detailAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  const handleBack = () => {
    Animated.timing(detailAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedJadwal(null);
      setAbsensiData([]);
      setSearchQuery('');
      setFilterStatus('all');
    });
  };

  // ── Filter & Sort ────────────────────────────────────────
  const filteredAbsensi = absensiData
    .filter((item: any) => {
      const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const itemKelas = item.nama_kelas || item.kelas;
      const matchesKelas = selectedKelas ? itemKelas === selectedKelas : true;
      return matchesSearch && matchesStatus && matchesKelas;
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'nama') return (a.name || '').localeCompare(b.name || '');
      return new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime();
    });

  // ── Rekap ────────────────────────────────────────────────
  const rekap = {
    hadir: absensiData.filter((d: any) => d.status === 'hadir').length,
    telat: absensiData.filter((d: any) => d.status === 'terlambat').length,
    izin: absensiData.filter((d: any) => d.status === 'izin').length,
    alfa: absensiData.filter((d: any) => d.status === 'alfa').length,
  };
  const totalMahasiswa = selectedJadwal?.total_students || 0;
  const persentaseKehadiran = totalMahasiswa > 0
    ? Math.round(((rekap.hadir + rekap.telat) / totalMahasiswa) * 100)
    : 0;

  // ── Export PDF ───────────────────────────────────────────
  const downloadPDF = async () => {
    if (filteredAbsensi.length === 0) {
      showToast('Tidak ada data absensi untuk diekspor', 'error');
      return;
    }
    setLoadingPDF(true);
    try {
      let htmlRows = filteredAbsensi.map((item: any) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.nim || '-'}</td>
          <td>${item.nama_mk || selectedJadwal?.subject || '-'}</td>
          <td>${item.nama_kelas || item.kelas || selectedKelas}</td>
          <td>${item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}</td>
          <td>${item.waktu_datang || '-'}</td>
          <td>${(item.status || '').toUpperCase()}</td>
        </tr>
      `).join('');

      let htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { text-align: center; color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; color: #333; }
            </style>
          </head>
          <body>
            <h1>Laporan Absensi ${selectedKelas ? `Kelas ${selectedKelas}` : ''}</h1>
            <table>
              <tr>
                <th>Nama</th>
                <th>NIM</th>
                <th>Mata Kuliah</th>
                <th>Kelas</th>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Status</th>
              </tr>
              ${htmlRows}
            </table>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentDocument?.write(htmlContent);
        iframe.contentDocument?.close();

        // Wait for iframe content to load then print
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          showToast('Berhasil membuka menu cetak PDF', 'success');
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 2000);
        }, 500);
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const pdfName = selectedKelas ? `absensi_kelas_${selectedKelas}.pdf` : 'absensi.pdf';
        // @ts-ignore
        const newUri = FileSystem.documentDirectory + pdfName;
        
        await FileSystem.moveAsync({
          from: uri,
          to: newUri,
        });

        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Bagikan PDF Absensi'
        });
        showToast('Berhasil export PDF', 'success');
      }
    } catch (err: any) {
      console.error('PDF Error:', err);
      showToast('Gagal export PDF', 'error');
    } finally {
      setLoadingPDF(false);
    }
  };

  // ── Export Excel ─────────────────────────────────────────
  const downloadExcel = async () => {
    if (filteredAbsensi.length === 0) {
      showToast('Tidak ada data absensi untuk diekspor', 'error');
      return;
    }
    setLoadingExcel(true);
    try {
      const dataToExport = filteredAbsensi.map((item: any) => ({
        'Nama Mahasiswa': item.name,
        'NIM': item.nim || '-',
        'Mata Kuliah': item.nama_mk || selectedJadwal?.subject || '-',
        'Kelas': item.nama_kelas || item.kelas || selectedKelas,
        'Tanggal': item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-',
        'Waktu Datang': item.waktu_datang || '-',
        'Status': (item.status || '').toUpperCase()
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Absensi");

      const filename = selectedKelas ? `absensi_kelas_${selectedKelas}.xlsx` : `absensi.xlsx`;

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, filename);
        showToast('Berhasil export Excel', 'success');
      } else {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: "xlsx" });
        // @ts-ignore
        const fileUri = FileSystem.documentDirectory + filename;

        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          // @ts-ignore
          encoding: FileSystem.EncodingType.Base64
        });

        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Bagikan Excel Absensi'
        });
        showToast('Berhasil export Excel', 'success');
      }
    } catch (err: any) {
      console.error('Excel Error:', err);
      showToast('Gagal export Excel', 'error');
    } finally {
      setLoadingExcel(false);
    }
  };

  // ── WhatsApp ─────────────────────────────────────────────
  const handleWhatsApp = async () => {
    const message = `Assalamu’alaikum,
Dengan hormat,

Berikut kami sampaikan laporan kehadiran (absensi) mahasiswa untuk kelas ${selectedKelas || 'yang bersangkutan'} pada hari ini.
hari ini.

Laporan ini berisi data kehadiran mahasiswa yang telah direkap secara sistem, meliputi status hadir, izin, maupun ketidakhadiran.

Kami mohon kesediaannya untuk meninjau laporan tersebut sebagai bahan monitoring dan evaluasi proses pembelajaran.

Apabila terdapat hal yang perlu dikonfirmasi atau ditindaklanjuti, kami siap untuk memberikan informasi tambahan.

Demikian laporan ini kami sampaikan.
Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.

Wassalamu’alaikum Warahmatullahi Wabarakatuh.`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/?text=${encodedMessage}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showToast('WhatsApp tidak didukung di perangkat ini', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Gagal membuka WhatsApp', 'error');
    }
  };

  // ── Download Report (wrapper) ────────────────────────────
  const downloadReport = async (type: 'pdf' | 'excel') => {
    if (type === 'pdf') {
      await downloadPDF();
    } else {
      await downloadExcel();
    }
  };

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      {selectedJadwal ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* HEADER */}
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.backButtonGradient}
                >
                  {/* @ts-ignore */}
                  <ArrowLeft color="#60a5fa" size={24} />
                </LinearGradient>
              </TouchableOpacity>
              <Text style={[styles.title, { color: tokens.textColor }]}>{selectedJadwal?.class_name || 'Detail Jadwal'}</Text>
              {/* @ts-ignore */}
              <Sparkles color="#60a5fa" size={20} />
            </View>
          </View>

          {/* INFO JADWAL */}
          <AnimatedInfoCard delay={0}>
            <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconBg}
                >
                  {/* @ts-ignore */}
                  <GraduationCap size={20} color="#fff" />
                </LinearGradient>
                <Text style={[styles.section, { color: tokens.textColor }]}>Informasi Jadwal Kuliah</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: tokens.subTextColor }]}>👨‍🏫 Dosen</Text>
                  <Text style={[styles.infoValue, { color: tokens.textColor }]}>{selectedJadwal?.dosen_name || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: tokens.subTextColor }]}>📚 Mata Kuliah</Text>
                  <Text style={[styles.infoValue, { color: tokens.textColor }]}>{selectedJadwal?.subject || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: tokens.subTextColor }]}>🏫 Ruangan</Text>
                  <Text style={[styles.infoValue, { color: tokens.textColor }]}>{selectedJadwal?.ruang || '-'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: tokens.subTextColor }]}>🕐 Jam Kuliah</Text>
                  <Text style={[styles.infoValue, { color: tokens.textColor }]}>{`${selectedJadwal?.jam_mulai || '-'} - ${selectedJadwal?.jam_selesai || '-'}`}</Text>
                </View>
              </View>
            </BlurView>
          </AnimatedInfoCard>

          {/* REKAP ABSENSI */}
          <AnimatedInfoCard delay={100}>
            <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#6366f1', '#4f46e5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconBg}
                >
                  {/* @ts-ignore */}
                  <Users size={20} color="#fff" />
                </LinearGradient>
                <Text style={[styles.section, { color: tokens.textColor }]}>Rekap Absensi Mahasiswa</Text>
              </View>
              <View style={styles.statGrid}>
                <AnimatedStatCard
                  index={0}
                  color="#22c55e"
                  number={rekap.hadir}
                  label="Hadir"
                  icon={<ColoredIcon icon={CheckCircle} size={24} color="#22c55e" />}
                />
                <AnimatedStatCard
                  index={1}
                  color="#eab308"
                  number={rekap.telat}
                  label="Telat"
                  icon={<ColoredIcon icon={Clock} size={24} color="#eab308" />}
                />
                <AnimatedStatCard
                  index={2}
                  color="#2563eb"
                  number={rekap.izin}
                  label="Izin"
                  icon={<ColoredIcon icon={FileX} size={24} color="#2563eb" />}
                />
                <AnimatedStatCard
                  index={3}
                  color="#ef4444"
                  number={rekap.alfa}
                  label="Alfa"
                  icon={<ColoredIcon icon={AlertCircle} size={24} color="#ef4444" />}
                />
              </View>
              <View style={[styles.progressBar, { borderTopColor: tokens.borderColor }]}>
                <View style={styles.progressLabelContainer}>
                  <Text style={[styles.progressLabel, { color: tokens.subTextColor }]}>Total Kehadiran</Text>
                  <Text style={[styles.progressPercentage, { color: tokens.textColor }]}>{persentaseKehadiran}%</Text>
                </View>
                <LinearGradient
                  colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressBarContainer}
                >
                  <LinearGradient
                    colors={['#22c55e', '#16a34a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      { width: `${persentaseKehadiran}%` },
                    ]}
                  />
                </LinearGradient>
              </View>
            </BlurView>
          </AnimatedInfoCard>

          {/* FILTER KELAS */}
          {Array.from(new Set(absensiData.map(item => item.nama_kelas || item.kelas).filter(Boolean))).length > 0 && (
            <AnimatedInfoCard delay={150}>
              <View style={styles.filterKelasContainer}>
                <Text style={[styles.filterKelasLabel, { color: tokens.textColor }]}>Filter Kelas:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kelasScroll}>
                  {Array.from(new Set(absensiData.map(item => item.nama_kelas || item.kelas).filter(Boolean))).map((kls: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.kelasChip, { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor }, selectedKelas === kls && styles.kelasChipActive]}
                      onPress={() => setSelectedKelas(kls)}
                    >
                      <Text style={[styles.kelasChipText, { color: tokens.subTextColor }, selectedKelas === kls && styles.kelasChipTextActive]}>
                        Kelas {kls}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </AnimatedInfoCard>
          )}

          {/* DAFTAR ABSENSI */}
          <AnimatedInfoCard delay={200}>
            <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.card, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#ec4899', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconBg}
                >
                  {/* @ts-ignore */}
                  <FileText size={20} color="#fff" />
                </LinearGradient>
                <Text style={[styles.section, { color: tokens.textColor }]}>Daftar Absensi ({filteredAbsensi.length})</Text>
              </View>

              {/* SEARCH & FILTER */}
              <View style={[styles.searchContainer, { backgroundColor: tokens.inputBg, borderColor: tokens.borderColor, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }]}>
                {/* @ts-ignore */}
                <Search size={18} color={tokens.subTextColor} />
                <TextInput
                  style={{ flex: 1, height: 44, color: tokens.textColor, marginLeft: 10 }}
                  placeholder="Cari nama mahasiswa..."
                  placeholderTextColor={tokens.subTextColor}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={[styles.tableHeader, { borderBottomColor: tokens.borderColor }]}>
                <View style={styles.tableCol1}><Text style={[styles.tableHeaderText, { color: tokens.subTextColor }]}>Mahasiswa</Text></View>
                <View style={styles.tableCol2}><Text style={[styles.tableHeaderText, { color: tokens.subTextColor }]}>Waktu</Text></View>
                <View style={styles.tableCol3}><Text style={[styles.tableHeaderText, { color: tokens.subTextColor }]}>Status</Text></View>
              </View>

              {filteredAbsensi.length > 0 ? (
                filteredAbsensi.map((item: any, idx: number) => (
                  <View key={item.id_absensi || idx} style={[styles.tableRow, { borderBottomColor: tokens.borderColor }]}>
                    <View style={styles.tableCol1}>
                      <Text style={[styles.tableText, { color: tokens.textColor, fontWeight: 'bold' }]}>{item.name}</Text>
                      <Text style={[styles.tableText, { color: tokens.subTextColor, fontSize: 11 }]}>{item.nim}</Text>
                    </View>
                    <View style={styles.tableCol2}>
                      <Text style={[styles.tableText, { color: tokens.textColor }]}>{item.waktu_datang || '-'}</Text>
                    </View>
                    <View style={styles.tableCol3}>
                      <View style={styles.statusBadge}>
                        <LinearGradient
                          colors={[statusColor[item.status] + '30', statusColor[item.status] + '10']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.statusBadgeGradient}
                        >
                          <Text style={[styles.tableText, { color: statusColor[item.status], fontWeight: '600' }]}>
                            {statusLabel[item.status] || item.status}
                          </Text>
                        </LinearGradient>
                      </View>
                      <Text style={[styles.tableCol3, styles.tableText, { fontSize: 12 }]}>
                        {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Tidak ada data</Text>
              )}
            </BlurView>
          </AnimatedInfoCard>

          {/* EXPORT BUTTONS & WHATSAPP */}
          <AnimatedInfoCard delay={300}>
            <View style={styles.buttonContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.exportBtn,
                  styles.excelBtn,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
                onPress={() => downloadReport('excel')}
                disabled={loadingExcel}
              >
                {loadingExcel ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    {/* @ts-ignore */}
                    <FileSpreadsheet size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Excel</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.exportBtn,
                  styles.pdfBtn,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
                onPress={() => downloadReport('pdf')}
                disabled={loadingPDF}
              >
                {loadingPDF ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    {/* @ts-ignore */}
                    <FileText size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>PDF</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={[styles.buttonContainer, { marginTop: 0 }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.exportBtn,
                  styles.waBtn,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
                onPress={handleWhatsApp}
              >
                {/* @ts-ignore */}
                <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Kirim WhatsApp</Text>
              </Pressable>
            </View>
          </AnimatedInfoCard>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* HEADER */}
          {!isEmbedded && (
            <View style={styles.headerContainer}>
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.backButtonGradient}
                  >
                    <ChevronLeft color={tokens.textColor} size={24} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Day Selector */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={[
                    styles.kelasChip,
                    { backgroundColor: tokens.iconButtonBg, borderColor: tokens.borderColor },
                    selectedDay === day && styles.kelasChipActive
                  ]}
                >
                  <Text style={[
                    styles.kelasChipText,
                    { color: tokens.subTextColor },
                    selectedDay === day && styles.kelasChipTextActive
                  ]}>{dayLabels[day]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.klasListContainer}
          >
            {loadingJadwal ? (
              <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 50 }} />
            ) : (
              (jadwalPerHari[selectedDay] || []).length > 0 ? (
                (jadwalPerHari[selectedDay] || []).map((jadwal: any, index: number) => (
                  <Pressable
                    key={jadwal.id_jadwal || index}
                    style={[styles.klasCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}
                    onPress={() => setSelectedJadwal(jadwal)}
                  >
                    <View style={styles.klasCardHeader}>
                      <View>
                        <Text style={[styles.klasMatkul, { color: tokens.textColor }]}>{jadwal.subject || '-'}</Text>
                        <Text style={[styles.klasName, { color: tokens.textColor }]}>{jadwal.class_name || '-'}</Text>
                      </View>
                      <ChevronRight color="#60a5fa" size={20} />
                    </View>
                    <View style={styles.klasInfoRow}>
                      <Text style={styles.klasInfo}>👨‍🏫 {jadwal.dosen_name || '-'}</Text>
                      <Text style={styles.klasInfo}>⏰ {jadwal.jam_mulai || '-'}</Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: tokens.subTextColor }]}>Tidak ada jadwal</Text>
              )
            )}
          </ScrollView>
        </ScrollView>
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  // HEADER
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },

  // CARD BASE
  card: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  expandedCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    marginTop: -10,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // SECTION HEADER
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // INFO GRID
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: '47%',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },

  // STAT GRID
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 18,
  },
  statCard: {
    width: '47%',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 5,
    marginBottom: 10,
    borderLeftWidth: 3,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // PROGRESS BAR
  progressBar: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },

  // TABLE STYLING
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableCol1: {
    flex: 2,
  },
  tableCol2: {
    flex: 1.2,
  },
  tableCol3: {
    flex: 0.8,
  },
  tableText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
  },
  statusBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  // BUTTON STYLING
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  excelBtn: {
    backgroundColor: '#16a34a',
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  pdfBtn: {
    backgroundColor: '#dc2626',
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  waBtn: {
    backgroundColor: '#25D366',
    borderColor: 'rgba(37, 211, 102, 0.3)',
  },

  // FILTER KELAS CHIPS
  filterKelasContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filterKelasLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  kelasScroll: {
    flexDirection: 'row',
  },
  kelasChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  kelasChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  kelasChipText: {
    fontWeight: '600',
    fontSize: 13,
  },
  kelasChipTextActive: {
    color: '#fff',
  },

  // KELAS LIST
  klasListContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  klasCard: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  klasCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  klasName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  klasMatkul: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  klasInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  klasInfo: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  dayLabel: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 40,
  },

  // TOAST STYLES
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 1000,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // SKELETON STYLES
  skeletonCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  skeletonLine: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 8,
  },
});
