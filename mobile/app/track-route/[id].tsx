import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import * as Location from 'expo-location';
import SwipeButton from '../../components/SwipeButton';
import { LoopyColors } from '../../constants/colors';

export default function AgentRouteScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const mapRef = useRef<MapView>(null);

    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [agentLocation, setAgentLocation] = useState<any>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [notified, setNotified] = useState(false);
    const [rideStarted, setRideStarted] = useState(false);

    const fetchTaskData = async () => {
        try {
            const res = await api.get(`/api/agent/tasks`);
            const currentTask = res.data.accepted.find((b: any) => b.id === id);
            if (currentTask) {
                setBooking(currentTask);
                if (currentTask.status === 'ONEWAY') {
                    setRideStarted(true);
                }
            }
        } catch (e) {
            console.log('Task Error', e);
        } finally {
            setLoading(false);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // in metres
    };

    const startRide = async () => {
        try {
            await api.post('/api/agent/tasks/update', { bookingId: id, action: 'STATUS', status: 'ONEWAY' });
            setRideStarted(true);
            Alert.alert("Ride Started", "Customer can now see your live location.");
        } catch (e) {
            Alert.alert("Error", "Could not start ride.");
        }
    };

    useEffect(() => {
        fetchTaskData();
        
        let subscription: any;
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            subscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 5 },
                (loc) => {
                    setAgentLocation(loc.coords);
                    
                    // Share live location if ride started and not yet arrived
                    if (rideStarted && booking?.status === 'ONEWAY') {
                        api.post('/api/agent/location', { lat: loc.coords.latitude, lng: loc.coords.longitude }).catch(() => {});
                    }

                    if (booking) {
                        const d = calculateDistance(loc.coords.latitude, loc.coords.longitude, booking.pickupLat, booking.pickupLng);
                        setDistance(d);
                        
                        // 2m Proximity Alert
                        if (d < 2 && !notified) {
                            setNotified(true);
                            api.post(`/api/bookings/${id}/proximity`, { distance: d }).catch(console.log);
                            Alert.alert("Near Target", "You are within 2m of the customer.");
                        }
                    }
                }
            );
        })();

        return () => {
            if (subscription) subscription.remove();
        };
    }, [booking, notified, rideStarted]);

    const openInMaps = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.pickupLat},${booking.pickupLng}&travelmode=driving`;
        Linking.openURL(url);
    };

    if (loading || !booking) return <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Route to Pickup</Text>
            </View>

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: (booking.pickupLat + (agentLocation?.latitude || booking.pickupLat)) / 2,
                    longitude: (booking.pickupLng + (agentLocation?.longitude || booking.pickupLng)) / 2,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                {agentLocation && (
                    <Marker
                        coordinate={{ latitude: agentLocation.latitude, longitude: agentLocation.longitude }}
                        title="My Location"
                    >
                        <View style={styles.agentMarker}>
                            <Ionicons name="bicycle" size={20} color="#fff" />
                        </View>
                    </Marker>
                )}

                <Marker
                    coordinate={{ latitude: booking.pickupLat, longitude: booking.pickupLng }}
                    title="Customer Location"
                    pinColor="#ef4444"
                />
            </MapView>

            <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.briefLabel}>EN ROUTE TO CUSTOMER</Text>
                        <Text style={styles.customerName}>{booking?.user?.name || 'Customer'}</Text>
                        <Text style={styles.addressText} numberOfLines={1}>{booking?.address?.street || 'Fetching address...'}</Text>
                    </View>
                    <View style={styles.distanceBadge}>
                        <Text style={styles.distanceText}>
                            {distance !== null ? (distance > 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance.toFixed(0)}m`) : '...'}
                        </Text>
                    </View>
                </View>

                {!rideStarted ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.mainActionBtn} onPress={startRide}>
                            <Ionicons name="play" size={20} color="#fff" />
                            <Text style={styles.btnText}>Start Ride</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.callCircleBtn} onPress={() => Linking.openURL(`tel:${booking?.user?.phone}`)}>
                            <Ionicons name="call" size={22} color="#10b981" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.activeActions}>
                        <View style={styles.toolRow}>
                            <TouchableOpacity style={styles.toolBtn} onPress={openInMaps}>
                                <Ionicons name="navigate-circle" size={20} color="#3b82f6" />
                                <Text style={styles.toolText}>Navigate</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.toolBtn} onPress={() => Linking.openURL(`tel:${booking?.user?.phone}`)}>
                                <Ionicons name="call" size={20} color="#10b981" />
                                <Text style={styles.toolText}>Call</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <SwipeButton 
                            title={distance !== null && distance < 50 ? "SWIPE TO ARRIVE" : "REACHED LOCATION?"}
                            icon="pin"
                            color="#10b981"
                            onSwipeComplete={async () => {
                                await api.post('/api/agent/tasks/update', { bookingId: id, action: 'STATUS', status: 'ARRIVED' });
                                router.push(`/weigh/${id}` as any);
                            }}
                        />
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { position: 'absolute', top: 60, left: 20, zIndex: 10 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5 },
    map: { flex: 1 },
    
    infoCard: { position: 'absolute', bottom: 30, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 32, padding: 20, elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -5 } },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    briefLabel: { fontSize: 10, fontWeight: '900', color: '#10b981', letterSpacing: 1, marginBottom: 4 },
    customerName: { fontSize: 22, fontWeight: '900', color: '#111827' },
    addressText: { fontSize: 13, color: '#64748b', marginTop: 2 },
    distanceBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#d1fae5' },
    distanceText: { fontSize: 13, fontWeight: '900', color: '#10b981' },
    
    actionRow: { flexDirection: 'row', gap: 12 },
    mainActionBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 10 },
    callCircleBtn: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d1fae5' },
    btnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

    activeActions: { gap: 16 },
    toolRow: { flexDirection: 'row', gap: 12 },
    toolBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    toolText: { fontSize: 13, fontWeight: '700', color: '#334155' },

    agentMarker: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', elevation: 12, shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 10 }
});
