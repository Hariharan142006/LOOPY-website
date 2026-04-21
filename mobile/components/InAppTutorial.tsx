import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LoopyColors } from '../constants/colors';
import { Fonts } from '../constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface TutorialStep {
  targetId: string;
  title: string;
  description: string;
  position: { x: number, y: number, width: number, height: number };
  tipPosition?: 'top' | 'bottom';
}

interface Props {
  isVisible: boolean;
  steps: TutorialStep[];
  onComplete: () => void;
}

export default function InAppTutorial({ isVisible, steps, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const step = steps[currentStep];

  const holeX = useSharedValue(0);
  const holeY = useSharedValue(0);
  const holeW = useSharedValue(0);
  const holeH = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      // Give initial layout a moment to settle
      const timer = setTimeout(() => setIsReady(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
      setCurrentStep(0);
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && step && isReady) {
      holeX.value = withSpring(step.position.x - 10, { damping: 15 });
      holeY.value = withSpring(step.position.y - 10, { damping: 15 });
      holeW.value = withSpring(step.position.width + 20, { damping: 15 });
      holeH.value = withSpring(step.position.height + 20, { damping: 15 });
    }
  }, [currentStep, isVisible, isReady, step?.position]);

  const animatedHoleStyle = useAnimatedStyle(() => ({
    left: holeX.value,
    top: holeY.value,
    width: holeW.value,
    height: holeH.value,
    opacity: isReady ? 1 : 0,
  }));

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible || !step || !isReady) return null;

  // Calculate if tip should be above or below to avoid screen edges
  const tipOnTop = step.tipPosition === 'top' || (step.position.y + step.position.height > SCREEN_HEIGHT - 250);

  return (
    <Modal transparent visible={isVisible} animationType="fade">
      <View style={styles.container}>
        <View style={styles.overlay}>
           <View style={[styles.backdrop, { height: Math.max(0, step.position.y - 10), width: SCREEN_WIDTH }]} />
           <View style={styles.holeRow}>
              <View style={[styles.backdrop, { height: step.position.height + 20, width: Math.max(0, step.position.x - 10) }]} />
              <View style={{ width: step.position.width + 20, height: step.position.height + 20 }} />
              <View style={[styles.backdrop, { height: step.position.height + 20, width: Math.max(0, SCREEN_WIDTH - (step.position.x + step.position.width + 10)) }]} />
           </View>
           <View style={[styles.backdrop, { height: Math.max(0, SCREEN_HEIGHT - (step.position.y + step.position.height + 10)), width: SCREEN_WIDTH }]} />
        </View>

        <Animated.View style={[styles.spotlight, animatedHoleStyle]} />

        <Animated.View 
          entering={FadeIn.duration(400)} 
          style={[
            styles.tipBox,
            tipOnTop 
              ? { bottom: SCREEN_HEIGHT - step.position.y + 20 }
              : { top: step.position.y + step.position.height + 30 }
          ]}
        >
           <View style={styles.tipHeader}>
              <Text style={styles.stepCount}>Step {currentStep + 1} of {steps.length}</Text>
              <TouchableOpacity onPress={onComplete}>
                 <Ionicons name="close" size={20} color="#9ca3af" />
              </TouchableOpacity>
           </View>
           <Text style={styles.tipTitle}>{step.title}</Text>
           <Text style={styles.tipDescription}>{step.description}</Text>
           
           <View style={styles.footer}>
              <View style={styles.leftActions}>
                {currentStep > 0 && (
                  <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={16} color="#4b5563" />
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
                   <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                 <Text style={styles.nextBtnText}>
                    {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                 </Text>
                 <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
           </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  holeRow: {
    flexDirection: 'row',
  },
  spotlight: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#89c541',
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  tipBox: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepCount: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#89c541',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tipTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: LoopyColors.charcoal,
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#4b5563',
  },
  skipBtn: {
    padding: 4,
  },
  skipText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#9ca3af',
  },
  nextBtn: {
    backgroundColor: '#89c541',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
});
