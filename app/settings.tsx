import React from 'react';
import { Alert, Linking, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowUpCircle, Bell, Check, ChevronRight, Clock, Info, Languages, LayoutGrid, Minus, Moon, Palette, Plus, Shield, Sun, Sunrise, Sunset } from 'lucide-react-native';
import { colors, createThemedStyles, ThemePreference } from '@/constants/colors';
import { AnimatedEntrance, AuroraBackground, PressableScale } from '@/components/ui';
import { LANGUAGES, Language } from '@/constants/translations';
import { NotificationMode, useSettings } from '@/contexts/SettingsContext';
import { getCurrentAppVersion } from '@/services/appUpdate';
import { APP_UPDATE_CONFIG } from '@/constants/config';

export default function SettingsScreen() {
  const router = useRouter();
  const currentVersion = getCurrentAppVersion();
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    notificationSettings,
    updateNotificationSettings,
    featureSettings,
    updateFeatureSettings,
    requestNotificationPermission,
    t,
  } = useSettings();

  const openPlayStore = async () => {
    const packageName = APP_UPDATE_CONFIG.androidPackage;
    const marketUrl = `market://details?id=${packageName}`;
    try {
      if (Platform.OS === 'android' && await Linking.canOpenURL(marketUrl)) {
        await Linking.openURL(marketUrl);
        return;
      }
      await Linking.openURL(`https://play.google.com/store/apps/details?id=${packageName}&pcampaignid=web_share`);
    } catch {
      Alert.alert('Unable to open store', 'Please open the Play Store manually to update the app.');
    }
  };

  const openOtherApp = async () => {
    try {
      await Linking.openURL('https://play.google.com/store/apps/details?id=app.healtyme.com');
    } catch {
      Alert.alert('Unable to open link', 'Please open the Play Store manually.');
    }
  };

  const ensurePermissionIfEnabling = async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Permission Needed', 'Please allow notifications to enable reminders.');
        return false;
      }
    }
    return true;
  };

  const updateSingleTime = async (
    key: 'healthTipReminderTimes' | 'quoteReminderTimes' | 'publicHealthDayReminderTimes' | 'interestedJobsReminderTimes',
    nextHour: number,
    nextMinute: number,
  ) => {
    const hour = ((nextHour % 24) + 24) % 24;
    const minute = ((nextMinute % 60) + 60) % 60;
    await updateNotificationSettings({ [key]: [{ id: '1', hour, minute }] } as any);
  };

  const renderTimeEditor = (
    label: string,
    key: 'healthTipReminderTimes' | 'quoteReminderTimes' | 'publicHealthDayReminderTimes' | 'interestedJobsReminderTimes',
    fallbackHour: number,
    fallbackMinute: number,
  ) => {
    const time = notificationSettings[key]?.[0] ?? { id: '1', hour: fallbackHour, minute: fallbackMinute };
    const presets = [
      { label: 'Morning', h: 7, m: 0, icon: Sunrise },
      { label: 'Afternoon', h: 13, m: 0, icon: Sun },
      { label: 'Evening', h: 18, m: 0, icon: Sunset },
    ];

    const ampm = time.hour < 12 ? 'AM' : 'PM';
    const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;

    return (
      <View style={styles.timeCard}>
        <Text style={styles.timeBlockLabel}>{label}</Text>

        {/* Big time display */}
        <View style={styles.timeHero}>
          <LinearGradient
            colors={[colors.primary + '1F', colors.primary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.timeHeroBg}
          />
          <View style={styles.timeHeroClock}>
            <Clock size={20} color={colors.primary} />
          </View>
          <View style={styles.timeHeroValueRow}>
            <Text style={styles.timeHeroValue}>{`${String(hour12).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`}</Text>
            <Text style={styles.timeHeroAmPm}>{ampm}</Text>
          </View>
        </View>

        {/* Preset segmented control */}
        <View style={styles.presetRow}>
          {presets.map((p) => {
            const active = p.h === time.hour && p.m === time.minute;
            const PIcon = p.icon;
            return (
              <PressableScale
                key={p.label}
                style={[styles.presetChip, active && styles.presetChipActive]}
                onPress={() => { void updateSingleTime(key, p.h, p.m); }}
                haptic
              >
                <PIcon size={14} color={active ? colors.primary : colors.textSecondary} />
                <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{p.label}</Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Hour / Minute steppers */}
        <View style={styles.stepperRow}>
          <View style={styles.stepper}>
            <Text style={styles.stepperLabel}>Hour</Text>
            <View style={styles.stepperControls}>
              <PressableScale style={styles.stepBtn} onPress={() => { void updateSingleTime(key, time.hour - 1, time.minute); }} haptic accessibilityLabel="Decrease hour">
                <Minus size={16} color={colors.primary} />
              </PressableScale>
              <Text style={styles.stepperValue}>{String(hour12).padStart(2, '0')}</Text>
              <PressableScale style={styles.stepBtn} onPress={() => { void updateSingleTime(key, time.hour + 1, time.minute); }} haptic accessibilityLabel="Increase hour">
                <Plus size={16} color={colors.primary} />
              </PressableScale>
            </View>
          </View>
          <View style={styles.stepper}>
            <Text style={styles.stepperLabel}>Minute</Text>
            <View style={styles.stepperControls}>
              <PressableScale style={styles.stepBtn} onPress={() => { void updateSingleTime(key, time.hour, time.minute - 5); }} haptic accessibilityLabel="Decrease minute">
                <Minus size={16} color={colors.primary} />
              </PressableScale>
              <Text style={styles.stepperValue}>{String(time.minute).padStart(2, '0')}</Text>
              <PressableScale style={styles.stepBtn} onPress={() => { void updateSingleTime(key, time.hour, time.minute + 5); }} haptic accessibilityLabel="Increase minute">
                <Plus size={16} color={colors.primary} />
              </PressableScale>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderSwitch = (label: string, description: string, value: boolean, onValueChange: (v: boolean) => void) => (
    <View style={styles.switchRow}>
      <View style={styles.switchLabelGroup}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description ? <Text style={styles.switchDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary + '70' }}
        thumbColor={value ? colors.primary : colors.surfaceAlt}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Appearance */}
        <AnimatedEntrance from="up" style={styles.sectionHeader}>
          <Palette size={15} color={colors.primary} />
          <Text style={styles.sectionTitle}>Appearance</Text>
        </AnimatedEntrance>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Theme</Text>
          <View style={styles.themeRow}>
            {(['light', 'dark'] as ThemePreference[]).map((option) => {
              const active = theme === option;
              const Icon = option === 'light' ? Sun : Moon;
              const isLight = option === 'light';
              // Preview swatch colours mirror the actual light/dark palettes.
              const pv = isLight
                ? { bg: '#F8FAFC', card: '#FFFFFF', line: '#E2E8F0', bar: '#2DD4BF' }
                : { bg: '#0D2035', card: '#132B44', line: '#1E3A5F', bar: '#2DD4BF' };
              return (
                <PressableScale
                  key={option}
                  style={[styles.themeCard, active && styles.themeCardActive]}
                  onPress={() => { void setTheme(option); }}
                  haptic
                >
                  {/* Mini theme preview */}
                  <View style={[styles.themePreview, { backgroundColor: pv.bg }]}>
                    <View style={[styles.themePreviewBar, { backgroundColor: pv.bar }]} />
                    <View style={[styles.themePreviewCard, { backgroundColor: pv.card }]}>
                      <View style={[styles.themePreviewLine, { backgroundColor: pv.line, width: '70%' }]} />
                      <View style={[styles.themePreviewLine, { backgroundColor: pv.line, width: '45%' }]} />
                    </View>
                  </View>

                  <View style={styles.themeLabelRow}>
                    <Icon size={16} color={active ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
                      {isLight ? t('light') : t('dark')}
                    </Text>
                  </View>

                  {active ? (
                    <View style={styles.themeCheck}>
                      <Check size={13} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View style={styles.sectionHeader}>
          <Languages size={15} color={colors.primary} />
          <Text style={styles.sectionTitle}>{t('language')}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.langRow}>
            {LANGUAGES.map((lang) => {
              const active = language === lang.key;
              return (
                <TouchableOpacity
                  key={lang.key}
                  style={[styles.langChip, active && styles.langChipActive]}
                  onPress={() => { void setLanguage(lang.key as Language); }}
                >
                  <Text style={[styles.langText, active && styles.langTextActive]}>{lang.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Feature Visibility */}
        <View style={styles.sectionHeader}>
          <LayoutGrid size={15} color={colors.primary} />
          <Text style={styles.sectionTitle}>Feature Visibility</Text>
        </View>
        <View style={styles.card}>
          {renderSwitch('Health Tips Card', 'Daily rotating public health tips on home screen', featureSettings.healthTipsCard, (enabled) => { void updateFeatureSettings({ healthTipsCard: enabled }); })}
          {renderSwitch('Public Health Days Card', 'Awareness days and weeks calendar', featureSettings.publicHealthDaysCard, (enabled) => { void updateFeatureSettings({ publicHealthDaysCard: enabled }); })}
          {renderSwitch('Latest News Section', 'Recent public health news on home screen', featureSettings.latestNewsSection, (enabled) => { void updateFeatureSettings({ latestNewsSection: enabled }); })}
          {renderSwitch('Menu Grid Section', 'Icon grid for quick navigation to all features', featureSettings.menuGridSection, (enabled) => { void updateFeatureSettings({ menuGridSection: enabled }); })}
        </View>

        {/* Notifications */}
        <View style={styles.sectionHeader}>
          <Bell size={15} color={colors.primary} />
          <Text style={styles.sectionTitle}>{t('notifications')}</Text>
        </View>
        <View style={styles.card}>
          {renderSwitch(t('healthTipReminder'), 'Get a daily health tip notification', notificationSettings.healthTipReminderEnabled, (enabled) => {
            void (async () => {
              if (!(await ensurePermissionIfEnabling(enabled))) return;
              await updateNotificationSettings({ healthTipReminderEnabled: enabled });
            })();
          })}
          {notificationSettings.healthTipReminderEnabled ? renderTimeEditor('Health Tips Time', 'healthTipReminderTimes', 7, 0) : null}

          {renderSwitch("Today's Quote", 'Daily inspirational public health quote', notificationSettings.quoteReminderEnabled, (enabled) => {
            void (async () => {
              if (!(await ensurePermissionIfEnabling(enabled))) return;
              await updateNotificationSettings({ quoteReminderEnabled: enabled });
            })();
          })}
          {notificationSettings.quoteReminderEnabled ? renderTimeEditor('Quote Reminder Time', 'quoteReminderTimes', 8, 0) : null}

          {renderSwitch("Public Health Day Alert", 'Be reminded of awareness days each morning', notificationSettings.publicHealthDayReminderEnabled, (enabled) => {
            void (async () => {
              if (!(await ensurePermissionIfEnabling(enabled))) return;
              await updateNotificationSettings({ publicHealthDayReminderEnabled: enabled });
            })();
          })}
          {notificationSettings.publicHealthDayReminderEnabled ? renderTimeEditor('Public Health Day Time', 'publicHealthDayReminderTimes', 8, 30) : null}

          {renderSwitch('Interested Jobs Reminder', 'Reminder to apply for saved job postings', notificationSettings.interestedJobsReminderEnabled, (enabled) => {
            void (async () => {
              if (!(await ensurePermissionIfEnabling(enabled))) return;
              await updateNotificationSettings({ interestedJobsReminderEnabled: enabled });
            })();
          })}
          {notificationSettings.interestedJobsReminderEnabled ? renderTimeEditor('Interested Jobs Time', 'interestedJobsReminderTimes', 9, 0) : null}

          <Text style={styles.fieldLabel}>{t('notificationMode')}</Text>
          <View style={styles.modeRow}>
            {(['sound', 'vibration', 'both'] as NotificationMode[]).map((mode) => {
              const active = notificationSettings.notificationMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeChip, active && styles.modeChipActive]}
                  onPress={() => { void updateNotificationSettings({ notificationMode: mode }); }}
                >
                  <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{mode}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* App Update */}
        <View style={styles.sectionHeader}>
          <ArrowUpCircle size={15} color={colors.primary} />
          <Text style={styles.sectionTitle}>App Update</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.updateMetaRow}>
            <Text style={styles.updateLabel}>Installed version</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>{currentVersion}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.updateBtn} onPress={() => { void openPlayStore(); }}>
            <ArrowUpCircle size={16} color="#fff" />
            <Text style={styles.updateBtnText}>Update on Play Store</Text>
          </TouchableOpacity>
        </View>

        {/* More */}
        <View style={styles.sectionHeader}>
          <Info size={15} color={colors.primary} />
          <Text style={styles.sectionTitle}>More</Text>
        </View>
        <View style={styles.card}>
          {[
            { label: 'About Us', onPress: () => { router.push('/about-us'); } },
            { label: 'Privacy Policy', onPress: () => { router.push('/privacy-policy'); } },
            { label: 'Our Other App (HealthyME)', onPress: () => { void openOtherApp(); } },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.moreLink, i < arr.length - 1 && styles.moreLinkBorder]}
              onPress={item.onPress}
            >
              <Text style={styles.moreLinkText}>{item.label}</Text>
              <ChevronRight size={16} color={colors.textLight} />
            </TouchableOpacity>
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
    gap: 8,
    paddingBottom: 32,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 2,
    paddingLeft: 2,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },

  // Theme selector
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeCard: {
    flex: 1,
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.background,
    position: 'relative',
  },
  themeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0E',
  },
  themePreview: {
    height: 74,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    gap: 6,
    overflow: 'hidden',
  },
  themePreviewBar: {
    height: 8,
    width: '55%',
    borderRadius: 4,
  },
  themePreviewCard: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    gap: 5,
  },
  themePreviewLine: {
    height: 6,
    borderRadius: 3,
  },
  themeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  themeLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  themeLabelActive: {
    color: colors.primary,
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Language
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  langChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  langText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  langTextActive: {
    color: colors.primary,
  },

  // Switch rows
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabelGroup: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  switchDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },

  // Time editor
  timeCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginLeft: 4,
  },
  timeBlockLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timeHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  timeHeroBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  timeHeroClock: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '1F',
  },
  timeHeroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  timeHeroValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  timeHeroAmPm: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  presetChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: colors.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepper: {
    flex: 1,
    gap: 6,
  },
  stepperLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 4,
  },
  stepBtn: {
    width: 40,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '14',
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Notification mode
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.background,
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  modeChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modeChipTextActive: {
    color: colors.primary,
  },

  // Update
  updateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updateLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  versionBadge: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  versionBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 2,
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // More links
  moreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  moreLinkBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moreLinkText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
}));
