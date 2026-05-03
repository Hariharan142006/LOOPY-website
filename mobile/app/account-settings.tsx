import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Switch, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LoopyColors, Colors } from '../constants/colors';
import TouchID from 'react-native-touch-id';
import { api } from '../utils/api';
import { useTranslation } from '../hooks/useTranslation';

export default function AccountSettingsScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Password Modal State
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/user/profile');
      setProfile(response.data);
    } catch (error) {
      console.error("Fetch profile error", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBiometrics = async (value: boolean) => {
    try {
      if (value) {
        try {
          await TouchID.isSupported();
        } catch (e) {
          Alert.alert(t('not_available' as any), t('biometrics_not_supported' as any));
          return;
        }

        await TouchID.authenticate('Enable Biometrics');
      }

      await api.patch('/api/user/settings', { biometricsEnabled: value });
      setProfile({ ...profile, biometricsEnabled: value });
      Alert.alert(t('success'), `${t('biometric_auth')} ${value ? t('enabled' as any) : t('disabled' as any)} ${t('successfully' as any)}.`);
    } catch (error) {
      Alert.alert("Error", "Failed to update biometric settings.");
    }
  };

  const validatePassword = () => {
    if (!passData.current || !passData.new || !passData.confirm) {
      Alert.alert(t('error'), t('pass_fill_all' as any));
      return false;
    }
    if (passData.new !== passData.confirm) {
      Alert.alert(t('error'), t('pass_no_match' as any));
      return false;
    }
    if (passData.new.length < 6) {
      Alert.alert(t('error'), t('pass_min_length' as any));
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    
    setPassLoading(true);
    try {
      await api.post('/api/user/password', {
        currentPassword: passData.current,
        newPassword: passData.new
      });
      Alert.alert(t('success'), t('pass_change_success' as any));
      setPassModalVisible(false);
      setPassData({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to change password.");
    } finally {
      setPassLoading(false);
    }
  };

  const handleAction = (title: string) => {
    Alert.alert(title, `This feature will be available in the next update.`);
  };

  const SettingItem = ({ icon, label, onPress, color = LoopyColors.charcoal, destructive = false, rightElement }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress} disabled={!!rightElement}>
      <View style={[styles.iconBox, { backgroundColor: color + '10' }]}>
        <Ionicons name={icon} size={22} color={destructive ? LoopyColors.red : color} />
      </View>
      <Text style={[styles.itemText, destructive && { color: LoopyColors.red }]}>{label}</Text>
      {rightElement || <Ionicons name="chevron-forward" size={18} color={LoopyColors.grey} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={LoopyColors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('account_settings_header')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator color={LoopyColors.green} size="large" style={{ marginVertical: 40 }} />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile_details_section')}</Text>
              <View style={styles.group}>
                <View style={styles.profileInfo}>
                  <View style={styles.profileBadge}>
                    <Text style={styles.profileInitial}>{profile?.name?.[0]?.toUpperCase() || 'U'}</Text>
                  </View>
                  <View style={styles.profileTexts}>
                    <Text style={styles.profileName}>{profile?.name}</Text>
                    <Text style={styles.profileEmail}>{profile?.email}</Text>
                    <Text style={styles.profilePhone}>{profile?.phone || t('no_phone_added' as any)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {profile?.role === 'AGENT' && profile?.assignedVehicles?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('fleet_details' as any)}</Text>
                <View style={styles.group}>
                  {profile.assignedVehicles.map((v: any) => (
                    <View key={v.id} style={styles.fleetItem}>
                      <View style={styles.fleetIcon}>
                        <Ionicons name="car-outline" size={24} color={LoopyColors.green} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fleetName}>{v.name}</Text>
                        <Text style={styles.fleetPlate}>{v.licensePlate}</Text>
                      </View>
                      <View style={styles.fleetBadge}>
                        <Text style={styles.fleetBadgeText}>{v.vehicleType}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('security_section')}</Text>
              <View style={styles.group}>
                <SettingItem 
                  icon="lock-closed-outline" 
                  label={t('change_password')} 
                  onPress={() => setPassModalVisible(true)} 
                />
                <SettingItem 
                  icon="location-outline" 
                  label={t('manage_addresses')} 
                  onPress={() => navigation.navigate('ManageAddresses')} 
                />
                <SettingItem 
                  icon="finger-print-outline" 
                  label={t('biometric_auth')} 
                  rightElement={
                    <Switch 
                      value={profile?.biometricsEnabled || false} 
                      onValueChange={toggleBiometrics}
                      trackColor={{ false: '#eee', true: LoopyColors.green }}
                    />
                  }
                />
              </View>
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('data_privacy_section')}</Text>
          <View style={styles.group}>
            <SettingItem 
              icon="download-outline" 
              label={t('export_my_data')} 
              onPress={() => handleAction('Export Data')} 
            />
            <SettingItem 
              icon="trash-outline" 
              label={t('delete_account')} 
              destructive 
              onPress={() => {
                Alert.alert(
                  t('delete_account'),
                  t('delete_account_confirm'),
                  [{ text: t('cancel'), style: 'cancel' }, { text: t('delete_account'), style: 'destructive' }]
                );
              }} 
            />
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={passModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('change_password')}</Text>
              <TouchableOpacity onPress={() => setPassModalVisible(false)}>
                <Ionicons name="close" size={24} color={LoopyColors.charcoal} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('current_password' as any)}</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="••••••••"
                value={passData.current}
                onChangeText={(text) => setPassData({...passData, current: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('new_password' as any)}</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Min. 6 characters"
                value={passData.new}
                onChangeText={(text) => setPassData({...passData, new: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('confirm_new_password' as any)}</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Confirm your new password"
                value={passData.confirm}
                onChangeText={(text) => setPassData({...passData, confirm: text})}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, passLoading && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={passLoading}
            >
              <Text style={styles.saveBtnText}>{passLoading ? t('updating' as any) : t('update_password' as any)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LoopyColors.white },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: LoopyColors.lightGrey,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LoopyColors.lightGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: LoopyColors.charcoal },
  scroll: { padding: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: LoopyColors.grey, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  group: { backgroundColor: LoopyColors.white, borderRadius: 24, padding: 8, borderWidth: 1, borderColor: LoopyColors.lightGrey },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  itemText: { flex: 1, fontSize: 16, fontWeight: '700', color: LoopyColors.charcoal },
  profileInfo: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  profileBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: LoopyColors.green + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  profileInitial: { fontSize: 24, fontWeight: '800', color: LoopyColors.green },
  profileTexts: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: LoopyColors.charcoal, marginBottom: 2 },
  profileEmail: { fontSize: 13, fontWeight: '600', color: LoopyColors.grey, marginBottom: 2 },
  profilePhone: { fontSize: 12, fontWeight: '600', color: LoopyColors.grey },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: LoopyColors.charcoal },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: LoopyColors.grey, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  saveBtn: { backgroundColor: LoopyColors.charcoal, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  fleetItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  fleetIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: LoopyColors.green + '10', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  fleetName: { fontSize: 16, fontWeight: '800', color: LoopyColors.charcoal },
  fleetPlate: { fontSize: 13, color: LoopyColors.grey, marginTop: 2 },
  fleetBadge: { backgroundColor: LoopyColors.lightGrey, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  fleetBadgeText: { fontSize: 10, fontWeight: '800', color: LoopyColors.charcoal, textTransform: 'uppercase' },
});
