import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import { ChevronLeft, MapPin, User, Cpu, ShieldAlert, Crosshair } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import StatusBadge from '../components/ui/StatusBadge';
import AIConfidenceBadge from '../components/ui/AIConfidenceBadge';
import RealtimeIndicator from '../components/ui/RealtimeIndicator';

const { width, height } = Dimensions.get('window');

// Campus Center Coordinate
const CAMPUS_REGION = {
  latitude: -6.289806,
  longitude: 107.291833,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};
const CAMPUS_RADIUS_METERS = 300; // Geofence radius

// Haversine formula to check distance
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in metres
};

const mapDarkStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

export default function LiveMapScreen({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { tokens, isLightTheme } = useTheme();
  const navigation = useNavigation();
  const { socket } = useSocket();
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchMapData();

    if (socket) {
      socket.on('new_attendance', (data) => {
        if (data.latitude && data.longitude) {
          const distance = getDistance(CAMPUS_REGION.latitude, CAMPUS_REGION.longitude, data.latitude, data.longitude);
          const isOutOfZone = distance > CAMPUS_RADIUS_METERS;
          const newMarker = { ...data, isOutOfZone };

          setMarkers(prev => {
             const existing = prev.findIndex(m => m.user_id === data.user_id);
             if (existing > -1) {
                const arr = [...prev];
                arr[existing] = newMarker;
                return arr;
             }
             return [...prev, newMarker];
          });

          // Optional: animate to new marker
          mapRef.current?.animateCamera({
             center: { latitude: data.latitude, longitude: data.longitude },
             zoom: 18
          }, { duration: 1000 });
        }
      });
    }

    return () => {
      if (socket) socket.off('new_attendance');
    };
  }, [socket]);

  const fetchMapData = async () => {
    try {
      const token = await AsyncStorage.getItem('@attendify_auth_token');
      const response = await fetch(`${API_URL}/analytics/map`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        const processed = result.data.map((m: any) => ({
           ...m,
           isOutOfZone: getDistance(CAMPUS_REGION.latitude, CAMPUS_REGION.longitude, parseFloat(m.latitude), parseFloat(m.longitude)) > CAMPUS_RADIUS_METERS
        }));
        setMarkers(processed);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Fetch map data error, using dummy data', error);
    }
    
    // Dummy Data Fallback for Horizon University Indonesia Karawang
    const dummyData = [
       {
          user_id: 'd1', name: 'Andi Saputra', location_name: 'Gedung Utama Horizon', 
          latitude: -6.289900, longitude: 107.291900, device_id: 'Mobile-A', approval_status: 'APPROVED', confidence: 95
       },
       {
          user_id: 'd2', name: 'Budi Santoso', location_name: 'Fakultas Kesehatan', 
          latitude: -6.289600, longitude: 107.291700, device_id: 'Mobile-B', approval_status: 'VERIFIED', confidence: 90
       },
       {
          user_id: 'd3', name: 'Citra Lestari', location_name: 'Area Kost Mahasiswa', 
          latitude: -6.292000, longitude: 107.290000, device_id: 'Mobile-C', approval_status: 'PENDING', confidence: 85
       },
       {
          user_id: 'd4', name: 'Dina Mariana', location_name: 'Galuh Mas Karawang', 
          latitude: -6.310000, longitude: 107.305000, device_id: 'Mobile-D', approval_status: 'REJECTED', confidence: 70
       }
    ];
    const processedDummy = dummyData.map((m: any) => ({
       ...m,
       isOutOfZone: getDistance(CAMPUS_REGION.latitude, CAMPUS_REGION.longitude, m.latitude, m.longitude) > CAMPUS_RADIUS_METERS
    }));
    setMarkers(processedDummy);
    setLoading(false);
  };

  const getMarkerColor = (m: any) => {
    if (m.isOutOfZone) return '#8B5CF6'; // Purple Out of Zone
    const status = m.approval_status || 'PENDING';
    if (status === 'APPROVED' || status === 'VERIFIED') return '#10B981';
    if (status === 'REVIEW_REQUIRED') return '#F59E0B';
    if (status === 'REJECTED') return '#EF4444';
    return '#3B82F6';
  };

  if (loading) {
     return (
       <View style={[styles.container, { backgroundColor: tokens.cardBg, justifyContent: 'center', alignItems: 'center' }]}>
         <ActivityIndicator size="large" color="#10B981" />
       </View>
     );
  }

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef}
        style={styles.map} 
        provider={PROVIDER_GOOGLE}
        initialRegion={CAMPUS_REGION}
        customMapStyle={isLightTheme ? [] : mapDarkStyle}
      >
        {/* Campus Geofence Area */}
        <Circle 
          center={{ latitude: CAMPUS_REGION.latitude, longitude: CAMPUS_REGION.longitude }}
          radius={CAMPUS_RADIUS_METERS}
          fillColor="rgba(16, 185, 129, 0.1)"
          strokeColor="rgba(16, 185, 129, 0.5)"
          strokeWidth={2}
        />

        {markers.map((m, idx) => {
          const lat = parseFloat(m.latitude);
          const lng = parseFloat(m.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={idx}
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor={getMarkerColor(m)}
            >
               <View style={[styles.markerRing, { borderColor: getMarkerColor(m), backgroundColor: `${getMarkerColor(m)}30` }]}>
                  <View style={[styles.markerCore, { backgroundColor: getMarkerColor(m) }]} />
               </View>
              
               <Callout tooltip>
                 <BlurView intensity={isLightTheme ? 80 : 40} tint={isLightTheme ? 'light' : 'dark'} style={[styles.calloutCard, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                       <User size={16} color={tokens.textColor} />
                       <Text style={{ fontWeight: 'bold', color: tokens.textColor, fontSize: 16 }}>{m.name}</Text>
                    </View>
                    
                    <View style={{ gap: 6 }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MapPin size={12} color={tokens.subTextColor} />
                          <Text style={{ color: tokens.subTextColor, fontSize: 12 }}>{m.location_name || 'Campus'}</Text>
                       </View>
                       
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Cpu size={12} color={tokens.subTextColor} />
                          <Text style={{ color: tokens.subTextColor, fontSize: 12 }}>{m.device_id || 'Mobile App'}</Text>
                       </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tokens.borderColor }}>
                       <StatusBadge status={m.isOutOfZone ? 'OUT_OF_ZONE' : m.approval_status} size="small" />
                       {m.confidence ? <AIConfidenceBadge confidence={parseFloat(m.confidence)} /> : null}
                    </View>
                 </BlurView>
               </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Floating Header */}
      {!isEmbedded && (
        <BlurView intensity={20} tint={isLightTheme ? 'light' : 'dark'} style={[styles.header, { borderColor: tokens.borderColor }]}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { backgroundColor: tokens.iconButtonBg }]}>
              <ChevronLeft size={24} color={tokens.textColor} />
           </TouchableOpacity>
           <View>
              <Text style={[styles.headerTitle, { color: tokens.textColor }]}>Live Map</Text>
              <Text style={[styles.headerSub, { color: tokens.subTextColor }]}>Realtime Geospatial Monitor</Text>
           </View>
           <RealtimeIndicator />
        </BlurView>
      )}

      {/* Geofence Legend */}
      <View style={styles.legendContainer}>
         <View style={[styles.legendItem, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
            <Crosshair size={14} color="#10B981" />
            <Text style={{ fontSize: 10, color: tokens.textColor, fontWeight: 'bold' }}>In Zone</Text>
         </View>
         <View style={[styles.legendItem, { backgroundColor: tokens.cardBg, borderColor: tokens.borderColor }]}>
            <ShieldAlert size={14} color="#8B5CF6" />
            <Text style={{ fontSize: 10, color: tokens.textColor, fontWeight: 'bold' }}>Out of Zone</Text>
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    overflow: 'hidden'
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 12,
  },
  markerRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  calloutCard: {
    width: 240,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  legendContainer: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  }
});
