import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, Platform, Dimensions, KeyboardAvoidingView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { LoopyColors, Colors } from '../constants/colors';
import { useTranslation } from '../hooks/useTranslation';
import { Fonts } from '../constants/typography';

const { width } = Dimensions.get('window');



const CAT_ICONS: Record<string, any> = {
  'Paper': 'document-text-outline',
  'Plastic': 'layers-outline',
  'Metal': 'construct-outline',
  'E-Waste': 'hardware-chip-outline',
  'Appliances': 'tv-outline',
  'Glass': 'wine-outline',
  'Automotive': 'car-outline',
  'Textiles': 'shirt-outline',
  'Batteries': 'battery-charging-outline',
};


import SuccessModal from '../components/SuccessModal';

export default function BookPickupScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const scrollRef = React.useRef<ScrollView>(null);
  
  const WEIGHT_RANGES = [
    { label: '0-5kg', min: 0, max: 5, avg: 2.5, color: '#f43f5e' },
    { label: '5-10kg', min: 5, max: 10, avg: 7.5, color: '#10b981' },
    { label: '10-20kg', min: 10, max: 20, avg: 15, color: '#3b82f6' },
    { label: 'Other', min: 20, max: 1000, avg: 50, color: '#6b7280' }
  ];

  const TIME_SLOTS = [
    { label: '09:00 - 12:00', value: '09:00' },
    { label: '12:00 - 15:00', value: '12:00' },
    { label: '15:00 - 18:00', value: '15:00' },
    { label: '18:00 - 21:00', value: '18:00' }
  ];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  // Data
  const [categories, setCategories] = useState([]);
  const [addresses, setAddresses] = useState([]);

  // Form State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [date, setDate] = useState(new Date(Date.now() + 86400000)); // Tomorrow
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0].value);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [weightRange, setWeightRange] = useState(WEIGHT_RANGES[0]);
  const [customWeight, setCustomWeight] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedScrapSize, setSelectedScrapSize] = useState<'Small' | 'Large'>('Small');

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  const [nextDays] = useState(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + 1 + i);
      days.push(d);
    }
    return days;
  });

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [catRes, addrRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/user/addresses')
      ]);
      setCategories(catRes.data.categories || []);
      setAddresses(addrRes.data.addresses || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      setCategories([]); 
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      let hasPermission = false;
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        Geolocation.requestAuthorization();
        hasPermission = true; // Simulating for now, Geolocation handles actual check
      }

      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Allow location access to detect your address.');
        setIsLocating(false);
        return;
      }

      await new Promise(r => setTimeout(r, 2000));

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await reverseGeocode(latitude, longitude);
          setIsLocating(false);
        },
        (error) => {
          console.log(error);
          Alert.alert('Error', 'Could not detect location. Please select manually.');
          setIsLocating(false);
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
      );
    } catch (e) {
      setIsLocating(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const apiKey = "AIzaSyA-upRfXkloEWajYtkwN7V4sT7mOikfjbw";
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        setSelectedAddress({
          lat: latitude,
          lng: longitude,
          address: data.results[0].formatted_address,
          isNew: true
        });
      } else if (data.status === 'REQUEST_DENIED') {
        console.error("Google Geocoding Denied:", data.error_message);
        Alert.alert('API Error', 'Geocoding API is not enabled for your Google Maps key. Please enable it in Google Cloud Console.');
        // Fallback to showing raw coordinates if geocoding fails
        setSelectedAddress({
          lat: latitude,
          lng: longitude,
          address: `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          isNew: true
        });
      } else {
        console.log("Geocoding failed with status:", data.status);
        setSelectedAddress({
          lat: latitude,
          lng: longitude,
          address: `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          isNew: true
        });
      }
    } catch (geocoderError) {
      console.log("Network error during geocoding", geocoderError);
      setSelectedAddress({
        lat: latitude,
        lng: longitude,
        address: `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        isNew: true
      });
    }
  };

  const findClosestSavedAddress = (lat: number, lng: number) => {
    let minDistance = 0.5; // 500 meters threshold
    let closestAddr = null;

    addresses.forEach((addr: any) => {
      if (addr.lat && addr.lng) {
        const dist = calculateDistance(lat, lng, addr.lat, addr.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestAddr = addr;
        }
      }
    });

    return closestAddr;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };


  const handleSubmit = async () => {
    if (!selectedAddress) {
      Alert.alert(t('error'), t('select_pickup_location'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/bookings', {
        items: selectedCategories.map(catId => {
           const cat = categories.find((c: any) => c.id === catId);
           const firstItem = (cat as any)?.items?.[0] || { id: 'unknown', currentPrice: 10 };
           return { id: firstItem.id, qty: weightRange.avg / selectedCategories.length, price: firstItem.currentPrice };
        }),
        schedule: {
          date: date.toISOString().split('T')[0],
          time: timeSlot
        },
        location: {
          ...selectedAddress,
          address: selectedAddress.address || selectedAddress.street || 'Unknown Address',
        },
        totalAmount: 0,
        remarks
      });

      if (response.data.success) {
        setBookingDetails({
          id: response.data.bookingId || response.data.booking?.id || 'Unknown',
          date: date.toISOString().split('T')[0],
          time: timeSlot,
          address: selectedAddress.address || selectedAddress.street || 'Selected Location'
        });
        setShowSuccess(true);
      }
    } catch (error) {
      Alert.alert(t('error'), t('scheduling_failed'));
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
     <View style={styles.indicatorContainer}>
        <View style={styles.indicatorTrack}>
           <View style={[styles.indicatorFill, { width: `${(step / 2) * 100}%` }]} />
        </View>
        <View style={styles.indicatorLabelBox}>
           <Text style={styles.indicatorText}>{t('step_indicator', { current: step, total: 2 })}</Text>
           <Text style={styles.indicatorSub}>{step === 1 ? t('material_selection') : t('location_time')}</Text>
        </View>
     </View>
  );

  const filteredCategories = categories.filter((cat: any) => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.items && cat.items.some((i: any) => i.name.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>{t('what_collecting')}</Text>
      <Text style={styles.sectionSub}>{t('select_categories_sub')}</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9ca3af" />
        <TextInput 
          placeholder="Search items like Newspaper, AC..." 
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {loading ? (
        <View style={styles.grid}>
          {[1, 2, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.catCard, { borderColor: '#f3f4f6', backgroundColor: '#f9fafb' }]}>
               <View style={[styles.iconCircle, { backgroundColor: '#f3f4f6' }]} />
               <View style={{ height: 12, width: '60%', backgroundColor: '#f3f4f6', borderRadius: 6 }} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {filteredCategories.length > 0 ? filteredCategories.map((cat: any) => {
            const isSelected = selectedCategories.includes(cat.id);
            const iconName = CAT_ICONS[cat.name] || 'cube-outline';
            return (
              <TouchableOpacity 
                key={cat.id} 
                activeOpacity={0.7}
                style={[styles.catCard, isSelected && styles.catCardSelected]}
                onPress={() => handleCategoryToggle(cat.id)}
              >
                <View style={[styles.iconCircle, isSelected && { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                   <Ionicons name={iconName} size={32} color={isSelected ? '#fff' : '#6b7280'} />
                </View>
                <Text style={[styles.catName, isSelected && styles.catNameSelected]}>{cat.name}</Text>
                {isSelected && (
                   <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                   </View>
                )}
              </TouchableOpacity>
            );
          }) : (
            <View style={styles.emptySearch}>
               <Ionicons name="search" size={48} color="#f3f4f6" />
               <Text style={styles.emptySearchText}>No matching scrap categories found</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity 
        style={[styles.primaryButton, selectedCategories.length === 0 && styles.buttonDisabled]}
        onPress={() => {
          if (selectedCategories.length === 0) {
            Alert.alert(t('selection_required'), t('select_at_least_one'));
          } else {
            setStep(2);
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>{t('continue_to_details')}</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInUp} style={styles.stepContainer}>

      {/* Green Banner */}
      <View style={styles.greenBanner}>
        <View style={styles.bannerIconBg}>
           <Ionicons name="shield-checkmark" size={24} color={LoopyColors.green} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
           <Text style={styles.bannerTitle}>Sell your scrap hassle free</Text>
           <Text style={styles.bannerSub}>We do not charge any money in our app</Text>
        </View>
      </View>

      {/* Size of Scrap */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
           <Ionicons name="bicycle-outline" size={16} /> Size of Scrap
        </Text>
        <Text style={styles.sectionSubText}>Can your scrap be carried on a bike?</Text>
        <View style={styles.scrapSizeRow}>
           <TouchableOpacity 
             style={[styles.scrapSizeCard, selectedScrapSize === 'Small' && styles.scrapSizeCardActive]}
             onPress={() => setSelectedScrapSize('Small')}
             activeOpacity={0.8}
           >
              <Ionicons name="bicycle" size={32} color={selectedScrapSize === 'Small' ? '#fff' : LoopyColors.green} />
              <View style={styles.scrapSizeCardTextWrap}>
                 <Text style={[styles.scrapSizeTitle, selectedScrapSize === 'Small' && { color: '#fff' }]}>Small</Text>
                 <Text style={[styles.scrapSizeSub, selectedScrapSize === 'Small' && { color: 'rgba(255,255,255,0.8)' }]}>Our Rider</Text>
              </View>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.scrapSizeCard, selectedScrapSize === 'Large' && styles.scrapSizeCardActive]}
             onPress={() => setSelectedScrapSize('Large')}
             activeOpacity={0.8}
           >
              <Ionicons name="bus" size={32} color={selectedScrapSize === 'Large' ? '#fff' : '#9ca3af'} />
              <View style={styles.scrapSizeCardTextWrap}>
                 <Text style={[styles.scrapSizeTitle, selectedScrapSize === 'Large' && { color: '#fff' }]}>Large</Text>
                 <Text style={[styles.scrapSizeSub, selectedScrapSize === 'Large' && { color: 'rgba(255,255,255,0.8)' }]}>Our Mini Truck</Text>
              </View>
           </TouchableOpacity>
        </View>
      </View>

      {/* Date Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
           <Ionicons name="calendar-outline" size={16} /> Date
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateChipRow}>
          {nextDays.map(d => {
             const isSelected = date.toDateString() === d.toDateString();
             const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
             const dayNum = d.getDate();
             return (
               <TouchableOpacity 
                 key={d.toISOString()} 
                 style={[styles.dateChip, isSelected && styles.dateChipActive]}
                 onPress={() => setDate(d)}
               >
                 <Text style={[styles.dateChipDay, isSelected && styles.dateChipDayActive]}>{dayName}</Text>
                 <Text style={[styles.dateChipNum, isSelected && styles.dateChipNumActive]}>{dayNum}</Text>
               </TouchableOpacity>
             )
          })}
        </ScrollView>
        <TouchableOpacity style={[styles.inputBox, { marginTop: 12 }]} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputBoxText}>{date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          <Ionicons name="calendar" size={20} color={LoopyColors.grey} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}
      </View>

      {/* Time Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
           <Ionicons name="time-outline" size={16} /> Time
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TIME_SLOTS.map(slot => (
             <TouchableOpacity 
               key={slot.value} 
               style={[styles.chip, timeSlot === slot.value && styles.chipActive]}
               onPress={() => setTimeSlot(slot.value)}
             >
               <Text style={[styles.chipText, timeSlot === slot.value && styles.chipTextActive]}>{slot.label}</Text>
             </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Estimated Weight */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
           <Ionicons name="bag-outline" size={16} /> Estimated Weight
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {WEIGHT_RANGES.map((range) => {
             const isActive = weightRange.label === range.label;
             return (
               <TouchableOpacity 
                 key={range.label} 
                 style={[
                   styles.weightChipBase, 
                   { borderColor: range.color, backgroundColor: isActive ? range.color : '#fff' }
                 ]}
                 onPress={() => setWeightRange(range)}
               >
                 <Text style={[
                   styles.weightChipTextBase, 
                   { color: isActive ? '#fff' : range.color }
                 ]}>{range.label}</Text>
               </TouchableOpacity>
             )
          })}
        </ScrollView>
        {weightRange.label === 'Other' && (
          <TextInput
            style={[styles.inputBox, { marginTop: 12 }]}
            placeholder="Enter weight in kg"
            keyboardType="numeric"
            value={customWeight}
            onChangeText={setCustomWeight}
          />
        )}
      </View>

      {/* Address Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('pickup_address')}</Text>
        {addresses.map((addr: any) => (
          <TouchableOpacity 
            key={addr.id} 
            style={[styles.addressCard, selectedAddress?.id === addr.id && styles.addressCardActive]}
            onPress={() => setSelectedAddress(addr)}
          >
            <View style={[styles.addressIcon, selectedAddress?.id === addr.id && { backgroundColor: LoopyColors.green }]}>
               <Ionicons name="home-outline" size={18} color={selectedAddress?.id === addr.id ? '#fff' : LoopyColors.grey} />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={[styles.addressLabel, selectedAddress?.id === addr.id && { color: LoopyColors.green }]}>{t((addr.label || 'Home').toLowerCase(), { defaultValue: addr.label || 'Home' })}</Text>
               <Text style={styles.addressSub} numberOfLines={1}>{addr.street}</Text>
            </View>
            {selectedAddress?.id === addr.id && <Ionicons name="radio-button-on" size={20} color={LoopyColors.green} />}
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={styles.detectBtn} onPress={handleDetectLocation} disabled={isLocating}>
          {isLocating ? <ActivityIndicator size="small" color={LoopyColors.green} /> : <Ionicons name="navigate-outline" size={18} color={LoopyColors.green} />}
          <Text style={styles.detectBtnText}>{selectedAddress?.isNew ? t('location_detected') : t('detect_location')}</Text>
          {selectedAddress?.isNew && <Text style={styles.detectedAddr} numberOfLines={1}>{selectedAddress.address}</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
         style={[styles.navyButton, loading && styles.buttonDisabled]} 
         onPress={handleSubmit} 
         disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : (
           <>
              <Text style={styles.navyButtonText}>COMPLETE PICKUP</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
           </>
        )}
      </TouchableOpacity>
      <View style={{height: 40}} />
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={LoopyColors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('new_booking_header')}</Text>
          <View style={{ width: 44 }} />
        </View>

        {renderStepIndicator()}

        <ScrollView 
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 60 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {step === 1 ? renderStep1() : renderStep2()}
        </ScrollView>

        {showSuccess && bookingDetails && (
          <SuccessModal 
            isVisible={showSuccess}
            details={bookingDetails}
            onClose={() => {
              setShowSuccess(false);
              navigation.replace('Main');
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
  
  indicatorContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  indicatorTrack: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12 },
  indicatorFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 2 },
  indicatorLabelBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  indicatorText: { fontSize: 11, fontFamily: Fonts.bold, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
  indicatorSub: { fontSize: 12, fontFamily: Fonts.medium, color: '#9ca3af' },
  
  stepContainer: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 26, fontFamily: Fonts.bold, color: '#111827', marginBottom: 6, letterSpacing: -0.5 },
  sectionSub: { fontSize: 15, fontFamily: Fonts.medium, color: '#6b7280', marginBottom: 24, lineHeight: 22 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24, gap: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  searchInput: { flex: 1, fontSize: 15, fontFamily: Fonts.medium, color: '#111827', padding: 0 },
  emptySearch: { flex: 1, alignItems: 'center', paddingVertical: 40 },
  emptySearchText: { fontSize: 14, fontFamily: Fonts.medium, color: '#9ca3af', marginTop: 12, textAlign: 'center' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: { width: (width - 52) / 2, backgroundColor: '#ffffff', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  catCardSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  iconCircle: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  catName: { fontSize: 14, fontFamily: Fonts.bold, color: '#4b5563' },
  catNameSelected: { color: '#ffffff' },
  checkBadge: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  
  primaryButton: { backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 100, marginTop: 32, gap: 10 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontFamily: Fonts.bold },
  buttonDisabled: { backgroundColor: '#e5e7eb' },
  inputGroup: { marginBottom: 28 },
  label: { fontSize: 16, fontFamily: Fonts.bold, color: LoopyColors.charcoal, marginBottom: 8 },
  sectionSubText: { fontSize: 12, fontFamily: Fonts.medium, color: '#9ca3af', marginBottom: 12 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: LoopyColors.white, borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 16, padding: 16, gap: 12 },
  inputBoxText: { flex: 1, fontSize: 15, color: '#6b7280', fontFamily: Fonts.semiBold },
  chipRow: { gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#f3f4f6', backgroundColor: LoopyColors.white },
  chipActive: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  chipText: { fontSize: 13, fontFamily: Fonts.bold, color: '#6b7280' },
  chipTextActive: { color: LoopyColors.green },
  addressCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: LoopyColors.lightGrey, marginBottom: 12, gap: 12 },
  addressCardActive: { borderColor: LoopyColors.green, backgroundColor: '#f0fdf4' },
  addressIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: LoopyColors.lightGrey, alignItems: 'center', justifyContent: 'center' },
  addressLabel: { fontSize: 14, fontFamily: Fonts.bold, color: LoopyColors.charcoal },
  addressSub: { fontSize: 12, fontFamily: Fonts.regular, color: LoopyColors.grey, marginTop: 2 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: LoopyColors.green, borderStyle: 'dashed', gap: 10, marginTop: 4 },
  detectBtnText: { color: LoopyColors.green, fontFamily: Fonts.bold, fontSize: 14 },
  detectedAddr: { flex: 1, fontSize: 12, fontFamily: Fonts.medium, color: LoopyColors.grey, fontStyle: 'italic' },
  textInput: { backgroundColor: LoopyColors.white, borderWidth: 1, borderColor: LoopyColors.lightGrey, borderRadius: 16, padding: 16, fontSize: 15, color: LoopyColors.charcoal, height: 100, textAlignVertical: 'top', fontFamily: Fonts.regular },
  
  // New Styles
  greenBanner: { flexDirection: 'row', backgroundColor: '#eafff2', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  bannerIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 15, fontFamily: Fonts.bold, color: '#166534', marginBottom: 2 },
  bannerSub: { fontSize: 12, fontFamily: Fonts.semiBold, color: '#166534', opacity: 0.8 },
  
  scrapSizeRow: { flexDirection: 'row', gap: 12 },
  scrapSizeCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  scrapSizeCardActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  scrapSizeCardTextWrap: { flex: 1 },
  scrapSizeTitle: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827', marginBottom: 2 },
  scrapSizeSub: { fontSize: 11, fontFamily: Fonts.semiBold, color: '#9ca3af' },

  dateChipRow: { gap: 12 },
  dateChip: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6', minWidth: 65 },
  dateChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  dateChipDay: { fontSize: 12, fontFamily: Fonts.bold, color: '#9ca3af', marginBottom: 4 },
  dateChipDayActive: { color: 'rgba(255,255,255,0.9)' },
  dateChipNum: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
  dateChipNumActive: { color: '#fff' },

  weightChipBase: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  weightChipTextBase: { fontSize: 13, fontFamily: Fonts.bold },

  navyButton: { backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, marginTop: 12, gap: 10 },
  navyButtonText: { color: '#fff', fontSize: 15, fontFamily: Fonts.bold, letterSpacing: 0.5 },
});
