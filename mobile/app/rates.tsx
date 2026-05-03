import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, StatusBar, TextInput } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { api } from '../utils/api';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LoopyColors } from '../constants/colors';
import { useTranslation } from '../hooks/useTranslation';
import { Fonts } from '../constants/typography';

const { width } = Dimensions.get('window');

const ITEM_ICONS: any = {
  'Newspaper': 'newspaper-outline',
  'Copper Wire': 'flash-outline',
  'PET Bottles': 'wine-outline',
  'Old Books': 'book-outline',
  'Aluminum Cans': 'square-outline',
  'Laptops': 'laptop-outline',
  'Paper Mix': 'document-text-outline',
  'Heavy Metal': 'construct-outline',
};

const MARKET_HIGHLIGHTS = [
  "Copper values hit all-time high.",
  "Plastic recycling demand up by 15%.",
  "Aluminum prices stable this week.",
  "Paper market seeing steady growth.",
  "E-waste collection drive tomorrow!"
];

export default function RatesScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<any>([]);
  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(() => {
      setHighlightIdx((prev) => (prev + 1) % MARKET_HIGHLIGHTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/categories');
      const cats = response.data.categories || [];
      // Add "All" category if not present
      const allCat = { id: 'all', name: 'All', items: cats.flatMap((c: any) => c.items) };
      setCategories([allCat, ...cats]);
      setActiveCategory(allCat);
    } catch (error) {
      console.error("Rates fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = activeCategory?.items?.filter((item: any) => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading && categories.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={LoopyColors.green} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Dynamic Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="menu-outline" size={26} color={LoopyColors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Market Prime</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="cart-outline" size={26} color={LoopyColors.charcoal} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={LoopyColors.grey} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search scrap materials..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={LoopyColors.grey}
          />
          <TouchableOpacity style={styles.micBtn}>
             <Ionicons name="mic-outline" size={20} color={LoopyColors.grey} />
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {categories.map((cat: any) => (
              <TouchableOpacity 
                key={cat.id} 
                style={[
                  styles.tab, 
                  activeCategory?.id === cat.id && styles.tabActive
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.tabText, activeCategory?.id === cat.id && styles.tabTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Today's Highlight */}
        <Animated.View entering={FadeInUp} style={styles.highlightBox}>
           <View style={styles.highlightContent}>
              <Text style={styles.highlightTag}>TODAY'S HIGHLIGHT</Text>
              <Animated.Text key={highlightIdx} entering={FadeInRight} style={styles.highlightTitle}>
                {MARKET_HIGHLIGHTS[highlightIdx]}
              </Animated.Text>
              <TouchableOpacity style={styles.viewTrendsBtn}>
                 <Text style={styles.viewTrendsText}>VIEW TRADE TRENDS</Text>
              </TouchableOpacity>
           </View>
           <Ionicons name="stats-chart" size={100} color="rgba(255,255,255,0.1)" style={styles.highlightIcon} />
        </Animated.View>

        {/* Items Grid */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.listContainer}>
          {filteredItems.map((item: any, index: number) => {
            return (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 50)} style={styles.marketListCard}>
                <View style={styles.cardIconBox}>
                   <Ionicons 
                     name={ITEM_ICONS[item.name] || 'cube'} 
                     size={36} 
                     color="#4b5563" 
                   />
                </View>
                <View style={styles.cardInfoRow}>
                   <Text style={styles.itemNameList}>{item.name}</Text>
                   <Text style={styles.priceValList}>₹{Number(item.currentPrice).toFixed(0)}/Unit</Text>
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingTop: 60, 
    paddingHorizontal: 24, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontFamily: Fonts.bold, color: '#166534', letterSpacing: -0.5 },
  
  scroll: { paddingBottom: 100 },
  
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f1f5f9', 
    marginHorizontal: 24, 
    paddingHorizontal: 16, 
    borderRadius: 16, 
    height: 56, 
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  searchInput: { flex: 1, fontSize: 16, color: '#1e293b', fontFamily: Fonts.medium, marginLeft: 10 },
  micBtn: { padding: 4 },

  tabContainer: { paddingVertical: 16 },
  tabs: { paddingHorizontal: 24, gap: 8 },
  tab: { 
    paddingHorizontal: 24, 
    paddingVertical: 10, 
    borderRadius: 12, 
    backgroundColor: '#e2e8f0',
  },
  tabActive: { backgroundColor: '#166534' },
  tabText: { fontSize: 14, fontFamily: Fonts.bold, color: '#64748b' },
  tabTextActive: { color: '#fff' },

  highlightBox: { 
    marginHorizontal: 24, 
    backgroundColor: '#166534', 
    borderRadius: 24, 
    padding: 24, 
    position: 'relative', 
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  highlightContent: { zIndex: 1 },
  highlightTag: { color: '#bbf7d0', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 8 },
  highlightTitle: { color: '#fff', fontSize: 26, fontFamily: Fonts.bold, marginBottom: 20, lineHeight: 32 },
  viewTrendsBtn: { 
    backgroundColor: '#fff', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    alignSelf: 'flex-start' 
  },
  viewTrendsText: { color: '#166534', fontSize: 12, fontFamily: Fonts.bold },
  highlightIcon: { position: 'absolute', right: -10, bottom: -20 },

  listContainer: { paddingHorizontal: 24, gap: 16 },
  marketListCard: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardIconBox: { 
    width: 64,
    height: 64,
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfoRow: { flex: 1, justifyContent: 'center' },
  itemNameList: { fontSize: 16, fontFamily: Fonts.bold, color: '#334155', marginBottom: 6 },
  priceValList: { fontSize: 18, fontFamily: Fonts.bold, color: '#16a34a' },
});
