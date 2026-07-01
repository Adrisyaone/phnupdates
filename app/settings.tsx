import React from 'react';
import { Alert, Linking, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowUpCircle, Bell, ChevronRight, Info, Languages, LayoutGrid, Moon, Palette, Shield, Sun } from 'lucide-react-native';
import { colors, createThemedStyles, ThemePreference } from '@/constants/colors';
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
      { label: 'Morning', h: 7, m: 0 },
      { label: 'Afternoon', h: 13, m: 0 },
      { label: 'Evening', h: 18, m: 0 },
    ];

    return (
      <View style={styles.timeBlock}>
        <Text style={styles.timeBlockLabel}>{label}</Text>
        <View style={styles.presetRow}>
          {presets.map((p) => {
            const active = p.h === time.hour && p.m === time.minute;
            return (
              <TouchableOpacity
                key={p.label}
                style={[styles.presetChip, active && styles.presetChipActive]}
                onPress={() => { void updateSingleTime(key, p.h, p.m); }}
              >
                <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.timeAdjustRow}>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeDisplayValue}>
              {`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`}
            </Text>
          </View>
          <View style={styles.adjustBtnGroup}>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => { void updateSingleTime(key, time.hour - 1, time.minute); }}>
              <Text style={styles.adjustBtnText}>−H</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => { void updateSingleTime(key, time.hour + 1, time.minute); }}>
              <Text style={styles.adjustBtnText}>+H</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => { void updateSingleTime(key, time.hour, time.minute - 5); }}>
              <Text style={styles.adjustBtnText}>−5m</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => { void updateSingleTime(key, time.hour, time.minute + 5); }}>
              <Text style={styles.adjustBtnText}>+5m</Text>
            </TouchableOpacity>
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
      <ScrollView contentContainerStyle={styles.content}>

        {/* Appearance */}
        <View style={styles.sectionHeader}>
          <Palette size={15} color={colors.primary} />
          <Text style={styles.sectionTitle}>Appearance</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Theme</Text>
          <View style={styles.themeRow}>
            {(['light', 'dark'] as ThemePreference[]).map((option) => {
              const active = theme === option;
              const Icon = option === 'light' ? Sun : Moon;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.themeCard, active && styles.themeCardActive]}
                  onPress={() => { void setTheme(option); }}
                >
                  <Icon size={22} color={active ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
                    {option === 'light' ? t('light') : t('dark')}
                  </Text>
                  {active ? <View style={styles.themeActiveDot} /> : null}
                </TouchableOpacity>
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
          {renderSwitch('Quote of the Day Card', 'Daily public health inspiration quote', featureSettings.quoteCard, (enabled) => { void updateFeatureSettings({ quoteCard: enabled }); })}
          {renderSwitch('Latest News Section', 'Recent public health news on home screen', featureSettings.latestNewsSection, (enabled) => { void updateFeatureSettings({ latestNewsSection: enabled }); })}
          {renderSwitch('Opportunities Section', 'Jobs, grants and vacancy listings', featureSettings.opportunitiesSection, (enabled) => { void updateFeatureSettings({ opportunitiesSection: enabled }); })}
          {renderSwitch('Job Portal Section', 'Job openings from organizations', featureSettings.jobPortalSection, (enabled) => { void updateFeatureSettings({ jobPortalSection: enabled }); })}
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
    gap: 10,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: colors.background,
    position: 'relative',
  },
  themeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0E',
  },
  themeLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  themeLabelActive: {
    color: colors.primary,
  },
  themeActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
  timeBlock: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginLeft: 4,
  },
  timeBlockLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  presetChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: colors.primary,
  },
  timeAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeDisplay: {
    backgroundColor: colors.primary + '14',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  timeDisplayValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  adjustBtnGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  adjustBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adjustBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
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
