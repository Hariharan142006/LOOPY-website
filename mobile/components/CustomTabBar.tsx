import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LoopyColors } from '../constants/colors';
import { Fonts } from '../constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';

  return (
    <View style={[styles.container, { bottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
      <View style={styles.content}>
        {state.routes.reduce((acc: any[], route, index) => {
          const options = descriptors[route.key].options as any;
          let label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

          // Skip hidden tabs based on name and role
          if (route.name === 'explore') return acc;
          if (route.name === 'pickups' && !isAgent) return acc;
          if (route.name === 'bookings' && isAgent) return acc;
          
          // Legacy check for expo-router hidden tabs
          if (options.href === null || options.tabBarButton === null || options.display === 'none') {
            return acc;
          }

          // Override wallet label to Withdraw as per user request
          if (route.name === 'wallet') {
            label = 'Withdraw';
          }

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const getIcon = (name: string, focused: boolean) => {
            let iconName: any = 'home';
            switch (name) {
              case 'index': iconName = focused ? 'home' : 'home-outline'; break;
              case 'pickups': iconName = focused ? 'bicycle' : 'bicycle-outline'; break;
              case 'bookings': iconName = focused ? 'calendar' : 'calendar-outline'; break;
              case 'wallet': iconName = focused ? 'wallet' : 'wallet-outline'; break;
              case 'profile': iconName = focused ? 'person' : 'person-outline'; break;
            }
            return <Ionicons name={iconName} size={22} color={focused ? LoopyColors.success : LoopyColors.grey} />;
          };

          acc.push(
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[
                styles.tabItem,
                isFocused && styles.activeTabItem
              ]}
            >
              {getIcon(route.name, isFocused)}
              <Text style={[
                styles.label,
                { color: isFocused ? LoopyColors.success : LoopyColors.grey }
              ]}>
                {label.toString().toUpperCase()}
              </Text>
            </TouchableOpacity>
          );

          // Insert middle "+" button for customers
          if (!isAgent && acc.length === 2) {
            acc.push(
              <View key="middle-btn" style={styles.middleButtonWrapper}>
                <TouchableOpacity 
                  style={styles.middleButton}
                  onPress={() => navigation.navigate('Book')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={32} color="#ffffff" />
                </TouchableOpacity>
              </View>
            );
          }

          return acc;
        }, [])}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 30,
    marginHorizontal: 2,
  },
  activeTabItem: {
    // transparent active bg as seen in mockup
  },
  label: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'capitalize',
  },
  middleButtonWrapper: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10b981', // LoopyColors.success
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30, // Float above the bar
    borderWidth: 4,
    borderColor: '#fcfcfc', // Background color match
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
