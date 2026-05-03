import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { LoopyColors } from '../../constants/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LanguageCode } from '../../constants/translations';
import { useTranslation } from '../../hooks/useTranslation';

const LANGUAGES = [
  { code: 'en', label: 'English', sub: 'Default Language' },
  { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { code: 'ta', label: 'தமிழ்', sub: 'Tamil' },
  { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
  { code: 'kn', label: 'ಕನ್ನಡ', sub: 'Kannada' },
  { code: 'ml', label: 'മലയാളം', sub: 'Malayalam' },
];

export default function LanguageSelectionScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>((user?.preferredLanguage as LanguageCode) || 'en');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      // If user is logged in, sync with backend
      if (user) {
        await api.post('/api/user/profile', {
          preferredLanguage: selectedLang,
        });
      }
      
      // Always update local state
      await updateUser({ preferredLanguage: selectedLang });
      
      if (user?.role === 'AGENT') {
        navigation.navigate('OnboardingFleet');
      } else {
        // Mark as onboarded for customers
        await api.post('/api/user/profile', { onboarded: true });
        await updateUser({ onboarded: true });
        // Main stack will pick up the onboarded: true and move to Main tabs
      }
    } catch (error: any) {
      console.log('Language save error:', error);
      // Fallback: still update local and proceed
      await updateUser({ preferredLanguage: selectedLang });
      if (user?.role === 'AGENT') {
        navigation.navigate('OnboardingFleet');
      } else {
        await updateUser({ onboarded: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
          <View style={styles.stepIndicator}>
            <View style={styles.stepDotActive} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            {user?.role === 'AGENT' && <View style={styles.stepDot} />}
          </View>
          <Text style={styles.title}>{t('onboarding_language_title' as any)}</Text>
          <Text style={styles.subtitle}>{t('onboarding_language_sub' as any)}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.list}>
          {LANGUAGES.map((lang, index) => (
            <TouchableOpacity 
              key={lang.code}
              style={[
                styles.langCard,
                selectedLang === lang.code && styles.langCardActive
              ]}
              onPress={() => setSelectedLang(lang.code as LanguageCode)}
              activeOpacity={0.7}
            >
              <View style={styles.langInfo}>
                <Text style={[
                   styles.langLabel,
                   selectedLang === lang.code && styles.langLabelActive
                ]}>{lang.label}</Text>
                <Text style={styles.langSub}>{lang.sub}</Text>
              </View>
              {selectedLang === lang.code && (
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark-circle" size={28} color={LoopyColors.green} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>{t('continue' as any)}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    paddingBottom: 120, // Space for fixed footer
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
    height: 4,
    borderRadius: 2,
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
  list: {
    gap: 16,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 20,
  },
  langCardActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 2,
  },
  langInfo: {
    gap: 4,
  },
  langLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: LoopyColors.charcoal,
  },
  langLabelActive: {
    color: '#166534',
  },
  langSub: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  checkIcon: {
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  button: {
    backgroundColor: LoopyColors.green,
    flexDirection: 'row',
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
});
