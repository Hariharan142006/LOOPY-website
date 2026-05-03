import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Alert, 
  StatusBar, 
  Image,
  Modal,
  PermissionsAndroid, 
  Platform, 
  Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInRight, FadeInDown, useSharedValue, withTiming, runOnJS, useAnimatedStyle } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
// @ts-ignore
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { LoopyColors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/layout';
import { useTranslation } from '../../hooks/useTranslation';
import InAppTutorial, { TutorialStep } from '../../components/InAppTutorial';
import { useRoute } from '@react-navigation/native';
import AnimatedTruck from '../../components/AnimatedTruck';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>(); const params = route.params || {};
  
  const [data, setData] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  const handleTruckPress = () => {
    navigation.navigate('Book');
  };

  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(params.startTutorial === 'true');
  const [walletPos, setWalletPos] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [ratesPos, setRatesPos] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [bookPos, setBookPos] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [impactPos, setImpactPos] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const tutorialSteps: TutorialStep[] = [
    {
      targetId: 'wallet',
      title: 'Earnings & Wallet',
      description: 'Track your recycling profits here. Every kilogram you recycle adds money to this wallet, which you can withdraw anytime.',
      position: walletPos,
      tipPosition: 'bottom',
    },
    {
      targetId: 'rates',
      title: 'Live Market Rates',
      description: 'Always check the Daily Rates before booking. We provide real-time, transparent prices for all categories like Paper, Plastic, and Metal.',
      position: ratesPos,
      tipPosition: 'top',
    },
    {
      targetId: 'book',
      title: 'Booking a Pickup',
      description: 'Ready to recycle? Just tap "Book Pickup" to choose a convenient time. Our agent will come to your doorstep for collection.',
      position: bookPos,
      tipPosition: 'top',
    },
    {
      targetId: 'impact',
      title: 'Your Eco Impact',
      description: 'See the difference you are making! This shows the total weight of waste you have successfully diverted from landfills.',
      position: impactPos,
      tipPosition: 'top',
    },
    {
      targetId: 'tabs',
      title: 'Navigation',
      description: 'Use the bottom bar to quickly switch between your bookings, wallet history, and profile settings.',
      position: { x: 0, y: SCREEN_HEIGHT - 60, width: SCREEN_WIDTH, height: 60 },
      tipPosition: 'top',
    }
  ];

  const measureElement = (ref: any, setter: Function) => {
    if (ref.current) {
        ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
            setter({ x, y, width, height });
        });
    }
  };

  const walletRef = React.useRef<View>(null);
  const ratesRef = React.useRef<View>(null);
  const bookRef = React.useRef<View>(null);
  const impactRef = React.useRef<View>(null);

  useEffect(() => {
    if (showTutorial) {
        // Delay measurement to allow layout to stabilize
        const timer = setTimeout(() => {
            measureElement(walletRef, setWalletPos);
            measureElement(ratesRef, setRatesPos);
            measureElement(bookRef, setBookPos);
            measureElement(impactRef, setImpactPos);
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [showTutorial]);

  const isAgent = user?.role === 'AGENT';

  const fetchData = async () => {
    try {
      const endpoints = isAgent 
        ? [api.post('/api/agent/tasks', { lat: user?.currentLat, lng: user?.currentLng }, { timeout: 10000 }), api.get('/api/notifications')] 
        : [api.get('/api/user/wallet'), api.get('/api/notifications'), api.get('/api/user/bookings?limit=5')];

      const responses = await Promise.all(endpoints);
      
      if (isAgent) {
        setData(responses[0].data);
      } else {
        setWallet(responses[0].data || null);
        setRecentBookings(responses[2]?.data?.bookings || []);
      }

      const notifs = responses[1]?.data?.notifications || [];
      setHasUnread(notifs.some((n: any) => !n.isRead));
    } catch (error) {
      console.log('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
        setLoading(true);
        fetchData();
    }, [isAgent])
  );

  useEffect(() => {
    const interval = setInterval(fetchData, 60000); // 60s polling (optimized from 30s)

    let watchId: number | null = null;
    if (isAgent) {
        (async () => {
            let hasPermission = false;
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            ]);
            hasPermission = 
                granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
                granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

            if (hasPermission) {
                watchId = Geolocation?.watchPosition ? Geolocation.watchPosition(
                    (location) => {
                        api.post('/api/agent/location', {
                            lat: location.coords.latitude,
                            lng: location.coords.longitude
                        }).catch(console.log);
                    },
                    (error) => console.log(error),
                    { 
                      enableHighAccuracy: true, 
                      distanceFilter: 50, 
                      interval: 30000,
                      fastestInterval: 10000,
                    }
                ) : null;
            }
        })();
    }


    return () => {
        clearInterval(interval);
        if (watchId !== null) Geolocation.clearWatch(watchId);
    };
  }, [isAgent]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleTaskAction = async (bookingId: string, action: 'ACCEPT' | 'STATUS', status?: string) => {
    setLoading(true);
    try {
      const res = await api.post('/api/agent/tasks/update', { bookingId, action, status });
      if (res.data.success) {
        if (action === 'ACCEPT') Alert.alert('Success', 'Pickup accepted!');
        await fetchData();
      } else {
        Alert.alert('Notice', res.data.error || 'Could not complete action');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const [isOnline, setIsOnline] = useState(true);

  const toggleDutyStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    try {
      await api.post('/api/agent/status', { isOnline: newStatus });
    } catch (e) {
      setIsOnline(!newStatus);
      Alert.alert('Error', 'Failed to update duty status');
    }
  };

  if (loading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={LoopyColors.green} />
      </View>
    );
  }


  return isAgent ? (
    <SafeAreaView style={styles.agentContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LoopyColors.green} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View style={styles.agentHeaderTop}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity style={styles.agentAvatarBtn} onPress={() => navigation.navigate('Main', { screen: 'profile' })}>
                   <Image 
                      source={user?.image ? { uri: user.image } : require('../../assets/images/user-placeholder.png')} 
                      style={{ width: '100%', height: '100%' }} 
                   />
                </TouchableOpacity>
                <View style={{marginLeft: 12}}>
                    <Text style={styles.agentPortalTextTitle}>{t('agent_portal')}</Text>
                    <View style={styles.onlineStatusRow}>
                       <Text style={styles.onlineStatusText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtnTransparent}>
                <Ionicons name="notifications-outline" size={24} color="#111827" />
                {hasUnread && <View style={[styles.unreadBadge, { top: 2, right: 2 }]} />}
            </TouchableOpacity>
        </View>

        <View style={styles.agentStatsWrapper}>
            <View style={styles.earningsCardDesign}>
               <View style={styles.earningsHeaderRow}>
                  <Text style={styles.statLabelTopGrey}>{t('todays_earnings')}</Text>
                  <View style={styles.trendBadgeGreen}>
                     <Ionicons name="trending-up" size={12} color="#10b981" />
                     <Text style={styles.trendBadgeText}>+15%</Text>
                  </View>
               </View>
               <Text style={styles.earningsValLarge}>₹{(data?.summary?.todayEarnings || 4850).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
               
               <View style={styles.targetProgressContainer}>
                  <View style={styles.targetLabelRow}>
                    <Text style={styles.targetLabelText}>Daily Target</Text>
                    <Text style={styles.targetValueText}>₹6,000.00</Text>
                  </View>
                  <View style={styles.targetTrack}>
                     <View style={[styles.targetFill, { width: '65%' }]} />
                  </View>
               </View>
            </View>

            <View style={styles.statsRowGridDesign}>
               <View style={styles.statCardFullDesign}>
                  <View style={styles.statIconBox}>
                     <Ionicons name="bus-outline" size={24} color="#059669" />
                  </View>
                  <Text style={styles.statValueBig}>{data?.summary?.todayCompleted ?? 24}</Text>
                  <Text style={styles.statLabelSmall}>PICKUPS</Text>
               </View>
               <View style={styles.statCardFullDesign}>
                  <View style={styles.statIconBox}>
                     <Ionicons name="time-outline" size={24} color="#059669" />
                  </View>
                  <Text style={styles.statValueBig}>{data?.accepted?.length ?? '08'}</Text>
                  <Text style={styles.statLabelSmall}>QUEUED</Text>
               </View>
            </View>
         </View>

         {/* Quick Actions Section */}
         <View style={styles.quickActionsAgentSection}>
            <Text style={styles.sectionHeadingTitle}>Quick Actions</Text>
            <View style={styles.agentActionsGridDesign}>
               <TouchableOpacity style={styles.agentActionItemDesign} onPress={() => Alert.alert('Coming Soon', 'QR Scanner will be available in v1.2')}>
                  <View style={[styles.actionIconCircleDesign, { backgroundColor: '#f0fdf4' }]}>
                     <Ionicons name="qr-code-outline" size={24} color="#059669" />
                  </View>
                  <Text style={styles.actionItemLabelDesign}>Scan QR</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.agentActionItemDesign} onPress={() => navigation.navigate('Rates')}>
                  <View style={[styles.actionIconCircleDesign, { backgroundColor: '#f0fdf4' }]}>
                     <Text style={{ fontSize: 24, color: '#059669', fontFamily: Fonts.bold }}>₹</Text>
                  </View>
                  <Text style={styles.actionItemLabelDesign}>Daily Rates</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.agentActionItemDesign} onPress={() => navigation.navigate('Main', { screen: 'pickups' })}>
                  <View style={[styles.actionIconCircleDesign, { backgroundColor: '#f0fdf4' }]}>
                     <Ionicons name="map-outline" size={24} color="#059669" />
                  </View>
                  <Text style={styles.actionItemLabelDesign}>Route Map</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.agentActionItemDesign} onPress={() => navigation.navigate('Notifications')}>
                  <View style={[styles.actionIconCircleDesign, { backgroundColor: '#f0fdf4' }]}>
                     <Ionicons name="headset-outline" size={24} color="#059669" />
                  </View>
                  <Text style={styles.actionItemLabelDesign}>Support</Text>
               </TouchableOpacity>
            </View>
         </View>

        <View style={styles.agentSectionActive}>
           <Text style={styles.sectionHeadingTitle}>Active Queue</Text>
           <Text style={styles.sectionSubHeading}>Manage your current recycling tasks</Text>
           
           {(!data?.accepted || data.accepted.length === 0) ? (
               <View style={styles.emptyActiveCardDashed}>
                   <View style={styles.emptyIconCircleBlue}>
                      <Ionicons name="cube-outline" size={32} color="#4f46e5" />
                   </View>
                   <Text style={styles.emptyActiveTitle}>No active tasks right now</Text>
                   <Text style={styles.emptyActiveSub}>New requests will appear here when assigned.</Text>
                   <TouchableOpacity style={styles.refreshQueueBtn} onPress={onRefresh} activeOpacity={0.7}>
                       {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.refreshQueueBtnText}>Refresh Queue</Text>}
                   </TouchableOpacity>
               </View>
           ) : (
               <View style={styles.mainActiveCard}>
                   <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Main', { screen: 'pickups' })}>
                       <View style={styles.mapBackdrop}>
                               <MapView 
                                   style={StyleSheet.absoluteFillObject}
                                   provider={PROVIDER_DEFAULT}
                                   region={{
                                       latitude: data.accepted?.[0]?.pickupLat || 21.1458,
                                       longitude: data.accepted?.[0]?.pickupLng || 79.0882,
                                       latitudeDelta: 0.02,
                                       longitudeDelta: 0.02,
                                   }}
                                   scrollEnabled={false}
                                   zoomEnabled={false}
                                   pitchEnabled={false}
                               >
                               {data.accepted?.[0] && (
                                 <Marker coordinate={{ latitude: data.accepted[0].pickupLat || 21.1458, longitude: data.accepted[0].pickupLng || 79.0882 }} />
                               )}
                           </MapView>
                           <View style={styles.localPickupPin}>
                               <Ionicons name="location" size={14} color="#15803d" />
                               <Text style={styles.localPickupText}>Local Pickup</Text>
                           </View>
                       </View>
                       <View style={styles.activeQueueInfo}>
                           <View style={styles.activeQueueHeaderRow}>
                               <View style={{ flex: 1 }}>
                                   <Text style={styles.aqName}>{data?.accepted?.[0]?.user?.name || 'Customer'}</Text>
                                   <View style={styles.aqAddressRow}>
                                       <Ionicons name="home" size={12} color="#9ca3af" />
                                       <Text style={styles.aqAddress} numberOfLines={1}>{data?.accepted?.[0]?.address?.street || 'Unknown Address'}</Text>
                                   </View>
                               </View>
                               <View style={{alignItems: 'flex-end'}}>
                                    <Text style={styles.aqScheduledLabel}>EST. PAYOUT</Text>
                                    <Text style={[styles.aqTime, { color: '#10b981' }]}>₹{(data?.accepted?.[0]?.estimatedValue || 0).toFixed(2)}</Text>
                                </View>
                            </View>

                            {/* Dynamic Material Tags */}
                            <View style={styles.materialTagsRow}>
                                {(data?.accepted?.[0]?.items || []).slice(0, 3).map((item: any, i: number) => (
                                    <View key={i} style={styles.materialTag}>
                                        <Text style={styles.materialTagText}>{item?.item?.name || 'Item'}</Text>
                                    </View>
                                ))}
                                {(data?.accepted?.[0]?.items?.length || 0) > 3 && (
                                    <View style={styles.materialTagMore}>
                                        <Text style={styles.materialTagText}>+{(data?.accepted?.[0]?.items?.length || 0) - 3}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.aqDivider} />

                            <View style={styles.aqScheduleInfoRow}>
                                <View style={styles.aqInfoItem}>
                                    <Ionicons name="time-outline" size={14} color="#6b7280" />
                                    <Text style={styles.aqInfoText}>{new Date(data?.accepted?.[0]?.scheduledAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                                <View style={styles.aqInfoItem}>
                                    <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                                    <Text style={styles.aqInfoText}>{new Date(data?.accepted?.[0]?.scheduledAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                                </View>
                            </View>
                           <View style={styles.aqActionRow}>
                               <TouchableOpacity 
                                   style={styles.aqPrimaryBtn} 
                                   onPress={() => navigation.navigate(
                                      data.accepted[0].status === 'ARRIVED' ? 'Weigh' : 'TrackRoute', 
                                      { id: data.accepted[0].id }
                                   )}>
                                   <Ionicons 
                                      name={
                                        data.accepted[0].status === 'ARRIVED' ? "scale" : 
                                        data.accepted[0].status === 'ONEWAY' ? "map" : "play"
                                      } 
                                      size={18} 
                                      color="#fff" 
                                   />
                                   <Text style={styles.aqPrimaryBtnText}>
                                      {
                                        data.accepted[0].status === 'ARRIVED' ? t('resume_weighing') : 
                                        data.accepted[0].status === 'ONEWAY' ? t('resume_route') : t('start_route')
                                      }
                                   </Text>
                               </TouchableOpacity>
                               <TouchableOpacity 
                                   style={styles.aqCallBtn} 
                                   onPress={() => Linking.openURL(`tel:${data?.accepted?.[0]?.user?.phone}`)}
                               >
                                   <Ionicons name="call" size={20} color="#15803d" />
                               </TouchableOpacity>
                           </View>
                       </View>
                   </TouchableOpacity>
               </View>
           )}
        </View>

         {data?.available && data.available.length > 0 && (
             <View style={styles.agentSection}>
                <View style={styles.sectionHeaderRow}>
                    <View>
                        <Text style={styles.activeQueueTitle}>{t('available_pickups')}</Text>
                        <Text style={styles.activeQueueSub}>{t('available_pickups_sub')}</Text>
                    </View>
                </View>
                <View style={{ gap: 12, marginTop: 12 }}>
                    {data?.available?.map((item: any) => (
                        <View key={item?.id || Math.random().toString()} style={styles.availableTaskCard}>
                            <View style={styles.availableHeader}>
                                <View style={styles.availableDistBadge}>
                                    <Ionicons name="location" size={12} color="#15803d" />
                                    <Text style={styles.availableDistText}>{(item?.distance || 0).toFixed(1)} km away</Text>
                                </View>
                                <Text style={styles.availablePayout}>₹{(item?.totalAmount || 0).toFixed(0)}</Text>
                            </View>
                            <Text style={styles.availableName}>{item?.user?.name || 'Customer'}</Text>
                            <Text style={styles.availableAddr} numberOfLines={1}>{item?.address?.street || 'No address'}</Text>
                            
                            {/* Materials Preview */}
                            <View style={[styles.materialTagsRow, { marginTop: 8, marginBottom: 8 }]}>
                                {(item?.items || []).slice(0, 3).map((scrap: any, i: number) => (
                                    <View key={i} style={[styles.materialTag, { paddingVertical: 2, paddingHorizontal: 8 }]}>
                                        <Text style={[styles.materialTagText, { fontSize: 10 }]}>{scrap?.item?.name || 'Item'}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.availableFooter}>
                                <View style={styles.availableTime}>
                                    <Ionicons name="time-outline" size={14} color="#6b7280" />
                                    <Text style={styles.availableTimeText}>{new Date(item?.scheduledAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                                <TouchableOpacity style={styles.acceptMiniBtn} onPress={() => handleTaskAction(item?.id, 'ACCEPT')}>
                                    <Text style={styles.acceptMiniBtnText}>{t('accept_task')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
             </View>
         )}

        {data?.accepted && data.accepted.length > 1 && (
            <View style={styles.agentSection}>
               <Text style={styles.upcomingLabel}>{t('upcoming_today')}</Text>
               <View style={styles.upcomingContainer}>
                   {data.accepted.slice(1).map((item: any) => (
                       <View key={item.id} style={styles.upcomingPill}>
                          <View style={styles.upcomingPillIcon}>
                              <Ionicons name="sync" size={16} color="#15803d" />
                          </View>
                          <View style={styles.upcomingPillInfo}>
                              <Text style={styles.upName}>{item.user?.name}</Text>
                              <Text style={styles.upDetails}>{item.items?.length || 3} items • {new Date(item.scheduledAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                       </View>
                   ))}
               </View>
            </View>
        )}
      </ScrollView>
    </SafeAreaView>

  ) : (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LoopyColors.green} />}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <Animated.View entering={FadeInUp} style={styles.customerHeader}>
          <View style={styles.customerHeaderTopRow}>
            <TouchableOpacity style={styles.avatarHolder} onPress={() => navigation.navigate('Main', { screen: 'profile' })}>
               {user?.image ? (
                 <Image source={{ uri: user.image }} style={styles.avatarMini} />
               ) : <Ionicons name="person" size={24} color="#9ca3af" />}
            </TouchableOpacity>
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={styles.greetingHeader}>{t('greeting')}, <Text style={styles.nameHeaderTeal}>{user?.name?.split(' ')[0] || 'Sk'}</Text></Text>
              <Text style={styles.subGreeting}>Manage your scrap pickups and track earnings.</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtnCircle}>
               <Ionicons name="notifications-outline" size={22} color="#111827" />
               {hasUnread && <View style={[styles.unreadBadge, { top: 12, right: 12 }]} />}
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ paddingHorizontal: 24, gap: 20, marginBottom: 32 }}>
           {/* Animated Truck Card */}
           <View ref={bookRef}>
             <AnimatedTruck onPress={handleTruckPress} />
           </View>

           {/* Total Earnings Card */}
           <Animated.View entering={FadeInUp.delay(300)} style={styles.earningsCardFull}>
              <Text style={styles.earningsLabelTop}>TOTAL EARNINGS</Text>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsValBigCustomer}>₹{(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
              <TouchableOpacity style={styles.withdrawBtnFull} onPress={() => navigation.navigate('Withdraw')}>
                 <Ionicons name="wallet-outline" size={20} color="#111827" style={{ marginRight: 8 }} />
                 <Text style={styles.withdrawBtnTextFull}>Withdraw Funds</Text>
              </TouchableOpacity>
           </Animated.View>



           {/* Schedule Pickup Card */}
           <Animated.View entering={FadeInUp.delay(400)} style={styles.actionCardModern}>
             <TouchableOpacity style={styles.actionCardInner} onPress={() => navigation.navigate('Book')}>
               <View style={[styles.actionIconBox, { backgroundColor: '#eafff2' }]}>
                 <Ionicons name="calendar-outline" size={22} color="#16a34a" />
               </View>
               <View style={{ flex: 1, paddingLeft: 16 }}>
                 <Text style={styles.actionCardTitle}>Schedule Pickup</Text>
                 <Text style={styles.actionCardSub}>Hassle-free doorstep service</Text>
               </View>
               <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
             </TouchableOpacity>
           </Animated.View>

           {/* Check Rates Card */}
           <Animated.View entering={FadeInUp.delay(500)} style={styles.actionCardModern}>
             <TouchableOpacity style={styles.actionCardInner} onPress={() => navigation.navigate('Rates')}>
               <View style={[styles.actionIconBox, { backgroundColor: '#eff6ff' }]}>
                 <Ionicons name="trending-up-outline" size={22} color="#3b82f6" />
               </View>
               <View style={{ flex: 1, paddingLeft: 16 }}>
                 <Text style={styles.actionCardTitle}>Check Rates</Text>
                 <Text style={styles.actionCardSub}>Live market scrap prices</Text>
               </View>
               <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
             </TouchableOpacity>
           </Animated.View>
        </View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInUp.delay(600)} style={styles.activitySectionCustomer}>
           <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                 <Text style={styles.seeAllTextGreen}>See All</Text>
              </TouchableOpacity>
           </View>
           
           <View style={styles.activityList}>
               {recentBookings.length === 0 ? (
                 <View style={styles.emptyCard}>
                    <Ionicons name="receipt-outline" size={32} color="#e5e7eb" />
                    <Text style={styles.emptyCardText}>No recent pickups found</Text>
                 </View>
               ) : (
                 recentBookings.map((item, idx) => {
                   const date = new Date(item.scheduledAt);
                   const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                   const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                   return (
                     <TouchableOpacity 
                       key={item.id} 
                       activeOpacity={0.9} 
                       onPress={() => navigation.navigate('Track', { id: item.id })}
                       style={styles.activityCardModern}
                     >
                        <View style={styles.activityCardHeader}>
                           <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                 <Text style={styles.activityIdText}>#{item.id.slice(-8).toUpperCase()}</Text>
                                 <View style={[styles.activityStatusBadge, item.status === 'COMPLETED' && { backgroundColor: '#eafff2' }]}>
                                    <Text style={[styles.activityStatusText, item.status === 'COMPLETED' && { color: '#16a34a' }]}>{item.status}</Text>
                                 </View>
                              </View>
                           </View>
                           <View style={styles.activityEstValueCol}>
                              <Text style={styles.activityEstValText}>
                                 {item.status === 'COMPLETED' ? `₹${item.totalAmount || 0}` : (item.estimatedValue ? `₹${item.estimatedValue}` : '₹--')}
                              </Text>
                              <Text style={styles.activityEstLabel}>{item.status === 'COMPLETED' ? 'FINAL VALUE' : 'ESTIMATED VALUE'}</Text>
                           </View>
                        </View>

                        <Text style={styles.activityDateTime}>{formattedDate} • {formattedTime}</Text>

                        <View style={styles.activityTagsRow}>
                           {item.items && item.items.length > 0 ? (
                             item.items.map((sub: any, sIdx: number) => (
                               <View key={sIdx} style={styles.activityTag}>
                                  <Text style={styles.activityTagText}>{sub.type || 'Material'}</Text>
                               </View>
                             ))
                           ) : (
                             <View style={styles.activityTag}>
                                <Text style={styles.activityTagText}>Material</Text>
                             </View>
                           )}
                        </View>

                        <View style={styles.activityFooterAgent}>
                           <View style={styles.activityAgentIconBox}>
                              <Ionicons name="bus" size={20} color="#16a34a" />
                           </View>
                           <View>
                              <Text style={styles.activityAgentName}>
                                 {item.agent ? item.agent.name : 'Assigning Agent'}
                              </Text>
                              <Text style={styles.activityAgentSub}>
                                 {item.agent ? (item.agent.phone || 'Professional Rider') : 'Looking for nearby riders...'}
                              </Text>
                           </View>
                        </View>
                     </TouchableOpacity>
                   );
                 })
               )}
            </View>
        </Animated.View>

      </ScrollView>



      {/* Interactive Tutorial Overlay */}
      <InAppTutorial 
        isVisible={showTutorial}
        steps={tutorialSteps}
        onComplete={() => {
          setShowTutorial(false);
          // Set a local flag so it doesn't show again on next refresh if params persist
          navigation.setParams({ startTutorial: 'false' });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header Styles
  header: { paddingHorizontal: 24, paddingTop: 20, marginBottom: 16 },
  customerHeader: { paddingHorizontal: 32, paddingTop: 20, marginBottom: 24 },
  customerHeaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatarHolder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4b5563', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarMini: { width: '100%', height: '100%' },
  welcomeBackText: { fontSize: 10, fontFamily: Fonts.bold, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  greetingHeader: { fontSize: 28, fontFamily: Fonts.bold, color: '#111827', letterSpacing: -1 },
  nameHeaderTeal: { color: '#0d9488' },
  notifBtnCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  subGreeting: { fontSize: 13, fontFamily: Fonts.semiBold, color: LoopyColors.grey, marginTop: 2, opacity: 0.8 },

  // Wallet
  walletCardFull: { backgroundColor: '#fff', borderRadius: 32, padding: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
  walletLabel: { fontSize: 10, fontFamily: Fonts.bold, color: '#9ca3af', letterSpacing: 1 },
  walletBalanceText: { fontSize: 40, fontFamily: Fonts.bold, color: '#111827', marginVertical: 8, letterSpacing: -1.5 },
  cashOutBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#86efac', paddingVertical: 12, borderRadius: 100, marginTop: 12 },
  cashOutBtnTextFull: { fontSize: 16, fontFamily: Fonts.bold, color: '#065f46' },

  // Impact
  impactCardFull: { backgroundColor: '#166534', borderRadius: 32, padding: 24, position: 'relative', overflow: 'hidden' },
  impactIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  impactValBig: { fontSize: 32, fontFamily: Fonts.bold, color: '#fff' },
  impactSubWhite: { fontSize: 10, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: 1 },
  watermarkLeaf: { position: 'absolute', right: -20, bottom: -40, opacity: 0.1 },

  // Actions
  quickActionsContainer: { paddingHorizontal: 32, marginBottom: 40 },
  quickActionsTitle: { fontSize: 10, fontFamily: Fonts.bold, color: '#9ca3af', marginBottom: 16, letterSpacing: 1 },
  actionsGridCenter: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  actionItemBox: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  actionCircleTeal: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionCircleBlue: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionCircleGreen: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionTitleSmall: { fontSize: 11, fontFamily: Fonts.bold, color: '#111827' },

  // Activity
  activitySectionCustomer: { paddingHorizontal: 32, marginBottom: 40 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionHeader: { fontSize: 18, fontFamily: Fonts.bold, color: LoopyColors.charcoal, letterSpacing: -0.5 },
  seeAllTextGreen: { fontSize: 13, fontFamily: Fonts.bold, color: '#16a34a', backgroundColor: '#eafff2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  activityList: { gap: 12 },
  activityCardPill: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  activityIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1, marginLeft: 12 },
  activityTitleFull: { fontSize: 15, fontFamily: Fonts.bold, color: LoopyColors.charcoal },
  activityDateFull: { fontSize: 12, fontFamily: Fonts.medium, color: LoopyColors.grey, marginTop: 2 },
  activityAmountRight: { alignItems: 'flex-end' },
  activityAmountDark: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827' },
  
  // Dynamic Activity Card Styles
  activityCardModern: { backgroundColor: '#fff', borderRadius: 32, padding: 24, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15 },
  activityCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  activityIdText: { fontSize: 20, fontFamily: Fonts.bold, color: '#111827' },
  activityStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f5f9' },
  activityStatusText: { fontSize: 10, fontFamily: Fonts.bold, color: '#475569', textTransform: 'uppercase' },
  activityEstValueCol: { alignItems: 'flex-end' },
  activityEstValText: { fontSize: 24, fontFamily: Fonts.bold, color: '#111827' },
  activityEstLabel: { fontSize: 9, fontFamily: Fonts.bold, color: '#9ca3af', marginTop: 2, letterSpacing: 0.5 },
  activityDateTime: { fontSize: 14, fontFamily: Fonts.medium, color: '#64748b', marginBottom: 20 },
  activityTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  activityTag: { backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  activityTagText: { fontSize: 13, fontFamily: Fonts.bold, color: '#475569' },
  activityFooterAgent: { backgroundColor: '#f8fafc', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center' },
  activityAgentIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activityAgentName: { fontSize: 15, fontFamily: Fonts.bold, color: '#111827' },
  activityAgentSub: { fontSize: 12, fontFamily: Fonts.medium, color: '#64748b', marginTop: 2 },

  statusPillSmallRed: { backgroundColor: '#ffe4e6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  statusPillSmallTextRed: { color: '#ef4444', fontSize: 8, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  statusPillSmallGreen: { backgroundColor: '#eafff2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  statusPillSmallTextGreen: { color: '#16a34a', fontSize: 8, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 28 },
  emptyCardText: { color: '#9ca3af', fontSize: 14, marginTop: 10, fontFamily: Fonts.bold },

  // Promo
  promoContainer: { marginHorizontal: 32, height: 160, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  promoImage: { width: '100%', height: '100%', resizeMode: 'cover', position: 'absolute' },
  promoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 20, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-end' },
  promoTitle: { fontSize: 18, fontFamily: Fonts.bold, color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  promoSubtitle: { fontSize: 10, fontFamily: Fonts.regular, color: '#fff', opacity: 0.9, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  referBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  referBtnText: { color: '#065f46', fontSize: 10, fontFamily: Fonts.bold },

  // Agent Specific
  agentContainer: { flex: 1, backgroundColor: '#f4f5f7' },
  agentHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  agentAvatarBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  agentPortalText: { fontSize: 13, fontFamily: Fonts.bold, color: '#15803d', marginBottom: 2 },
  agentHelloText: { fontSize: 11, fontFamily: Fonts.medium, color: '#6b7280' },
  notifBtnGray: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },

  agentStatsWrapper: { paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  earningsCardFull: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  statLabelTop: { fontSize: 10, fontFamily: Fonts.bold, color: '#6b7280', letterSpacing: 0.5, marginBottom: 8 },
  earningsValBig: { fontSize: 36, fontFamily: Fonts.bold, color: '#15803d', letterSpacing: -1 },
  earningsTrend: { fontSize: 14, fontFamily: Fonts.bold, color: '#15803d', marginBottom: 4 },
  statsRowGrid: { flexDirection: 'row', gap: 12 },
  statCardHalf: { flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  statValBig: { fontSize: 28, fontFamily: Fonts.bold, color: '#111827', marginTop: 8 },

  viewMapBadgeGray: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },

  dutyTogglePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, gap: 6, borderWidth: 1 },
  dutyOnline: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  dutyOffline: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  dutyDot: { width: 6, height: 6, borderRadius: 3 },
  dutyToggleText: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5 },

  agentActionsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  agentActionItem: { width: (SCREEN_WIDTH - 72) / 4, alignItems: 'center' },
  actionIconCircle: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionItemLabel: { fontSize: 11, fontFamily: Fonts.bold, color: '#4b5563', textAlign: 'center' },

  emptyIconBg: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyCardSub: { fontSize: 12, fontFamily: Fonts.medium, color: '#9ca3af', marginTop: 4, textAlign: 'center' },

  viewMapTextGray: { fontSize: 12, fontFamily: Fonts.bold, color: LoopyColors.charcoal },
  activeQueueTitle: { fontSize: 20, fontFamily: Fonts.bold, color: '#111827', letterSpacing: -0.5 },
  activeQueueSub: { fontSize: 12, fontFamily: Fonts.medium, color: '#6b7280', marginTop: 2 },

  mainActiveCard: { backgroundColor: '#fff', borderRadius: 28, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, marginTop: 16 },
  mapBackdrop: { height: 160, backgroundColor: '#bbf7d0', position: 'relative', overflow: 'hidden' },
  localPickupPin: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, elevation: 2, gap: 6 },
  localPickupText: { fontSize: 12, fontFamily: Fonts.bold, color: '#111827' },
  
  activeQueueInfo: { padding: 24, backgroundColor: '#fff' },
  activeQueueHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  aqName: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
  aqAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  aqAddress: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280', flex: 1 },
  aqScheduledLabel: { fontSize: 9, fontFamily: Fonts.bold, color: '#9ca3af', letterSpacing: 1 },
  aqTime: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827', marginTop: 2 },
  
  materialTagsRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  materialTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  materialTagMore: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  materialTagText: { fontSize: 11, fontFamily: Fonts.bold, color: '#475569' },
  
  aqDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  aqScheduleInfoRow: { flexDirection: 'row', gap: 16 },
  aqInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aqInfoText: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280' },

  aqActionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  aqPrimaryBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#15803d', paddingVertical: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  aqPrimaryBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 16 },
  aqCallBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' },

  agentSection: { paddingHorizontal: 24, marginBottom: 24 },
  upcomingLabel: { fontSize: 11, fontFamily: Fonts.bold, color: '#6b7280', letterSpacing: 0.5, marginBottom: 12, marginTop: 12, textTransform: 'uppercase' },
  upcomingContainer: { backgroundColor: '#f3f4f6', borderRadius: 24, padding: 12 },
  upcomingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 8 },
  upcomingPillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  upcomingPillInfo: { flex: 1, marginLeft: 16 },
  upName: { fontSize: 14, fontFamily: Fonts.bold, color: '#111827' },
  upDetails: { fontSize: 12, fontFamily: Fonts.medium, color: '#6b7280', marginTop: 4 },

  // Available Tasks
  availableTaskCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, borderLeftWidth: 4, borderLeftColor: '#15803d' },
  availableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  availableDistBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  availableDistText: { fontSize: 11, fontFamily: Fonts.bold, color: '#166534' },
  availablePayout: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
  availableName: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827', marginBottom: 4 },
  availableAddr: { fontSize: 12, fontFamily: Fonts.medium, color: '#6b7280', marginBottom: 16 },
  availableFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availableTime: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  availableTimeText: { fontSize: 12, fontFamily: Fonts.medium, color: '#6b7280' },
  acceptMiniBtn: { backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  acceptMiniBtnText: { color: '#fff', fontSize: 12, fontFamily: Fonts.bold },

  truckCard: { backgroundColor: '#fcfcfc', borderRadius: 24, height: 240, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative' },

  earningsLabelTop: { fontSize: 12, fontFamily: Fonts.medium, color: '#6b7280', letterSpacing: 1.5, textAlign: 'center' },
  earningsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20, gap: 12 },
  earningsValBigCustomer: { fontSize: 48, fontFamily: Fonts.bold, color: '#111827', letterSpacing: -1.5, textAlign: 'center' },
  earningsTrendBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  earningsTrendText: { fontSize: 11, fontFamily: Fonts.bold, color: '#166534' },
  withdrawBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', paddingVertical: 16, borderRadius: 100, marginHorizontal: 16 },
  withdrawBtnTextFull: { fontSize: 16, fontFamily: Fonts.medium, color: '#111827' },
  actionCardSub: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280' },
  actionCardModern: { backgroundColor: '#ffffff', borderRadius: 28, borderWidth: 1, borderColor: '#f3f4f6', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  actionCardInner: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  actionIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionCardTitle: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827', marginBottom: 4 },

  // New Impact Section
  impactGridSection: { flexDirection: 'row', gap: 16 },
  impactCardMini: { flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center' },
  impactIconSmall: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  impactValSmall: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
  impactLabelSmall: { fontSize: 11, fontFamily: Fonts.medium, color: '#9ca3af', marginTop: 2 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontFamily: Fonts.bold, color: '#111827' },
  methodList: { gap: 16 },
  methodItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', padding: 16, borderRadius: 20, gap: 16 },
  methodIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  methodName: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827' },
  methodSub: { fontSize: 12, fontFamily: Fonts.medium, color: '#9ca3af', marginTop: 2 },
  unreadBadge: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', borderWidth: 1.5, borderColor: '#fff' },

  // Agent Daily Goal Styles
  dailyGoalCard: { backgroundColor: '#111827', borderRadius: 24, padding: 20, marginTop: 12 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  goalTitle: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
  goalProgressText: { fontSize: 12, fontFamily: Fonts.bold, color: '#10b981' },
  goalTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 12 },
  goalFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  goalSub: { fontSize: 11, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.6)' },

  // Redesigned Agent Styles
  agentPortalTextTitle: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
  onlineStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineStatusText: { fontSize: 11, fontFamily: Fonts.bold, color: '#10b981', textTransform: 'uppercase' },
  notifBtnTransparent: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  
  earningsCardDesign: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  earningsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statLabelTopGrey: { fontSize: 11, fontFamily: Fonts.bold, color: '#9ca3af', letterSpacing: 0.5 },
  trendBadgeGreen: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  trendBadgeText: { fontSize: 12, fontFamily: Fonts.bold, color: '#10b981' },
  earningsValLarge: { fontSize: 44, fontFamily: Fonts.bold, color: '#059669', letterSpacing: -1.5 },
  
  targetProgressContainer: { marginTop: 24 },
  targetLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  targetLabelText: { fontSize: 13, fontFamily: Fonts.bold, color: '#9ca3af' },
  targetValueText: { fontSize: 13, fontFamily: Fonts.bold, color: '#059669' },
  targetTrack: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' },
  targetFill: { height: '100%', backgroundColor: '#059669', borderRadius: 5 },
  targetFooterText: { fontSize: 12, fontFamily: Fonts.medium, color: '#6b7280' },

  statsRowGridDesign: { flexDirection: 'row', gap: 16, marginTop: 16 },
  statCardFullDesign: { flex: 1, backgroundColor: '#fff', borderRadius: 32, padding: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  statIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'flex-start', marginBottom: 8 },
  statLabelSmall: { fontSize: 13, fontFamily: Fonts.bold, color: '#9ca3af', letterSpacing: 0.5, marginTop: 8 },
  statValueBig: { fontSize: 48, fontFamily: Fonts.bold, color: '#111827' },

  quickActionsAgentSection: { paddingHorizontal: 24, marginBottom: 32 },
  sectionHeadingTitle: { fontSize: 20, fontFamily: Fonts.bold, color: '#111827', letterSpacing: -0.5, marginBottom: 16 },
  agentActionsGridDesign: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  agentActionItemDesign: { flex: 1, alignItems: 'center' },
  actionIconCircleDesign: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionItemLabelDesign: { fontSize: 11, fontFamily: Fonts.bold, color: '#4b5563', textAlign: 'center' },

  agentSectionActive: { paddingHorizontal: 24, marginBottom: 40 },
  sectionSubHeading: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280', marginTop: -12, marginBottom: 20 },
  emptyActiveCardDashed: { alignItems: 'center', justifyContent: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.5)' },
  emptyIconCircleBlue: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyActiveTitle: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827', textAlign: 'center' },
  emptyActiveSub: { fontSize: 13, fontFamily: Fonts.medium, color: '#9ca3af', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  refreshQueueBtn: { backgroundColor: '#065f46', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100, marginTop: 24 },
  refreshQueueBtnText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold },
  customMarker: { alignItems: 'center', justifyContent: 'center' },
});
