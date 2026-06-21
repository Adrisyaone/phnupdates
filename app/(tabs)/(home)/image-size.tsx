import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Crop, ImagePlus, Square } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { colors, createThemedStyles } from '@/constants/colors';
import { useSettings } from '@/contexts/SettingsContext';

type ImageSizeOption = {
  preset: 'square' | 'portrait' | 'landscape' | 'custom';
  title: string;
  description: string;
  width: number;
  height: number;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const IMAGE_SIZE_OPTIONS: ImageSizeOption[] = [
  {
    preset: 'square',
    title: 'Square 1024×1024',
    description: 'Balanced for profile-style and general image generation.',
    width: 1024,
    height: 1024,
    icon: Square,
  },
  {
    preset: 'portrait',
    title: 'Portrait 1024×1536',
    description: 'Best for tall layouts, posters, and portrait crops.',
    width: 1024,
    height: 1536,
    icon: Crop,
  },
  {
    preset: 'landscape',
    title: 'Landscape 1536×1024',
    description: 'Best for wide scenes, banners, and landscape edits.',
    width: 1536,
    height: 1024,
    icon: Crop,
  },
  {
    preset: 'custom',
    title: 'Custom dimensions',
    description: 'Use your own width and height when supported.',
    width: 1200,
    height: 900,
    icon: Crop,
  },
];

export default function ImageSizeScreen() {
  const { featureSettings, updateFeatureSettings } = useSettings();
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [resizedImageUri, setResizedImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [customWidthText, setCustomWidthText] = useState(() => String(featureSettings.imageSizeWidth));
  const [customHeightText, setCustomHeightText] = useState(() => String(featureSettings.imageSizeHeight));

  const commitCustomDimensions = (widthStr: string, heightStr: string) => {
    const w = Math.min(8000, Math.max(1, parseInt(widthStr, 10) || 1));
    const h = Math.min(8000, Math.max(1, parseInt(heightStr, 10) || 1));
    setCustomWidthText(String(w));
    setCustomHeightText(String(h));
    void updateFeatureSettings({ imageSizePreset: 'custom', imageSizeWidth: w, imageSizeHeight: h });
  };

  const currentLabel = useMemo(
    () => `${featureSettings.imageSizeWidth}×${featureSettings.imageSizeHeight}`,
    [featureSettings.imageSizeHeight, featureSettings.imageSizeWidth]
  );

  const currentSize = useMemo(
    () => ({ width: Math.max(1, featureSettings.imageSizeWidth), height: Math.max(1, featureSettings.imageSizeHeight) }),
    [featureSettings.imageSizeHeight, featureSettings.imageSizeWidth]
  );

  const pickImage = async () => {
    setStatusMessage('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatusMessage('Gallery permission is required to pick an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      base64: false,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setSelectedImageUri(result.assets[0].uri);
    setResizedImageUri(null);
    setStatusMessage('Image selected. Tap resize to create the downloaded version.');
  };

  const resizeAndSaveImage = async () => {
    if (!selectedImageUri) {
      setStatusMessage('Select an image first.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Resizing image...');

    try {
      const resized = await manipulateAsync(
        selectedImageUri,
        [{ resize: currentSize }],
        { format: SaveFormat.JPEG, compress: 0.92 }
      );

      setResizedImageUri(resized.uri);

      let saved = false;
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(resized.uri);
          saved = true;
        }
      } catch {
        // Permission request unsupported on this build — fall through to sharing
      }
      if (saved) {
        setStatusMessage(`Saved to your photo library at ${currentLabel}.`);
      } else {
        setStatusMessage(`Resized to ${currentLabel}. Tap "Download" to save to your gallery.`);
      }
    } catch (error) {
      console.log('[ImageSize] Resize failed:', error);
      setStatusMessage('Could not resize the selected image. Please try another file.');
      Alert.alert('Resize failed', 'Could not resize the selected image. Please try another file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResizedImage = async () => {
    if (!resizedImageUri) {
      setStatusMessage('Resize the image first.');
      return;
    }

    try {
      let savedToLibrary = false;
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(resizedImageUri);
          savedToLibrary = true;
        }
      } catch {
        // Permission request unsupported on this build — fall through to sharing
      }
      if (savedToLibrary) {
        setStatusMessage('Image saved to your photo library.');
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(resizedImageUri);
        return;
      }

      setStatusMessage('Could not save — please grant media library permission and try again.');
    } catch (error) {
      console.log('[ImageSize] Download failed:', error);
      setStatusMessage('Could not save the image. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Stack.Screen options={{ title: 'Image Size' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <ImagePlus size={22} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Image Size</Text>
          <Text style={styles.heroSubtitle}>
            Choose the crop or generation size before you edit or process an image. Current selection: {currentLabel}.
          </Text>
        </View>

        <View style={styles.list}>
          {IMAGE_SIZE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = featureSettings.imageSizePreset === option.preset;
            const isCustom = option.preset === 'custom';
            return (
              <View key={option.preset}>
                <TouchableOpacity
                  style={[styles.optionCard, active && styles.optionCardActive, isCustom && active && styles.optionCardCustomActive]}
                  activeOpacity={0.88}
                  onPress={() => {
                    if (isCustom) {
                      void updateFeatureSettings({
                        imageSizePreset: 'custom',
                        imageSizeWidth: Math.min(8000, Math.max(1, parseInt(customWidthText, 10) || 1200)),
                        imageSizeHeight: Math.min(8000, Math.max(1, parseInt(customHeightText, 10) || 900)),
                      });
                    } else {
                      void updateFeatureSettings({
                        imageSizePreset: option.preset,
                        imageSizeWidth: option.width,
                        imageSizeHeight: option.height,
                      });
                    }
                  }}
                >
                  <View style={[styles.optionIconWrap, active && styles.optionIconWrapActive]}>
                    <Icon size={20} color={active ? colors.surface : colors.primary} />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  {!isCustom && (
                    <View style={styles.optionBadge}>
                      <Text style={styles.optionBadgeText}>{option.width}×{option.height}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {isCustom && active && (
                  <View style={styles.customInputsRow}>
                    <View style={styles.customInputWrap}>
                      <Text style={styles.customInputLabel}>Width (px)</Text>
                      <TextInput
                        style={styles.customInput}
                        keyboardType="number-pad"
                        value={customWidthText}
                        onChangeText={setCustomWidthText}
                        onBlur={() => commitCustomDimensions(customWidthText, customHeightText)}
                        maxLength={5}
                        placeholder="e.g. 1200"
                        placeholderTextColor={colors.textSecondary}
                        selectTextOnFocus
                      />
                    </View>
                    <Text style={styles.customInputSep}>×</Text>
                    <View style={styles.customInputWrap}>
                      <Text style={styles.customInputLabel}>Height (px)</Text>
                      <TextInput
                        style={styles.customInput}
                        keyboardType="number-pad"
                        value={customHeightText}
                        onChangeText={setCustomHeightText}
                        onBlur={() => commitCustomDimensions(customWidthText, customHeightText)}
                        maxLength={5}
                        placeholder="e.g. 900"
                        placeholderTextColor={colors.textSecondary}
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.footerTitle}>Select and resize</Text>
          <Text style={styles.footerText}>
            Pick an image, resize it to the selected size, and save the resized version to your device.
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => { void pickImage(); }}>
              <Text style={styles.actionButtonSecondaryText}>Choose image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => { void resizeAndSaveImage(); }} disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.actionButtonPrimaryText}>Resize & Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.downloadButton} onPress={() => { void downloadResizedImage(); }} disabled={!resizedImageUri}>
            <Text style={styles.downloadButtonText}>Download resized image</Text>
          </TouchableOpacity>
          {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
        </View>

        {selectedImageUri ? (
          <View style={styles.previewCard}>
            <Text style={styles.footerTitle}>Selected image</Text>
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
          </View>
        ) : null}

        {resizedImageUri ? (
          <View style={styles.previewCard}>
            <Text style={styles.footerTitle}>Resized output</Text>
            <Image source={{ uri: resizedImageUri }} style={styles.previewImage} />
          </View>
        ) : null}

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>How it is used</Text>
          <Text style={styles.footerText}>
            The selected size is read by the image capture/edit flow so the crop aspect matches your chosen output orientation.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 8,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '14',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 10,
  },
  optionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionCardCustomActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  customInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  customInputWrap: {
    flex: 1,
    gap: 4,
  },
  customInputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  customInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  customInputSep: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '14',
  },
  optionIconWrapActive: {
    backgroundColor: colors.primary,
  },
  optionTextWrap: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  optionDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  optionNote: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  optionBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceAlt,
  },
  optionBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  footerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6,
  },
  actionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButtonPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimaryText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSecondaryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  downloadButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  downloadButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  previewCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  footerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
}));