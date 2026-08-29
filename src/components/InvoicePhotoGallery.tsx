import { useState } from 'react';
import { Modal, View, Image, Pressable, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = {
  visible: boolean;
  uris: string[];
  onClose: () => void;
};

const IMAGE_RADIUS = 16;

// react-native's built-in ScrollView zoom props (minimumZoomScale etc.)
// only work on iOS — Android has no native pinch-zoom support on
// ScrollView at all, so a real cross-platform zoom needs to be built by
// hand with gesture-handler + reanimated (both already dependencies of
// this app). Pinch scales the image; pan lets the person drag around
// once zoomed in; a double-condition reset (pinch end + pan end) snaps
// back to 1x so the next photo swipe isn't fighting a still-zoomed image.
function ZoomableImage({ uri, width }: { uri: string; width: number }) {
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
      // Only allow panning once zoomed in — otherwise a pan gesture here
      // would fight the FlatList's own horizontal swipe-between-photos.
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
    <View style={[styles.page, { width }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageFrame, animatedStyle]}>
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// A small paged photo gallery for multi-page invoices — swipe between
// pages with a "1 of N" counter, rather than only ever being able to
// see one photo at a time (which is what the single-image
// ImageViewerModal is for, and remains unchanged for its other callers).
export function InvoicePhotoGallery({ visible, uris, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;

  if (uris.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setActiveIndex(0)}
    >
      <View style={styles.backdrop}>
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

        <FlatList
          data={uris}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setActiveIndex(index);
          }}
          renderItem={({ item }) => <ZoomableImage uri={item} width={screenWidth} />}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
  page: { justifyContent: 'center', alignItems: 'center' },
  imageFrame: {
    width: '90%',
    height: '80%',
    borderRadius: IMAGE_RADIUS,
    overflow: 'hidden',
  },
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
});
