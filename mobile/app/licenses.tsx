import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../constants/typography';

const OPEN_SOURCE_LIBS = [
  { name: 'React Native', version: '0.74', license: 'MIT' },
  { name: 'Expo', version: '51.0', license: 'MIT' },
  { name: 'React Navigation', version: '6.x', license: 'MIT' },
  { name: 'React Native Reanimated', version: '3.10', license: 'MIT' },
  { name: 'Axios', version: '1.6', license: 'MIT' },
  { name: 'React Native Maps', version: '1.14', license: 'MIT' },
  { name: 'React Native Vector Icons', version: '10.x', license: 'MIT' },
];

export default function LicensesScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Open Source Licenses</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.paragraph}>
          The Loopy Eco-System application is built using a number of brilliant open source projects. We are grateful to the community for their contributions.
        </Text>
        
        <View style={styles.list}>
          {OPEN_SOURCE_LIBS.map((lib, i) => (
            <View key={i} style={styles.libCard}>
              <View style={styles.libHeader}>
                <Text style={styles.libName}>{lib.name}</Text>
                <Text style={styles.libVersion}>v{lib.version}</Text>
              </View>
              <Text style={styles.libLicense}>{lib.license} License</Text>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          For full license texts and source code, please visit the respective repositories on GitHub or npm.
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
  paragraph: { fontSize: 15, fontFamily: Fonts.medium, color: '#4b5563', lineHeight: 24, marginBottom: 24 },
  list: { gap: 12 },
  libCard: { backgroundColor: '#f9fafb', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  libHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  libName: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827' },
  libVersion: { fontSize: 13, fontFamily: Fonts.medium, color: '#6b7280' },
  libLicense: { fontSize: 13, fontFamily: Fonts.bold, color: '#10b981' },
  disclaimer: { fontSize: 13, fontFamily: Fonts.medium, color: '#9ca3af', textAlign: 'center', marginTop: 32, lineHeight: 20 },
});
