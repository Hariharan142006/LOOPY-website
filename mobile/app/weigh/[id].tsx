import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    TextInput, 
    Alert, 
    Image, 
    ActivityIndicator, 
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { LoopyColors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { 
    FadeIn, 
    FadeInDown, 
    FadeInRight, 
    SlideInUp, 
    Layout, 
    LinearTransition 
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CATEGORY_ICONS: any = {
    'Paper': 'newspaper',
    'Plastic': 'cube',
    'Metal': 'construct',
    'E-Waste': 'hardware-chip',
    'Glass': 'beaker',
    'Iron': 'hammer',
    'Carton': 'archive',
    'Copper': 'magnet'
};

export default function WeighingScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [booking, setBooking] = useState<any>(null);
    const [scrapItems, setScrapItems] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<any[]>([]); 
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        const load = async () => {
             const bookingId = Array.isArray(id) ? id[0] : id;
             try {
                const [bRes, catsRes] = await Promise.all([
                    api.get(`/api/bookings/${bookingId}`),
                    api.get('/api/categories')
                ]);
                setBooking(bRes.data);
                const allItems = (catsRes.data.categories || []).flatMap((c: any) => c.items || []);
                setScrapItems(allItems);
             } catch (e: any) {
                Alert.alert('Load Failure', 'Could not fetch data for this pickup.');
             } finally {
                setLoading(false);
             }
        };
        load();
    }, [id]);

    const handleAddItem = () => {
        if (scrapItems.length > 0) {
            setSelectedItems([...selectedItems, { 
                tempId: Date.now(),
                itemId: scrapItems[0].id, 
                weight: '', 
                price: scrapItems[0].currentPrice,
                name: scrapItems[0].name
            }]);
        }
    };

    const removeItem = (index: number) => {
        const newItems = [...selectedItems];
        newItems.splice(index, 1);
        setSelectedItems(newItems);
    };

    const updateItem = (index: number, key: string, value: any) => {
        const newItems = [...selectedItems];
        if (key === 'itemId') {
            const item = scrapItems.find(i => i.id === value);
            newItems[index] = { ...newItems[index], itemId: value, price: item.currentPrice, name: item.name };
        } else {
            newItems[index][key] = value;
        }
        setSelectedItems(newItems);
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need camera access to take proof of weights.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.6,
        });
        if (!result.canceled) {
            setPhotos([...photos, result.assets[0].uri]);
        }
    };

    const removePhoto = (idx: number) => {
        const p = [...photos];
        p.splice(idx, 1);
        setPhotos(p);
    };

    const totalToPay = selectedItems.reduce((acc, curr) => acc + (parseFloat(curr.weight || 0) * curr.price), 0);

    const handleBarCodeScanned = ({ data }: any) => {
        setShowScanner(false);
        processPayment(data);
    };

    const processPayment = async (customerWalletId: string) => {
        if (selectedItems.length === 0) {
            Alert.alert('No Items', 'Please add items first.');
            return;
        }
        try {
            setLoading(true);
            await api.post(`/api/bookings/${id}/pay`, {
                items: selectedItems,
                photos,
                totalAmount: totalToPay,
                customerWalletId
            });
            setPaymentSuccess(true);
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 3500);
        } catch (e: any) {
            Alert.alert('Payment Failed', e.response?.data?.error || 'System error');
        } finally {
            setLoading(false);
        }
    };

    const openScanner = async () => {
        if (!permission?.granted) {
            const res = await requestPermission();
            if (!res.granted) return;
        }
        setShowScanner(true);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={LoopyColors.green} /></View>;

    if (paymentSuccess) {
        return (
            <View style={styles.successContainer}>
                <Animated.View entering={FadeIn} style={styles.successCircle}>
                    <Ionicons name="checkmark" size={60} color="#fff" />
                </Animated.View>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successSub}>
                    Payout of <Text style={{fontWeight: '900', color: '#111827'}}>₹{totalToPay.toFixed(2)}</Text> completed.
                </Text>
            </View>
        );
    }

    if (showScanner) {
        return (
            <View style={styles.scannerContainer}>
                <CameraView
                  onBarcodeScanned={handleBarCodeScanned}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.scannerOverlay}>
                    <View style={styles.scannerHole} />
                    <Text style={styles.scannerText}>Scan Customer Wallet QR</Text>
                </View>
                <TouchableOpacity style={styles.closeScanner} onPress={() => setShowScanner(false)}>
                    <Ionicons name="close-circle" size={48} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={{ flex: 1 }}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 160 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Order Pipeline</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.topCard}>
                        <View style={styles.topCardHeader}>
                            <View>
                                <Text style={styles.briefLabel}>PICKUP AGENT VIEW</Text>
                                <Text style={styles.briefName}>{booking?.user?.name}</Text>
                            </View>
                            <View style={styles.userAvatar}>
                                <Text style={styles.avatarText}>{booking?.user?.name?.[0]}</Text>
                            </View>
                        </View>
                        <View style={styles.addressBox}>
                            <Ionicons name="location" size={14} color={LoopyColors.green} />
                            <Text style={styles.briefAddress} numberOfLines={1}>{booking?.address?.street}</Text>
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Calculated Weights</Text>
                        <TouchableOpacity style={styles.addBtnPill} onPress={handleAddItem}>
                            <Ionicons name="add" size={18} color="#fff" />
                            <Text style={styles.addBtnPillText}>New Item</Text>
                        </TouchableOpacity>
                    </View>

                    {selectedItems.length === 0 ? (
                        <View style={styles.emptyItemsBox}>
                            <Ionicons name="scale-outline" size={48} color="#e5e7eb" />
                            <Text style={styles.emptyText}>Add scrap items to start weighing</Text>
                        </View>
                    ) : (
                        selectedItems.map((item, index) => (
                            <Animated.View 
                                layout={LinearTransition}
                                entering={FadeInDown.delay(index * 50)} 
                                key={item.tempId || index} 
                                style={styles.itemCard}
                            >
                                <View style={styles.itemCardHeader}>
                                    <ScrollView 
                                        horizontal 
                                        showsHorizontalScrollIndicator={false} 
                                        style={styles.catScroll}
                                        nestedScrollEnabled={true}
                                    >
                                        {scrapItems.map(si => (
                                            <TouchableOpacity 
                                                key={si.id} 
                                                onPress={() => updateItem(index, 'itemId', si.id)}
                                                style={[styles.miniCatChip, item.itemId === si.id && styles.miniCatChipActive]}
                                            >
                                                <Ionicons 
                                                    name={CATEGORY_ICONS[si.name] || 'cube'} 
                                                    size={12} 
                                                    color={item.itemId === si.id ? '#fff' : '#6b7280'} 
                                                />
                                                <Text style={[styles.miniCatText, item.itemId === si.id && styles.miniCatTextActive]}>{si.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.itemCardBody}>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>WEIGHT (KG)</Text>
                                        <TextInput
                                            style={styles.weightInput}
                                            placeholder="0.00"
                                            keyboardType="decimal-pad"
                                            value={item.weight}
                                            onChangeText={(v) => updateItem(index, 'weight', v)}
                                            placeholderTextColor="#9ca3af"
                                        />
                                    </View>
                                    <View style={styles.subtotalBox}>
                                        <Text style={styles.subtotalLabel}>{item.price.toFixed(2)}/kg</Text>
                                        <Text style={styles.subtotalVal}>₹{(parseFloat(item.weight || 0) * item.price).toFixed(2)}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        ))
                    )}

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Verification Proofs</Text>
                        <Text style={styles.photoCount}>{photos.length}/5</Text>
                    </View>

                    <View style={styles.photoGrid}>
                        {photos.map((p, i) => (
                            <Animated.View entering={FadeInRight} key={i} style={styles.photoWrapper}>
                                <Image source={{ uri: p }} style={styles.gridImage} />
                                <TouchableOpacity style={styles.delPhoto} onPress={() => removePhoto(i)}>
                                    <Ionicons name="close" size={16} color="#fff" />
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                        {photos.length < 5 && (
                            <TouchableOpacity style={styles.photoTrigger} onPress={takePhoto}>
                                <Ionicons name="camera" size={32} color="#9ca3af" />
                                <Text style={styles.triggerText}>Add Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Animated.View entering={FadeInDown.delay(300)} style={styles.payoutBar}>
                <View style={styles.priceRow}>
                    <Text style={styles.totalLabel}>TOTAL PAYOUT</Text>
                    <Text style={styles.totalValue}>₹{totalToPay.toFixed(2)}</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.payoutBtn, totalToPay <= 0 && styles.payoutBtnDisabled]} 
                    onPress={() => totalToPay > 0 && openScanner()}
                    disabled={totalToPay <= 0 || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="qr-code" size={20} color="#fff" />
                            <Text style={styles.payoutBtnText}>Scan Customer Wallet</Text>
                        </>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 60 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
    headerTitle: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827' },
    
    topCard: { backgroundColor: '#fff', margin: 20, borderRadius: 24, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    topCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    briefLabel: { fontSize: 11, fontFamily: Fonts.bold, color: LoopyColors.green, letterSpacing: 1 },
    briefName: { fontSize: 24, fontFamily: Fonts.bold, color: '#111827', marginTop: 4 },
    userAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 20, fontFamily: Fonts.bold, color: '#64748b' },
    addressBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 },
    briefAddress: { fontSize: 13, color: '#64748b', flex: 1 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontFamily: Fonts.bold, color: '#111827' },
    addBtnPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, gap: 6 },
    addBtnPillText: { color: '#fff', fontSize: 13, fontFamily: Fonts.bold },

    emptyItemsBox: { alignItems: 'center', padding: 40, backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0' },
    emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 14, textAlign: 'center' },

    itemCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 16, borderRadius: 20, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
    itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', pb: 12 },
    catScroll: { flex: 1, marginRight: 12 },
    miniCatChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, backgroundColor: '#f8fafc', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    miniCatChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
    miniCatText: { fontSize: 11, fontWeight: '700', color: '#64748b', marginLeft: 4 },
    miniCatTextActive: { color: '#fff' },
    removeBtn: { padding: 4 },

    itemCardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    inputContainer: { flex: 1 },
    inputLabel: { fontSize: 9, fontFamily: Fonts.bold, color: '#94a3b8', letterSpacing: 0.5, marginBottom: 4 },
    weightInput: { fontSize: 32, fontFamily: Fonts.bold, color: '#111827', padding: 0 },
    subtotalBox: { alignItems: 'flex-end', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    subtotalLabel: { fontSize: 10, fontFamily: Fonts.bold, color: '#10b981' },
    subtotalVal: { fontSize: 18, fontFamily: Fonts.bold, color: '#111827' },

    photoCount: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
    photoWrapper: { width: (width - 56) / 3, height: (width - 56) / 3, borderRadius: 16, overflow: 'hidden' },
    gridImage: { width: '100%', height: '100%' },
    delPhoto: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    photoTrigger: { width: (width - 56) / 3, height: (width - 56) / 3, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    triggerText: { fontSize: 10, fontFamily: Fonts.bold, color: '#94a3b8', marginTop: 4 },

    payoutBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -5 } },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    totalLabel: { fontSize: 13, fontFamily: Fonts.bold, color: '#64748b', letterSpacing: 0.5 },
    totalValue: { fontSize: 32, fontFamily: Fonts.bold, color: '#111827' },
    payoutBtn: { flexDirection: 'row', backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 10 },
    payoutBtnText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
    payoutBtnDisabled: { backgroundColor: '#e2e8f0' },

    scannerContainer: { flex: 1, backgroundColor: '#000' },
    scannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    scannerHole: { width: 250, height: 250, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'transparent' },
    scannerText: { color: '#fff', marginTop: 32, fontSize: 16, fontFamily: Fonts.bold },
    closeScanner: { position: 'absolute', bottom: 60, left: (width - 48) / 2 },

    successContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 40 },
    successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 32, elevation: 12, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 20 },
    successTitle: { fontSize: 28, fontFamily: Fonts.bold, color: '#111827', marginBottom: 12 },
    successSub: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24 },
});
