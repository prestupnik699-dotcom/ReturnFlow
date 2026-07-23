import { useState } from 'react';
import { View, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/AppText';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { useReturnImages } from '@/features/returns/hooks/useReturnImages';
import { useUploadReturnImage } from '@/features/returns/hooks/useUploadReturnImage';
import { useDeleteReturnImage } from '@/features/returns/hooks/useDeleteReturnImage';
import type { ReturnImage } from '@/features/returns/services/images.service';

type Props = { returnId: string; canEdit: boolean };

export function ReturnPhotos({ returnId, canEdit }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: images } = useReturnImages(returnId);
  const uploadMutation = useUploadReturnImage(returnId);
  const deleteMutation = useDeleteReturnImage(returnId);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const styles = createStyles(theme);

  const handlePickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate(result.assets[0].uri);
    }
  };

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate(result.assets[0].uri);
    }
  };

  const handleDelete = (image: ReturnImage) => {
    deleteMutation.mutate(image);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('returns.detail.photosTitle')}</Text>
        {uploadMutation.isPending ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : null}
      </View>

      <View style={styles.grid}>
        {(images ?? []).map((image) => (
          <View key={image.id} style={styles.thumbWrap}>
            <Pressable onPress={() => setViewerUri(image.imageUrl)}>
              <Image source={{ uri: image.thumbnailUrl }} style={styles.thumb} />
            </Pressable>
            {canEdit ? (
              <Pressable style={styles.deleteBadge} onPress={() => handleDelete(image)} hitSlop={8}>
                <Feather name="x" size={12} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        ))}

        {canEdit ? (
          <>
            <Pressable style={styles.addTile} onPress={handlePickFromCamera}>
              <Feather name="camera" size={22} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.addTile} onPress={handlePickFromGallery}>
              <Feather name="image" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </>
        ) : null}
      </View>

      {uploadMutation.isError ? (
        <Text style={styles.errorText}>{uploadMutation.error.message}</Text>
      ) : null}

      <ImageViewerModal visible={!!viewerUri} uri={viewerUri} onClose={() => setViewerUri(null)} />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  const size = 84;
  return StyleSheet.create({
    container: { gap: theme.spacing.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    title: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    thumbWrap: { width: size, height: size },
    thumb: {
      width: size,
      height: size,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceVariant,
    },
    deleteBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: theme.colors.danger,
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTile: {
      width: size,
      height: size,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: { fontSize: theme.fontSizes.xs, color: theme.colors.danger },
  });
}
