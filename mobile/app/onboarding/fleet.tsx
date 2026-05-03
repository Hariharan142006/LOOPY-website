import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { LoopyColors } from '../../constants/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function FleetDetailsScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();
  
  const [vehicleName, setVehicleName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Bicycle');
  const [capacity, setCapacity] = useState('');
  const [loading, setLoading] = useState(false);

  const VEHICLE_TYPES = ['Bicycle', 'Bike', 'Three-Wheeler', 'Mini Truck', 'Truck'];

  const handleContinue = async () => {
    if (!vehicleName || !vehiclePlate || !vehicleType || !capacity) {
      Alert.alert('Error', 'Please fill in all vehicle details');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/user/profile', {
        vehicleName,
        vehiclePlate,
        vehicleType,
        capacityKg: Number(capacity)
      });

      if (response.data.success) {
        await api.post('/api/user/profile', { onboarded: true });
        await updateUser({ vehicleType, onboarded: true });
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to save vehicle details';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
          <View style={styles.stepIndicator}>
            <View style={styles.stepDotActive} />
            <View style={styles.stepDotActive} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>
          <Text style={styles.title}>Vehicle Details</Text>
          <Text style={styles.subtitle}>Register your vehicle to start receiving pickup requests</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="car-outline" size={20} color={LoopyColors.grey} style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                value={vehicleName}
                onChangeText={setVehicleName}
                placeholder="e.g. Hero Splendor"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Plate Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color={LoopyColors.grey} style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                value={vehiclePlate}
                onChangeText={setVehiclePlate}
                placeholder="e.g. MH 12 AB 1234"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Type</Text>
            <View style={styles.typeGrid}>
              {VEHICLE_TYPES.map(type => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.typeChip, vehicleType === type && styles.typeChipActive]}
                  onPress={() => setVehicleType(type)}
                >
                  <Text style={[styles.typeText, vehicleType === type && styles.typeTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Load Capacity (KG)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="cube-outline" size={20} color={LoopyColors.grey} style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="e.g. 50"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24, paddingTop: 80 },
  header: { marginBottom: 40 },
  stepIndicator: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  stepDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: '#f3f4f6' },
  stepDotActive: { backgroundColor: LoopyColors.green, width: 32, height: 4, borderRadius: 2 },
  title: { fontSize: 32, fontWeight: '800', color: LoopyColors.charcoal, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', lineHeight: 24 },
  form: { gap: 24 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: LoopyColors.charcoal, fontWeight: '500' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6' },
  typeChipActive: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  typeText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  typeTextActive: { color: '#166534' },
  button: { backgroundColor: LoopyColors.green, flexDirection: 'row', height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 16, elevation: 4 },
  buttonDisabled: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
