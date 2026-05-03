import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, StatusBar, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../utils/api';
import Animated, { FadeInUp, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { Colors, LoopyColors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/layout';
import { useTranslation } from '../../hooks/useTranslation';
import { launchImageLibrary } from 'react-native-image-picker';


export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [stats, setStats] = useState({ pickups: 0, recycled: 0, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const isAgent = user?.role === 'AGENT';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (isAgent) {
           const [agentRes, walletRes] = await Promise.all([
             api.get('/api/agent/tasks'),
             api.get('/api/user/wallet')
           ]);
           const completed = agentRes.data.completed || [];
           setStats({
             pickups: completed.length,
             recycled: completed.reduce((acc: number, b: any) => acc + (b.items?.reduce((ia: number, i: any) => ia + (i.quantity || 0), 0) || 0), 0), 
             earned: Math.floor(walletRes.data.balance || 0) 
           });
        } else {
           const [bookingsRes, walletRes] = await Promise.all([
             api.get('/api/user/bookings'),
             api.get('/api/user/wallet')
           ]);
           const bookings = bookingsRes.data.bookings || [];
           const completedPickups = bookings.filter((b: any) => b.status === 'COMPLETED').length;
           setStats({
             pickups: completedPickups || 0,
             recycled: walletRes.data.impact?.kgRecycled || 0,
             earned: Math.floor(walletRes.data.balance || 0)
           });
        }
      } catch (error) {
        console.log('Error fetching profile stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const handlePickImage = async () => {
    try {
      const result: any = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.5,
        includeBase64: true,
      });

      if (result.assets && result.assets.length > 0 && result.assets[0].base64) {
        setUploading(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Sync with backend
        await api.post('/api/user/profile', { image: base64Image });
        
        // Update local global state
        await updateUser({ image: base64Image });
        
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Update Failed', 'Could not update profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to end your current session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const MenuItem = ({ icon, label, onPress, color, subValue, isHot }: any) => (
    <View>
      <TouchableOpacity style={styles.menuItemCard} onPress={onPress}>
         <View style={[styles.menuIconCircle, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={22} color={color} />
         </View>
         <View style={{ flex: 1 }}>
            <Text style={styles.menuItemLabel}>{label}</Text>
            <Text style={styles.menuItemSub}>{subValue || 'Manage your account details'}</Text>
         </View>
         {isHot && (
           <View style={styles.hotBadge}>
              <Text style={styles.hotText}>HOT</Text>
           </View>
         )}
         <Ionicons name="chevron-forward" size={18} color={LoopyColors.border} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        
        {/* Top Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handlePickImage}
            activeOpacity={0.8}
            disabled={uploading}
          >
             <View style={styles.avatarBorder}>
                {uploading ? (
                  <View style={styles.uploadingState}>
                    <ActivityIndicator color={LoopyColors.green} />
                  </View>
                ) : (
                  <Image 
                    source={user?.image ? { uri: user.image } : require('../../assets/images/user-placeholder.png')} 
                    style={styles.avatarImg} 
                  />
                )}
             </View>
             <View style={styles.editCameraBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
             </View>
             <View style={styles.roleBadgeOverlay}>
                <Text style={styles.roleLabel}>{user?.role || 'CUSTOMER'}</Text>
             </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{(user?.name || 'USER').toUpperCase()}</Text>
          <Text style={styles.memberSince}>{t('member_since')} March 2023</Text>
        </View>

        {/* High-Fidelity Stats Grid */}
        <View style={styles.statsGridRow}>
           <View style={styles.statPill}>
              <Text style={styles.statNumber}>{loading ? '--' : stats.pickups}</Text>
              <Text style={styles.statTitle}>{isAgent ? t('pickups').toUpperCase() : t('bookings').toUpperCase()}</Text>
           </View>

           <View style={[styles.statPill, styles.statPillGreen]}>
              <Text style={[styles.statNumber, { color: '#fff' }]}>{loading ? '--' : stats.recycled}</Text>
              <Text style={[styles.statTitle, { color: '#fff', opacity: 0.9 }]}>{t('kg_recycled_label')}</Text>
              <View style={styles.lightOverlay} />
           </View>

           <View style={styles.statPill}>
              <Text style={styles.statNumber}>₹{(stats.earned / 1000).toFixed(0)}k</Text>
              <Text style={styles.statTitle}>{t('earned')}</Text>
           </View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
           <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>{t('general_settings')}</Text>
              <View style={styles.headingLine} />
           </View>

           <View style={styles.menuItemsList}>
              <MenuItem 
                icon="settings-outline" 
                label={t('account_setting')} 
                subValue={t('security_accessibility')}
                color="#5b21b6" 
                onPress={() => navigation.navigate('AccountSettings')} 
              />
              <MenuItem 
                icon="person-outline" 
                label={t('profile_details')} 
                subValue={t('personal_info')}
                color="#15803d" 
                onPress={() => navigation.navigate('EditProfile')} 
              />
              <MenuItem 
                icon="notifications-outline" 
                label={t('language_notif')} 
                subValue={t('pref_alerts')}
                color="#06b6d4" 
                onPress={() => navigation.navigate('LanguageNotifications')} 
              />
              <MenuItem 
                icon="gift-outline" 
                label={t('refer_earn')} 
                subValue={t('refer_subtitle')}
                color="#f97316" 
                isHot={true}
                onPress={() => navigation.navigate('ReferEarn')} 
              />
            </View>
        </View>
        {/* Legal & Support Section */}
        <View style={[styles.settingsSection, { marginTop: 32 }]}>
           <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>{t('legal_support')}</Text>
              <View style={styles.headingLine} />
           </View>

           <View style={styles.menuItemsList}>
              <MenuItem 
                icon="help-buoy-outline" 
                label={t('help_center')} 
                subValue={t('help_center_sub')}
                color="#ea580c" 
                onPress={() => navigation.navigate('HelpSupport')} 
              />
              <MenuItem 
                icon="document-text-outline" 
                label={t('terms_conditions')} 
                subValue={t('terms_sub')}
                color="#374151" 
                onPress={() => navigation.navigate('Terms')} 
              />
              <MenuItem 
                icon="ribbon-outline" 
                label={t('licenses')} 
                subValue={t('licenses_sub')}
                color="#64748b" 
                onPress={() => navigation.navigate('Licenses')} 
              />
           </View>
        </View>

        {/* Logout Button */}
        <View style={{ paddingHorizontal: 32, marginTop: 40 }}>
           <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
              <Text style={styles.signOutText}>{t('sign_out')}</Text>
           </TouchableOpacity>
        </View>

        <Text style={styles.versionTag}>LOOPY ECO-SYSTEM • v1.1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  
  // Header
  profileHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  avatarContainer: { position: 'relative', marginBottom: 20 },
  avatarBorder: { width: 130, height: 130, borderRadius: 65, padding: 4, backgroundColor: '#fff', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 60 },
  uploadingState: { width: '100%', height: '100%', borderRadius: 60, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  editCameraBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#22c55e', width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  roleBadgeOverlay: { position: 'absolute', bottom: -5, alignSelf: 'center', backgroundColor: '#166534', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 100, borderWidth: 3, borderColor: '#fff' },
  roleLabel: { color: '#fff', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  profileName: { fontSize: 26, fontFamily: Fonts.bold, color: '#111827', letterSpacing: -0.5 },
  memberSince: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280', marginTop: 4 },

  // Stats Grid
  statsGridRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 48 },
  statPill: { flex: 1, backgroundColor: '#fff', borderRadius: 24, paddingVertical: 24, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  statPillGreen: { backgroundColor: '#22c55e', overflow: 'hidden' },
  statNumber: { fontSize: 22, fontFamily: Fonts.bold, color: '#111827' },
  statTitle: { fontSize: 9, fontFamily: Fonts.bold, color: '#6b7280', marginTop: 4, letterSpacing: 0.5 },
  lightOverlay: { position: 'absolute', top: -50, right: -50, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Settings
  settingsSection: { paddingHorizontal: 32 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionHeading: { fontSize: 11, fontFamily: Fonts.bold, color: '#6b7280', letterSpacing: 1.5 },
  headingLine: { flex: 1, height: 1, backgroundColor: '#f3f4f6', marginLeft: 12 },
  menuItemsList: { gap: 14 },
  menuItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
  menuIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  menuItemLabel: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827' },
  menuItemSub: { fontSize: 13, fontFamily: Fonts.medium, color: '#9ca3af', marginTop: 2 },
  hotBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginRight: 8 },
  hotText: { color: '#f97316', fontSize: 10, fontFamily: Fonts.bold },

  // Sign Out
  signOutBtn: { backgroundColor: '#fff', paddingVertical: 18, borderRadius: 100, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  signOutText: { color: '#ef4444', fontSize: 16, fontFamily: Fonts.bold },
  versionTag: { textAlign: 'center', fontSize: 10, fontFamily: Fonts.bold, color: '#d1d5db', marginTop: 40, letterSpacing: 2 },
});
