import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LoopyColors } from '../constants/colors';
import { FontSizes } from '../constants/typography';
import { useIsFocused } from '@react-navigation/native';

interface SwipeButtonProps {
    title: string;
    onSwipeComplete: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    color?: string;
}

const BUTTON_HEIGHT = 56;
const SWIPEABLE_DIMENSIONS = 46;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SwipeButton({
    title,
    onSwipeComplete,
    icon = 'arrow-forward',
    color = LoopyColors.charcoal
}: SwipeButtonProps) {
    // Initialize with a default to avoid 0-width logic issues
    const isFocused = useIsFocused();
    const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 100);
    const X = useSharedValue(0);
    const completed = useSharedValue(false);
    const startX = useSharedValue(0);

    // Hard-reset everything when the screen comes into focus
    React.useEffect(() => {
        if (isFocused) {
            X.value = 0;
            completed.value = false;
        }
    }, [isFocused]);

    const onLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
    };

    // Dynamic swipe range based on container width
    const H_SWIPE_RANGE = containerWidth - SWIPEABLE_DIMENSIONS - 10;

    const panGesture = Gesture.Pan()
        .onStart(() => {
            if (completed.value || H_SWIPE_RANGE === 0) return;
            startX.value = X.value;
        })
        .onUpdate((event) => {
            if (completed.value || H_SWIPE_RANGE === 0) return;
            const newValue = startX.value + event.translationX;
            if (newValue >= 0 && newValue <= H_SWIPE_RANGE) {
                X.value = newValue;
            } else if (newValue > H_SWIPE_RANGE) {
                X.value = H_SWIPE_RANGE;
            } else {
                X.value = 0;
            }
        })
        .onEnd(() => {
            if (completed.value || H_SWIPE_RANGE === 0) return;
            if (X.value < H_SWIPE_RANGE / 1.5) {
                X.value = withSpring(0);
            } else {
                X.value = withSpring(H_SWIPE_RANGE);
                completed.value = true;
                runOnJS(onSwipeComplete)();
            }
        });

    const animatedStyles = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: X.value }],
        };
    });

    const interpolateText = useAnimatedStyle(() => {
        return {
            opacity: H_SWIPE_RANGE ? 1 - (X.value / H_SWIPE_RANGE) * 1.5 : 1,
        };
    });

    return (
        <View style={styles.container} onLayout={onLayout}>
            <View style={[styles.swipeArea, { backgroundColor: color, width: containerWidth }]}>
                <Animated.Text 
                    style={[styles.title, interpolateText]}
                    pointerEvents="none"
                >
                    {title}
                </Animated.Text>
                {containerWidth > 0 && (
                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.swipeCircle, animatedStyles]}>
                            <Ionicons name={icon} size={20} color={color} />
                        </Animated.View>
                    </GestureDetector>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        justifyContent: 'center',
    },
    swipeArea: {
        height: BUTTON_HEIGHT,
        borderRadius: BUTTON_HEIGHT / 2,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    title: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        zIndex: 1,
    },
    swipeCircle: {
        height: SWIPEABLE_DIMENSIONS,
        width: SWIPEABLE_DIMENSIONS,
        borderRadius: SWIPEABLE_DIMENSIONS / 2,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        left: 5,
        zIndex: 3,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
});
