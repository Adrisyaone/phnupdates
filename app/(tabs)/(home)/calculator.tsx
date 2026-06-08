import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeftRight, CalendarDays, Calculator, Flame } from 'lucide-react-native';
import { getDashboardMenu, getMenuThemeColor } from '@/constants/blogMenus';
import { colors, createThemedStyles } from '@/constants/colors';

const TOOL_ICON_MAP = {
  'calorie-estimation': Flame,
  'bmi-calculator': Calculator,
  'measurement-converter': ArrowLeftRight,
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
      subtitle: 'Convert measurements and dates.',
      items: ['measurement-converter', 'date-converter'],
    },
  ] as const;

  const menuItems = new Map((menu?.submenus || []).map((item) => [item.key, item]));

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { borderColor: menuColor + '33', backgroundColor: menuColor + '0D' }]}>
          <View style={[styles.heroIcon, { backgroundColor: menuColor }]}> 
            <Calculator size={22} color={colors.surface} />
          </View>
          <Text style={styles.title}>{menu?.title || 'Calculator'}</Text>
          <Text style={styles.subtitle}>
            Quick tools for calorie estimation, BMI calculation, and everyday health conversions.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tools</Text>
          <Text style={styles.sectionSubtitle}>Open a tool to continue.</Text>
        </View>

        <View style={styles.sectionList}>
          {menuSections.map((section) => (
            <View key={section.title} style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.groupTitle}>{section.title}</Text>
                <Text style={styles.groupSubtitle}>{section.subtitle}</Text>
              </View>

              <View style={styles.cardList}>
                {section.items.map((itemKey) => {
                  const submenu = menuItems.get(itemKey);
                  if (!submenu) return null;
                  const ToolIcon = TOOL_ICON_MAP[submenu.key as keyof typeof TOOL_ICON_MAP] || ArrowRight;
                  return (
                    <TouchableOpacity
                      key={submenu.key}
                      style={[styles.toolCard, { borderColor: menuColor + '33' }]}
                      onPress={() => {
                        if (submenu.route) {
                          router.push(submenu.route as any);
                        }
                      }}
                      activeOpacity={0.88}
                    >
                      <View style={[styles.toolIconWrap, { backgroundColor: menuColor + '15' }]}>
                        <ToolIcon size={20} color={menuColor} />
                      </View>
                      <View style={styles.toolTextWrap}>
                        <Text style={styles.toolTitle}>{submenu.title}</Text>
                        <Text style={styles.toolDescription}>{submenu.description}</Text>
                      </View>
                      <ArrowRight size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
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
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  sectionList: {
    gap: 16,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    gap: 4,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  groupSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  cardList: {
    gap: 12,
  },
  toolCard: {
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    fontWeight: '700',
  },
  toolDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
}));