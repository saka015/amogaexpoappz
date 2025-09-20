import { supabase } from '@/config/supabase';
import { uploadAttachmentToSupabase } from '@/lib/utils';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

type ImagePickerResult = {
  pickImage: () => Promise<string[] | undefined>;
  uploadImage: (uri: string, bucketName: string) => Promise<string | null>;
};

export function useImagePicker(): ImagePickerResult {
  const pickImage = async (): Promise<string[] | undefined> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        // aspect: [4, 3],
        quality: 1,
        base64: true
      });

      if (!result.canceled && result.assets.length > 0) {
        return result.assets.map(asset => asset.uri);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to pick image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const uploadImage = async (uri: string, bucketName: string): Promise<string | null> => {
    console.log("uri", uri)
    const isDataUri = uri.startsWith('data:');
    const isFileUri = uri.startsWith('file://');

    if (!isDataUri && !isFileUri) {
      return uri;
    }


    try {
      // Create a unique file path
      const fileExt = uri.includes('jpeg') ? 'jpg' : 'png';
      const filePath = `${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt}`;

      const publicUrl = uploadAttachmentToSupabase(uri, filePath, contentType, bucketName, "tmp")

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      Alert.alert("Upload Failed", error.message);
      return null;
    }
  };


  return { pickImage, uploadImage };
} 