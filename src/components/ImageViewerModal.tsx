import { Modal, View, Image, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = { visible: boolean; uri: string | null; onClose: () => void };

export function ImageViewerModal({ visible, uri, onClose }: Props) {
  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={28} color="#fff" />
        </Pressable>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
  image: { width: '100%', height: '80%' },
  closeButton: { position: 'absolute', top: 60, right: 24, zIndex: 1 },
});
