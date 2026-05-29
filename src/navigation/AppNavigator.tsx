import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import JadwalScreen from '../screens/JadwalScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ScanScreen from '../screens/ScanScreen';
import NotificationScreen from '../screens/NotificationScreen';
import DosenDashboardScreen from '../screens/DosenDashboardScreen';
// Tambahan import untuk halaman detail sesi dosen baru
import DosenDetailSesiScreen from '../screens/DosenDetailSesiScreen'; 
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import SplashScreen from '../screens/SplashScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import ProfileDetailsScreen from '../screens/ProfileDetailsScreen';
import AboutAttendifyScreen from '../screens/AboutAttendifyScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ManageStudentsScreen from '../screens/ManageStudentsScreen';
import ManageLecturersScreen from '../screens/ManageLecturersScreen';
import IoTSensorValidationScreen from '../screens/IoTSensorValidationScreen';
import DatabaseLogsScreen from '../screens/DatabaseLogsScreen';
import ManageAttendanceScreen from '../screens/ManageAttendanceScreen';
import ESP32CameraScreen from '../screens/ESP32CameraScreen';
import AdminReportsScreen from '../screens/AdminReportsScreen';
import AdminFaceRegistrationScreen from '../screens/AdminFaceRegistrationScreen';
import LaporanMasalahScreen from '../screens/LaporanMasalahScreen';
import DosenDailyReportScreen from '../screens/DosenDailyReportScreen';
import LiveMapScreen from '../screens/LiveMapScreen';
import AnalyticsCommandCenterScreen from '../screens/AnalyticsCommandCenterScreen';
import IoTUnifiedScreen from '../screens/IoTUnifiedScreen';
import { Colors } from '@/constants/Colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const { isLightTheme, tokens } = useTheme();
  const tabBg = isLightTheme ? 'rgba(255,255,255,0.95)' : '#0F172A';
  const tabBorder = isLightTheme ? 'rgba(0,0,0,0.08)' : 'transparent';
  const inactiveColor = isLightTheme ? '#9ca3af' : 'rgba(255,255,255,0.4)';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: tabBg,
          borderTopWidth: isLightTheme ? 1 : 0,
          borderTopColor: tabBorder,
          height: 95,
          paddingBottom: 36,
          paddingTop: 8,
          borderTopRightRadius: 32,
          borderTopLeftRadius: 32,
          elevation: 0,
          shadowColor: isLightTheme ? '#000' : 'transparent',
          shadowOpacity: isLightTheme ? 0.06 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarActiveTintColor: Colors.ai.primary,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -4 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }) => <Home color={color} size={24} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <UserIcon color={color} size={24} /> }}
      />
    </Tab.Navigator>
  );
}

// Tab Navigator untuk Admin
function AdminTabNavigator() {
  const { isLightTheme, tokens } = useTheme();
  const tabBg = isLightTheme ? 'rgba(255,255,255,0.95)' : '#0F172A';
  const tabBorder = isLightTheme ? 'rgba(0,0,0,0.08)' : 'transparent';
  const inactiveColor = isLightTheme ? '#9ca3af' : 'rgba(255,255,255,0.4)';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: tabBg,
          borderTopWidth: isLightTheme ? 1 : 0,
          borderTopColor: tabBorder,
          height: 95,
          paddingBottom: 36,
          paddingTop: 8,
          borderTopRightRadius: 32,
          borderTopLeftRadius: 32,
          elevation: 0,
          shadowColor: isLightTheme ? '#000' : 'transparent',
          shadowOpacity: isLightTheme ? 0.06 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarActiveTintColor: Colors.ai.primary,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -4 }
      }}
    >
      <Tab.Screen
        name="Home"
        component={AdminDashboardScreen}
        options={{ 
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Home color={color} size={24} /> 
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={ProfileScreen}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <UserIcon color={color} size={24} /> 
        }}
      />
    </Tab.Navigator>
  );
}

