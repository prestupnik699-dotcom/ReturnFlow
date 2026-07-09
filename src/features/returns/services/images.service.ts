import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type ReturnImage = {
  id: string;
  imagePath: string;
  thumbnailPath: string;
  imageUrl: string;
  thumbnailUrl: string;
  uploadedBy: string;
  createdAt: string;
};

type ReturnImageRow = {
  id: string;
  image_url: string;
  thumbnail_url: string;
  uploaded_by: string;
  created_at: string;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function resizeAndCompress(uri: string, width: number, compress: number) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width });
  const rendered = await context.renderAsync();
  return rendered.saveAsync({ compress, format: SaveFormat.JPEG });
}

export async function uploadReturnImage(
  returnItemId: string,
  localUri: string,
  uploadedBy: string,
): Promise<ServiceResult<null>> {
  try {
    const full = await resizeAndCompress(localUri, 1600, 0.8);
    const thumb = await resizeAndCompress(localUri, 300, 0.6);

    const id = Crypto.randomUUID();
    const imagePath = `${returnItemId}/${id}.jpg`;
    const thumbnailPath = `${returnItemId}/${id}_thumb.jpg`;

    const fullBlob = await (await fetch(full.uri)).blob();
    const thumbBlob = await (await fetch(thumb.uri)).blob();

    const { error: uploadError } = await supabase.storage
      .from('returns')
      .upload(imagePath, fullBlob, { contentType: 'image/jpeg' });

    if (uploadError) {
      return fromCaughtError(uploadError, 'UPLOAD_IMAGE_FAILED');
    }

    const { error: thumbError } = await supabase.storage
      .from('returns')
      .upload(thumbnailPath, thumbBlob, { contentType: 'image/jpeg' });

    if (thumbError) {
      return fromCaughtError(thumbError, 'UPLOAD_THUMBNAIL_FAILED');
    }

    const { error: insertError } = await supabase.from('return_images').insert({
      return_item_id: returnItemId,
      image_url: imagePath,
      thumbnail_url: thumbnailPath,
      uploaded_by: uploadedBy,
    });

    if (insertError) {
      return fromCaughtError(insertError, 'SAVE_IMAGE_RECORD_FAILED');
    }

    return { success: true, data: null };
  } catch (error) {
    return fromCaughtError(error, 'UPLOAD_IMAGE_FAILED');
  }
}

export async function fetchReturnImages(
  returnItemId: string,
): Promise<ServiceResult<ReturnImage[]>> {
  const { data, error } = await supabase
    .from('return_images')
    .select('id, image_url, thumbnail_url, uploaded_by, created_at')
    .eq('return_item_id', returnItemId)
    .order('created_at', { ascending: true });

  if (error) {
    return fromCaughtError(error, 'FETCH_IMAGES_FAILED');
  }

  const rows = data as unknown as ReturnImageRow[];

  const images = await Promise.all(
    rows.map(async (row) => {
      const [fullSigned, thumbSigned] = await Promise.all([
        supabase.storage.from('returns').createSignedUrl(row.image_url, SIGNED_URL_TTL_SECONDS),
        supabase.storage.from('returns').createSignedUrl(row.thumbnail_url, SIGNED_URL_TTL_SECONDS),
      ]);

      return {
        id: row.id,
        imagePath: row.image_url,
        thumbnailPath: row.thumbnail_url,
        imageUrl: fullSigned.data?.signedUrl ?? '',
        thumbnailUrl: thumbSigned.data?.signedUrl ?? '',
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at,
      };
    }),
  );

  return { success: true, data: images };
}

export async function deleteReturnImage(image: ReturnImage): Promise<ServiceResult<null>> {
  const { error: storageError } = await supabase.storage
    .from('returns')
    .remove([image.imagePath, image.thumbnailPath]);

  if (storageError) {
    return fromCaughtError(storageError, 'DELETE_IMAGE_FILES_FAILED');
  }

  const { error: dbError } = await supabase.from('return_images').delete().eq('id', image.id);

  if (dbError) {
    return fromCaughtError(dbError, 'DELETE_IMAGE_RECORD_FAILED');
  }

  return { success: true, data: null };
}
