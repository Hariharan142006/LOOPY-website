import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView, StatusBar, Image, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LoopyColors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/layout';
import { useTranslation } from '../../hooks/useTranslation';


const { width } = Dimensions.get('window');

export default function BookingsScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [impact, setImpact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [bookingsRes, walletRes] = await Promise.all([
        api.get('/api/user/bookings'),
        api.get('/api/user/wallet')
      ]);
      setBookings(bookingsRes.data.bookings || []);
      setImpact(walletRes.data.impact || null);
    } catch (error) {
      console.log('Error fetching bookings/impact', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderTimelineItem = ({ item, index }: { item: any; index: number }) => {
    const status = item.status?.toUpperCase() || 'PENDING';
    const isCompleted = status === 'COMPLETED' || status === 'PAID';
    const isCancelled = status === 'CANCELLED';
    
    const getStatusTheme = () => {
       if (isCompleted) return { bg: '#eafff2', text: '#16a34a' };
       if (isCancelled) return { bg: '#ffe4e6', text: '#ef4444' };
       return { bg: '#f1f5f9', text: '#64748b' };
    };
    const theme = getStatusTheme();

    return (
       <Animated.View entering={FadeInRight.delay(index * 100)} style={styles.cardContainer}>
         <TouchableOpacity 
           activeOpacity={0.7}
           onPress={() => navigation.navigate('Track', { id: item.id } as any)}
           style={styles.bookingCard}
         >
           <View style={styles.cardHeaderRow}>
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <Text style={styles.cardIdText}>#{item.id.slice(0,8).toUpperCase()}</Text>
                <View style={[styles.statusPill, { backgroundColor: theme.bg }]}>
                   <Text style={[styles.statusPillText, { color: theme.text }]}>{status}</Text>
                </View>
             </View>
             <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.cardAmount}>₹{item.totalAmount > 0 ? item.totalAmount.toFixed(2) : '--'}</Text>
                <Text style={styles.cardAmountSub}>{isCompleted ? 'FINAL PAYOUT' : 'ESTIMATED VALUE'}</Text>
             </View>
           </View>
           
           <Text style={styles.cardDateText}>{new Date(item.createdAt).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})} • {new Date(item.createdAt).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}</Text>

           <View style={styles.itemsRow}>
              {(item.items && item.items.length > 0) ? (
                <>
                  {item.items.slice(0, 2).map((sub: any, idx: number) => (
                    <View key={idx} style={styles.itemTag}>
                      <Text style={styles.itemTagText}>{sub.type || sub.category || 'Material'}</Text>
                    </View>
                  ))}
                  {item.items.length > 2 && (
                    <View style={styles.itemTag}>
                      <Text style={styles.itemTagText}>+{item.items.length - 2} more</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.itemTag}>
                  <Text style={styles.itemTagText}>{(item.estimatedWeight || item.weightRange?.label || '20kg') + ' Recyclables'}</Text>
                </View>
              )}
           </View>

           <View style={styles.agentRow}>
              <View style={styles.agentIconBg}>
                 <Ionicons name="bus" size={20} color={LoopyColors.green} />
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                 <Text style={styles.agentName}>{item.agent?.name ? `Agent ${item.agent.name.split(' ')[0]}` : 'Assigning Agent'}</Text>
                 <Text style={styles.agentRole}>{item.agent ? 'Pickup Professional' : 'Looking for nearby riders...'}</Text>
              </View>
              {item.agent?.phone && (
                <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${item.agent.phone}`)}>
                   <Text style={styles.callBtnText}>Call Agent</Text>
                </TouchableOpacity>
              )}
           </View>
         </TouchableOpacity>
       </Animated.View>
    );
  };

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
        <Text style={styles.loopyLogoText}>Loopy</Text>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10}}>
           <View style={{ flexShrink: 1, paddingRight: 16 }}>
             <Text style={styles.headerTitle}>My Bookings</Text>
             <Text style={styles.headerSub}>Track current pickups and view past history</Text>
           </View>
           <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Main', { screen: 'profile' })}>
             <Image 
                source={user?.image ? { uri: user.image } : require('../../assets/images/user-placeholder.png')} 
                style={styles.avatarMini} 
             />
           </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderTimelineItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => <View style={{height: 16}} />}
        ListFooterComponent={() => bookings.length > 0 ? (
          <TouchableOpacity style={styles.loadMoreBtn}>
             <Text style={styles.loadMoreText}>{t('load_more')}</Text>
          </TouchableOpacity>
        ) : null}
        contentContainerStyle={[styles.listContent, { paddingBottom: 200 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LoopyColors.green} />}
        showsVerticalScrollIndicator={false}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { paddingHorizontal: 24, paddingVertical: 16, paddingTop: 24 },
  loopyLogoText: { fontSize: 24, fontWeight: '900', color: '#16a34a' },
  headerTitle: { fontSize: 28, fontFamily: Fonts.bold, color: '#111827', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 4, fontFamily: Fonts.medium },
  profileBtn: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: '#fecdd3', alignItems: 'center', justifyContent: 'center' },
  avatarMini: { width: '100%', height: '100%' },

  listContent: { paddingBottom: 100, paddingHorizontal: 24 },
  
  // Cards
  cardContainer: { marginBottom: 16 },
  bookingCard: { backgroundColor: '#fff', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardIdText: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardAmount: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'right' },
  cardAmountSub: { fontSize: 9, fontWeight: '800', color: '#6b7280', letterSpacing: 0.5, textAlign: 'right', marginTop: 2 },
  
  cardDateText: { fontSize: 13, color: '#6b7280', fontWeight: '500', marginBottom: 20 },
  
  itemsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 24 },
  itemTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  itemTagText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  
  agentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 20 },
  agentIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eafff2', alignItems: 'center', justifyContent: 'center' },
  agentName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  agentRole: { fontSize: 11, fontWeight: '500', color: '#64748b' },
  callBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: '#16a34a', backgroundColor: '#fff' },
  callBtnText: { fontSize: 13, fontWeight: '800', color: '#16a34a' },

  // Footer & FAB
  loadMoreBtn: { marginVertical: 12, paddingVertical: 14, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center' },
  loadMoreText: { fontSize: 13, fontFamily: Fonts.bold, color: '#6b7280' },
});
