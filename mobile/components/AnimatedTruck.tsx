import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Dimensions } from 'react-native';

interface AnimatedTruckProps {
  onPress: () => void;
}

const AnimatedTruck: React.FC<AnimatedTruckProps> = ({ onPress }) => {
  // Animation Controllers
  const idleAnim = useRef(new Animated.Value(0)).current;
  const driveOffAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Idle Animation (Bouncing, Wheels, Road)
    Animated.loop(
      Animated.timing(idleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [idleAnim]);

  // 2. Drive-Off Animation Trigger
  const triggerDriveOff = () => {
    Animated.timing(driveOffAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.in(Easing.back(1.5)),
      useNativeDriver: true,
    }).start(() => {
      // Trigger navigation via prop
      onPress();
      // Reset it after it drives off.
      driveOffAnim.setValue(0);
    });
  };

  // Interpolations
  const roadTranslateX = idleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -40] // Shifts the dashes left seamlessly
  });

  const truckBounceY = idleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -2, 0] // Slight up and down movement
  });

  const truckDriveX = driveOffAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Dimensions.get('window').width] // Drive off screen
  });

  const wheelRotate = idleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '120deg'] // 120deg for a seamless loop on a 3-spoke design
  });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={triggerDriveOff} style={styles.cardContainer}>
      {/* 1. Road Background */}
      <View style={styles.roadBackground} />
      
      {/* 2. Moving Road Dashes */}
      <View style={styles.dashesContainer}>
        <Animated.View style={[styles.dashesWrapper, { transform: [{ translateX: roadTranslateX }] }]}>
          {[...Array(30)].map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </Animated.View>
      </View>

      {/* 3. The Truck Component */}
      <Animated.View style={[
        styles.truckWrapper,
        { transform: [{ translateX: truckDriveX }, { translateY: truckBounceY }] }
      ]}>
         {/* Ground Shadow */}
         <View style={styles.truckShadow} />
         
         {/* Rear Base */}
         <View style={styles.rearBase}>
           <View style={[styles.taillight, { left: 4 }]} />
           <View style={[styles.taillight, { right: 4 }]} />
         </View>

         {/* Cargo Box */}
         <View style={styles.cargoBox}>
           <View style={styles.cargoBoxInner}>
             <Text style={styles.cargoText}>BOOK PICKUP{'\n'}NOW</Text>
           </View>
         </View>

         {/* Driver Cabin */}
         <View style={styles.cabin}>
           <View style={styles.window}>
              <View style={styles.windowGlass} />
           </View>
           <View style={styles.doorHandle} />
         </View>

         {/* Wheels */}
         <Wheel rotate={wheelRotate} position={{ left: 30 }} />
         <Wheel rotate={wheelRotate} position={{ left: 85 }} />
         <Wheel rotate={wheelRotate} position={{ right: 30 }} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// Reusable Wheel Sub-Component
const Wheel = ({ rotate, position }: { rotate: any, position: any }) => (
  <Animated.View style={[styles.wheelContainer, position, { transform: [{ rotate }] }]}>
    <View style={styles.wheelOuter}>
      <View style={styles.wheelRim}>
        <View style={styles.rimCenterDark} />
        {/* Draw 3 spokes matching 120-degree symmetry */}
        {[0, 60, 120].map((deg, i) => (
          <View key={i} style={[styles.spoke, { transform: [{ rotate: `${deg}deg` }] }]} />
        ))}
        <View style={styles.hubCenter} />
      </View>
    </View>
  </Animated.View>
);

const styles = StyleSheet.create({
  cardContainer: {
    height: 240,
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    position: 'relative',
  },
  roadBackground: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#2D2B42',
  },
  dashesContainer: {
    position: 'absolute',
    bottom: 33,
    left: 0,
    right: 0,
    height: 4,
    overflow: 'hidden',
  },
  dashesWrapper: {
    flexDirection: 'row',
    width: 2000, 
  },
  dash: {
    marginHorizontal: 10,
    width: 20,
    height: 4,
    backgroundColor: 'yellow',
  },
  truckWrapper: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    width: 300,
    height: 180,
  },
  truckShadow: {
    position: 'absolute',
    bottom: 5,
    left: 20,
    right: 20,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 100,
  },
  rearBase: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    width: 200,
    height: 40,
    backgroundColor: '#2D2B42',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  taillight: {
    position: 'absolute',
    top: 8,
    width: 6,
    height: 24,
    backgroundColor: 'red',
    borderRadius: 2,
  },
  cargoBox: {
    position: 'absolute',
    bottom: 60,
    left: 5,
    width: 190,
    height: 120,
    backgroundColor: 'white',
    borderRadius: 12,
    borderColor: '#E0E0E0',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cargoBoxInner: {
    margin: 10,
    flex: 1,
    backgroundColor: '#5E548E', 
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cargoText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Poppins-Bold',
  },
  cabin: {
    position: 'absolute',
    bottom: 25,
    right: 0,
    width: 100,
    height: 130,
    backgroundColor: '#433D60',
    borderTopRightRadius: 50,
    borderBottomRightRadius: 8,
    borderColor: '#2D2B42',
    borderWidth: 2,
  },
  window: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 20,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 16,
    borderColor: '#455A64',
    borderWidth: 2,
    overflow: 'hidden',
  },
  windowGlass: {
    flex: 1,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  doorHandle: {
    position: 'absolute',
    bottom: 40,
    right: 10,
    width: 20,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
  },
  wheelContainer: {
    position: 'absolute',
    bottom: 0,
    width: 48,
    height: 48,
  },
  wheelOuter: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  wheelRim: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    borderColor: '#9E9E9E',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rimCenterDark: {
    position: 'absolute',
    width: 32,
    height: 32,
    backgroundColor: '#424242',
    borderRadius: 16,
  },
  spoke: {
    position: 'absolute',
    width: 34,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  hubCenter: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#BDBDBD',
    borderRadius: 5,
    borderColor: '#757575',
    borderWidth: 1,
  },
});

export default AnimatedTruck;
