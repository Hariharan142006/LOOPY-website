import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { api } from '../../utils/api';
import { LoopyColors, Colors } from '../../constants/colors';
import RNPrint from 'react-native-print';
import RNShare from 'react-native-share';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function InvoiceScreen() {
    const route = useRoute<any>(); const id = route.params?.id;
    const navigation = useNavigation<any>();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const res = await api.get(`/api/bookings/${id}`);
                setBooking(res.data);
            } catch (e) {
                Alert.alert('Error', 'Failed to load invoice details');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [id]);

    const generatePDF = async () => {
        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Poppins', sans-serif; padding: 40px; color: #111827; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo { font-size: 28px; font-weight: 900; color: #10b981; }
                        .invoice-title { font-size: 20px; font-weight: bold; color: #6b7280; }
                        .details { margin-bottom: 40px; display: flex; justify-content: space-between; }
                        .section-title { font-size: 12px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; }
                        table { width: 100%; border-collapse: collapse; }
                        th { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 12px 0; color: #6b7280; font-size: 14px; }
                        td { padding: 16px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; }
                        .total-row { margin-top: 30px; text-align: right; }
                        .total-label { font-size: 16px; color: #6b7280; }
                        .total-amount { font-size: 28px; font-weight: 900; color: #111827; margin-top: 5px; }
                        .footer { margin-top: 100px; text-align: center; color: #9ca3af; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">
                            <img src="https://loopy-backend-murex.vercel.app/logo.png" style="height: 60px;" />
                        </div>
                        <div class="invoice-title">DIGITAL INVOICE</div>
                    </div>
                    
                    <div class="details">
                        <div>
                            <div class="section-title">Customer</div>
                            <div style="font-weight: bold; font-size: 18px;">${booking.user?.name}</div>
                            <div>Pickup ID: #${booking.id.slice(-6).toUpperCase()}</div>
                            <div>Date: ${new Date(booking.updatedAt).toLocaleDateString()}</div>
                        </div>
                        <div style="text-align: right;">
                            <div class="section-title">Service Provider</div>
                            <div style="font-weight: bold;">Loopy Logistics</div>
                            <div>Agent: ${booking.agent?.name || 'Pro Assistant'}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>SCRAP ITEM</th>
                                <th style="text-align: center;">WEIGHT</th>
                                <th style="text-align: center;">RATE</th>
                                <th style="text-align: right;">SUBTOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${booking.items.map((item: any) => `
                                <tr>
                                    <td style="font-weight: bold;">${item.item.name}</td>
                                    <td style="text-align: center;">${item.quantity} kg</td>
                                    <td style="text-align: center;">₹${item.priceAtBooking.toFixed(2)}</td>
                                    <td style="text-align: right; font-weight: bold;">₹${(item.quantity * item.priceAtBooking).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="total-row">
                        <div class="total-label">Total Payout Received</div>
                        <div class="total-amount">₹${(booking.totalAmount || 0).toFixed(2)}</div>
                    </div>

                    <div class="footer">
                        Thank you for recycling with Loopy! Every KG matters for the planet. 🌍
                    </div>
                </body>
            </html>
        `;

        try {
            await RNPrint.print({ html });
        } catch (error) {
            Alert.alert('Error', 'Could not generate PDF');
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={LoopyColors.green} /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color={LoopyColors.charcoal} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Digital Invoice</Text>
                <TouchableOpacity onPress={generatePDF} style={styles.downloadHeaderBtn}>
                    <Ionicons name="download-outline" size={24} color={LoopyColors.green} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
                <Animated.View entering={FadeInUp} style={styles.invoiceCard}>
                    <View style={styles.brandRow}>
                        <View>
                            <Image 
                                source={require('../../assets/images/logo.png')} 
                                style={styles.brandLogo} 
                                resizeMode="contain"
                            />
                            <Text style={styles.invoiceId}>#{booking.id.slice(-8).toUpperCase()}</Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#059669" />
                            <Text style={styles.verifiedText}>PAID</Text>
                        </View>

                    </View>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>DATE</Text>
                            <Text style={styles.infoVal}>{new Date(booking.updatedAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={[styles.infoCol, { alignItems: 'flex-end' }]}>
                            <Text style={styles.infoLabel}>AGENT</Text>
                            <Text style={styles.infoVal}>{booking.agent?.name || 'Loopy Assistant'}</Text>
                        </View>
                    </View>

                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeadText, { flex: 2 }]}>ITEM</Text>
                        <Text style={[styles.tableHeadText, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                        <Text style={[styles.tableHeadText, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
                    </View>

                    {booking.items.map((item: any, idx: number) => (
                        <View key={idx} style={styles.tableRow}>
                            <View style={{ flex: 2 }}>
                                <Text style={styles.itemName}>{item.item.name}</Text>
                                <Text style={styles.itemRate}>₹{item.priceAtBooking.toFixed(2)}/kg</Text>
                            </View>
                            <Text style={[styles.itemQty, { flex: 1, textAlign: 'center' }]}>{item.quantity}kg</Text>
                            <Text style={[styles.itemTotal, { flex: 1, textAlign: 'right' }]}>₹{(item.quantity * item.priceAtBooking).toFixed(2)}</Text>
                        </View>
                    ))}

                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>TOTAL PAYOUT</Text>
                        <Text style={styles.totalAmount}>₹{(booking.totalAmount || 0).toFixed(2)}</Text>
                    </View>

                    <View style={styles.greenFootnote}>
                       <Ionicons name="leaf" size={14} color="#059669" />
                       <Text style={styles.greenFootnoteText}>You saved approx. 12.5kg of CO2 today!</Text>
                    </View>
                </Animated.View>

                <TouchableOpacity style={styles.downloadBtn} onPress={generatePDF}>
                    <Ionicons name="cloud-download-outline" size={24} color="#fff" />
                    <Text style={styles.downloadBtnText}>Download Receipt PDF</Text>
                </TouchableOpacity>

                <Text style={styles.helpText}>Need help with this transaction? Contact Support</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, marginBottom: 10 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: LoopyColors.charcoal },
    downloadHeaderBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    invoiceCard: { backgroundColor: '#fff', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
    brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
    brandName: { fontSize: 24, fontWeight: '900', color: LoopyColors.green, letterSpacing: -1 },
    brandLogo: { width: 120, height: 40, marginBottom: 8 },
    invoiceId: { fontSize: 12, fontWeight: '700', color: LoopyColors.grey, marginTop: 2 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#d1fae5' },
    verifiedText: { fontSize: 10, fontWeight: '800', color: '#059669' },
    infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    infoLabel: { fontSize: 10, fontWeight: '800', color: LoopyColors.grey, marginBottom: 4, letterSpacing: 1 },
    infoVal: { fontSize: 14, fontWeight: '700', color: LoopyColors.charcoal },
    infoCol: { flex: 1 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 12, marginBottom: 16 },
    tableHeadText: { fontSize: 11, fontWeight: '800', color: LoopyColors.grey, letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    itemName: { fontSize: 15, fontWeight: '800', color: LoopyColors.charcoal },
    itemRate: { fontSize: 11, color: LoopyColors.grey, fontWeight: '600' },
    itemQty: { fontSize: 14, fontWeight: '700', color: LoopyColors.charcoal },
    itemTotal: { fontSize: 15, fontWeight: '900', color: LoopyColors.charcoal },
    totalSection: { marginTop: 10, borderTopWidth: 2, borderTopColor: LoopyColors.charcoal, paddingTop: 20, alignItems: 'flex-end' },
    totalLabel: { fontSize: 12, fontWeight: '800', color: LoopyColors.grey },
    totalAmount: { fontSize: 32, fontWeight: '900', color: LoopyColors.charcoal, marginTop: 4 },
    greenFootnote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 16 },
    greenFootnoteText: { fontSize: 11, color: '#059669', fontWeight: '700' },
    downloadBtn: { backgroundColor: LoopyColors.charcoal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18, borderRadius: 20, marginTop: 24 },
    downloadBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    helpText: { textAlign: 'center', color: LoopyColors.grey, fontSize: 12, marginTop: 24, fontWeight: '500' }
});
