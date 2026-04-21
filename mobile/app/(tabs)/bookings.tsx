import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView, StatusBar, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LoopyColors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/layout';
import { useTranslation } from '../../hooks/useTranslation';


const { width } = Dimensions.get('window');

export default function BookingsScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/api/user/bookings');
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.log('Error fetching bookings', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const renderTimelineItem = ({ item, index }: { item: any; index: number }) => {
    const status = item.status?.toUpperCase();
    const isCompleted = status === 'COMPLETED' || status === 'PAID';
    const isActive = status === 'PENDING' || status === 'ASSIGNED' || status === 'ONEWAY' || status === 'ARRIVED';
    
    const getStatusColor = () => {
      switch (status) {
        case 'PENDING': return '#f59e0b'; // Amber
        case 'ASSIGNED': return '#3b82f6'; // Blue
        case 'ONEWAY': return '#10b981'; // Green
        case 'ARRIVED': return '#8b5cf6'; // Purple
        case 'COMPLETED':
        case 'PAID': return '#22c55e'; // Success Green
        case 'CANCELLED': return '#ef4444'; // Red
        default: return '#9ca3af'; // Grey
      }
    };

    const statusColor = getStatusColor();
    
    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineLine, index === bookings.length - 1 && { height: '50%' }]} />
          <View style={[
            styles.timelineDot, 
            isActive && { backgroundColor: statusColor + '20', borderColor: statusColor, borderWidth: 2 },
            isCompleted && { backgroundColor: statusColor }
          ]}>
             {isActive && <View style={[styles.dotInner, { backgroundColor: statusColor }]} />}
          </View>
        </View>

        <Animated.View 
          entering={FadeInRight.delay(index * 100)} 
          style={styles.cardContainer}
        >
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => router.push(`/track/${item.id}` as any)}
            style={[
              styles.bookingCard, 
              isActive && { backgroundColor: statusColor + '08', borderColor: statusColor + '40' }
            ]}
          >
            <View style={styles.cardHeaderSmall}>
               <Text style={[styles.statusLabel, { color: statusColor }]}>
                 {t(`status.${status.toLowerCase()}`)} • {new Date(item.scheduledAt).toLocaleDateString()}
               </Text>
               <Ionicons 
                 name={isCompleted ? "checkmark-circle" : (status === 'PENDING' ? "time" : "navigate")} 
                 size={16} 
                 color={statusColor} 
               />
            </View>

            <Text style={styles.cardTitle}>{item.id.slice(-6).toUpperCase()} {t('pickup')}</Text>
            <Text style={styles.cardDesc}>{item.address?.street}, {item.address?.city}</Text>
            
            <View style={styles.cardFooter}>
               <View style={styles.materialTag}>
                  <Ionicons name="leaf" size={12} color={isActive ? statusColor : '#6b7280'} />
                  <Text style={[styles.materialText, isActive && { color: statusColor }]}>{t('recyclables')}</Text>
               </View>
               {isCompleted && item.totalAmount > 0 && (
                  <View style={styles.creditsBadge}>
                     <Text style={styles.creditsText}>+₹{item.totalAmount.toFixed(0)} Credits</Text>
                  </View>
               )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const ListHeader = () => (
    <Animated.View entering={FadeInUp} style={styles.impactCardContainer}>
      <View style={styles.impactCard}>
        <View style={styles.impactCardRow}>
          <View>
            <Text style={styles.impactLabel}>{t('total_savings')}</Text>
            <Text style={styles.impactValue}>124.8 KG</Text>
          </View>
          <View style={styles.growthBadge}>
             <Text style={styles.growthText}>+12% this month</Text>
          </View>
        </View>
        
        <View style={styles.subStatsRow}>
           <View style={styles.subStatCard}>
              <View style={styles.subStatIcon}><Ionicons name="sync" size={14} color="#16a34a" /></View>
              <Text style={styles.subStatLabel}>{t('plastic_diverted')}</Text>
              <Text style={styles.subStatVal}>82.3 kg</Text>
           </View>
           <View style={styles.subStatCard}>
              <View style={styles.subStatIcon}><Ionicons name="leaf" size={14} color="#16a34a" /></View>
              <Text style={styles.subStatLabel}>{t('co2_offset')}</Text>
              <Text style={styles.subStatVal}>42.5 kg</Text>
           </View>
        </View>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={LoopyColors.green} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>{t('bookings')}</Text>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile' as any)}>
           <Image 
              source={user?.image ? { uri: user.image } : require('../../assets/images/user-placeholder.png')} 
              style={styles.avatarMini} 
           />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderTimelineItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={() => (
          <TouchableOpacity style={styles.loadMoreBtn}>
             <Text style={styles.loadMoreText}>{t('load_more')}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LoopyColors.green} />}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/book' as any)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
  profileBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  avatarMini: { width: '100%', height: '100%' },

  // Impact Card
  impactCardContainer: { padding: 24, paddingBottom: 12 },
  impactCard: { 
    backgroundColor: '#fff', 
    borderRadius: 32, 
    padding: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8 
  },
  impactCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  impactLabel: { fontSize: 10, fontFamily: Fonts.bold, color: '#059669', letterSpacing: 1 },
  impactValue: { fontSize: 32, fontFamily: Fonts.bold, color: '#111827', marginTop: 4 },
  growthBadge: { backgroundColor: '#bbf7d0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  growthText: { color: '#166534', fontSize: 10, fontFamily: Fonts.bold },
  subStatsRow: { flexDirection: 'row', gap: 12 },
  subStatCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 20, padding: 16 },
  subStatIcon: { marginBottom: 8 },
  subStatLabel: { fontSize: 10, fontFamily: Fonts.medium, color: '#6b7280', marginBottom: 2 },
  subStatVal: { fontSize: 14, fontFamily: Fonts.bold, color: '#111827' },

  // Timeline
  listContent: { paddingBottom: 100 },
  timelineRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 4 },
  timelineLeft: { width: 30, alignItems: 'center' },
  timelineLine: { position: 'absolute', top: 0, bottom: -10, width: 2, backgroundColor: '#e5e7eb' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#9ca3af', marginTop: 28, zIndex: 1, borderWidth: 3, borderColor: '#fcfcfc' },
  timelineDotActive: { backgroundColor: '#bbf7d0', width: 24, height: 24, borderRadius: 12, marginTop: 23, marginLeft: -5 },
  dotInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#22c55e' },
  
  // Cards
  cardContainer: { flex: 1 },
  bookingCard: { flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20, marginLeft: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f3f4f6' },
  scheduledCard: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  cardHeaderSmall: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statusLabel: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
  cardTitle: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  materialTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  scheduledMaterialTag: { backgroundColor: '#dcfce7' },
  materialText: { fontSize: 11, fontFamily: Fonts.bold, color: '#111827' },
  creditsBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  creditsText: { fontSize: 11, fontFamily: Fonts.bold, color: '#059669' },

  // Footer & FAB
  loadMoreBtn: { marginHorizontal: 24, marginVertical: 12, paddingVertical: 14, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center' },
  loadMoreText: { fontSize: 13, fontFamily: Fonts.bold, color: '#6b7280' },
  fab: { position: 'absolute', bottom: 100, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
});
