import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import * as Location from 'expo-location';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInRight, FadeInUp } from 'react-native-reanimated';
import { LoopyColors } from '../../constants/colors';
import { FontSizes, Fonts } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/layout';
import SwipeButton from '../../components/SwipeButton';

export default function AgentPickupsTimeline() {
    const router = useRouter();
    const [tasks, setTasks] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [agentLoc, setAgentLoc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            // Speed optimization: Try last known position first to avoid GPS lock delay
            let loc = await Location.getLastKnownPositionAsync({});
            if (!loc) {
                loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            }
            
            if (loc) setAgentLoc(loc.coords);
            
            const res = await api.post('/api/agent/tasks', {
                lat: loc?.coords.latitude || 0,
                lng: loc?.coords.longitude || 0
            });
            setTasks(res.data.accepted || []);
            setSummary(res.data.summary || null);
        } catch (e) {
            console.log('Pickups Fetch Error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Calculate straight line distance (if needed) for sorting
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    // Sort by shortest distance
    const sortedTasks = [...tasks].sort((a, b) => {
        if (!agentLoc) return 0;
        const distA = calculateDistance(agentLoc.latitude, agentLoc.longitude, a.pickupLat, a.pickupLng);
        const distB = calculateDistance(agentLoc.latitude, agentLoc.longitude, b.pickupLat, b.pickupLng);
        return distA - distB;
    });

    const ListHeader = () => (
        <Animated.View entering={FadeInUp.springify()} style={styles.headerArea}>
            <View style={styles.earningsBanner}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.earningsLabel}>TODAY'S EARNINGS</Text>
                    <Text style={styles.earningsVal}>₹{(summary?.todayEarnings || 0).toFixed(0)}</Text>
                </View>
                <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-done" size={14} color="#fff" />
                    <Text style={styles.completedText} numberOfLines={1}>{tasks.length} Loads Rem</Text>
                </View>
            </View>

            <View style={styles.timelineTitleRow}>
                <Text style={styles.timelineTitle}>Optimal Route sequence</Text>
                <TouchableOpacity onPress={() => Alert.alert('Sequence Locked', 'The route sequence is automatically optimized by live mathematical shortest-path routing and cannot be manually changed.')}>
                    <Ionicons name="filter" size={20} color={LoopyColors.grey} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderTimelineItem = ({ item, index }: { item: any, index: number }) => {
        const isNextTask = isOnline && index === 0; // First task gets priority styling
        const statusColor = item.status === 'ONEWAY' ? '#8b5cf6' : LoopyColors.green;
        
        let distKmStr = "N/A";
        if (agentLoc) {
            distKmStr = calculateDistance(agentLoc.latitude, agentLoc.longitude, item.pickupLat, item.pickupLng).toFixed(1) + " km";
        }

        return (
            <View style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                    <View style={[styles.timelineLine, index === sortedTasks.length - 1 && { height: '50%' }]} />
                    <View style={[
                        styles.timelineDot, 
                        isNextTask && { backgroundColor: statusColor + '20', borderColor: statusColor, borderWidth: 2 }
                    ]}>
                        {isNextTask && <View style={[styles.dotInner, { backgroundColor: statusColor }]} />}
                    </View>
                </View>

                <Animated.View entering={FadeInRight.delay(index * 100)} style={styles.cardContainer}>
                    <View style={[styles.bookingCard, isNextTask && styles.nextTaskCard]}>
                        <View style={styles.cardHeaderSmall}>
                            <Text style={[styles.statusLabel, { color: isNextTask ? statusColor : '#6b7280' }]}>
                                {index + 1}. {item.status.replace('_', ' ')} • Payout: ₹{item.totalAmount.toFixed(0)}
                            </Text>
                            <View style={styles.distanceBadge}>
                                <Ionicons name="location" size={12} color={isNextTask ? statusColor : '#6b7280'} />
                                <Text style={styles.distanceText}>{distKmStr}</Text>
                            </View>
                        </View>

                        <Text style={styles.customerName}>{item.user?.name}</Text>
                        <Text style={styles.addressText}>{item.address?.street}, {item.address?.city}</Text>

                        <View style={styles.logisticsTags}>
                            <View style={styles.tagBadge}>
                                <Ionicons name="time" size={14} color={LoopyColors.charcoal} />
                                <Text style={styles.tagText}>{item.scheduledTime || 'Today'}</Text>
                            </View>
                            <View style={styles.tagBadge}>
                                <Ionicons name="car" size={14} color={LoopyColors.charcoal} />
                                <Text style={styles.tagText}>{item.vehicleType || 'Mini Truck'}</Text>
                            </View>
                        </View>

                        {isNextTask && (
                            <View style={styles.swipeWrapper}>
                                <SwipeButton 
                                    key={`${item.id}-${item.status}`}
                                    title={
                                        item.status === 'ARRIVED' ? "RESUME WEIGHING" : 
                                        item.status === 'ONEWAY' ? "RESUME ROUTE" : "SWIPE TO START"
                                    }
                                    onSwipeComplete={() => {
                                        if (item.status === 'ARRIVED') {
                                            router.push(`/weigh/${item.id}` as any);
                                        } else {
                                            router.push(`/track-route/${item.id}` as any);
                                        }
                                    }}
                                    color={LoopyColors.charcoal}
                                />
                            </View>
                        )}
                    </View>
                </Animated.View>
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={LoopyColors.green} /></View>;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <Text style={styles.headerText}>My Pickups</Text>
            </View>

            <FlatList
                data={sortedTasks}
                renderItem={renderTimelineItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={onRefresh}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Ionicons name="leaf-outline" size={60} color="#e5e7eb" />
                        <Text style={{ marginTop: 10, color: '#9ca3af', fontWeight: 'bold' }}>No tasks assigned for today.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
    header: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#f9fafb' },
    headerText: { fontSize: 24, fontWeight: '900', color: '#111827' },
    
    // Header & Duty Toggle
    headerArea: { paddingHorizontal: 20, marginBottom: 20 },
    dutyToggleCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#f3f4f6' },
    dutyTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
    dutySub: { fontSize: 12, color: '#6b7280', fontWeight: '500', marginTop: 2 },
    toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    toggleText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    
    earningsBanner: { backgroundColor: '#111827', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    earningsLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 1 },
    earningsVal: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 4 },
    completedBadge: { backgroundColor: '#4b5563', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    completedText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

    timelineTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12, paddingHorizontal: 10 },
    timelineTitle: { fontSize: 13, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },

    // Timeline Rendering
    listContent: { paddingBottom: 100 },
    timelineRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 8 },
    timelineLeft: { width: 30, alignItems: 'center' },
    timelineLine: { position: 'absolute', top: 0, bottom: -15, width: 2, backgroundColor: '#e5e7eb' },
    timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#d1d5db', marginTop: 28, zIndex: 1, borderWidth: 3, borderColor: '#f9fafb' },
    dotInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: LoopyColors.green },
    
    cardContainer: { flex: 1, marginLeft: 16 },
    bookingCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f3f4f6', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    nextTaskCard: { borderColor: '#dcfce7', backgroundColor: '#f0fdf4', borderWidth: 1.5, elevation: 8, shadowColor: LoopyColors.green, shadowOpacity: 0.15 },
    
    cardHeaderSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statusLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    distanceText: { fontSize: 11, fontWeight: '700', color: '#4b5563' },
    
    customerName: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 4 },
    addressText: { fontSize: 13, color: '#4b5563', lineHeight: 18, marginBottom: 16 },
    
    logisticsTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
    tagText: { fontSize: 11, fontWeight: '800', color: '#374151' },

    swipeWrapper: { 
        marginTop: 24, 
        width: '100%',
    }
});
