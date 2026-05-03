import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInScale, FadeInDown } from 'react-native-reanimated';
import { LoopyColors } from '../constants/colors';
import { Fonts } from '../constants/typography';

const { width } = Dimensions.get('window');

interface SuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  details: {
    id: string;
    date: string;
    time: string;
    address: string;
  };
}

export default function SuccessModal({ isVisible, onClose, details }: SuccessModalProps) {
  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View entering={FadeInScale} style={styles.content}>
          <View style={styles.checkCircle}>
             <Ionicons name="checkmark-circle" size={80} color="#10b981" />
          </View>
          
          <Text style={styles.title}>Pickup Requested!</Text>
          <Text style={styles.sub}>Our agent will arrive at the scheduled time. Please keep your scrap ready.</Text>
          
          <View style={styles.detailsCard}>
             <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                <Text style={styles.detailText}>{details.date} • {details.time}</Text>
             </View>
             <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={18} color="#6b7280" />
                <Text style={styles.detailText} numberOfLines={1}>{details.address}</Text>
             </View>
             <View style={styles.detailRow}>
                <Ionicons name="barcode-outline" size={18} color="#6b7280" />
                <Text style={styles.detailText}>ID: #{details.id.slice(-6).toUpperCase()}</Text>
             </View>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
             <Text style={styles.closeBtnText}>Great, thanks!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { backgroundColor: '#fff', borderRadius: 32, padding: 32, alignItems: 'center', width: '100%' },
  checkCircle: { marginBottom: 20 },
  title: { fontSize: 24, fontFamily: Fonts.bold, color: '#111827', marginBottom: 12 },
  sub: { fontSize: 14, fontFamily: Fonts.medium, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  detailsCard: { backgroundColor: '#f9fafb', borderRadius: 20, padding: 20, width: '100%', gap: 12, marginBottom: 32 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailText: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#374151' },
  closeBtn: { backgroundColor: '#111827', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 100, width: '100%', alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
});
