import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database, ShieldCheck, Link2, Lock } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground } from '@/components/ui';

const SECTIONS = [
  {
    icon: Database,
    title: 'Data Storage',
    text: 'Public Health Updates stores your app preferences and profile details locally on your device.',
  },
  {
    icon: Link2,
    title: 'External Content',
    text: 'The app shows public content from phnupdates.com and opens linked pages in the in-app browser.',
  },
  {
    icon: Lock,
    title: 'No Sale of Personal Data',
    text: 'This app does not sell personal data to third parties.',
  },
] as const;

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedEntrance from="up" style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <ShieldCheck size={22} color={colors.primary} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <Text style={styles.headerSub}>How we handle your data</Text>
          </View>
        </AnimatedEntrance>

        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          return (
            <AnimatedEntrance key={section.title} index={i + 1} from="up">
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Icon size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.sectionText}>{section.text}</Text>
              </View>
            </AnimatedEntrance>
          );
        })}

        <Text style={styles.lastUpdated}>Last updated: March 19, 2026</Text>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    gap: 2,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 16,
    gap: spacing.sm,
    ...elevation('sm'),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  lastUpdated: {
    color: colors.textLight,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
}));
