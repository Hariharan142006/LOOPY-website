import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Linking, Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { api } from '../../utils/api';

export default function TrackingScreen() {
    const route = useRoute<any>(); const id = route.params?.id;
    const navigation = useNavigation<any>();
    const mapRef = useRef<MapView>(null);

    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [eta, setEta] = useState<string>('Calculating...');


    const fetchTrackingData = async () => {
        try {
            const res = await api.get(`/api/user/bookings/${id}`);
            setBooking(res.data);
            setError(null);
            if (['ASSIGNED', 'ONEWAY', 'ARRIVED'].includes(res.data.status)) {
                calculateETA(res.data);
            }

        } catch (e: any) {
            console.log('Tracking Error', e?.response?.status, e?.response?.data);
            setError(e?.response?.data?.error || 'Failed to load booking details.');
        } finally {
            setLoading(false);
        }
    };

    const calculateETA = (data: any) => {
        if (!data.agent?.currentLat || !data.pickupLat) return;
        
        const lat1 = data.agent.currentLat;
        const lon1 = data.agent.currentLng;
        const lat2 = data.pickupLat;
        const lon2 = data.pickupLng;

        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        const mins = Math.ceil(distance * 3); // 3 mins per km
        setEta(`${mins} mins`);

        if (mapRef.current) {
            mapRef.current.fitToCoordinates([
                { latitude: lat1, longitude: lon1 },
                { latitude: lat2, longitude: lon2 }
            ], {
                edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
                animated: true
            });
        }
    };

    useEffect(() => {
        fetchTrackingData();
        const interval = setInterval(fetchTrackingData, 5000); // 5s for smoother tracking
        return () => clearInterval(interval);
    }, []);

    const statuses = [
        { key: 'PENDING', label: 'Request Received', icon: 'list', sub: 'Your request has been submitted' },
        { key: 'ASSIGNED', label: 'Agent Assigned', icon: 'person', sub: 'An agent has been assigned' },
        { key: 'ONEWAY', label: 'Out for Collection', icon: 'bicycle', sub: 'Agent is heading your way' },
        { key: 'ARRIVED', label: 'Agent Arrived', icon: 'pin', sub: 'Agent is at your location' },
        { key: 'WEIGHED', label: 'Items Weighed', icon: 'scale', sub: 'Scrap weighed & calculated' },
        { key: 'COMPLETED', label: 'Pickup Complete', icon: 'checkmark-done', sub: 'Collection finished' },
    ];


    const getStatusIndex = (currentStatus: string) => {
        if (currentStatus === 'PAID') return 5;
        if (currentStatus === 'COMPLETED') return 5;
        if (currentStatus === 'WEIGHED') return 4;
        const idx = statuses.findIndex(s => s.key === currentStatus);
        return idx === -1 ? 0 : idx;
    };


    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>;

    if (error || !booking) return (
        <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 12, textAlign: 'center', paddingHorizontal: 40 }}>{error || 'Booking not found.'}</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 14, backgroundColor: '#10b981', borderRadius: 16 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );

    const currentIdx = getStatusIndex(booking.status);
    const isActiveTrack = ['ASSIGNED', 'ONEWAY', 'ARRIVED'].includes(booking.status);


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tracking Details</Text>

            </View>

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: booking.pickupLat,
                    longitude: booking.pickupLng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >
                {isActiveTrack && booking.agent?.currentLat && (
                    <Marker
                        coordinate={{ latitude: booking.agent.currentLat, longitude: booking.agent.currentLng }}
                        title="Your Agent"
                    >
                        <View style={styles.agentMarker}>
                            <Ionicons name="bicycle" size={20} color="#fff" />
                        </View>
                    </Marker>
                )}

                <Marker
                    coordinate={{ latitude: booking.pickupLat, longitude: booking.pickupLng }}
                    title="Pickup Point"
                    pinColor="#ef4444"
                />
            </MapView>

            <View style={styles.logisticsCard}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.stepperContainer}>
                        {statuses.map((s, i) => {
                            const isDone = i <= currentIdx;
                            const isCurrent = i === currentIdx;
                            return (
                                <View key={s.key} style={styles.stepRow}>
                                    <View style={styles.stepIndicator}>
                                        <View style={[styles.stepDot, isDone && styles.stepDotDone, isCurrent && styles.stepDotCurrent]}>
                                            {isDone && <Ionicons name="checkmark" size={12} color="#fff" />}
                                        </View>
                                        {i < statuses.length - 1 && <View style={[styles.stepLine, i < currentIdx && styles.stepLineDone]} />}
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>{s.label}</Text>
                                        {isCurrent && isActiveTrack && (
                                            <Text style={styles.stepSub}>ETA: {eta}</Text>
                                        )}
                                        {isCurrent && booking.status === 'ASSIGNED' && (
                                            <Text style={styles.stepSub}>Agent is heading your way</Text>
                                        )}
                                        {!isCurrent && isDone && s.sub && (
                                            <Text style={styles.stepSubDone}>{s.sub}</Text>
                                        )}
                                    </View>

                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.agentInfoRow}>
                        <View style={styles.agentAvatar}>
                            <Text style={styles.avatarText}>{booking.agent?.name?.charAt(0) || '?'}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.agentName}>{booking.agent?.name || 'Assigning Agent...'}</Text>
                            <Text style={styles.agentSub}>
                                {booking.agent?.assignedVehicles?.[0] 
                                    ? `${booking.agent.assignedVehicles[0].name} • ${booking.agent.assignedVehicles[0].licensePlate}` 
                                    : 'Loopy Professional'}
                            </Text>
                        </View>
                        {booking.agent?.phone && (
                            <TouchableOpacity style={styles.callCircle} onPress={() => Linking.openURL(`tel:${booking.agent.phone}`)}>
                                <Ionicons name="call" size={20} color="#10b981" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {(booking.status === 'COMPLETED' || booking.status === 'PAID' || booking.status === 'WEIGHED') && (
                        <TouchableOpacity 
                            style={styles.invoiceBtn} 
                            onPress={() => navigation.navigate('Invoice', { id: booking.id } as any)}
                        >
                            <Ionicons name="receipt-outline" size={20} color="#fff" />
                            <Text style={styles.invoiceBtnText}>View Digital Invoice</Text>
                        </TouchableOpacity>
                    )}

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { position: 'absolute', top: 50, left: 20, right: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, color: '#111827', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    map: { flex: 0.6 },
    logisticsCard: { flex: 0.4, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
    stepperContainer: { marginVertical: 10 },
    stepRow: { flexDirection: 'row', gap: 20, minHeight: 60 },
    stepIndicator: { alignItems: 'center' },
    stepDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
    stepDotDone: { backgroundColor: '#10b981' },
    stepDotCurrent: { backgroundColor: '#3b82f6', transform: [{ scale: 1.2 }], borderWidth: 2, borderColor: '#eff6ff' },
    stepLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },
    stepLineDone: { backgroundColor: '#10b981' },
    stepContent: { flex: 1, paddingTop: 1 },
    stepLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
    stepLabelDone: { color: '#111827', fontWeight: '800' },
    stepSub: { fontSize: 12, color: '#10b981', fontWeight: 'bold', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 20 },
    agentInfoRow: { flexDirection: 'row', alignItems: 'center' },
    agentAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d1fae5' },
    avatarText: { color: '#10b981', fontWeight: 'bold', fontSize: 18 },
    agentName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    agentSub: { fontSize: 12, color: '#6b7280' },
    agentMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    callCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
    stepSubDone: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
    invoiceBtn: { backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 24 },
    invoiceBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }

});
