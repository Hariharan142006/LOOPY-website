import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LoopyColors, Colors } from '../constants/colors';
import { Fonts } from '../constants/typography';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      if (token && user) {
        await login(token, user);
      }
    } catch (error: any) {
      console.error("Login Error Full:", error);
      if (error.response) {
        // Server responded with a status code outside the 2xx range
        console.error("Error Response Data:", error.response.data);
        console.error("Error Response Status:", error.response.status);
        const message = error.response.data?.error || `Server Error: ${error.response.status}`;
        Alert.alert('Login Failed', message);
      } else if (error.request) {
        // Request was made but no response was received
        console.error("Error Request:", error.request);
        Alert.alert('Connection Failed', 'Could not reach the server. Please check your internet connection or backend URL.');
      } else {
        // Something happened in setting up the request
        console.error("Error Message:", error.message);
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your green future</Text>

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
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                 <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={LoopyColors.grey} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPass}>
               <Text style={styles.forgotPassText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                   <Text style={styles.buttonText}>Sign In</Text>
                   <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New customer? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Diagnostic Link */}
            <TouchableOpacity 
              style={{ marginTop: 20, alignItems: 'center' }} 
              onPress={async () => {
                try {
                  setLoading(true);
                  const test = await api.get('/api/categories');
                  Alert.alert('System Check', `Connection Successful!\nURL: ${api.defaults.baseURL}\nData: ${test.data?.categories?.length} categories found.`);
                } catch (e: any) {
                  const detail = e.response ? `Status: ${e.response.status}\nData: ${JSON.stringify(e.response.data)}` : `Request Failed: ${e.message}`;
                  Alert.alert('System Check Failed', `URL: ${api.defaults.baseURL}\nError: ${detail}`);
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={{ color: '#9ca3af', fontSize: 12, textDecorationLine: 'underline' }}>Run System Diagnostic</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    // Removed background and border for a cleaner floating logo look
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 90,
    height: 90,
  },
  brandName: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: LoopyColors.charcoal,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    color: LoopyColors.green,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  formSection: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: LoopyColors.charcoal,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: '#6b7280',
    marginBottom: 32,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: LoopyColors.charcoal,
    fontFamily: Fonts.medium,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPassText: {
    color: LoopyColors.green,
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  button: {
    backgroundColor: LoopyColors.green,
    flexDirection: 'row',
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    fontFamily: Fonts.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  footerLink: {
    color: LoopyColors.green,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  agentNote: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  agentNoteText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: Fonts.regular,
  },
});
