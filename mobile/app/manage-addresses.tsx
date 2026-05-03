import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, PermissionsAndroid, KeyboardAvoidingView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { LoopyColors } from '../constants/colors';
import { Fonts } from '../constants/typography';
import Geolocation from '@react-native-community/geolocation';
import { useTranslation } from '../hooks/useTranslation';

export default function ManageAddressesScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [loading, setLoading] = useState(false);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const apiKey = "AIzaSyA-upRfXkloEWajYtkwN7V4sT7mOikfjbw";
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
          const addr = data.results[0];
          const components = addr.address_components;
          
          let streetName = "";
          let cityVal = "";
          let postalCode = "";

          components.forEach((c: any) => {
              if (c.types.includes('route')) streetName = c.long_name;
              if (c.types.includes('locality')) cityVal = c.long_name;
              if (c.types.includes('postal_code')) postalCode = c.long_name;
          });

          setStreet(streetName || addr.formatted_address.split(',')[0]);
          setCity(cityVal);
          setZip(postalCode);
      }
    } catch (e) {
      console.log("Geocoding error", e);
    }
  };

  const handleDetect = async () => {
    setIsLocating(true);
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        { title: 'Location Permission', message: 'Allow location access to detect your address.', buttonPositive: 'Allow' }
      );
      const hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;

      if (!hasPermission) {
        setIsLocating(false);
        return;
      }

      // Safety delay for Android provider initialization
      await new Promise(r => setTimeout(r, 2000));

      const getLocation = (highAccuracy: boolean) => {
        return new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            { 
              enableHighAccuracy: highAccuracy, 
              timeout: 30000, 
              maximumAge: 0
            }
          );
        });
      };

      try {
        // Try quick last known location first
        let position: any = await new Promise((resolve) => {
          Geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 2000, maximumAge: 3600000 }
          );
        });

        if (!position) {
          position = await getLocation(true);
        }

        const { latitude, longitude } = position.coords;
        await reverseGeocode(latitude, longitude);
      } catch (e) {
        console.log("High accuracy failed, trying low accuracy");
        try {
          let position: any = await getLocation(false);
          const { latitude, longitude } = position.coords;
          await reverseGeocode(latitude, longitude);
        } catch (e2) {
          Alert.alert('Error', 'Could not get a GPS fix. Please ensure location is enabled.');
        }
      }
      setIsLocating(false);
    } catch (e) {
      Alert.alert(t('error'), t('could_not_detect_location'));
      setIsLocating(false);
    }
  };

  const handleSave = async () => {
    if (!street || !city || !zip) {
      Alert.alert(t('error'), t('fill_all_fields'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/user/addresses', {
        street,
        city,
        zip,
        isDefault: true
      });
      
      // Update local user state
      if (user) {
        const updatedAddresses = [...(user.addresses || []), response.data.address];
        await updateUser({ addresses: updatedAddresses });
      }

      Alert.alert(t('success'), t('address_saved'), [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert(t('error'), error.response?.data?.message || t('save_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={LoopyColors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('add_new_address')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity 
            style={styles.detectBtn} 
            onPress={handleDetect}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#fff" />
                <Text style={styles.detectText}>{t('detect_current_location')}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('street_address')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('street_placeholder')}
              value={street}
              onChangeText={setStreet}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('city')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('city_placeholder')}
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('zip_code')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('zip_placeholder')}
              value={zip}
              onChangeText={setZip}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>{t('save_address')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontFamily: Fonts.bold, color: LoopyColors.charcoal },
  scrollContent: { padding: 24 },
  detectBtn: { backgroundColor: LoopyColors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginBottom: 32, gap: 10 },
  detectText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: Fonts.bold, color: LoopyColors.charcoal, marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 16, fontFamily: Fonts.medium, color: '#111827' },
  saveBtn: { backgroundColor: LoopyColors.charcoal, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  saveText: { color: '#fff', fontSize: 18, fontFamily: Fonts.bold },
});