// Tab Navigator untuk Dosen
function DosenTabNavigator() {
  const { isLightTheme, tokens } = useTheme();
  const tabBg = isLightTheme ? 'rgba(255,255,255,0.95)' : '#0F172A';
  const tabBorder = isLightTheme ? 'rgba(0,0,0,0.08)' : 'transparent';
  const inactiveColor = isLightTheme ? '#9ca3af' : 'rgba(255,255,255,0.4)';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: tabBg,
          borderTopWidth: isLightTheme ? 1 : 0,
          borderTopColor: tabBorder,
          height: 95,
          paddingBottom: 36,
          paddingTop: 8,
          borderTopRightRadius: 32,
          borderTopLeftRadius: 32,
          elevation: 0,
          shadowColor: isLightTheme ? '#000' : 'transparent',
          shadowOpacity: isLightTheme ? 0.06 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarActiveTintColor: Colors.ai.primary,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -4 }
      }}
    >
      <Tab.Screen
        name="Home"
        component={DosenDashboardScreen}
        options={{ 
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Home color={color} size={24} /> 
        }}
      />
      <Tab.Screen
        name="DosenProfile"
        component={ProfileScreen}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <UserIcon color={color} size={24} /> 
        }}
      />
    </Tab.Navigator>
  );
}

// Navigator untuk user yang sudah login (Mahasiswa)
function MahasiswaNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Jadwal" component={JadwalScreen} />
      <Stack.Screen name="Scan" component={ScanScreen} />
      <Stack.Screen name="Notification" component={NotificationScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
      <Stack.Screen name="AboutAttendify" component={AboutAttendifyScreen} />
      <Stack.Screen name="ESP32Camera" component={ESP32CameraScreen} />
      <Stack.Screen name="LaporanMasalah" component={LaporanMasalahScreen} />
    </Stack.Navigator>
  );
}

// Navigator untuk Dosen yang sudah login
function DosenNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="DosenMain" 
        component={DosenTabNavigator} 
      />

      {/* DISINI: Registrasi halaman detail sesi presensi IoT dosen */}
      <Stack.Screen 
        name="DosenDetailSesi" 
        component={DosenDetailSesiScreen} 
      />

      <Stack.Screen 
        name="ManageAttendance" 
        component={ManageAttendanceScreen} 
      />

      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
      />

      <Stack.Screen 
        name="PrivacySecurity" 
        component={PrivacySecurityScreen} 
      />

      <Stack.Screen 
        name="ProfileDetails" 
        component={ProfileDetailsScreen} 
      />

      <Stack.Screen 
        name="AboutAttendify" 
        component={AboutAttendifyScreen} 
      />

      <Stack.Screen 
        name="Notification" 
        component={NotificationScreen} 
      />

      <Stack.Screen
        name="DosenDailyReport"
        component={DosenDailyReportScreen}
      />
      <Stack.Screen
        name="LiveMap"
        component={LiveMapScreen}
      />
    </Stack.Navigator>
  );
}

// Navigator untuk Admin yang sudah login
function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminMain" component={AdminTabNavigator} />
      <Stack.Screen name="ManageStudents" component={ManageStudentsScreen} />
      <Stack.Screen name="ManageLecturers" component={ManageLecturersScreen} />
      <Stack.Screen name="IoTSensor" component={IoTUnifiedScreen} />
      <Stack.Screen name="DatabaseLogs" component={DatabaseLogsScreen} />
      <Stack.Screen name="ManageAttendance" component={ManageAttendanceScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="AboutAttendify" component={AboutAttendifyScreen} />
      <Stack.Screen name="Notification" component={NotificationScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, role } = useAuth();

  console.log('🔍 AppNavigator - isLoggedIn:', isLoggedIn, 'role:', role);

  if (!isLoggedIn) {
    return (
      <Stack.Navigator 
        key={`auth-${isLoggedIn}`}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
        />
        <Stack.Screen 
          name="CreateAccount" 
          component={CreateAccountScreen}
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen}
          options={{
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    );
  }

  if (role === 'dosen') {
    return <DosenNavigator />;
  }

  if (role === 'admin') {
    return <AdminNavigator />;
  }

  return <MahasiswaNavigator />;
}