import { useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Camera, FileDown, FilePlus2, ScanLine, Trash2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, createThemedStyles } from '@/constants/colors';
import { AnimatedEntrance, AuroraBackground, PressableScale } from '@/components/ui';

type PickedImage = {
  id: string;
  uri: string;
};

export default function CamScannerScreen() {
  const [images, setImages] = useState<PickedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const addFromGallery = async () => {
    setStatusMessage('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatusMessage('Gallery permission is required to pick images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      base64: false,
    });

    if (result.canceled || !result.assets.length) return;

    const newImages: PickedImage[] = result.assets.map((asset) => ({
      id: `${asset.uri}-${Date.now()}-${Math.random()}`,
      uri: asset.uri,
    }));

    setImages((prev) => [...prev, ...newImages]);
    setStatusMessage(`${result.assets.length} image${result.assets.length > 1 ? 's' : ''} added.`);
  };

  const addFromCamera = async () => {
    setStatusMessage('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatusMessage('Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 1, base64: false });

    if (result.canceled || !result.assets[0]?.uri) return;

    setImages((prev) => [
      ...prev,
      { id: `${result.assets[0].uri}-${Date.now()}`, uri: result.assets[0]!.uri },
    ]);
    setStatusMessage('Photo added.');
  };

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const clearAll = () => {
    setImages([]);
    setStatusMessage('');
  };

  const convertToPdf = async () => {
    if (Platform.OS === 'web') {
      setStatusMessage('PDF export is only available on the Android or iOS app.');
      return;
    }

    if (images.length === 0) {
      setStatusMessage('Add at least one image first.');
      return;
    }

    setIsConverting(true);

    try {
      const base64Images: string[] = [];

      for (let i = 0; i < images.length; i++) {
        setStatusMessage(`Processing image ${i + 1} of ${images.length}...`);

        // Resize to A4-compatible width and get base64 directly from manipulateAsync —
        // avoids any FileSystem dependency and works on both native and web.
        const { base64 } = await manipulateAsync(
          images[i].uri,
          [{ resize: { width: 1240 } }],
          { format: SaveFormat.JPEG, compress: 0.82, base64: true }
        );

        if (!base64) throw new Error(`Could not encode image ${i + 1} as base64.`);
        base64Images.push(base64);
      }

      setStatusMessage('Generating PDF...');

      const pages = base64Images
        .map(
          (b64) =>
            `<div class="page"><img src="data:image/jpeg;base64,${b64}" /></div>`
        )
        .join('');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; }
    .page {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10mm;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    img { max-width: 100%; height: auto; display: block; }
  </style>
</head>
<body>${pages}</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or share your PDF',
          UTI: 'com.adobe.pdf',
        });
        setStatusMessage('PDF ready — use the share sheet to save it.');
      } else {
        setStatusMessage(`PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('[CamScanner] PDF conversion failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Failed: ${msg}`);
      Alert.alert('Conversion failed', msg);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Stack.Screen options={{ title: 'CamScanner' }} />
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <AnimatedEntrance from="up" style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <ScanLine size={22} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>CamScanner</Text>
          <Text style={styles.heroSubtitle}>
            Pick images from your gallery or camera and convert them into a single PDF document.
          </Text>
        </AnimatedEntrance>

        <View style={styles.addRow}>
          <PressableScale style={styles.addButton} onPress={() => { void addFromGallery(); }} haptic>
            <FilePlus2 size={18} color={colors.primary} />
            <Text style={styles.addButtonText}>Gallery</Text>
          </PressableScale>
          <PressableScale style={styles.addButton} onPress={() => { void addFromCamera(); }} haptic>
            <Camera size={18} color={colors.primary} />
            <Text style={styles.addButtonText}>Camera</Text>
          </PressableScale>
          {images.length > 0 && (
            <PressableScale style={styles.clearButton} onPress={clearAll}>
              <Trash2 size={18} color={colors.error} />
              <Text style={styles.clearButtonText}>Clear all</Text>
            </PressableScale>
          )}
        </View>

        {images.length > 0 && (
          <View style={styles.previewGrid}>
            {images.map((img, index) => (
              <View key={img.id} style={styles.previewItem}>
                <Image source={{ uri: img.uri }} style={styles.previewThumb} />
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>{index + 1}</Text>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(img.id)}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionCard}>
          {Platform.OS === 'web' && (
            <Text style={styles.webNote}>PDF export works on the Android / iOS app only.</Text>
          )}
          <Text style={styles.actionTitle}>
            {images.length === 0
              ? 'No images added yet'
              : `${images.length} image${images.length > 1 ? 's' : ''} ready to convert`}
          </Text>
          <TouchableOpacity
            style={[styles.convertButton, images.length === 0 && styles.convertButtonDisabled]}
            onPress={() => { void convertToPdf(); }}
            disabled={isConverting || images.length === 0}
          >
            {isConverting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FileDown size={18} color="#fff" />
                <Text style={styles.convertButtonText}>Convert to PDF</Text>
              </>
            )}
          </TouchableOpacity>
          {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
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
  heroTitle: { color: colors.text, fontSize: 28, fontWeight: '800' },
  heroSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  addRow: { flexDirection: 'row', gap: 10 },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
    paddingVertical: 12,
  },
  addButtonText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  clearButtonText: { color: colors.error, fontWeight: '600', fontSize: 14 },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  previewItem: {
    width: '30%',
    aspectRatio: 0.75,
    borderRadius: 12,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  previewThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceAlt,
  },
  previewBadge: {
    position: 'absolute' as const,
    top: 6,
    left: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  removeButton: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  webNote: { color: colors.error, fontSize: 13, fontWeight: '600' },
  actionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: 14,
  },
  convertButtonDisabled: { opacity: 0.45 },
  convertButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  statusText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
}));
