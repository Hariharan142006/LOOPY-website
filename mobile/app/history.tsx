import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';
import { LoopyColors, Colors } from '../constants/colors';
import { Fonts } from '../constants/typography';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  useEffect(() => {
    fetchHistory(0);
  }, []);

  const fetchHistory = async (skip: number = 0) => {
    try {
      if (skip === 0) setLoading(true);
      else setLoadingMore(true);

      const response = await api.get(`/api/user/bookings?limit=${LIMIT}&skip=${skip}`);
      const newBookings = response.data.bookings || [];
      
      if (skip === 0) {
        setHistory(newBookings);
      } else {
        setHistory(prev => [...prev, ...newBookings]);
      }
      
      if (newBookings.length < LIMIT) {
        setHasMore(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchHistory(history.length);
    }
  };

  const filteredHistory = history.filter(item => {
    const searchLow = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(searchLow) ||
      (item.address?.street || '').toLowerCase().includes(searchLow) ||
      (item.address?.city || '').toLowerCase().includes(searchLow)
    );
  });

  const getStatusMeta = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'COMPLETED':
      case 'PAID':
        return { 
          color: '#22c55e', 
          icon: 'leaf', 
          bg: '#f0fdf4',
          label: 'COMPLETED',
          footer: 'Earned Credits'
        };
      case 'ARRIVED':
        return { 
          color: '#06b6d4', 
          icon: 'car', 
          bg: '#ecfeff',
          label: 'ARRIVED',
          footer: 'Agent is waiting at drop-off'
        };
      case 'SCHEDULED':
      case 'PENDING':
      case 'ASSIGNED':
        return { 
          color: '#6b7280', 
          icon: 'calendar', 
          bg: '#f9fafb',
          label: s === 'PENDING' ? 'SCHEDULED' : s,
          footer: 'Reminder set'
        };
      default:
        return { 
          color: '#9ca3af', 
          icon: 'time', 
          bg: '#f9fafb',
          label: s,
          footer: 'Status update'
        };
    }
  };

  const HistoryCard = ({ item, index }: { item: any; index: number }) => {
    const meta = getStatusMeta(item.status);
    const date = new Date(item.scheduledAt);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
      <Animated.View 
        entering={FadeInUp.delay(index * 100)} 
        layout={Layout.springify()}
        style={styles.card}
      >
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Track', { id: item.id } as any)}>
           <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                 <Ionicons name={meta.icon as any} size={22} color={meta.color} />
              </View>
              <View style={styles.cardHeaderContent}>
                 <Text style={styles.locationTitle}>{item.address?.street || `Pickup #${item.id.slice(-6).toUpperCase()}`}</Text>
                 <Text style={styles.timeMeta}>{formattedDate} • {formattedTime}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                 <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
           </View>

           {/* Estimated Value Display */}
           {item.status !== 'COMPLETED' && (
             <View style={styles.estimatedValueRow}>
                <Text style={styles.estLabel}>ESTIMATED VALUE</Text>
                <Text style={styles.estVal}>₹{(item.estimatedValue || 0).toFixed(2)}</Text>
             </View>
           )}

           <View style={styles.tagsRow}>
              {(item.items && item.items.length > 0) ? (
                 item.items.slice(0, 2).map((subItem: any, idx: number) => (
                    <View key={idx} style={styles.tag}>
                       <Ionicons name={idx === 0 ? "cube-outline" : "document-text-outline"} size={12} color="#111827" />
                       <Text style={styles.tagText}>{subItem.type || 'Material'} ({subItem.quantity || '0'}kg)</Text>
                    </View>
                 ))
              ) : (
                <View style={styles.tag}>
                   <Ionicons name="leaf" size={12} color="#111827" />
                   <Text style={styles.tagText}>Recyclables (est. {item.estimatedWeight || '25'}kg)</Text>
                </View>
              )}
           </View>

           <View style={styles.cardDivider} />

            <View style={styles.cardFooter}>
               <View style={{ flex: 1 }}>
                  <Text style={[styles.footerActionText, { color: meta.color === '#6b7280' ? '#6b7280' : (meta.color === '#22c55e' ? '#111827' : meta.color) }]}>
                     {meta.footer === 'Earned Credits' ? `Earned ${Math.floor(item.totalAmount || 120)} ECO Credits` : meta.footer}
                  </Text>
                  {item.agent && (
                    <Text style={styles.agentInfoSub}>
                      {item.agent.name} • {item.agent.vehicleType || 'Professional'}
                    </Text>
                  )}
               </View>
               <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
           <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
           <TextInput 
             style={styles.searchInput}
             placeholder="Search pickups or waste types..."
             placeholderTextColor="#9ca3af"
             value={searchQuery}
             onChangeText={setSearchQuery}
           />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>RECENT ACTIVITY</Text>

        {loading ? (
          <View style={styles.center}>
             <ActivityIndicator size="small" color={LoopyColors.green} />
          </View>
        ) : filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
             <Ionicons name="receipt-outline" size={48} color="#e5e7eb" />
             <Text style={styles.emptyText}>No matching pickups found</Text>
          </View>
        ) : (
          filteredHistory.map((item, index) => (
            <HistoryCard key={item.id} item={item} index={index} />
          ))
        )}

        {filteredHistory.length > 0 && hasMore && (
          <TouchableOpacity 
            style={[styles.loadMoreBtn, loadingMore && { opacity: 0.7 }]} 
            onPress={loadMore}
            disabled={loadingMore}
          >
             {loadingMore ? (
               <ActivityIndicator size="small" color="#166534" />
             ) : (
               <Text style={styles.loadMoreText}>LOAD OLDER RECORDS</Text>
             )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { padding: 40, alignItems: 'center' },
  
  // Header & Search
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#f9fafb' },
  backBtn: { marginBottom: 16 },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ebebeb', 
    borderRadius: 100, 
    paddingHorizontal: 16, 
    height: 52,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: Fonts.medium, color: '#111827' },

  // List Content
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionHeader: { fontSize: 11, fontFamily: Fonts.bold, color: '#6b7280', letterSpacing: 1.5, marginBottom: 20, marginTop: 8 },
  
  // Card Design
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardHeaderContent: { flex: 1 },
  locationTitle: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827' },
  timeMeta: { fontSize: 13, fontFamily: Fonts.medium, color: '#9ca3af', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  statusText: { fontSize: 9, fontFamily: Fonts.bold },

  // Tags
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  tagText: { fontSize: 11, fontFamily: Fonts.bold, color: '#111827' },

  cardDivider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: -20, marginBottom: 16 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerActionText: { fontSize: 13, fontFamily: Fonts.bold },
  agentInfoSub: { fontSize: 11, fontFamily: Fonts.medium, color: '#9ca3af', marginTop: 2 },

  // Estimated Value
  estimatedValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fdf2f8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 16 },
  estLabel: { fontSize: 9, fontFamily: Fonts.bold, color: '#db2777' },
  estVal: { fontSize: 14, fontFamily: Fonts.bold, color: '#db2777' },

  // Helpers
  loadMoreBtn: { backgroundColor: '#f3f4f6', paddingVertical: 14, borderRadius: 100, alignItems: 'center', marginTop: 12 },
  loadMoreText: { fontSize: 12, fontFamily: Fonts.bold, color: '#166534', letterSpacing: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, fontFamily: Fonts.medium, color: '#9ca3af', marginTop: 16 },
});
