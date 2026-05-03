import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../constants/typography';
import { api } from '../utils/api';

const WITHDRAW_METHODS = [
  { id: 'bank', name: 'Bank Transfer', icon: 'business-outline', sub: '2-3 business days' },
  { id: 'upi', name: 'UPI', icon: 'phone-portrait-outline', sub: 'Instant transfer' },
  { id: 'wallet', name: 'App Wallet', icon: 'wallet-outline', sub: 'Instant internal transfer' }
];

export default function WithdrawScreen() {
  const navigation = useNavigation<any>();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await api.get('/api/user/wallet');
      setBalance(res.data?.balance || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = () => {
    if (!selectedMethod) {
      Alert.alert('Selection Required', 'Please select a preferred withdrawal method.');
      return;
    }
    
    if (balance <= 0) {
      Alert.alert('Insufficient Funds', 'You do not have enough funds to withdraw.');
      return;
    }

    Alert.alert('Withdrawal Initiated', `Your request to withdraw via ${WITHDRAW_METHODS.find(m => m.id === selectedMethod)?.name} has been received.`, [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Funds</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          {loading ? (
            <ActivityIndicator color="#111827" style={{ marginTop: 12 }} />
          ) : (
            <Text style={styles.balanceVal}>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Select Preferred Method</Text>

        <View style={styles.methodList}>
          {WITHDRAW_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <TouchableOpacity 
                key={method.id} 
                style={[styles.methodItem, isSelected && styles.methodItemActive]}
                onPress={() => setSelectedMethod(method.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.methodIcon, isSelected ? { backgroundColor: '#111827' } : { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name={method.icon as any} size={24} color={isSelected ? '#fff' : '#6b7280'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodName, isSelected && { color: '#111827' }]}>{method.name}</Text>
                  <Text style={styles.methodSub}>{method.sub}</Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, (!selectedMethod || balance <= 0) && styles.primaryButtonDisabled]} 
          onPress={handleWithdraw}
          disabled={!selectedMethod || balance <= 0}
        >
          <Text style={styles.primaryButtonText}>Confirm Withdrawal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },
  content: { padding: 24 },
  
  balanceCard: { backgroundColor: '#f9fafb', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 32 },
  balanceLabel: { fontSize: 12, fontFamily: Fonts.bold, color: '#6b7280', letterSpacing: 1.5, marginBottom: 8 },
  balanceVal: { fontSize: 40, fontFamily: Fonts.bold, color: '#111827', letterSpacing: -1 },
  
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827', marginBottom: 16 },
  
  methodList: { gap: 12, marginBottom: 40 },
  methodItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1.5, borderColor: '#f3f4f6' },
  methodItemActive: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  methodIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  methodName: { fontSize: 16, fontFamily: Fonts.bold, color: '#374151', marginBottom: 2 },
  methodSub: { fontSize: 13, fontFamily: Fonts.medium, color: '#9ca3af' },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: '#10b981' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981' },

  primaryButton: { backgroundColor: '#111827', padding: 18, borderRadius: 100, alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: '#d1d5db' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
});
