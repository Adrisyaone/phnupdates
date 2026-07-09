import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';
import { radii } from '@/constants/theme';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    WebView = require('react-native-webview').default;
  } catch (e) {
    console.log('[MapPreview] WebView not available:', e);
  }
}

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  height?: number;
  /** Half-width of the visible bounding box, in degrees. Smaller = more zoomed in. */
  spanDegrees?: number;
}

/**
 * Inline, no-API-key map preview via OpenStreetMap's embeddable export view.
 * Used instead of react-native-maps since that needs a native rebuild and a
 * Google Maps API key we don't have configured.
 */
export function MapPreview({ latitude, longitude, height = 160, spanDegrees = 0.01 }: MapPreviewProps) {
  const bbox = [
    longitude - spanDegrees,
    latitude - spanDegrees,
    longitude + spanDegrees,
    latitude + spanDegrees,
  ].join('%2C');
  const marker = `${latitude}%2C${longitude}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;

  const wrapStyle = [
    styles.wrap,
    { height, borderColor: colors.border },
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={wrapStyle}>
        <iframe
          src={embedUrl}
          style={{ border: 0, width: '100%', height: '100%' } as any}
          title="Map location"
        />
      </View>
    );
  }

  if (!WebView) {
    return null;
  }

  return (
    <View style={wrapStyle}>
      <WebView
        source={{ uri: embedUrl }}
        style={[styles.webview, { backgroundColor: colors.surfaceAlt }]}
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loading, { backgroundColor: colors.surfaceAlt }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  webview: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
