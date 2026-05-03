import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LoopyColors, Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { Fonts } from '../constants/typography';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role] = useState('CUSTOMER'); // Always CUSTOMER — agents are created only by admin
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const { login } = useAuth();

  const handleSignup = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert('Error', 'Please fill in all fields including phone number');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // Alert.alert('Debug', 'API Call Starting...');
      const response = await api.post('/api/auth/signup', {
        name,
        email,
        password,
        phone,
        role,
      });

      // Alert.alert('Debug', 'Response Status: ' + response.status);

      // The backend should return success: true, but we'll also check for token as a fallback
      if (response.data.success || response.data.token) {
        setLoading(false);
        const { token, user } = response.data;
        
        Alert.alert(
          'Welcome to Loopy!', 
          'Your account has been created successfully. Taking you to the dashboard...',
          [{ text: 'OK' }]
        );

        try {
          await login(token, user);
          
          setTimeout(() => {
            const nextScreen = user?.onboarded ? 'Main' : 'OnboardingLanguage';
            navigation.reset({
              index: 0,
              routes: [{ name: nextScreen }],
            });
          }, 500);
        } catch (authError: any) {
          Alert.alert('Session Error', 'Account created but we couldn\'t log you in. Please sign in manually.');
          navigation.navigate('Login');
        }
        return;
      } else {
        const rawData = JSON.stringify(response.data);
        Alert.alert('Registration Error', `The server sent back an unexpected response.\n\nData: ${rawData.substring(0, 100)}`);
      }
    } catch (error: any) {
      let msg = error.message;
      if (error.response) {
        msg = `Server Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        msg = "No response from server";
      }
      Alert.alert('DEBUG: CATCH ERROR', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200)} style={styles.headerSection}>
           <View style={styles.logoContainer}>
              <Image 
                 source={require('../assets/images/logo.png')} 
                 style={styles.logo} 
                 resizeMode="contain"
              />
           </View>
           <Text style={styles.brandName}>Loopy</Text>
           <Text style={styles.tagline}>Recycle. Reduce. Reuse.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.formSection}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up as a customer to start recycling</Text>

          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={20} color={LoopyColors.grey} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={20} color={LoopyColors.grey} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color={LoopyColors.grey} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputBox}>
            <Ionicons name="call-outline" size={20} color={LoopyColors.grey} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#9ca3af"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={LoopyColors.green} />
            <Text style={styles.infoText}>Agents are onboarded only by the platform admin.</Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                 <Text style={styles.buttonText}>Join Loopy</Text>
                 <Ionicons name="sparkles" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  logo: {
    width: 36,
    height: 36,
  },
  brandName: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: LoopyColors.charcoal,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 10,
    color: LoopyColors.green,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  formSection: {
    width: '100%',
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: LoopyColors.charcoal,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: LoopyColors.charcoal,
    fontFamily: Fonts.medium,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },

  button: {
    backgroundColor: LoopyColors.green,
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: LoopyColors.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  footerLink: {
    color: LoopyColors.green,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
});
