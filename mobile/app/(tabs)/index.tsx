import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView, Dimensions, Alert, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInRight, FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { LoopyColors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/layout';
import { useTranslation } from '../../hooks/useTranslation';
import InAppTutorial, { TutorialStep } from '../../components/InAppTutorial';
import { useLocalSearchParams } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [data, setData] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        ? [api.get('/api/agent/tasks')] 
        : [api.get('/api/user/bookings'), api.get('/api/user/wallet')];

      const responses = await Promise.all(endpoints);
      
      if (isAgent) {
        setData(responses[0].data);
      } else {
        setData(responses[0].data.bookings || []);
        setWallet(responses[1].data || null);
      }
    } catch (error) {
      console.log('Error fetching dashboard data', error);
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);

    let locationSubscription: any;
    if (isAgent) {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            locationSubscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
                (location) => {
                    api.post('/api/agent/location', {
                        lat: location.coords.latitude,
                        lng: location.coords.longitude
                    }).catch(console.log);
                }
            );
        })();
    }

    return () => {
        clearInterval(interval);
        if (locationSubscription) locationSubscription.remove();
    };
  }, [isAgent]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleTaskAction = async (bookingId: string, action: 'ACCEPT' | 'STATUS', status?: string) => {
    try {
      await api.post('/api/agent/tasks/update', { bookingId, action, status });
      fetchData();
      if (action === 'ACCEPT') Alert.alert('Success', 'Pickup accepted!');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to update task');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={LoopyColors.green} />
      </View>
    );
  }

  const renderAgentTask = (item: any, type: 'AVAILABLE' | 'ACCEPTED') => (
    <Animated.View entering={FadeInUp} style={styles.agentTaskCard} key={item.id}>
        <View style={styles.taskHeader}>
            <View style={styles.taskTypeBadge}>
                <Text style={styles.taskTypeText}>{item.address?.label || 'Pickup'}</Text>
            </View>
            <Text style={styles.taskDistance}>{item.distance ? `${item.distance.toFixed(1)} km` : 'Local'}</Text>
        </View>

        <View style={styles.taskBody}>
            <Text style={styles.taskAddress}>{item.address?.street}, {item.address?.city}</Text>
            <Text style={styles.taskUser}><Ionicons name="person" size={12} /> {item.user?.name}</Text>
            <Text style={styles.taskTime}><Ionicons name="time" size={12} /> {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        <View style={styles.taskFooter}>
            {type === 'AVAILABLE' ? (
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleTaskAction(item.id, 'ACCEPT')}>
                    <Text style={styles.acceptBtnText}>Accept Pickup</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.actionRow}>
                    {item.status === 'ASSIGNED' && (
                        <TouchableOpacity style={styles.statusBtnPrimary} onPress={() => {
                            handleTaskAction(item.id, 'STATUS', 'ONEWAY');
                            router.push(`/track-route/${item.id}` as any);
                        }}>
                            <Ionicons name="navigate" size={18} color="#fff" />
                            <Text style={styles.statusBtnText}>On the Way</Text>
                        </TouchableOpacity>
                    )}
                    {item.status === 'ONEWAY' && (
                        <TouchableOpacity style={[styles.statusBtnPrimary, { backgroundColor: '#8b5cf6' }]} onPress={() => handleTaskAction(item.id, 'STATUS', 'ARRIVED')}>
                            <Ionicons name="pin" size={18} color="#fff" />
                            <Text style={styles.statusBtnText}>Arrived</Text>
                        </TouchableOpacity>
                    )}
                    {item.status === 'ARRIVED' && (
                         <TouchableOpacity style={[styles.statusBtnPrimary, { backgroundColor: '#10b981' }]} onPress={() => router.push(`/weigh/${item.id}` as any)}>
                            <Ionicons name="scale" size={18} color="#fff" />
                            <Text style={styles.statusBtnText}>Start Weighing</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.callBtn} onPress={() => Alert.alert('Calling', `Dialing ${item.user?.phone}`)}>
                        <Ionicons name="call" size={20} color={LoopyColors.charcoal} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    </Animated.View>
  );

  return isAgent ? (
    <SafeAreaView style={styles.agentContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LoopyColors.green} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.agentHeaderTop}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity style={styles.agentAvatarBtn} onPress={() => router.push('/profile' as any)}>
                   <Image 
                      source={user?.image ? { uri: user.image } : require('../../assets/images/user-placeholder.png')} 
                      style={{ width: '100%', height: '100%' }} 
                   />
                </TouchableOpacity>
                <View style={{marginLeft: 12}}>
                    <Text style={styles.agentPortalText}>Agent Portal</Text>
                    <Text style={styles.agentHelloText}>Hello, {user?.name?.split(' ')[0]}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtnGray}>
               <Ionicons name="notifications" size={20} color="#6b7280" />
            </TouchableOpacity>
        </View>

        <View style={styles.agentStatsWrapper}>
           <Animated.View entering={FadeInUp.delay(100).springify().damping(15)} style={styles.earningsCardFull}>
              <Text style={styles.statLabelTop}>TODAY'S EARNINGS</Text>
              <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4}}>
                 <Text style={styles.earningsValBig}>₹{(data?.summary?.todayEarnings || 0).toFixed(0)}</Text>
                 <Text style={styles.earningsTrend}>+12%</Text>
              </View>
           </Animated.View>
           <View style={styles.statsRowGrid}>
              <Animated.View entering={FadeInUp.delay(200).springify().damping(15)} style={styles.statCardHalf}>
                 <Text style={styles.statLabelTop}>PICKUPS</Text>
                 <Text style={styles.statValBig}>{data?.summary?.todayCompleted || 0}</Text>
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(300).springify().damping(15)} style={styles.statCardHalf}>
                 <Text style={styles.statLabelTop}>QUEUED</Text>
                 <Text style={styles.statValBig}>{data?.summary?.assignedCount || 0}</Text>
              </Animated.View>
           </View>
        </View>

        <View style={styles.agentSection}>
           <View style={styles.sectionHeaderRow}>
               <View>
                 <Text style={styles.activeQueueTitle}>Active Queue</Text>
                 <Text style={styles.activeQueueSub}>Manage your current recycling tasks</Text>
               </View>
               <TouchableOpacity onPress={() => router.push('/pickups' as any)} style={styles.viewMapBadgeGray}>
                    <Ionicons name="map" size={12} color={LoopyColors.charcoal} />
                    <Text style={styles.viewMapTextGray}>Map</Text>
               </TouchableOpacity>
           </View>
           
           {(!data?.accepted || data.accepted.length === 0) ? (
               <View style={styles.emptyCard}>
                   <Ionicons name="bicycle-outline" size={40} color="#e5e7eb" />
                   <Text style={styles.emptyCardText}>No active tasks</Text>
               </View>
           ) : (
               <Animated.View entering={FadeInUp.delay(400).springify().damping(14)} style={styles.mainActiveCard}>
                   <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/pickups' as any)}>
                       <View style={styles.mapBackdrop}>
                           <MapView 
                               style={StyleSheet.absoluteFillObject}
                               provider={PROVIDER_DEFAULT}
                               initialRegion={{
                                   latitude: data.accepted[0].pickupLat || 21.1458,
                                   longitude: data.accepted[0].pickupLng || 79.0882,
                                   latitudeDelta: 0.02,
                                   longitudeDelta: 0.02,
                               }}
                               scrollEnabled={false}
                               zoomEnabled={false}
                               pitchEnabled={false}
                           >
                               <Marker coordinate={{ latitude: data.accepted[0].pickupLat || 21.1458, longitude: data.accepted[0].pickupLng || 79.0882 }} />
                           </MapView>
                           <View style={styles.localPickupPin}>
                               <Ionicons name="location" size={14} color="#15803d" />
                               <Text style={styles.localPickupText}>Local Pickup</Text>
                           </View>
                       </View>
                       <View style={styles.activeQueueInfo}>
                           <View style={styles.activeQueueHeaderRow}>
                               <View>
                                   <Text style={styles.aqName}>{data.accepted[0].user?.name || 'Customer'}</Text>
                                   <View style={styles.aqAddressRow}>
                                       <Ionicons name="home" size={12} color="#9ca3af" />
                                       <Text style={styles.aqAddress}>{data.accepted[0].address?.street || 'Unknown Address'}</Text>
                                   </View>
                               </View>
                               <View style={{alignItems: 'flex-end'}}>
                                   <Text style={styles.aqScheduledLabel}>SCHEDULED</Text>
                                   <Text style={styles.aqTime}>{new Date(data.accepted[0].scheduledAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                               </View>
                           </View>
                           <View style={styles.aqActionRow}>
                               <TouchableOpacity 
                                   style={styles.aqPrimaryBtn} 
                                   onPress={() => router.push(
                                      data.accepted[0].status === 'ARRIVED' 
                                      ? `/weigh/${data.accepted[0].id}` as any 
                                      : `/track-route/${data.accepted[0].id}` as any
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
                                        data.accepted[0].status === 'ARRIVED' ? "Resume Weighing" : 
                                        data.accepted[0].status === 'ONEWAY' ? "Resume Route" : "Start Route"
                                      }
                                   </Text>
                               </TouchableOpacity>
                               <TouchableOpacity style={styles.aqCallBtn}>
                                   <Ionicons name="call" size={20} color="#15803d" />
                               </TouchableOpacity>
                           </View>
                       </View>
                   </TouchableOpacity>
               </Animated.View>
           )}
        </View>

        {data?.accepted && data.accepted.length > 1 && (
            <Animated.View entering={FadeInUp.delay(500).springify().damping(14)} style={styles.agentSection}>
               <Text style={styles.upcomingLabel}>UPCOMING TODAY</Text>
               <View style={styles.upcomingContainer}>
                   {data.accepted.slice(1).map((item: any, idx: number) => (
                       <Animated.View entering={FadeInRight.delay(600 + (idx * 100)).springify()} key={item.id} style={styles.upcomingPill}>
                          <View style={styles.upcomingPillIcon}>
                              <Ionicons name="sync" size={16} color="#15803d" />
                          </View>
                          <View style={styles.upcomingPillInfo}>
                              <Text style={styles.upName}>{item.user?.name}</Text>
                              <Text style={styles.upDetails}>{item.items?.length || 3} items • {new Date(item.scheduledAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                       </Animated.View>
                   ))}
               </View>
            </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  ) : (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LoopyColors.green} />}
        contentContainerStyle={{ paddingBottom: 64 }}
      >
        <Animated.View entering={FadeInUp} style={styles.customerHeader}>
          <View style={styles.customerHeaderTopRow}>
            <TouchableOpacity style={styles.avatarHolder} onPress={() => router.push('/profile' as any)}>
               <Image 
                  source={user?.image ? { uri: user.image } : require('../../assets/images/user-placeholder.png')} 
                  style={styles.avatarMini} 
               />
            </TouchableOpacity>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.welcomeBackText}>{t('greeting').toUpperCase()} BACK</Text>
              <Text style={styles.greetingHeader}>{t('greeting')}, <Text style={styles.nameHeaderGreen}>{user?.name?.split(' ')[0] || 'User'}</Text></Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtnGreen}>
               <Ionicons name="notifications" size={20} color="#065f46" />
               <View style={styles.notifDotGreen} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ paddingHorizontal: 24, gap: 20, marginBottom: 32 }}>
           <Animated.View 
            entering={FadeInRight.delay(200)} 
            style={styles.walletCardFull}
            ref={walletRef}
           >
              <Text style={styles.walletLabel}>WALLET BALANCE</Text>
              <Text style={styles.walletBalanceText}>₹{(wallet?.balance || 24035.60).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <TouchableOpacity style={styles.cashOutBtnFull} onPress={() => router.push('/wallet' as any)}>
                 <Ionicons name="cash-outline" size={16} color="#065f46" style={{ marginRight: 8 }} />
                 <Text style={styles.cashOutBtnTextFull}>Cash Out</Text>
              </TouchableOpacity>
           </Animated.View>

           <Animated.View 
            entering={FadeInRight.delay(400)} 
            style={styles.impactCardFull}
            ref={impactRef}
           >
              <View style={styles.impactIconBg}><Ionicons name="leaf" size={18} color="#fff" /></View>
              <Text style={styles.impactValBig}>{wallet?.impact?.kgRecycled || '519.1'}</Text>
              <Text style={styles.impactSubGreen}>KG RECYCLED TOTAL</Text>
              <Ionicons name="leaf" size={160} color="#15803d" style={styles.watermarkLeaf} />
           </Animated.View>
        </View>

        <View style={styles.quickActionsContainer}>
           <Text style={styles.quickActionsTitle}>QUICK ACTIONS</Text>
           <View style={styles.actionsGridCenter}>
             <TouchableOpacity style={styles.actionItemBox} onPress={() => router.push('/book' as any)} ref={bookRef}>
                <View style={styles.actionIconCyan}><Ionicons name="car-outline" size={24} color="#fff" /></View>
                <Text style={styles.actionTitleSmall}>Book Pickup</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.actionItemBox} onPress={() => router.push('/rates' as any)} ref={ratesRef}>
                <View style={styles.actionIconBlue}><Ionicons name="stats-chart" size={24} color="#0f172a" /></View>
                <Text style={styles.actionTitleSmall}>Daily Rates</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.actionItemBox} onPress={() => router.push('/history' as any)}>
                <View style={styles.actionIconLightGreen}><Ionicons name="time" size={24} color="#065f46" /></View>
                <Text style={styles.actionTitleSmall}>History</Text>
             </TouchableOpacity>
           </View>
        </View>

        <View style={styles.activitySectionCustomer}>
           <View style={styles.sectionHeaderRow}>
               <View>
                  <Text style={styles.sectionHeaderSmall}>RECENT ACTIVITY</Text>
                  <Text style={styles.activitySubtitle}>Updated 2 mins ago</Text>
               </View>
               <TouchableOpacity onPress={() => router.push('/history' as any)}>
                    <Text style={styles.seeAllTextGreen}>See All</Text>
               </TouchableOpacity>
           </View>
           <View style={styles.activityList}>
              {(!wallet?.transactions || wallet.transactions.length === 0) ? (
                 <View style={styles.emptyCard}>
                    <Ionicons name="receipt-outline" size={32} color={LoopyColors.border} />
                    <Text style={styles.emptyCardText}>No recent activity</Text>
                 </View>
              ) : (
                 wallet.transactions.slice(0, 3).map((item: any, idx: number) => (
                    <Animated.View 
                       key={item.id || idx.toString()} 
                       entering={FadeInDown.delay(600 + (idx * 100))} 
                       style={styles.activityCardPill}
                    >
                       <View style={styles.activityIconGrey}>
                          <Ionicons 
                             name={item.type === 'CREDIT' ? "cash" : "leaf"} 
                             size={20} 
                             color={LoopyColors.success} 
                          />
                       </View>
                       <View style={styles.activityInfo}>
                          <Text style={styles.activityTitleFull}>{item.description || 'Payout for Pickup #A5297R'}</Text>
                          <Text style={styles.activityDateFull}>{item.type === 'CREDIT' ? 'Oct 24, 2023 • 2:30 PM' : 'Oct 22, 2023 • 10:15 AM'}</Text>
                       </View>
                       <View style={styles.activityAmountRight}>
                          <Text style={styles.amountTextGreen}>
                             {item.type === 'CREDIT' ? '+' : '-'} ₹{(item.amount || 0).toFixed(2)}
                          </Text>
                          <View style={styles.successBadge}>
                             <Text style={styles.successBadgeText}>{item.type === 'CREDIT' ? 'SUCCESS' : 'LOGGED'}</Text>
                          </View>
                       </View>
                    </Animated.View>
                 ))
              )}
           </View>
        </View>
        
        <View style={styles.promoContainer}>
            <Animated.Image 
               entering={FadeInUp.delay(800)}
               source={require('../../assets/images/promo-bg.png')} 
               style={styles.promoImage} 
            />
            <View style={styles.promoOverlay}>
               <View>
                 <Text style={styles.promoTitle}>Every gram counts</Text>
                 <Text style={styles.promoSubtitle}>Invite friends to earn eco-bonuses.</Text>
               </View>
               <TouchableOpacity style={styles.referBtn}>
                  <Text style={styles.referBtnText}>Refer Now</Text>
               </TouchableOpacity>
            </View>
        </View>

      </ScrollView>

      {/* Interactive Tutorial Overlay */}
      <InAppTutorial 
        isVisible={showTutorial}
        steps={tutorialSteps}
        onComplete={() => {
          setShowTutorial(false);
          // Set a local flag so it doesn't show again on next refresh if params persist
          router.setParams({ startTutorial: 'false' });
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
  customerHeader: { paddingHorizontal: 32, paddingTop: 20, marginBottom: 32 },
  customerHeaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatarHolder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  welcomeBackText: { fontSize: 10, fontFamily: Fonts.bold, color: LoopyColors.grey, textTransform: 'uppercase', letterSpacing: 0.5 },
  greetingHeader: { fontSize: 24, fontFamily: Fonts.bold, color: LoopyColors.charcoal, letterSpacing: -0.8 },
  nameHeaderGreen: { color: LoopyColors.success },
  notifBtnGreen: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  notifDotGreen: { position: 'absolute', top: 12, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#065f46', borderWidth: 1.5, borderColor: '#dcfce7' },
  subGreeting: { fontSize: 13, fontFamily: Fonts.semiBold, color: LoopyColors.grey, marginTop: 2, opacity: 0.8 },

  // Wallet
  walletCardFull: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  walletLabel: { fontSize: 10, fontFamily: Fonts.bold, color: LoopyColors.grey, letterSpacing: 0.5 },
  walletBalanceText: { fontSize: 36, fontFamily: Fonts.bold, color: LoopyColors.charcoal, marginVertical: 4, letterSpacing: -1 },
  cashOutBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#86efac', paddingVertical: 8, borderRadius: 100, marginTop: 8 },
  cashOutBtnTextFull: { fontSize: 14, fontFamily: Fonts.bold, color: '#065f46' },

  // Impact
  impactCardFull: { backgroundColor: '#166534', borderRadius: 24, padding: 20, position: 'relative', overflow: 'hidden' },
  impactIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  impactValBig: { fontSize: 24, fontFamily: Fonts.bold, color: '#fff' },
  impactSubGreen: { fontSize: 10, fontFamily: Fonts.bold, color: '#86efac', marginTop: 2, letterSpacing: 1 },
  watermarkLeaf: { position: 'absolute', right: -20, bottom: -40, opacity: 0.2 },

  // Actions
  quickActionsContainer: { paddingHorizontal: 32, marginBottom: 40 },
  quickActionsTitle: { fontSize: 10, fontFamily: Fonts.bold, color: LoopyColors.grey, marginBottom: 16, letterSpacing: 0.5 },
  actionsGridCenter: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  actionItemBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  actionIconCyan: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionIconBlue: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionIconLightGreen: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionTitleSmall: { fontSize: 10, fontFamily: Fonts.bold, color: LoopyColors.charcoal },

  // Activity
  activitySectionCustomer: { paddingHorizontal: 32, marginBottom: 40 },
  sectionHeader: { fontSize: 18, fontFamily: Fonts.bold, color: LoopyColors.charcoal, letterSpacing: -0.5 },
  sectionHeaderSmall: { fontSize: 10, fontFamily: Fonts.bold, color: LoopyColors.grey, letterSpacing: 0.5 },
  activitySubtitle: { fontSize: 14, fontFamily: Fonts.regular, color: '#6b7280', marginTop: 2 },
  seeAllTextGreen: { fontSize: 14, fontFamily: Fonts.bold, color: LoopyColors.success },
  activityList: { gap: 12 },
  activityCardPill: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 24, marginBottom: 8 },
  activityIconGrey: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1, marginLeft: 12 },
  activityTitleFull: { fontSize: 14, fontFamily: Fonts.bold, color: LoopyColors.charcoal },
  activityDateFull: { fontSize: 12, fontFamily: Fonts.medium, color: LoopyColors.grey, marginTop: 2 },
  activityAmountRight: { alignItems: 'flex-end' },
  amountTextGreen: { fontSize: 14, fontFamily: Fonts.bold, color: '#166534' },
  successBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  successBadgeText: { color: '#166534', fontSize: 8, fontFamily: Fonts.bold },
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
  viewMapTextGray: { fontSize: 12, fontFamily: Fonts.bold, color: LoopyColors.charcoal },
  activeQueueTitle: { fontSize: 20, fontFamily: Fonts.bold, color: '#111827', letterSpacing: -0.5 },
  activeQueueSub: { fontSize: 12, fontFamily: Fonts.medium, color: '#6b7280', marginTop: 2 },

  mainActiveCard: { backgroundColor: '#fff', borderRadius: 28, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, marginTop: 16 },
  mapBackdrop: { height: 160, backgroundColor: '#bbf7d0', position: 'relative', overflow: 'hidden' },
  localPickupPin: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, elevation: 2, gap: 6 },
  localPickupText: { fontSize: 12, fontFamily: Fonts.bold, color: '#111827' },
  
  activeQueueInfo: { padding: 24, backgroundColor: '#fff' },
  activeQueueHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  aqName: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827', marginBottom: 6 },
  aqAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aqAddress: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280' },
  aqScheduledLabel: { fontSize: 10, fontFamily: Fonts.bold, color: '#6b7280', letterSpacing: 0.5, marginBottom: 4 },
  aqTime: { fontSize: 16, fontFamily: Fonts.bold, color: '#15803d' },
  
  aqActionRow: { flexDirection: 'row', gap: 12 },
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
});
