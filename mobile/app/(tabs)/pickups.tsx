import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Platform, StatusBar, Alert, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { api } from '../../utils/api';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInRight, FadeInUp } from 'react-native-reanimated';
import { LoopyColors } from '../../constants/colors';
import { FontSizes, Fonts } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/layout';
import SwipeButton from '../../components/SwipeButton';
import { useTranslation } from '../../hooks/useTranslation';

type StatusFilter = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export default function AgentPickupsTimeline() {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const [tasks, setTasks] = useState<any[]>([]);
    const [completedTasks, setCompletedTasks] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [agentLoc, setAgentLoc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

    // Cache GPS coordinates so we don't block the API call
    const cachedCoords = useRef<{ latitude: number; longitude: number } | null>(null);

    const fetchGPS = async () => {
        try {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            ]);
            const hasPermission =
                granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
                granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

            if (hasPermission) {
                Geolocation.getCurrentPosition(
                    (position: any) => {
                        cachedCoords.current = position.coords;
                        setAgentLoc(position.coords);
                    },
                    (error: any) => console.log('GPS error:', error.message),
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
                );
            }
        } catch (e) {
            console.log('GPS permission error', e);
        }
    };

    // Fast fetch: use cached GPS, don't wait for GPS to load
    const fetchData = async (showFullLoader = false) => {
        if (showFullLoader) setLoading(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const res = await api.post('/api/agent/tasks', {
                lat: cachedCoords.current?.latitude || 0,
                lng: cachedCoords.current?.longitude || 0,
                date: dateStr
            });
            setTasks(res.data.accepted || []);
            setCompletedTasks(res.data.completed || []);
            setSummary(res.data.summary || null);
            setIsOnline(res.data.isOnline ?? true);
        } catch (e) {
            console.log('Pickups Fetch Error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // On first focus: start GPS in background, fetch API immediately
    useFocusEffect(
        React.useCallback(() => {
            fetchGPS(); // non-blocking
            fetchData(true);
        }, [])
    );

    // Re-fetch when date changes
    useEffect(() => {
        if (!loading) {
            fetchData(false);
        }
    }, [selectedDate]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchGPS();
        fetchData(false);
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const sortedTasks = [...tasks].sort((a, b) => {
        if (!agentLoc) return 0;
        const distA = calculateDistance(agentLoc.latitude, agentLoc.longitude, a.pickupLat, a.pickupLng);
        const distB = calculateDistance(agentLoc.latitude, agentLoc.longitude, b.pickupLat, b.pickupLng);
        return distA - distB;
    });

    // Apply status filter
    const getFilteredItems = () => {
        const allActive = sortedTasks;
        const allCompleted = completedTasks;
        const allCancelled = [...tasks, ...completedTasks].filter(t => t.status === 'CANCELLED');

        switch (statusFilter) {
            case 'ACTIVE':
                return allActive.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
            case 'COMPLETED':
                return allCompleted;
            case 'CANCELLED':
                return allCancelled;
            case 'ALL':
            default:
                return [...allActive, ...allCompleted];
        }
    };

    const filteredItems = getFilteredItems();

    const STATUS_FILTERS: { key: StatusFilter; label: string; icon: string }[] = [
        { key: 'ALL', label: 'All', icon: 'layers-outline' },
        { key: 'ACTIVE', label: 'Active', icon: 'flash-outline' },
        { key: 'COMPLETED', label: 'Done', icon: 'checkmark-circle-outline' },
        { key: 'CANCELLED', label: 'Cancelled', icon: 'close-circle-outline' },
    ];

    const ListHeader = () => (
        <View style={styles.headerArea}>
            {/* Earnings Banner */}
            <View style={styles.earningsBanner}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.earningsLabel}>{t('todays_earnings')}</Text>
                    <Text style={styles.earningsVal}>₹{(summary?.todayEarnings || 0).toFixed(0)}</Text>
                </View>
                <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-done" size={14} color="#fff" />
                    <Text style={styles.completedText} numberOfLines={1}>
                        {summary?.todayCompleted || 0} done · {tasks.length} active
                    </Text>
                </View>
            </View>

            {/* Date Filter */}
            <View style={styles.dateSelectorContainer}>
                <Text style={styles.dateLabel}>Filter by Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
                    {[-3, -2, -1, 0, 1].map((offset) => {
                        const date = new Date();
                        date.setDate(date.getDate() + offset);
                        const isSelected = date.toDateString() === selectedDate.toDateString();
                        const dayName = offset === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateNum = date.getDate();
                        return (
                            <TouchableOpacity
                                key={offset}
                                style={[styles.dateCard, isSelected && styles.dateCardActive]}
                                onPress={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + offset);
                                    setSelectedDate(d);
                                }}
                            >
                                <Text style={[styles.dateDayText, isSelected && styles.dateTextActive]}>{dayName}</Text>
                                <Text style={[styles.dateNumText, isSelected && styles.dateTextActive]}>{dateNum}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Status Filter Tabs */}
            <View style={styles.statusFilterRow}>
                {STATUS_FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.statusFilterBtn, statusFilter === f.key && styles.statusFilterBtnActive]}
                        onPress={() => setStatusFilter(f.key)}
                    >
                        <Ionicons
                            name={f.icon as any}
                            size={13}
                            color={statusFilter === f.key ? '#fff' : '#6b7280'}
                        />
                        <Text style={[styles.statusFilterText, statusFilter === f.key && styles.statusFilterTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.timelineTitleRow}>
                <Text style={styles.timelineTitle}>
                    {statusFilter === 'ALL' ? t('optimal_route') : `${f => filteredItems.length} results`}
                </Text>
                <TouchableOpacity onPress={() => Alert.alert(t('sequence_locked'), t('sequence_locked_desc'))}>
                    <Ionicons name="options-outline" size={20} color={LoopyColors.grey} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '#10b981';
            case 'ONEWAY': return '#8b5cf6';
            case 'ARRIVED': return '#f59e0b';
            case 'CANCELLED': return '#ef4444';
            default: return LoopyColors.green;
        }
    };

    const renderTimelineItem = ({ item, index }: { item: any, index: number }) => {
        const isCompleted = item.status === 'COMPLETED';
        const isCancelled = item.status === 'CANCELLED';
        const isNextTask = isOnline && index === 0 && !isCompleted && !isCancelled;
        const statusColor = getStatusColor(item.status);

        let distKmStr = '';
        if (agentLoc && item.pickupLat && item.pickupLng) {
            distKmStr = calculateDistance(agentLoc.latitude, agentLoc.longitude, item.pickupLat, item.pickupLng).toFixed(1) + ' km';
        }

        return (
            <View style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                    <View style={styles.timelineLine} />
                    <View style={[
                        styles.timelineDot,
                        isNextTask && { backgroundColor: statusColor + '20', borderColor: statusColor, borderWidth: 2 },
                        isCompleted && { backgroundColor: '#10b981', borderColor: '#10b981' },
                        isCancelled && { backgroundColor: '#ef4444', borderColor: '#ef4444' }
                    ]}>
                        {isNextTask && <View style={[styles.dotInner, { backgroundColor: statusColor }]} />}
                        {isCompleted && <Ionicons name="checkmark" size={10} color="#fff" />}
                        {isCancelled && <Ionicons name="close" size={10} color="#fff" />}
                    </View>
                </View>

                <View style={styles.cardContainer}>
                    <Animated.View entering={FadeInRight.delay(index * 60)}>
                        <View style={[
                            styles.bookingCard,
                            isNextTask && styles.nextTaskCard,
                            isCancelled && styles.cancelledCard
                        ]}>
                            <View style={styles.cardHeaderSmall}>
                                <View style={[styles.statusPill, { backgroundColor: statusColor + '15' }]}>
                                    <Text style={[styles.statusLabel, { color: statusColor }]}>
                                        {item.status.replace(/_/g, ' ')}
                                    </Text>
                                </View>
                                <View style={styles.distanceBadge}>
                                    {distKmStr ? (
                                        <>
                                            <Ionicons name="location" size={12} color={isNextTask ? statusColor : '#6b7280'} />
                                            <Text style={styles.distanceText}>{distKmStr}</Text>
                                        </>
                                    ) : null}
                                    <Text style={[styles.payoutText, { color: statusColor }]}>₹{(item.totalAmount || 0).toFixed(0)}</Text>
                                </View>
                            </View>

                            <Text style={styles.customerName}>{item.user?.name || 'Customer'}</Text>
                            <Text style={styles.addressText}>
                                {item.address?.street}{item.address?.city ? `, ${item.address.city}` : ''}
                            </Text>

                            <View style={styles.logisticsTags}>
                                <View style={styles.tagBadge}>
                                    <Ionicons name="calendar-outline" size={12} color={LoopyColors.charcoal} />
                                    <Text style={styles.tagText}>
                                        {item.scheduledAt
                                            ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : 'Scheduled'}
                                    </Text>
                                </View>
                                <View style={styles.tagBadge}>
                                    <Ionicons name="cube-outline" size={12} color={LoopyColors.charcoal} />
                                    <Text style={styles.tagText}>{item.items?.length || 0} items</Text>
                                </View>
                            </View>

                            {isNextTask && (
                                <View style={styles.swipeWrapper}>
                                    <SwipeButton
                                        key={`${item.id}-${item.status}`}
                                        title={
                                            item.status === 'ARRIVED' ? t('resume_weighing').toUpperCase() :
                                            item.status === 'ONEWAY' ? t('resume_route').toUpperCase() : t('swipe_to_start')
                                        }
                                        onSwipeComplete={() => {
                                            if (item.status === 'ARRIVED') {
                                                navigation.navigate('Weigh', { id: item.id } as any);
                                            } else {
                                                navigation.navigate('TrackRoute', { id: item.id } as any);
                                            }
                                        }}
                                        color={LoopyColors.charcoal}
                                    />
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </View>
            </View>
        );
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={LoopyColors.green} />
            <Text style={styles.loadingText}>Loading pickups...</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <Text style={styles.headerText}>{t('my_pickups')}</Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                    {refreshing ? (
                        <ActivityIndicator size="small" color={LoopyColors.green} />
                    ) : (
                        <Ionicons name="refresh-outline" size={22} color={LoopyColors.charcoal} />
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredItems}
                renderItem={renderTimelineItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={onRefresh}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="leaf-outline" size={60} color="#e5e7eb" />
                        <Text style={styles.emptyText}>No pickups found for this filter.</Text>
                        <Text style={styles.emptySubText}>Try selecting a different date or status.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
    loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280', fontFamily: Fonts.medium },
    header: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#f9fafb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerText: { fontSize: 24, fontFamily: Fonts.bold, color: '#111827' },
    refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' },

    headerArea: { paddingHorizontal: 20, marginBottom: 20 },
    earningsBanner: { backgroundColor: '#111827', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    earningsLabel: { fontSize: 10, fontFamily: Fonts.bold, color: '#9ca3af', letterSpacing: 1 },
    earningsVal: { fontSize: 32, fontFamily: Fonts.bold, color: '#fff', marginTop: 4 },
    completedBadge: { backgroundColor: '#4b5563', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    completedText: { color: '#fff', fontSize: 11, fontFamily: Fonts.bold },

    // Date Filter
    dateSelectorContainer: { marginTop: 20, paddingBottom: 4 },
    dateLabel: { fontSize: 11, fontFamily: Fonts.bold, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    dateScroll: { gap: 10 },
    dateCard: { width: 58, height: 70, backgroundColor: '#fff', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6', elevation: 2 },
    dateCardActive: { backgroundColor: '#111827', borderColor: '#111827', elevation: 8 },
    dateDayText: { fontSize: 10, fontFamily: Fonts.bold, color: '#6b7280', marginBottom: 4 },
    dateNumText: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
    dateTextActive: { color: '#fff' },

    // Status Filter
    statusFilterRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'nowrap' },
    statusFilterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, borderWidth: 1, borderColor: '#e5e7eb', gap: 4 },
    statusFilterBtnActive: { backgroundColor: '#111827', borderColor: '#111827' },
    statusFilterText: { fontSize: 11, fontFamily: Fonts.bold, color: '#6b7280' },
    statusFilterTextActive: { color: '#fff' },

    timelineTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12, paddingHorizontal: 4 },
    timelineTitle: { fontSize: 13, fontFamily: Fonts.bold, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },

    // Timeline
    listContent: { paddingBottom: 100 },
    timelineRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 8 },
    timelineLeft: { width: 30, alignItems: 'center' },
    timelineLine: { position: 'absolute', top: 0, bottom: -15, width: 2, backgroundColor: '#e5e7eb' },
    timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#d1d5db', marginTop: 28, zIndex: 1, borderWidth: 3, borderColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
    dotInner: { width: 10, height: 10, borderRadius: 5 },

    cardContainer: { flex: 1, marginLeft: 16 },
    bookingCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#f3f4f6', elevation: 2, marginBottom: 4 },
    nextTaskCard: { borderColor: '#dcfce7', backgroundColor: '#f0fdf4', borderWidth: 1.5, elevation: 8 },
    cancelledCard: { opacity: 0.6, backgroundColor: '#fef2f2', borderColor: '#fecaca' },

    cardHeaderSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    distanceText: { fontSize: 11, fontFamily: Fonts.bold, color: '#4b5563' },
    payoutText: { fontSize: 14, fontFamily: Fonts.bold },

    customerName: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827', marginBottom: 4 },
    addressText: { fontSize: 13, fontFamily: Fonts.medium, color: '#4b5563', lineHeight: 18, marginBottom: 14 },

    logisticsTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
    tagText: { fontSize: 11, fontFamily: Fonts.bold, color: '#374151' },

    swipeWrapper: { marginTop: 20, width: '100%' },

    emptyContainer: { alignItems: 'center', marginTop: 50, paddingHorizontal: 40 },
    emptyText: { marginTop: 12, color: '#374151', fontFamily: Fonts.bold, fontSize: 16, textAlign: 'center' },
    emptySubText: { marginTop: 6, color: '#9ca3af', fontFamily: Fonts.medium, fontSize: 13, textAlign: 'center' },
});
