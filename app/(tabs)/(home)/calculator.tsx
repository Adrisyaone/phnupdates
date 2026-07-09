import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ArrowLeftRight, CalendarDays, Calculator, Flame, LandPlot } from 'lucide-react-native';
import { getDashboardMenu, getMenuThemeColor } from '@/constants/blogMenus';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, glow, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero, PressableScale, SectionHeader } from '@/components/ui';

const TOOL_ICON_MAP = {
  'calorie-estimation': Flame,
  'bmi-calculator': Calculator,
  'measurement-converter': ArrowLeftRight,
  'area-converter': LandPlot,
  'date-converter': CalendarDays,
} as const;

export default function CalculatorHubScreen() {
  const router = useRouter();
  const menu = getDashboardMenu('calculator');
  const menuColor = getMenuThemeColor('calculator');

  const menuSections = [
    {
      title: 'Nutrition Tools',
      subtitle: 'Estimate calories from food descriptions or images.',
      items: ['calorie-estimation'],
    },
    {
      title: 'Body Metrics',
      subtitle: 'Calculate BMI from height and weight.',
      items: ['bmi-calculator'],
    },
    {
      title: 'Converters',
      subtitle: 'Convert measurements, area, and dates.',
      items: ['measurement-converter', 'area-converter', 'date-converter'],
    },
  ] as const;

  const menuItems = new Map((menu?.submenus || []).map((item) => [item.key, item]));

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground tint={menuColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GradientHero rounded colorsOverride={[menuColor, menuColor + 'CC']} style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroIcon}>
              <Calculator size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{menu?.title || 'Calculator'}</Text>
            <Text style={styles.subtitle}>
              Quick tools for calorie estimation, BMI calculation, and everyday health conversions.
            </Text>
          </View>
        </GradientHero>

        <View style={styles.body}>
          <View style={styles.sectionList}>
            {menuSections.map((section, sIdx) => (
              <View key={section.title} style={styles.sectionBlock}>
                <SectionHeader title={section.title} subtitle={section.subtitle} accent={menuColor} />

                <View style={styles.cardList}>
                  {section.items.map((itemKey, i) => {
                    const submenu = menuItems.get(itemKey);
                    if (!submenu) return null;
                    const ToolIcon = TOOL_ICON_MAP[submenu.key as keyof typeof TOOL_ICON_MAP] || ArrowRight;
                    return (
                      <AnimatedEntrance key={submenu.key} index={i} delay={sIdx * 40} from="up">
                        <PressableScale
                          style={[styles.toolCard, { borderColor: menuColor + '33' }]}
                          onPress={() => { if (submenu.route) router.push(submenu.route as any); }}
                          haptic
                        >
                          <LinearGradient
                            colors={[menuColor, menuColor + 'CC']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.toolIconWrap, glow(menuColor, 0.28)]}
                          >
                            <ToolIcon size={22} color="#FFFFFF" />
                          </LinearGradient>
                          <View style={styles.toolTextWrap}>
                            <Text style={styles.toolTitle}>{submenu.title}</Text>
                            <Text style={styles.toolDescription}>{submenu.description}</Text>
                          </View>
                          <ArrowRight size={18} color={menuColor} />
                        </PressableScale>
                      </AnimatedEntrance>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
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
    paddingBottom: spacing.xxl,
  },
  hero: {
    paddingBottom: spacing.xl,
  },
  heroInner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF2E',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    marginBottom: spacing.xs,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#FFFFFFE6',
    fontSize: 13,
    lineHeight: 20,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sectionList: {
    gap: spacing.xl,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  cardList: {
    gap: spacing.md,
  },
  toolCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...elevation('md'),
  },
  toolIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTextWrap: {
    flex: 1,
    gap: 3,
  },
  toolTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  toolDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
}));
