import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, NativeSyntheticEvent, NativeScrollEvent, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { LoopyColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: 'Easy Pickups',
    description: 'Schedule a pickup for your recyclables in just a few taps. Our agents will arrive right at your doorstep.',
    icon: 'calendar-outline',
    color: '#89c541',
    accent: '#f0fdf4',
  },
  {
    id: 2,
    title: 'Live Market Rates',
    description: 'Stay updated with real-time market prices for plastic, paper, metal, and more. Transparent pricing, always.',
    icon: 'trending-up-outline',
    color: '#3b82f6',
    accent: '#eff6ff',
  },
  {
    id: 3,
    title: 'Earn & Save Earth',
    description: 'Get paid instantly into your Loopy wallet for every kilogram you recycle. Track your positive impact on the planet.',
    icon: 'leaf-outline',
    color: '#10b981',
    accent: '#ecfdf5',
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const { updateUser } = useAuth();

  useEffect(() => {
    const handleComplete = async () => {
      try {
        const response = await api.post('/api/user/profile', {
          onboarded: true,
        });

        if (response.data.success) {
          await updateUser({ onboarded: true });
        }
      } catch (error) {
        console.error('Onboarding completion error:', error);
        await updateUser({ onboarded: true });
      } finally {
        router.replace({
          pathname: '/(tabs)',
          params: { startTutorial: 'true' }
        });
      }
    };
    
    handleComplete();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#89c541" />
        <Text style={styles.loadingText}>Setting up your workspace...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  }
});
