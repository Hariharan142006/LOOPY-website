import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, RefreshControl, StatusBar, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInUp, FadeInLeft, FadeInDown, Layout } from 'react-native-reanimated';
import { LoopyColors, Colors } from '../constants/colors';
import { Fonts } from '../constants/typography';
import { useTranslation } from '../hooks/useTranslation';

const FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'pickups', label: 'Pickups' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'impact', label: 'Impact' },
];

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      const apiNotifs = response.data.notifications || [];
      setNotifications(apiNotifs);
    } catch (e) {
      console.error(e);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    try {
      // Optimistically update UI
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      const res = await api.post('/api/notifications/read-all');
      if (res.data.success) {
        // Success
      }
    } catch (e) {
      console.error('Mark all as read error:', e);
      // Revert or show error if needed
      onRefresh(); // Refresh from server to be sure
    }
  };

  const handlePress = async (item: any) => {
    console.log('Notification pressed:', item.id, 'Type:', item.type, 'RelatedId:', item.relatedId);

    // 1. Mark as read immediately in UI
    if (!item.isRead) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
      try {
        await api.post('/api/notifications/read', { id: item.id });
      } catch (e) {
        console.log('Error marking as read', e);
      }
    }

    // 2. Navigation Logic based on type and role
    const role = user?.role || 'CUSTOMER';

    if (item.type === 'MONEY' || item.type === 'SUCCESS') {
      navigation.navigate('Main', { screen: 'wallet' });
    } else if (item.type === 'PICKUP' || item.type === 'INFO' || item.type === 'ALERT' || item.type === 'WARNING' || item.type === 'ERROR') {
      if (item.relatedId) {
        // Customers go to Track, Agents go to TrackRoute
        const targetScreen = role === 'AGENT' ? 'TrackRoute' : 'Track';
        navigation.navigate(targetScreen, { id: item.relatedId });
      } else {
        navigation.navigate('Main', { screen: 'history' });
      }
    } else if (item.type === 'IMPACT') {
      navigation.navigate('Main', { screen: 'index' });
    } else if (item.type === 'SECURITY') {
      navigation.navigate('AccountSettings');
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'MONEY':
      case 'SUCCESS': return { name: 'cash-outline', color: '#10b981', bg: '#ecfdf5' };
      case 'PICKUP':
      case 'INFO': return { name: 'bicycle-outline', color: '#3b82f6', bg: '#eff6ff' };
      case 'ALERT':
      case 'WARNING': return { name: 'alert-circle-outline', color: '#f59e0b', bg: '#fffbeb' };
      case 'ERROR': return { name: 'close-circle-outline', color: '#ef4444', bg: '#fef2f2' };
      case 'IMPACT': return { name: 'leaf-outline', color: '#22c55e', bg: '#f0fdf4' };
      case 'SECURITY': return { name: 'shield-checkmark-outline', color: '#6366f1', bg: '#eef2ff' };
      default: return { name: 'notifications-outline', color: '#6b7280', bg: '#f9fafb' };
    }
  };

  const NotificationCard = ({ item }: any) => {
     const iconConfig = getNotifIcon(item.type);
     const date = new Date(item.createdAt);
     
     // Relative time or formatted date
     const now = new Date();
     const isToday = date.toDateString() === now.toDateString();
     const dateString = isToday 
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

     return (
       <TouchableOpacity 
          style={[styles.notifCard, !item.isRead && styles.unreadCard]}
          activeOpacity={0.8}
          onPress={() => handlePress(item)}
       >
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
             <Ionicons name={iconConfig.name as any} size={22} color={iconConfig.color} />
          </View>
          <View style={styles.notifContent}>
             <View style={styles.cardHeader}>
                <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.notifDate}>{dateString}</Text>
             </View>
             <Text style={styles.notifMessage} numberOfLines={2}>
                {item.message}
             </Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
       </TouchableOpacity>
     );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={LoopyColors.green} />
      </View>
    );
  }

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pickups') return n.type === 'PICKUP';
    if (activeFilter === 'alerts') return n.type === 'ALERT' || n.type === 'WARNING' || n.type === 'ERROR';
    if (activeFilter === 'impact') return n.type === 'IMPACT';
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.readAllBtn} onPress={markAllAsRead}>
           <Ionicons name="checkmark-done" size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
           {FILTER_TYPES.map((filter) => (
             <TouchableOpacity 
               key={filter.id}
               onPress={() => setActiveFilter(filter.id)}
               style={[
                 styles.filterChip,
                 activeFilter === filter.id && styles.activeFilterChip
               ]}
             >
               <Text style={[
                 styles.filterText,
                 activeFilter === filter.id && styles.activeFilterText
               ]}>
                 {filter.label}
               </Text>
             </TouchableOpacity>
           ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LoopyColors.green} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <NotificationCard item={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
             <View style={styles.emptyIconBg}>
                <Ionicons name="notifications-off-outline" size={40} color="#9ca3af" />
             </View>
             <Text style={styles.emptyTitle}>{t('all_caught_up')}</Text>
             <Text style={styles.emptySubtitle}>{t('no_notifications')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  readAllBtn: { width: 40, height: 40, backgroundColor: '#ecfdf5', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontFamily: Fonts.bold, color: '#111827', letterSpacing: -0.5 },
  
  filterWrapper: { marginBottom: 16 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6' },
  activeFilterChip: { backgroundColor: '#111827', borderColor: '#111827' },
  filterText: { fontSize: 13, fontFamily: Fonts.bold, color: '#6b7280' },
  activeFilterText: { color: '#fff' },

  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  notifCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  unreadCard: { backgroundColor: '#fff', borderColor: '#10b981', borderWidth: 1.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginLeft: 8 },
  iconContainer: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  notifContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontFamily: Fonts.bold, color: '#111827' },
  notifDate: { fontSize: 11, fontFamily: Fonts.bold, color: '#9ca3af' },
  notifMessage: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280', lineHeight: 18 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
  emptySubtitle: { fontSize: 14, fontFamily: Fonts.medium, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
});
