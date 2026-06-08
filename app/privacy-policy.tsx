import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createThemedStyles } from '@/constants/colors';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Data Storage</Text>
          <Text style={styles.sectionText}>
            Public Health Updates stores your app preferences and profile details locally on your device.
          </Text>

          <Text style={styles.sectionTitle}>External Content</Text>
          <Text style={styles.sectionText}>
            The app shows public content from phnupdates.com and opens linked pages in the in-app browser.
          </Text>

          <Text style={styles.sectionTitle}>No Sale of Personal Data</Text>
          <Text style={styles.sectionText}>
            This app does not sell personal data to third parties.
          </Text>

          <Text style={styles.lastUpdated}>Last updated: March 19, 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  lastUpdated: {
    color: colors.textLight,
    fontSize: 12,
    marginTop: 6,
  },
}));
