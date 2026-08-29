import { useState } from 'react';
import { Modal, View, Image, Pressable, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/AppText';

type Props = {
  visible: boolean;
  uris: string[];
  onClose: () => void;
};

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
          renderItem={({ item }) => (
            <View style={[styles.page, { width: screenWidth }]}>
              <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
  page: { justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '80%' },
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
