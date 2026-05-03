import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../constants/typography';

export default function TermsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Loopy Terms of Service</Text>
        <Text style={styles.date}>Last updated: March 2024</Text>
        
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing and using the Loopy application, you accept and agree to be bound by the terms and provision of this agreement.
        </Text>

        <Text style={styles.sectionTitle}>2. Service Description</Text>
        <Text style={styles.paragraph}>
          Loopy provides a platform to schedule, track, and manage recyclable scrap pickups. We reserve the right to modify or discontinue the service with or without notice.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          To use certain features, you must register for an account. You agree to provide accurate information and keep your account secure.
        </Text>

        <Text style={styles.sectionTitle}>4. Pricing and Payments</Text>
        <Text style={styles.paragraph}>
          Scrap prices are based on daily market rates and are subject to change without prior notice. Final valuation is determined by the agent at the time of pickup using calibrated weighing equipment.
        </Text>

        <Text style={styles.sectionTitle}>5. Prohibited Items</Text>
        <Text style={styles.paragraph}>
          Users must not submit hazardous, explosive, or biologically contaminated materials for pickup. Agents reserve the right to reject any items deemed unsafe.
        </Text>
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
  title: { fontSize: 24, fontFamily: Fonts.bold, color: '#111827', marginBottom: 8 },
  date: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280', marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827', marginTop: 24, marginBottom: 12 },
  paragraph: { fontSize: 15, fontFamily: Fonts.medium, color: '#4b5563', lineHeight: 24 },
});
