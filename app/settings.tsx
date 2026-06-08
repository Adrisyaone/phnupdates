import React from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Languages, Palette, Bell, SlidersHorizontal, ArrowUpCircle } from 'lucide-react-native';
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
    } catch (error) {
      console.log('[Settings] Failed to open Play Store:', error);
      Alert.alert('Unable to open store', 'Please open the Play Store manually to update the app.');
    }
  };

  const openOtherApp = async () => {
    const appUrl = 'https://play.google.com/store/apps/details?id=app.healtyme.com';

    try {
      await Linking.openURL(appUrl);
    } catch (error) {
      console.log('[Settings] Failed to open other app link:', error);
      Alert.alert('Unable to open link', 'Please open the Play Store manually to view our other app.');
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
    await updateNotificationSettings({
      [key]: [{ id: '1', hour, minute }],
    } as any);
  };

  const renderTimeEditor = (
    label: string,
    key: 'healthTipReminderTimes' | 'quoteReminderTimes' | 'publicHealthDayReminderTimes' | 'interestedJobsReminderTimes',
    fallbackHour: number,
    fallbackMinute: number,
  ) => {
    const time = notificationSettings[key]?.[0] ?? { id: '1', hour: fallbackHour, minute: fallbackMinute };

    return (
      <View style={styles.timeEditorCard}>
        <Text style={styles.timeEditorLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {[
            { label: 'Morning', h: 7, m: 0 },
            { label: 'Afternoon', h: 13, m: 0 },
            { label: 'Evening', h: 18, m: 0 },
            { label: 'Custom', h: time.hour, m: time.minute },
          ].map((p) => {
            const active = p.h === time.hour && p.m === time.minute && p.label !== 'Custom';
            return (
              <TouchableOpacity
                key={p.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => { void updateSingleTime(key, p.h, p.m); }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.timeEditorRow}>
          <TouchableOpacity
            style={styles.timeAdjustBtn}
            onPress={() => { void updateSingleTime(key, time.hour - 1, time.minute); }}
          >
            <Text style={styles.timeAdjustBtnText}>-H</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeAdjustBtn}
            onPress={() => { void updateSingleTime(key, time.hour + 1, time.minute); }}
          >
            <Text style={styles.timeAdjustBtnText}>+H</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeAdjustBtn}
            onPress={() => { void updateSingleTime(key, time.hour, time.minute - 5); }}
          >
            <Text style={styles.timeAdjustBtnText}>-5m</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timeAdjustBtn}
            onPress={() => { void updateSingleTime(key, time.hour, time.minute + 5); }}
          >
            <Text style={styles.timeAdjustBtnText}>+5m</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.timeEditorValue}>{`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Palette size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>{t('theme')}</Text>
          </View>
          <View style={styles.optionRow}>
            {(['light', 'dark'] as ThemePreference[]).map((option) => {
              const active = theme === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    void setTheme(option);
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{option === 'light' ? t('light') : t('dark')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Languages size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>{t('language')}</Text>
          </View>
          <View style={styles.optionRow}>
            {LANGUAGES.map((lang) => {
              const active = language === lang.key;
              return (
                <TouchableOpacity
                  key={lang.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    void setLanguage(lang.key as Language);
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{lang.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SlidersHorizontal size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Feature Visibility</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Health Tips Card</Text>
            <Switch
              value={featureSettings.healthTipsCard}
              onValueChange={(enabled) => {
                void updateFeatureSettings({ healthTipsCard: enabled });
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={featureSettings.healthTipsCard ? colors.primary : colors.surfaceAlt}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Public Health Days Card</Text>
            <Switch
              value={featureSettings.publicHealthDaysCard}
              onValueChange={(enabled) => {
                void updateFeatureSettings({ publicHealthDaysCard: enabled });
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={featureSettings.publicHealthDaysCard ? colors.primary : colors.surfaceAlt}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Public Health Quote Card</Text>
            <Switch
              value={featureSettings.quoteCard}
              onValueChange={(enabled) => {
                void updateFeatureSettings({ quoteCard: enabled });
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={featureSettings.quoteCard ? colors.primary : colors.surfaceAlt}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Latest News Section</Text>
            <Switch
              value={featureSettings.latestNewsSection}
              onValueChange={(enabled) => {
                void updateFeatureSettings({ latestNewsSection: enabled });
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={featureSettings.latestNewsSection ? colors.primary : colors.surfaceAlt}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Opportunities Section</Text>
            <Switch
              value={featureSettings.opportunitiesSection}
              onValueChange={(enabled) => {
                void updateFeatureSettings({ opportunitiesSection: enabled });
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={featureSettings.opportunitiesSection ? colors.primary : colors.surfaceAlt}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Menu Grid Section</Text>
            <Switch
              value={featureSettings.menuGridSection}
              onValueChange={(enabled) => {
                void updateFeatureSettings({ menuGridSection: enabled });
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={featureSettings.menuGridSection ? colors.primary : colors.surfaceAlt}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bell size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>{t('notifications')}</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('healthTipReminder')}</Text>
            <Switch
              value={notificationSettings.healthTipReminderEnabled}
              onValueChange={(enabled) => {
                void (async () => {
                  if (!(await ensurePermissionIfEnabling(enabled))) return;
                  await updateNotificationSettings({ healthTipReminderEnabled: enabled });
                })();
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={notificationSettings.healthTipReminderEnabled ? colors.primary : colors.surfaceAlt}
            />
          </View>
          {renderTimeEditor('Health Tips Time', 'healthTipReminderTimes', 7, 0)}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Today&apos;s Quote Reminder</Text>
            <Switch
              value={notificationSettings.quoteReminderEnabled}
              onValueChange={(enabled) => {
                void (async () => {
                  if (!(await ensurePermissionIfEnabling(enabled))) return;
                  await updateNotificationSettings({ quoteReminderEnabled: enabled });
                })();
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={notificationSettings.quoteReminderEnabled ? colors.primary : colors.surfaceAlt}
            />
          </View>
          {renderTimeEditor('Quote Reminder Time', 'quoteReminderTimes', 8, 0)}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Today&apos;s Public Health Day Reminder</Text>
            <Switch
              value={notificationSettings.publicHealthDayReminderEnabled}
              onValueChange={(enabled) => {
                void (async () => {
                  if (!(await ensurePermissionIfEnabling(enabled))) return;
                  await updateNotificationSettings({ publicHealthDayReminderEnabled: enabled });
                })();
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={notificationSettings.publicHealthDayReminderEnabled ? colors.primary : colors.surfaceAlt}
            />
          </View>
          {renderTimeEditor('Public Health Day Time', 'publicHealthDayReminderTimes', 8, 30)}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Interested Jobs Apply Reminder</Text>
            <Switch
              value={notificationSettings.interestedJobsReminderEnabled}
              onValueChange={(enabled) => {
                void (async () => {
                  if (!(await ensurePermissionIfEnabling(enabled))) return;
                  await updateNotificationSettings({ interestedJobsReminderEnabled: enabled });
                })();
              }}
              trackColor={{ false: colors.border, true: colors.primary + '66' }}
              thumbColor={notificationSettings.interestedJobsReminderEnabled ? colors.primary : colors.surfaceAlt}
            />
          </View>
          {renderTimeEditor('Interested Jobs Time', 'interestedJobsReminderTimes', 9, 0)}

          <Text style={styles.fieldLabel}>{t('notificationMode')}</Text>
          <View style={styles.optionRow}>
            {(['sound', 'vibration', 'both'] as NotificationMode[]).map((mode) => {
              const active = notificationSettings.notificationMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    void updateNotificationSettings({ notificationMode: mode });
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{mode}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ArrowUpCircle size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>App Update</Text>
          </View>

          <Text style={styles.updateMeta}>Installed version: {currentVersion}</Text>
          <Text style={styles.updateMessage}>Tap Update Now to open the Play Store.</Text>

          <View style={styles.updateActions}>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => {
                void openPlayStore();
              }}
            >
              <View style={styles.buttonInline}>
                <ArrowUpCircle size={16} color={colors.text} />
                <Text style={styles.moreButtonText}>Update Now</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>More</Text>
          </View>
          <View style={styles.moreRow}>
            <TouchableOpacity style={styles.moreButton} onPress={() => { router.push('/about-us'); }}>
              <Text style={styles.moreButtonText}>About Us</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreButton} onPress={() => { router.push('/privacy-policy'); }}>
              <Text style={styles.moreButtonText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreButton} onPress={() => { void openOtherApp(); }}>
              <Text style={styles.moreButtonText}>Our other app</Text>
            </TouchableOpacity>
          </View>
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
    gap: 12,
    paddingBottom: 26,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.primaryDark,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  timeEditorCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.background,
    gap: 8,
  },
  timeEditorLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  timeEditorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeAdjustBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeAdjustBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  timeEditorValue: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '700',
  },
  moreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  updateMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  updateMessage: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  updateActions: {
    flexDirection: 'row',
    gap: 10,
  },
  moreButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  moreButtonDisabled: {
    opacity: 0.55,
  },
  buttonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  moreButtonTextDisabled: {
    color: colors.textSecondary,
  },
}));
