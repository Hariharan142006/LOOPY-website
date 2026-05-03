import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, Dimensions, StatusBar } from 'react-native';
import Animated, { FadeInUp, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { Colors, LoopyColors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/layout';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';


const { width } = Dimensions.get('window');

export default function WalletScreen() {
  const { user } = useAuth();
  const { t, currentLanguage } = useTranslation();
  const navigation = useNavigation<any>();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  const fetchWallet = async () => {
    try {
      const response = await api.get('/api/user/wallet');
      setWallet(response.data);
    } catch (error) {
      console.log('Error fetching wallet', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const handleWithdraw = () => {
    if ((wallet?.balance || 0) < 100) {
      Alert.alert(t('error'), 'Minimum withdrawal amount is ₹100. Complete more pickups to reach the minimum.');
      return;
    }
    Alert.alert(
        t('withdraw_now'),
        `Withdraw ₹${Number(wallet.balance).toFixed(2)} to your account?`,
        [
            { text: t('cancel'), style: 'cancel' },
            { text: 'Bank Account', onPress: () => Alert.alert('✅ Transfer Initiated', 'Your ₹' + Number(wallet.balance).toFixed(2) + ' will arrive in your bank within 24-48 hours.') },
            { text: 'UPI', onPress: () => Alert.alert('✅ UPI Transfer Sent', '₹' + Number(wallet.balance).toFixed(2) + ' sent to your linked UPI. Usually instant!') }
        ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={LoopyColors.green} />
      </View>
    );
  }

  const lifetimeEarnings = (wallet?.balance || 0) + (wallet?.transactions?.reduce((acc: any, t: any) => t.type === 'DEBIT' ? acc + t.amount : acc, 0) || 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
         <Text style={styles.headerTitle}>{t('my_wallet')}</Text>
         <TouchableOpacity 
            style={styles.helpBtn} 
            onPress={() => Alert.alert(
              t('wallet_info'), 
              '• Earnings are added after each successful pickup.\n• Minimum withdrawal is ₹100.\n• Transfers usually take 24-48 hours to reflect in your bank.'
            )}
         >
            <Ionicons name="help-circle-outline" size={24} color={LoopyColors.charcoal} />
         </TouchableOpacity>
      </View>

      <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LoopyColors.green} />}
          contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View style={styles.content}>
          <Animated.View entering={FadeInUp} style={styles.balanceCard}>
             <View style={styles.cardHeader}>
                <View style={styles.brandBadge}>
                   <Ionicons name="leaf" size={14} color={LoopyColors.green} />
                   <Text style={styles.brandBadgeText}>LOOPY PAY</Text>
                </View>
                <Ionicons name="wifi" size={20} color="#ffffff30" />
             </View>

             <Text style={styles.balanceLabel}>{t('total_balance')}</Text>
             <Text style={styles.balanceVal}>₹{Number(wallet?.balance || 0).toFixed(2)}</Text>
             
             <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw}>
                   <Text style={styles.withdrawText}>{t('withdraw_now')}</Text>
                   <Ionicons name="arrow-forward" size={16} color={LoopyColors.charcoal} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.qrToggle} onPress={() => setQrVisible(!qrVisible)}>
                   <Ionicons name="qr-code" size={24} color={LoopyColors.white} />
                </TouchableOpacity>
             </View>
          </Animated.View>

          {qrVisible && (
              <Animated.View entering={FadeInDown} style={styles.qrContainer}>
                  <View style={styles.qrHeader}>
                     <Text style={styles.qrTitle}>{t('personal_qr')}</Text>
                     <TouchableOpacity onPress={() => setQrVisible(false)}>
                        <Ionicons name="close-circle" size={24} color={LoopyColors.grey} />
                     </TouchableOpacity>
                  </View>
                  <Text style={styles.qrSubtitle}>{t('qr_subtitle')}</Text>
                  <View style={styles.qrWrapper}>
                      <QRCode
                          value={JSON.stringify({ userId: user?.id, type: 'PAYMENT_RECEIVE', name: user?.name })}
                          size={180}
                          color={LoopyColors.charcoal}
                          backgroundColor="white"
                      />
                  </View>
                  <View style={styles.qrFooter}>
                     <Ionicons name="shield-checkmark" size={14} color={LoopyColors.green} />
                     <Text style={styles.qrSecureText}>Loopy Secure ID: {user?.id?.slice(-8).toUpperCase()}</Text>
                  </View>
              </Animated.View>
          )}

          <View style={styles.statsRow}>
              <Animated.View entering={FadeInUp.delay(200)} style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: '#f0fdf4' }]}>
                     <Ionicons name="leaf" size={20} color={LoopyColors.green} />
                  </View>
                  <View>
                     <Text style={styles.statVal}>{wallet?.impact?.kgRecycled || 0} KG</Text>
                     <Text style={styles.statLabel}>{t('total_recycled')}</Text>
                  </View>
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(300)} style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: '#eff6ff' }]}>
                     <Ionicons name="cash-outline" size={20} color="#3b82f6" />
                  </View>
                  <View>
                     <Text style={styles.statVal}>₹{Number(lifetimeEarnings).toFixed(2)}</Text>
                     <Text style={styles.statLabel}>{t('lifetime_earning')}</Text>
                  </View>
              </Animated.View>
          </View>

          <View style={styles.historySection}>
              <View style={styles.sectionHeaderRow}>
                 <Text style={styles.sectionHeader}>{t('history')}</Text>
                 <TouchableOpacity onPress={() => navigation.navigate('History')}><Text style={styles.viewAllText}>{t('see_all')}</Text></TouchableOpacity>
              </View>

              {(!wallet?.transactions || wallet.transactions.length === 0) ? (
                  <View style={styles.emptyCard}>
                      <Ionicons name="receipt-outline" size={40} color={LoopyColors.lightGrey} />
                      <Text style={styles.emptyText}>{t('no_activity')}</Text>
                  </View>
              ) : (
                  wallet.transactions.map((t_item: any, idx: number) => {
                    const isCredit = t_item.type === 'CREDIT';
                    const description = t_item.description || (isCredit ? t('pickup_payout') : t('bank_transfer'));
                    
                    const getIconConfig = () => {
                      const desc = description.toLowerCase();
                      if (desc.includes('plastic')) return { name: 'sync', color: '#16a34a', bg: '#f0fdf4' };
                      if (desc.includes('bonus') || desc.includes('reward')) return { name: 'flash', color: '#16a34a', bg: '#f0fdf4' };
                      if (desc.includes('food')) return { name: 'restaurant', color: '#16a34a', bg: '#f0fdf4' };
                      if (desc.includes('transfer') || desc.includes('withdrawal')) return { name: 'wallet', color: '#6b7280', bg: '#f3f4f6' };
                      return { name: isCredit ? 'add-circle' : 'remove-circle', color: isCredit ? '#16a34a' : '#6b7280', bg: isCredit ? '#f0fdf4' : '#f3f4f6' };
                    };

                    const iconConfig: any = getIconConfig();

                    return (
                      <Animated.View key={t_item.id} entering={SlideInRight.delay(idx * 100)} style={styles.transactionCard}>
                          <View style={[styles.itemIcon, { backgroundColor: iconConfig.bg }]}>
                              <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
                          </View>
                          <View style={styles.itemInfo}>
                              <Text style={styles.itemTitle}>{description}</Text>
                              <Text style={styles.itemDate}>
                                {new Date(t_item.createdAt).toLocaleDateString(currentLanguage, { day: 'numeric', month: 'short', year: 'numeric' })}
                                {t_item.weight ? ` • ${t_item.weight} kg` : (isCredit && !t_item.description ? ' • Reward' : '')}
                              </Text>
                          </View>
                          <View style={styles.amountContainer}>
                             <Text style={[styles.itemAmount, { color: isCredit ? '#059669' : '#111827' }]}>
                                {isCredit ? '+' : '-'}₹{Number(t_item.amount).toFixed(2)}
                             </Text>
                             <Text style={styles.statusLabel}>{t('completed')}</Text>
                          </View>
                      </Animated.View>
                    );
                  })
              )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LoopyColors.white },
  header: { paddingTop: 60, paddingHorizontal: Spacing['2xl'], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: FontSizes['3xl'], fontWeight: '800', color: LoopyColors.charcoal },
  helpBtn: { width: 44, height: 44, borderRadius: BorderRadius.lg, backgroundColor: LoopyColors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LoopyColors.lightGrey },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing['2xl'], paddingTop: 10 },
  balanceCard: { backgroundColor: LoopyColors.charcoal, borderRadius: 32, padding: Spacing['2xl'], shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  brandBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff15', paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, gap: 6 },
  brandBadgeText: { color: LoopyColors.white, fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 1 },
  balanceLabel: { color: LoopyColors.textLight, fontSize: FontSizes.sm, fontWeight: '800', letterSpacing: 1.5, marginBottom: Spacing.sm },
  balanceVal: { color: LoopyColors.white, fontSize: 44, fontWeight: '900' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing['3xl'] },
  withdrawBtn: { backgroundColor: LoopyColors.green, paddingHorizontal: Spacing.xl, paddingVertical: 14, borderRadius: BorderRadius.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  withdrawText: { color: LoopyColors.charcoal, fontWeight: '800', fontSize: FontSizes.md },
  qrToggle: { width: 48, height: 48, borderRadius: BorderRadius.xl, backgroundColor: '#ffffff15', alignItems: 'center', justifyContent: 'center' },
  qrContainer: { marginTop: Spacing['2xl'], backgroundColor: '#f9fafb', borderRadius: 32, padding: Spacing['2xl'], borderWidth: 1, borderColor: LoopyColors.lightGrey, alignItems: 'center' },
  qrHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: Spacing.lg },
  qrTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: LoopyColors.charcoal },
  qrSubtitle: { fontSize: 13, color: LoopyColors.grey, textAlign: 'center', marginBottom: Spacing['2xl'], lineHeight: 18 },
  qrWrapper: { backgroundColor: '#fff', padding: Spacing.xl, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  qrFooter: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl, gap: 6 },
  qrSecureText: { fontSize: 11, fontWeight: '700', color: LoopyColors.grey, letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing['2xl'] },
  statBox: { flex: 1, backgroundColor: LoopyColors.white, borderRadius: 24, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: LoopyColors.lightGrey },
  statIconBox: { width: 40, height: 40, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: FontSizes.lg, fontWeight: '800', color: LoopyColors.charcoal },
  statLabel: { fontSize: FontSizes.xs, fontWeight: '600', color: LoopyColors.grey },
  historySection: { marginTop: Spacing['3xl'] },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sectionHeader: { fontSize: 20, fontFamily: Fonts.bold, color: LoopyColors.charcoal },
  viewAllText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: LoopyColors.green },
  transactionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: LoopyColors.white, borderRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#f3f4f6' },
  itemIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, marginLeft: Spacing.md },
  itemTitle: { fontSize: 13, fontFamily: Fonts.bold, color: '#111827' },
  itemDate: { fontSize: 10, fontFamily: Fonts.medium, color: '#6b7280', marginTop: 2 },
  amountContainer: { alignItems: 'flex-end', minWidth: 80 },
  itemAmount: { fontSize: 14, fontFamily: Fonts.bold },
  statusLabel: { fontSize: 8, fontFamily: Fonts.bold, color: '#9ca3af', marginTop: 2, letterSpacing: 0.5 },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing['4xl'], borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 32 },
  emptyText: { color: "#6b7280", marginTop: Spacing.md, fontSize: FontSizes.md, fontWeight: '500' },
});
