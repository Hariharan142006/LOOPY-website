import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { LoopyColors } from '../constants/colors';
import { Fonts } from '../constants/typography';
import { useTranslation } from '../hooks/useTranslation';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, login, updateUser } = useAuth();
  const { t } = useTranslation();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        
        Alert.alert(t('success'), 'Profile picture updated successfully');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t('error'), 'Could not update profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!name) {
      Alert.alert(t('error'), 'Please enter your full name');
      return;
    }
    if (!phone) {
      Alert.alert(t('error'), 'Please enter your phone number');
      return;
    }
    if (!email) {
      Alert.alert(t('error'), 'Email is missing. Please contact support.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/user/profile', {
        name,
        email,
        phone
      });

      if (response.data.success) {
        await updateUser({ name, phone });
        Alert.alert(t('success'), 'Profile updated successfully!');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert(t('error'), 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('edit_profile')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarSection}>
           <View style={styles.avatar}>
              {uploading ? (
                <ActivityIndicator color={LoopyColors.green} />
              ) : (
                user?.image ? (
                  <Image source={{ uri: user.image }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                )
              )}
           </View>
           <TouchableOpacity style={styles.changeBtn} onPress={handlePickImage} disabled={uploading}>
              <Text style={styles.changeText}>{uploading ? 'Uploading...' : 'Change Photo'}</Text>
           </TouchableOpacity>
        </View>

        <View style={styles.form}>
           <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('full_name')}</Text>
              <TextInput 
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
              />
           </View>

           <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('email_address')}</Text>
              <TextInput 
                style={[styles.input, styles.inputDisabled]}
                value={email}
                editable={false}
                placeholder="email@example.com"
              />
              <Text style={styles.hint}>{t('email_hint')}</Text>
           </View>

           <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('phone_number')}</Text>
              <TextInput 
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="9876543210"
                keyboardType="phone-pad"
              />
           </View>

           <TouchableOpacity 
             style={[styles.submitBtn, loading && styles.btnDisabled]} 
             onPress={handleUpdate}
             disabled={loading}
           >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('save_changes')}</Text>}
           </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#111827',
  },
  scroll: {
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ecfdf5',
  },
  avatarText: {
    fontSize: 40,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  changeBtn: {
    marginTop: 12,
  },
  changeText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#10b981',
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#374151',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: '#111827',
    fontFamily: Fonts.medium,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#9ca3af',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
