import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { LoopyColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from '../../hooks/useTranslation';

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const { t } = useTranslation();
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert(t('error'), 'Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      Alert.alert(t('error'), 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      // We don't mark as onboarded yet, just update details
      const response = await api.post('/api/user/profile', {
        name,
        phone,
      });

      if (response.data.success) {
        await updateUser({ name, phone });
        router.push('/onboarding/language');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to save details. Please try again.';
      Alert.alert(t('error'), message);
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
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
          </View>
          <Text style={styles.title}>Personal Details</Text>
          <Text style={styles.subtitle}>Help us customize your recycling experience</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('full_name')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={LoopyColors.grey} style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('phone_number')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={LoopyColors.grey} style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="9876543210"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
            <Text style={styles.hint}>This is used by agents for pickup coordination.</Text>
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

          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={() => logout()}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 80,
  },
  header: {
    marginBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  stepDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f3f4f6',
  },
  stepDotActive: {
    backgroundColor: LoopyColors.green,
    width: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: LoopyColors.charcoal,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: LoopyColors.charcoal,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
    marginTop: 4,
  },
  button: {
    backgroundColor: LoopyColors.green,
    flexDirection: 'row',
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: LoopyColors.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
