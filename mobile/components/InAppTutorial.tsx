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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LoopyColors } from '../constants/colors';
import { Fonts } from '../constants/typography';
import { useTranslation } from '../hooks/useTranslation';

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
  const { t } = useTranslation();
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
      // Safety: If position is 0,0 (measurement failed), default to center of screen
      const isInvalid = step.position.width === 0 || step.position.height === 0;
      
      if (isInvalid) {
        holeX.value = SCREEN_WIDTH / 2 - 50;
        holeY.value = SCREEN_HEIGHT / 2 - 50;
        holeW.value = 100;
        holeH.value = 100;
      } else {
        holeX.value = step.position.x - 10;
        holeY.value = step.position.y - 10;
        holeW.value = step.position.width + 20;
        holeH.value = step.position.height + 20;
      }
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
  const targetY = step.position.y || SCREEN_HEIGHT / 2;
  const targetH = step.position.height || 100;
  const tipOnTop = step.tipPosition === 'top' || (targetY + targetH > SCREEN_HEIGHT - 280);

  return (
    <Modal transparent visible={isVisible} animationType="fade">
      <View style={styles.container}>
        <View style={styles.overlay}>
            <View style={[styles.backdrop, { height: Math.max(0, targetY - 10), width: SCREEN_WIDTH }]} />
            <View style={styles.holeRow}>
               <View style={[styles.backdrop, { height: targetH + 20, width: Math.max(0, step.position.x - 10) }]} />
               <View style={{ width: step.position.width + 20, height: targetH + 20 }} />
               <View style={[styles.backdrop, { height: targetH + 20, width: Math.max(0, SCREEN_WIDTH - (step.position.x + step.position.width + 10)) }]} />
            </View>
            <View style={[styles.backdrop, { height: Math.max(0, SCREEN_HEIGHT - (targetY + targetH + 10)), width: SCREEN_WIDTH }]} />
        </View>

        <Animated.View style={[styles.spotlight, animatedHoleStyle]} />

        <TouchableOpacity 
          style={styles.globalSkip} 
          onPress={onComplete}
          activeOpacity={0.7}
        >
          <Text style={styles.globalSkipText}>{t('skip_tutorial' as any)}</Text>
        </TouchableOpacity>

        <Animated.View 
          entering={FadeIn.duration(400)} 
          style={[
            styles.tipBox,
            tipOnTop 
              ? { bottom: Math.min(SCREEN_HEIGHT - 100, SCREEN_HEIGHT - targetY + 20) }
              : { top: Math.min(SCREEN_HEIGHT - 250, targetY + targetH + 30) }
          ]}
        >
           <View style={styles.tipHeader}>
              <Text style={styles.stepCount}>{t('step_indicator', { current: currentStep + 1, total: steps.length })}</Text>
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
                    <Text style={styles.backBtnText}>{t('back' as any)}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
                   <Text style={styles.skipText}>{t('skip' as any)}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                 <Text style={styles.nextBtnText}>
                    {currentStep === steps.length - 1 ? t('finish' as any) : t('next' as any)}
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
    borderRadius: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  skipText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#6b7280',
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
  globalSkip: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  globalSkipText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
