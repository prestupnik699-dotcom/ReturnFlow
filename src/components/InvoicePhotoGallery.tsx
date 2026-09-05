import { useState } from 'react';
import { Modal, View, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = {
  visible: boolean;
  uris: string[];
  onClose: () => void;
};

const IMAGE_RADIUS = 16;

// One photo shown at a time with explicit prev/next buttons, NOT a
// swipeable FlatList — a horizontally-paging FlatList and a
// gesture-handler pinch/pan gesture both want to own horizontal touch
// input, and RN's classic scroll responder system doesn't coordinate
// with gesture-handler's gesture system, so pinch would get silently
// stolen by page-swiping. Button navigation sidesteps that conflict
// entirely and is what most photo viewers do anyway once zoom is
// involved.
//
// The rounded-corner mask (borderRadius + overflow:hidden) lives on a
// plain, non-animated outer View — putting it directly on the Animated
// View that also carries the pinch/pan transform is a known source of
// clipping rendering incorrectly on Android once a transform is active.
function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetIfSmall = () => {
    'worklet';
    if (scale.value < 1) {
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      resetIfSmall();
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value <= 1) return;
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.imageMask}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageAnimatedLayer, animatedStyle]}>
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function InvoicePhotoGallery({ visible, uris, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (uris.length === 0) return null;

  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goNext = () => setActiveIndex((i) => Math.min(uris.length - 1, i + 1));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setActiveIndex(0)}
    >
      <GestureHandlerRootView style={styles.backdrop}>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={28} color="#fff" />
        </Pressable>

        {uris.length > 1 ? (
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {activeIndex + 1} / {uris.length}
            </Text>
          </View>
        ) : null}

        {/* key={activeIndex} forces a fresh mount per photo, so zoom/pan
            reset to 1x automatically when switching pages instead of
            carrying over the previous photo's zoom state. */}
        <ZoomableImage key={activeIndex} uri={uris[activeIndex]!} />

        {uris.length > 1 ? (
          <View style={styles.navRow}>
            <Pressable
              style={[styles.navButton, activeIndex === 0 && styles.navButtonDisabled]}
              onPress={goPrev}
              disabled={activeIndex === 0}
              hitSlop={12}
            >
              <Feather name="chevron-left" size={26} color="#fff" />
            </Pressable>
            <Pressable
              style={[
                styles.navButton,
                activeIndex === uris.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={goNext}
              disabled={activeIndex === uris.length - 1}
              hitSlop={12}
            >
              <Feather name="chevron-right" size={26} color="#fff" />
            </Pressable>
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
  imageMask: {
    width: screenWidth * 0.9,
    height: '75%',
    alignSelf: 'center',
    borderRadius: IMAGE_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  imageAnimatedLayer: { width: '100%', height: '100%' },
  image: { width: '100%', height: '100%' },
  closeButton: { position: 'absolute', top: 60, right: 24, zIndex: 1 },
  counterBadge: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 1,
  },
  counterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  navRow: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: { opacity: 0.3 },
});
