import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { ThemePreference, setColorTheme } from '@/constants/colors';
import { Language, getTranslation } from '@/constants/translations';
import { getDailyTip } from '@/mocks/healthTips';
import { PUBLIC_HEALTH_QUOTES } from '@/constants/publicHealthQuotes';
import { PUBLIC_HEALTH_DAYS } from '@/constants/publicHealthDays';
import { JOB_PORTAL_LABELS } from '@/constants/blogMenus';
import { getInterestedPosts } from '@/services/interestedPosts';
import { clearPendingNotificationQuickLog, setPendingNotificationQuickLog } from '@/services/notificationQuickLogState';
import { hashPin as secureHashPin, legacyHashPin, BRUTE_FORCE_CONFIG, sanitizeForLog } from '@/constants/security';

const LANGUAGE_KEY = 'healthme_language';
const THEME_KEY = 'healthme_theme';
const NOTIFICATION_SETTINGS_KEY = 'healthme_notification_settings';
const APP_LOCK_SETTINGS_KEY = 'healthme_app_lock_settings';
const FLOATING_TABS_KEY = 'healthme_floating_tabs';
const FASTING_SAVINGS_KEY = 'healthme_fasting_savings';
const DONATION_HISTORY_KEY = 'healthme_donation_history';
const DASHBOARD_WIDGETS_KEY = 'healthme_dashboard_widgets';
const SMART_DEVICES_KEY = 'healthme_smart_devices';
const FEATURE_SETTINGS_KEY = 'healthme_feature_settings';
const PROFILE_KEY = 'healthme_profile';
const ACTIVITY_PLAN_STORAGE_KEY = 'healthme_activity_plans';

export interface ReminderTime {
  id: string;
  hour: number;
  minute: number;
}

export type NotificationMode = 'sound' | 'vibration' | 'both';

export interface NotificationSettings {
  activityReminderEnabled: boolean;
  activityReminderTimes: ReminderTime[];
  activityReminderDays: boolean[];
  calorieAlertEnabled: boolean;
  healthTipReminderEnabled: boolean;
  healthTipReminderTimes: ReminderTime[];
  quoteReminderEnabled: boolean;
  quoteReminderTimes: ReminderTime[];
  publicHealthDayReminderEnabled: boolean;
  publicHealthDayReminderTimes: ReminderTime[];
  interestedJobsReminderEnabled: boolean;
  interestedJobsReminderTimes: ReminderTime[];
  notificationMode: NotificationMode;
  notificationSound: string;
}

export interface AppLockSettings {
  enabled: boolean;
  biometricEnabled: boolean;
  pinHash: string | null;
}

export interface FloatingTabsSettings {
  food: boolean;
  activity: boolean;
  weight: boolean;
  medication: boolean;
  bp: boolean;
  glucose: boolean;
  lipid: boolean;
  fasting: boolean;
  // New quick-access floating tabs
  quotes?: boolean;
  healthTips?: boolean;
  publicHealthDays?: boolean;
}

export type FloatingTabKey = keyof FloatingTabsSettings;

export interface FastingSavingsSettings {
  ratePerHour: number;
  currency: string;
  currencySymbol: string;
}

export interface DonationRecord {
  id: string;
  amount: number;
  currency: string;
  date: number;
  note?: string;
}

export interface DashboardWidgets {
  dailyTip: boolean;
  healthAlerts: boolean;
  scoreboard: boolean;
  weightHeight: boolean;
  bmi: boolean;
  bpChart: boolean;
  pulseChart: boolean;
  weightChart: boolean;
  glucoseChart: boolean;
  calorieRequirement: boolean;
  todaySummary: boolean;
  calorieIntake: boolean;
  nutrientTrends: boolean;
  caloriesBurned: boolean;
  fasting: boolean;
  weeklySummary: boolean;
  offlineStatus: boolean;
  medicationAdherence: boolean;
  quickTools: boolean;
  history: boolean;
}

export interface FeatureSettings {
  healthTipsCard: boolean;
  publicHealthDaysCard: boolean;
  quoteCard: boolean;
  latestNewsSection: boolean;
  jobPortalSection: boolean;
  opportunitiesSection: boolean;
  menuGridSection: boolean;
  imageSizePreset: 'square' | 'portrait' | 'landscape' | 'custom';
  imageSizeWidth: number;
  imageSizeHeight: number;
}

export type DashboardWidgetKey = keyof DashboardWidgets;

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetKey, string> = {
  dailyTip: 'Daily Health Tip',
  healthAlerts: 'Health Alerts',
  scoreboard: 'Quick Health Snapshot',
  weightHeight: 'Weight and Height',
  bmi: 'BMI Overview',
  bpChart: 'Blood Pressure Trend',
  pulseChart: 'Pulse Trend',
  weightChart: 'Weight and BMI Trend',
  glucoseChart: 'Blood Sugar Trend',
  calorieRequirement: 'Daily Calorie Goal',
  todaySummary: 'Today\'s Summary',
  calorieIntake: 'Calorie Intake Trend',
  nutrientTrends: 'Nutrition Trends',
  caloriesBurned: 'Activity Calories Burned',
  fasting: 'Fasting Progress',
  weeklySummary: 'Weekly Summary',
  offlineStatus: 'Sync and Backup Status',
  medicationAdherence: 'Medication Adherence',
  quickTools: 'Quick Tools',
  history: 'Calendar History',
};

export const DASHBOARD_WIDGET_ORDER: DashboardWidgetKey[] = [
  'todaySummary',
  'dailyTip',
  'weeklySummary',
  'healthAlerts',
  'scoreboard',
  'calorieRequirement',
  'weightHeight',
  'bmi',
  'calorieIntake',
  'nutrientTrends',
  'caloriesBurned',
  'weightChart',
  'bpChart',
  'pulseChart',
  'glucoseChart',
  'fasting',
  'medicationAdherence',
  'quickTools',
  'history',
  'offlineStatus',
];

export interface SmartDeviceConfig {
  id: string;
  name: string;
  type: 'smartwatch' | 'bp_monitor' | 'scale' | 'glucose_meter' | 'other';
  brand: string;
  connected: boolean;
  lastSync: number | null;
  lastSyncedData?: {
    pulse?: number;
    systolic?: number;
    diastolic?: number;
    weight?: number;
    glucose?: number;
    steps?: number;
    sleepHours?: number;
  } | null;
  syncPulse: boolean;
  syncBP: boolean;
  syncWeight: boolean;
  syncGlucose: boolean;
  syncSteps: boolean;
  syncSleep: boolean;
}

export const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
];

const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgets = {
  dailyTip: true,
  healthAlerts: true,
  scoreboard: true,
  weightHeight: true,
  bmi: true,
  bpChart: true,
  pulseChart: true,
  weightChart: true,
  glucoseChart: true,
  calorieRequirement: true,
  todaySummary: true,
  calorieIntake: true,
  nutrientTrends: true,
  caloriesBurned: true,
  fasting: true,
  weeklySummary: false,
  offlineStatus: false,
  medicationAdherence: true,
  quickTools: true,
  history: true,
};

const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  healthTipsCard: true,
  publicHealthDaysCard: true,
  quoteCard: true,
  latestNewsSection: true,
  jobPortalSection: true,
  opportunitiesSection: true,
  menuGridSection: true,
  imageSizePreset: 'square',
  imageSizeWidth: 1024,
  imageSizeHeight: 1024,
};

const DEFAULT_FASTING_SAVINGS: FastingSavingsSettings = {
  ratePerHour: 1,
  currency: 'USD',
  currencySymbol: '$',
};

const DEFAULT_FLOATING_TABS: FloatingTabsSettings = {
  food: false,
  activity: false,
  weight: false,
  medication: false,
  bp: false,
  glucose: false,
  lipid: false,
  fasting: false,
  quotes: true,
  healthTips: true,
  publicHealthDays: true,
};

const MAX_FLOATING_TABS = 5;
const MAX_VISIBLE_FLOATING_TABS = 4;

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  activityReminderEnabled: false,
  activityReminderTimes: [{ id: '1', hour: 18, minute: 0 }],
  activityReminderDays: [false, true, true, true, true, true, false],
  calorieAlertEnabled: false,
  healthTipReminderEnabled: true,
  healthTipReminderTimes: [{ id: '1', hour: 7, minute: 0 }],
  quoteReminderEnabled: true,
  quoteReminderTimes: [{ id: '1', hour: 8, minute: 0 }],
  publicHealthDayReminderEnabled: true,
  publicHealthDayReminderTimes: [{ id: '1', hour: 8, minute: 30 }],
  interestedJobsReminderEnabled: true,
  interestedJobsReminderTimes: [{ id: '1', hour: 9, minute: 0 }],
  notificationMode: 'both',
  notificationSound: 'default',
};

export const NOTIFICATION_SOUND_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'chime', label: 'Chime' },
  { key: 'bell', label: 'Bell' },
  { key: 'alert', label: 'Alert' },
  { key: 'gentle', label: 'Gentle' },
];

const DEFAULT_APP_LOCK_SETTINGS: AppLockSettings = {
  enabled: false,
  biometricEnabled: false,
  pinHash: null,
};

const PIN_ATTEMPTS_KEY = 'healthme_pin_attempts';
const PIN_LOCKOUT_KEY = 'healthme_pin_lockout';
const NOTIFICATION_QUICK_LOG_TTL_MS = 2 * 60 * 1000;

type QuickLogRoute = 'activity' | 'food';

interface ActivityPlanWorkoutNotificationItem {
  id: string;
  name?: string;
  time?: string;
  day?: string;
  completed?: boolean;
  startHour?: number;
  startMinute?: number;
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number;
}

interface ActivityPlanMap {
  [date: string]: ActivityPlanWorkoutNotificationItem[];
}

let Notifications: typeof import('expo-notifications') | null = null;
let scheduleWorkerRunning = false;
let pendingScheduleRequest: { settings: NotificationSettings; lang: Language } | null = null;

const ACTIVITY_LOG_CATEGORY = 'activity-log-actions';
const CALORIE_LOG_CATEGORY = 'calorie-log-actions';

function hasAnyScheduledReminderEnabled(settings: NotificationSettings): boolean {
  return Boolean(
    settings.activityReminderEnabled
    || settings.healthTipReminderEnabled
    || settings.quoteReminderEnabled
    || settings.publicHealthDayReminderEnabled
    || settings.interestedJobsReminderEnabled
  );
}

function stableRandomIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function getTodayPublicHealthDaysText(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const todayDays = PUBLIC_HEALTH_DAYS
    .filter((item) => item.month === month && item.day === day)
    .map((item) => item.title);

  if (todayDays.length === 0) {
    return 'Check today\'s public health day updates in the app.';
  }

  if (todayDays.length === 1) {
    return `Today: ${todayDays[0]}`;
  }

  return `Today: ${todayDays.slice(0, 2).join(' | ')}`;
}

function parseTimeSlotToHourMinute(timeSlot?: string): { hour: number; minute: number } {
  if (timeSlot === 'Morning') return { hour: 7, minute: 0 };
  if (timeSlot === 'Afternoon') return { hour: 13, minute: 0 };
  if (timeSlot === 'Evening') return { hour: 18, minute: 0 };
  return { hour: 18, minute: 0 };
}

function formatHourMinute(hour: number, minute: number): string {
  const h12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function getWorkoutStartDate(dateKey: string, workout: ActivityPlanWorkoutNotificationItem): Date | null {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const fallback = parseTimeSlotToHourMinute(workout.time);
  const hour = typeof workout.startHour === 'number' ? workout.startHour : fallback.hour;
  const minute = typeof workout.startMinute === 'number' ? workout.startMinute : fallback.minute;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  date.setHours(hour, minute, 0, 0);
  return date;
}

const initNotifications = async () => {
  if (Platform.OS === 'web') return;
  try {
    Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('health-alerts', {
        name: 'Health Alerts',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('health-tips', {
        name: 'Health Tips',
        importance: Notifications.AndroidImportance?.HIGH ?? 3,
        vibrationPattern: [0, 200, 200, 200],
        sound: 'default',
      });
    }

    // Removed quick-log action buttons for notifications to disable
    // direct "Log Food" / "Log Activity" actions from push notifications.

    console.log('[SettingsContext] Notifications initialized with action categories');
  } catch (error) {
    console.log('[SettingsContext] Notifications not available:', error);
    Notifications = null;
  }
};

initNotifications();

const performScheduleAllNotifications = async (settings: NotificationSettings, lang: Language) => {
  if (Platform.OS === 'web') return;
  if (!Notifications) {
    await initNotifications();
  }
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[SettingsContext] Cancelled all existing notifications');

    if (settings.activityReminderEnabled) {
      const days = settings.activityReminderDays || DEFAULT_NOTIFICATION_SETTINGS.activityReminderDays;
      const times = settings.activityReminderTimes || DEFAULT_NOTIFICATION_SETTINGS.activityReminderTimes;

      for (const reminderTime of times) {
        const { hour, minute } = reminderTime;
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          if (days[dayIndex]) {
            const weekday = dayIndex === 0 ? 1 : dayIndex + 1;
            await Notifications.scheduleNotificationAsync({
              content: {
                title: getTranslation(lang, 'activityReminderTitle'),
                body: getTranslation(lang, 'activityReminderBody'),
                sound: 'default',
                vibrate: [0, 250, 250, 250],
                data: { type: 'activity_reminder' },
                ...(Platform.OS === 'android' ? { channelId: 'health-alerts' } : {}),
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday,
                hour,
                minute,
              },
            });
            console.log(`[SettingsContext] Scheduled activity reminder day ${dayIndex} at ${hour}:${minute}`);
          }
        }
      }
    } else {
      // Activity reminders are disabled; nothing to schedule.
    }

    if (settings.healthTipReminderEnabled) {
      const tipTimes = settings.healthTipReminderTimes?.length
        ? settings.healthTipReminderTimes
        : DEFAULT_NOTIFICATION_SETTINGS.healthTipReminderTimes;
      let ncdsForTip: string[] = [];
      try {
        const storedProfile = await AsyncStorage.getItem(PROFILE_KEY);
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          if (Array.isArray(parsedProfile?.ncds)) {
            ncdsForTip = parsedProfile.ncds;
          }
        }
      } catch (e) {
        console.log('[SettingsContext] Failed to read profile for daily tip:', e);
      }

      const dailyTip = getDailyTip(ncdsForTip);
      const tipBody = dailyTip?.tip || getTranslation(lang, 'healthTipReminderBody');
      const tipTitle = 'Health Tip';
      for (const reminderTime of tipTimes) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: tipTitle,
            body: tipBody,
            sound: 'default',
            vibrate: [0, 200, 200, 200],
            data: { type: 'health_tip', route: '/(tabs)/(home)', tip: tipBody },
            ...(Platform.OS === 'android' ? { channelId: 'health-tips' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: reminderTime.hour,
            minute: reminderTime.minute,
          },
        });
        console.log(`[SettingsContext] Scheduled health tip at ${reminderTime.hour}:${reminderTime.minute} with tip: ${tipBody.substring(0, 50)}...`);
      }
    } else {
      console.log('[SettingsContext] Health tip reminder disabled');
    }

    if (settings.quoteReminderEnabled) {
      const quoteTimes = settings.quoteReminderTimes?.length
        ? settings.quoteReminderTimes
        : DEFAULT_NOTIFICATION_SETTINGS.quoteReminderTimes;
      const now = new Date();
      const seed = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const quoteIndex = stableRandomIndex(`quote-${seed}`, PUBLIC_HEALTH_QUOTES.length);
      const selectedQuote = PUBLIC_HEALTH_QUOTES[quoteIndex];
      const quoteBody = selectedQuote?.quote || 'Read today\'s public health quote in the app.';

      for (const reminderTime of quoteTimes) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Today\'s Public Health Quote',
            body: quoteBody,
            sound: 'default',
            vibrate: [0, 200, 200, 200],
            data: { type: 'daily_quote', route: '/(tabs)/(home)' },
            ...(Platform.OS === 'android' ? { channelId: 'health-tips' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: reminderTime.hour,
            minute: reminderTime.minute,
          },
        });
        console.log(`[SettingsContext] Scheduled quote reminder at ${reminderTime.hour}:${reminderTime.minute}`);
      }
    } else {
      console.log('[SettingsContext] Quote reminder disabled');
    }

    if (settings.publicHealthDayReminderEnabled) {
      const dayTimes = settings.publicHealthDayReminderTimes?.length
        ? settings.publicHealthDayReminderTimes
        : DEFAULT_NOTIFICATION_SETTINGS.publicHealthDayReminderTimes;

      const schedNow = new Date();
      const startOfToday = new Date(schedNow.getFullYear(), schedNow.getMonth(), schedNow.getDate());
      const lookAheadMs = 90 * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(schedNow.getTime() + lookAheadMs);

      // Group titles by calendar date within the 90-day look-ahead window
      const eventsByKey = new Map<string, { year: number; month: number; day: number; titles: string[] }>();
      for (const healthDay of PUBLIC_HEALTH_DAYS) {
        for (const yearOffset of [0, 1]) {
          const year = schedNow.getFullYear() + yearOffset;
          const eventDate = new Date(year, healthDay.month - 1, healthDay.day);
          if (eventDate < startOfToday || eventDate > cutoffDate) continue;
          const key = `${year}-${String(healthDay.month).padStart(2, '0')}-${String(healthDay.day).padStart(2, '0')}`;
          if (!eventsByKey.has(key)) {
            eventsByKey.set(key, { year, month: healthDay.month, day: healthDay.day, titles: [] });
          }
          eventsByKey.get(key)!.titles.push(healthDay.title);
          break;
        }
      }

      const sortedEvents = Array.from(eventsByKey.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });

      const MAX_PHD_NOTIFICATIONS = 20;
      let phdScheduled = 0;

      for (const event of sortedEvents) {
        if (phdScheduled >= MAX_PHD_NOTIFICATIONS) break;
        const body = event.titles.length === 1
          ? `Today: ${event.titles[0]}`
          : `Today: ${event.titles.slice(0, 2).join(' | ')}${event.titles.length > 2 ? ` +${event.titles.length - 2} more` : ''}`;

        for (const reminderTime of dayTimes) {
          const triggerDate = new Date(event.year, event.month - 1, event.day, reminderTime.hour, reminderTime.minute, 0, 0);
          if (triggerDate.getTime() <= schedNow.getTime()) continue;
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Today's Public Health Day",
              body,
              sound: 'default',
              vibrate: [0, 200, 200, 200],
              data: { type: 'public_health_day', route: '/(tabs)/(home)' },
              ...(Platform.OS === 'android' ? { channelId: 'health-tips' } : {}),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
          phdScheduled++;
          console.log(`[SettingsContext] Scheduled PHD "${body.substring(0, 40)}" on ${event.year}-${event.month}-${event.day} at ${reminderTime.hour}:${reminderTime.minute}`);
        }
      }
      if (phdScheduled === 0) {
        console.log('[SettingsContext] No upcoming public health days to schedule in next 90 days');
      }
    } else {
      console.log('[SettingsContext] Public health day reminder disabled');
    }

    if (settings.interestedJobsReminderEnabled) {
      const jobsTimes = settings.interestedJobsReminderTimes?.length
        ? settings.interestedJobsReminderTimes
        : DEFAULT_NOTIFICATION_SETTINGS.interestedJobsReminderTimes;

      const interestedPosts = await getInterestedPosts();
      const allowedJobLabels = new Set(JOB_PORTAL_LABELS.map((label) => label.trim().toLowerCase()));
      const interestedJobs = interestedPosts.filter((post) =>
        Array.isArray(post.labels) && post.labels.some((label) => allowedJobLabels.has(label.trim().toLowerCase()))
      );

      if (interestedJobs.length > 0) {
        const jobsBody = interestedJobs.length === 1
          ? 'You have 1 interested job saved. Tap to review and apply.'
          : `You have ${interestedJobs.length} interested jobs saved. Tap to review and apply.`;

        for (const reminderTime of jobsTimes) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Apply for Interested Jobs',
              body: jobsBody,
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              data: {
                type: 'interested_jobs',
                route: '/(tabs)/(home)/interested?menuKey=opportunities',
              },
              ...(Platform.OS === 'android' ? { channelId: 'daily-reminders' } : {}),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: reminderTime.hour,
              minute: reminderTime.minute,
            },
          });
          console.log(`[SettingsContext] Scheduled interested jobs reminder at ${reminderTime.hour}:${reminderTime.minute}`);
        }
      } else {
        console.log('[SettingsContext] Skipped interested jobs reminder: no interested jobs found');
      }
    } else {
      console.log('[SettingsContext] Interested jobs reminder disabled');
    }

    try {
      const rawPlans = await AsyncStorage.getItem(ACTIVITY_PLAN_STORAGE_KEY);
      if (rawPlans) {
        const plans = JSON.parse(rawPlans) as ActivityPlanMap;
        const now = Date.now();

        for (const [dateKey, workouts] of Object.entries(plans)) {
          if (!Array.isArray(workouts)) continue;

          for (const workout of workouts) {
            if (!workout || workout.completed || workout.reminderEnabled === false) {
              continue;
            }

            const startDate = getWorkoutStartDate(dateKey, workout);
            if (!startDate) continue;

            const reminderLeadMinutes = typeof workout.reminderMinutesBefore === 'number' && workout.reminderMinutesBefore >= 0
              ? workout.reminderMinutesBefore
              : 10;
            const reminderDate = new Date(startDate.getTime() - reminderLeadMinutes * 60 * 1000);

            if (reminderDate.getTime() <= now) {
              continue;
            }

            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Activity Planner Reminder',
                body: `${workout.name || 'Workout'} at ${formatHourMinute(startDate.getHours(), startDate.getMinutes())}. Time to get ready!`,
                sound: 'default',
                vibrate: [0, 250, 250, 250],
                data: {
                  type: 'activity_plan_reminder',
                  route: '/(tabs)/(home)',
                  workoutId: workout.id,
                  workoutDay: dateKey,
                },
                ...(Platform.OS === 'android' ? { channelId: 'daily-reminders' } : {}),
              },
              trigger: reminderDate as any,
            });
          }
        }
      }
    } catch (plannerError) {
      console.error('[SettingsContext] Error scheduling planner activity reminders:', plannerError);
    }
  } catch (error) {
    console.error('[SettingsContext] Error scheduling notifications:', error);
  }
};

const scheduleAllNotifications = async (settings: NotificationSettings, lang: Language) => {
  pendingScheduleRequest = { settings, lang };

  if (scheduleWorkerRunning) {
    return;
  }

  scheduleWorkerRunning = true;
  try {
    while (pendingScheduleRequest) {
      const request = pendingScheduleRequest;
      pendingScheduleRequest = null;
      await performScheduleAllNotifications(request.settings, request.lang);
    }
  } finally {
    scheduleWorkerRunning = false;
  }
};

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [language, setLanguageState] = useState<Language>('en');
  const [theme, setThemeState] = useState<ThemePreference>('dark');
  const [notificationSettings, setNotificationSettingsState] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [appLockSettings, setAppLockSettingsState] = useState<AppLockSettings>(DEFAULT_APP_LOCK_SETTINGS);
  const [isLocked, setIsLocked] = useState(false);
  const [notificationQuickLogAccess, setNotificationQuickLogAccess] = useState(false);
  const [notificationQuickLogToken, setNotificationQuickLogToken] = useState<string | null>(null);
  const [notificationQuickLogExpiresAt, setNotificationQuickLogExpiresAt] = useState<number>(0);
  const [notificationQuickLogRoute, setNotificationQuickLogRoute] = useState<QuickLogRoute | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [floatingTabs, setFloatingTabsState] = useState<FloatingTabsSettings>(DEFAULT_FLOATING_TABS);
  const [fastingSavings, setFastingSavingsState] = useState<FastingSavingsSettings>(DEFAULT_FASTING_SAVINGS);
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [dashboardWidgets, setDashboardWidgetsState] = useState<DashboardWidgets>(DEFAULT_DASHBOARD_WIDGETS);
  const [featureSettings, setFeatureSettingsState] = useState<FeatureSettings>(DEFAULT_FEATURE_SETTINGS);
  const [smartDevices, setSmartDevicesState] = useState<SmartDeviceConfig[]>([]);

  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
    checkNotificationPermission();
    checkBiometricAvailability();
  }, []);

  useEffect(() => {
    if (settingsLoaded) {
      scheduleAllNotifications(notificationSettings, language);
    }
  }, [settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (Platform.OS === 'web') return;

    const syncNotifications = async () => {
      if (!Notifications) {
        await initNotifications();
      }

      if (!hasAnyScheduledReminderEnabled(notificationSettings)) {
        await scheduleAllNotifications(notificationSettings, language);
        return;
      }

      const granted = notificationPermission || await requestNotificationPermission();
      if (!granted) {
        console.log('[SettingsContext] Notification permission not granted; reminders may not appear in background.');
        return;
      }

      await scheduleAllNotifications(notificationSettings, language);
    };

    void syncNotifications();
  }, [
    settingsLoaded,
    language,
    notificationPermission,
    notificationSettings,
  ]);

  useEffect(() => {
    setColorTheme(theme);
  }, [theme]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // Keep quick-log access across foreground/background transitions.
      // Expiration is handled by TTL timer below, which avoids races during notification opens.
      if (state === 'active' && notificationQuickLogExpiresAt > 0 && notificationQuickLogExpiresAt <= Date.now()) {
        setNotificationQuickLogAccess(false);
        setNotificationQuickLogToken(null);
        setNotificationQuickLogExpiresAt(0);
        setNotificationQuickLogRoute(null);
      }

      // Re-sync scheduled reminders whenever app returns to foreground.
      if (state === 'active' && settingsLoaded) {
        void scheduleAllNotifications(notificationSettings, language);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [language, notificationQuickLogExpiresAt, notificationSettings, settingsLoaded]);

  useEffect(() => {
    if (!notificationQuickLogAccess || notificationQuickLogExpiresAt <= Date.now()) return;

    const timeoutMs = notificationQuickLogExpiresAt - Date.now();
    const timer = setTimeout(() => {
      setNotificationQuickLogAccess(false);
      setNotificationQuickLogToken(null);
      setNotificationQuickLogExpiresAt(0);
      setNotificationQuickLogRoute(null);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [notificationQuickLogAccess, notificationQuickLogExpiresAt]);

  const loadSettings = async () => {
    try {
      console.log('[SettingsContext] Loading settings');
      const [storedLanguage, storedTheme, storedNotifications, storedAppLock, storedFloatingTabs, storedFastingSavings, storedDonations, storedDashWidgets, storedSmartDevices, storedFeatureSettings] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY),
        AsyncStorage.getItem(APP_LOCK_SETTINGS_KEY),
        AsyncStorage.getItem(FLOATING_TABS_KEY),
        AsyncStorage.getItem(FASTING_SAVINGS_KEY),
        AsyncStorage.getItem(DONATION_HISTORY_KEY),
        AsyncStorage.getItem(DASHBOARD_WIDGETS_KEY),
        AsyncStorage.getItem(SMART_DEVICES_KEY),
        AsyncStorage.getItem(FEATURE_SETTINGS_KEY),
      ]);

      if (storedLanguage) {
        setLanguageState(storedLanguage as Language);
      }
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setThemeState(storedTheme);
        setColorTheme(storedTheme);
      }
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        const migratedHealthTipTimes = parsed.healthTipReminderTimes?.length
          ? parsed.healthTipReminderTimes
          : (typeof parsed.healthTipReminderHour === 'number' && typeof parsed.healthTipReminderMinute === 'number')
            ? [{ id: '1', hour: parsed.healthTipReminderHour, minute: parsed.healthTipReminderMinute }]
            : DEFAULT_NOTIFICATION_SETTINGS.healthTipReminderTimes;
        const migratedQuoteTimes = parsed.quoteReminderTimes?.length
          ? parsed.quoteReminderTimes
          : DEFAULT_NOTIFICATION_SETTINGS.quoteReminderTimes;
        const migratedPublicHealthDayTimes = parsed.publicHealthDayReminderTimes?.length
          ? parsed.publicHealthDayReminderTimes
          : DEFAULT_NOTIFICATION_SETTINGS.publicHealthDayReminderTimes;
        const migratedInterestedJobsTimes = parsed.interestedJobsReminderTimes?.length
          ? parsed.interestedJobsReminderTimes
          : DEFAULT_NOTIFICATION_SETTINGS.interestedJobsReminderTimes;
        const loadedSettings = {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...parsed,
          activityReminderTimes: parsed.activityReminderTimes?.length 
            ? parsed.activityReminderTimes 
            : DEFAULT_NOTIFICATION_SETTINGS.activityReminderTimes,
          activityReminderDays: parsed.activityReminderDays?.length === 7
            ? parsed.activityReminderDays
            : DEFAULT_NOTIFICATION_SETTINGS.activityReminderDays,
          healthTipReminderTimes: migratedHealthTipTimes,
          quoteReminderTimes: migratedQuoteTimes,
          publicHealthDayReminderTimes: migratedPublicHealthDayTimes,
          interestedJobsReminderTimes: migratedInterestedJobsTimes,
        };
        setNotificationSettingsState(loadedSettings);
      }
      if (storedFloatingTabs) {
        setFloatingTabsState({ ...DEFAULT_FLOATING_TABS, ...JSON.parse(storedFloatingTabs) });
      }
      if (storedFastingSavings) {
        setFastingSavingsState({ ...DEFAULT_FASTING_SAVINGS, ...JSON.parse(storedFastingSavings) });
      }
      if (storedDonations) {
        setDonationHistory(JSON.parse(storedDonations));
      }
      if (storedDashWidgets) {
        setDashboardWidgetsState({ ...DEFAULT_DASHBOARD_WIDGETS, ...JSON.parse(storedDashWidgets) });
      }
      if (storedFeatureSettings) {
        setFeatureSettingsState({ ...DEFAULT_FEATURE_SETTINGS, ...JSON.parse(storedFeatureSettings) });
      }
      if (storedSmartDevices) {
        const parsedDevices = JSON.parse(storedSmartDevices) as SmartDeviceConfig[];
        const migratedDevices = parsedDevices.map((device) => ({
          ...device,
          lastSyncedData: typeof (device as any).lastSyncedData === 'object'
            ? (device as any).lastSyncedData
            : null,
          syncSteps: typeof (device as any).syncSteps === 'boolean'
            ? (device as any).syncSteps
            : device.type === 'smartwatch',
          syncSleep: typeof (device as any).syncSleep === 'boolean'
            ? (device as any).syncSleep
            : device.type === 'smartwatch',
        }));
        setSmartDevicesState(migratedDevices);
      }
      if (storedAppLock) {
        const parsed = JSON.parse(storedAppLock);
        let migratedSettings = { ...DEFAULT_APP_LOCK_SETTINGS, ...parsed };

        if (parsed.pinCode && !parsed.pinHash) {
          console.log('[SettingsContext] Migrating plain-text PIN to hashed PIN');
          try {
            const hashed = await secureHashPin(parsed.pinCode);
            migratedSettings = { ...migratedSettings, pinHash: hashed };
            delete (migratedSettings as any).pinCode;
            await AsyncStorage.setItem(APP_LOCK_SETTINGS_KEY, JSON.stringify(migratedSettings));
            console.log('[SettingsContext] PIN migration complete');
          } catch (migErr) {
            console.log('[SettingsContext] PIN migration failed:', migErr);
          }
        } else if (parsed.pinCode) {
          delete (migratedSettings as any).pinCode;
        }

        setAppLockSettingsState(migratedSettings);
        if (migratedSettings.enabled && migratedSettings.pinHash) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
          if (migratedSettings.enabled && !migratedSettings.pinHash) {
            const healedSettings = { ...migratedSettings, enabled: false };
            setAppLockSettingsState(healedSettings);
            await AsyncStorage.setItem(APP_LOCK_SETTINGS_KEY, JSON.stringify(healedSettings));
            console.log('[SettingsContext] Disabled app lock due to missing PIN hash');
          }
        }
      }
    } catch (error) {
      console.error('[SettingsContext] Error loading settings:', error);
    } finally {
      setIsLoading(false);
      setSettingsLoaded(true);
    }
  };

  const checkNotificationPermission = async () => {
    if (Platform.OS === 'web' || !Notifications) {
      setNotificationPermission(false);
      return;
    }
    
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status === 'granted');
    } catch (error) {
      console.log('[SettingsContext] Error checking notification permission:', error);
      setNotificationPermission(false);
    }
  };

  const checkBiometricAvailability = async () => {
    if (Platform.OS === 'web') {
      setBiometricAvailable(false);
      return;
    }
    
    try {
      const LocalAuthentication = await import('expo-local-authentication');
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
      console.log('[SettingsContext] Biometric available:', compatible && enrolled);
    } catch (error) {
      console.log('[SettingsContext] Biometric not available:', error);
      setBiometricAvailable(false);
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !Notifications) {
      return false;
    }
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      const granted = finalStatus === 'granted';
      setNotificationPermission(granted);
      return granted;
    } catch (error) {
      console.error('[SettingsContext] Error requesting notification permission:', error);
      return false;
    }
  };

  const setLanguage = useCallback(async (newLanguage: Language) => {
    console.log('[SettingsContext] Setting language:', newLanguage);
    setLanguageState(newLanguage);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, newLanguage);
    } catch (error) {
      console.error('[SettingsContext] Error saving language:', error);
    }
  }, []);

  const setTheme = useCallback(async (newTheme: ThemePreference) => {
    console.log('[SettingsContext] Setting theme:', newTheme);
    setThemeState(newTheme);
    setColorTheme(newTheme);

    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
    } catch (error) {
      console.error('[SettingsContext] Error saving theme:', error);
    }
  }, []);

  const updateNotificationSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    console.log('[SettingsContext] Updating notification settings:', newSettings);
    const updated: NotificationSettings = { ...notificationSettings, ...newSettings };
    setNotificationSettingsState(updated);

    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
      await scheduleAllNotifications(updated, language as Language);
    } catch (error) {
      console.error('[SettingsContext] Error saving notification settings:', error);
    }
  }, [language, notificationSettings]);



  const sendCalorieExceededNotification = useCallback(async () => {
    if (Platform.OS === 'web' || !notificationSettings.calorieAlertEnabled || !Notifications) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: getTranslation(language, 'calorieAlertTitle'),
          body: getTranslation(language, 'calorieAlertBody'),
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          ...(Platform.OS === 'android' ? { channelId: 'health-alerts' } : {}),
        },
        trigger: null,
      });
      console.log('[SettingsContext] Sent calorie exceeded notification');
    } catch (error) {
      console.error('[SettingsContext] Error sending notification:', error);
    }
  }, [language, notificationSettings.calorieAlertEnabled]);

  const rescheduleNotifications = useCallback(async () => {
    await scheduleAllNotifications(notificationSettings, language as Language);
  }, [language, notificationSettings]);

  const t = useCallback((key: string): string => {
    return getTranslation(language, key);
  }, [language]);

  const updateAppLockSettings = useCallback(async (newSettings: Partial<AppLockSettings>) => {
    console.log('[SettingsContext] Updating app lock settings:', sanitizeForLog(newSettings));
    try {
      let baseSettings = appLockSettings;
      const storedAppLock = await AsyncStorage.getItem(APP_LOCK_SETTINGS_KEY);
      if (storedAppLock) {
        try {
          baseSettings = { ...DEFAULT_APP_LOCK_SETTINGS, ...JSON.parse(storedAppLock) };
        } catch (parseError) {
          console.log('[SettingsContext] Failed to parse stored app lock settings:', parseError);
        }
      }

      const updated = { ...baseSettings, ...newSettings };

      if (updated.enabled && !updated.pinHash) {
        console.log('[SettingsContext] Refusing to enable app lock without PIN hash');
        const safeSettings = { ...updated, enabled: false };
        setAppLockSettingsState(safeSettings);
        await AsyncStorage.setItem(APP_LOCK_SETTINGS_KEY, JSON.stringify(safeSettings));
        return;
      }

      setAppLockSettingsState(updated);
      await AsyncStorage.setItem(APP_LOCK_SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[SettingsContext] Error saving app lock settings:', error);
    }
  }, [appLockSettings]);

  const setPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const hashed = await secureHashPin(pin);
      await updateAppLockSettings({ pinHash: hashed });
      console.log('[SettingsContext] PIN set successfully (hashed)');
      return true;
    } catch (error) {
      console.error('[SettingsContext] Error setting PIN:', error);
      return false;
    }
  }, [updateAppLockSettings]);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const lockoutUntilStr = await AsyncStorage.getItem(PIN_LOCKOUT_KEY);
      if (lockoutUntilStr) {
        const lockoutUntil = parseInt(lockoutUntilStr, 10);
        if (Date.now() < lockoutUntil) {
          console.log('[SettingsContext] PIN entry locked out');
          return false;
        } else {
          await AsyncStorage.removeItem(PIN_LOCKOUT_KEY);
          await AsyncStorage.setItem(PIN_ATTEMPTS_KEY, '0');
        }
      }

      const hashed = await secureHashPin(pin);
      const legacyHashed = legacyHashPin(pin);
      let storedPinHash = appLockSettings.pinHash;
      let storedAppLockRaw: string | null = null;
      if (!storedPinHash) {
        storedAppLockRaw = await AsyncStorage.getItem(APP_LOCK_SETTINGS_KEY);
        if (storedAppLockRaw) {
          try {
            const parsed = JSON.parse(storedAppLockRaw);
            if (typeof parsed?.pinHash === 'string') {
              storedPinHash = parsed.pinHash;
              if (storedPinHash !== appLockSettings.pinHash) {
                setAppLockSettingsState(prev => ({ ...prev, pinHash: storedPinHash }));
              }
            }
          } catch (parseError) {
            console.log('[SettingsContext] Failed to parse app lock settings while verifying PIN:', parseError);
          }
        }
      }

      const isValid = storedPinHash === hashed || storedPinHash === legacyHashed;

      if (isValid && storedPinHash === legacyHashed) {
        try {
          const currentRaw = storedAppLockRaw ?? await AsyncStorage.getItem(APP_LOCK_SETTINGS_KEY);
          const parsed = currentRaw ? JSON.parse(currentRaw) : {};
          const migrated = { ...DEFAULT_APP_LOCK_SETTINGS, ...parsed, pinHash: hashed };
          await AsyncStorage.setItem(APP_LOCK_SETTINGS_KEY, JSON.stringify(migrated));
          setAppLockSettingsState(prev => ({ ...prev, pinHash: hashed }));
          console.log('[SettingsContext] Migrated legacy PIN hash to secure hash');
        } catch (e) {
          console.log('[SettingsContext] Failed legacy hash migration:', e);
        }
      }

      if (!isValid) {
        const attemptsStr = await AsyncStorage.getItem(PIN_ATTEMPTS_KEY);
        const attempts = (attemptsStr ? parseInt(attemptsStr, 10) : 0) + 1;
        await AsyncStorage.setItem(PIN_ATTEMPTS_KEY, attempts.toString());

        if (attempts >= BRUTE_FORCE_CONFIG.EXTENDED_LOCKOUT_THRESHOLD) {
          const lockout = Date.now() + BRUTE_FORCE_CONFIG.EXTENDED_LOCKOUT_MS;
          await AsyncStorage.setItem(PIN_LOCKOUT_KEY, lockout.toString());
          console.log('[SettingsContext] Extended lockout activated after', attempts, 'attempts');
        } else if (attempts >= BRUTE_FORCE_CONFIG.MAX_ATTEMPTS) {
          const lockout = Date.now() + BRUTE_FORCE_CONFIG.LOCKOUT_DURATION_MS;
          await AsyncStorage.setItem(PIN_LOCKOUT_KEY, lockout.toString());
          console.log('[SettingsContext] Lockout activated after', attempts, 'attempts');
        }
      } else {
        await AsyncStorage.setItem(PIN_ATTEMPTS_KEY, '0');
        await AsyncStorage.removeItem(PIN_LOCKOUT_KEY);
      }

      return isValid;
    } catch (error) {
      console.error('[SettingsContext] PIN verification error:', error);
      return false;
    }
  }, [appLockSettings.pinHash]);

  const totalDonated = useMemo(() => {
    return donationHistory.reduce((sum, d) => sum + d.amount, 0);
  }, [donationHistory]);

  const addDonation = useCallback(async (amount: number, note?: string) => {
    const record: DonationRecord = {
      id: Date.now().toString(),
      amount,
      currency: fastingSavings.currency,
      date: Date.now(),
      note,
    };
    const updated = [record, ...donationHistory];
    setDonationHistory(updated);
    try {
      await AsyncStorage.setItem(DONATION_HISTORY_KEY, JSON.stringify(updated));
      console.log('[SettingsContext] Donation recorded:', record);
    } catch (error) {
      console.error('[SettingsContext] Error saving donation:', error);
    }
  }, [donationHistory, fastingSavings.currency]);

  const updateDonation = useCallback(async (id: string, updates: Partial<Pick<DonationRecord, 'amount' | 'note'>>) => {
    const updated = donationHistory.map(d => d.id === id ? { ...d, ...updates } : d);
    setDonationHistory(updated);
    try {
      await AsyncStorage.setItem(DONATION_HISTORY_KEY, JSON.stringify(updated));
      console.log('[SettingsContext] Donation updated:', id, updates);
    } catch (error) {
      console.error('[SettingsContext] Error updating donation:', error);
    }
  }, [donationHistory]);

  const deleteDonation = useCallback(async (id: string) => {
    const updated = donationHistory.filter(d => d.id !== id);
    setDonationHistory(updated);
    try {
      await AsyncStorage.setItem(DONATION_HISTORY_KEY, JSON.stringify(updated));
      console.log('[SettingsContext] Donation deleted:', id);
    } catch (error) {
      console.error('[SettingsContext] Error deleting donation:', error);
    }
  }, [donationHistory]);

  const updateDashboardWidgets = useCallback(async (newSettings: Partial<DashboardWidgets>) => {
    console.log('[SettingsContext] Updating dashboard widgets:', newSettings);
    const updated = { ...dashboardWidgets, ...newSettings };
    setDashboardWidgetsState(updated);
    try {
      await AsyncStorage.setItem(DASHBOARD_WIDGETS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[SettingsContext] Error saving dashboard widgets:', error);
    }
  }, [dashboardWidgets]);

  const updateFeatureSettings = useCallback(async (newSettings: Partial<FeatureSettings>) => {
    console.log('[SettingsContext] Updating feature settings:', newSettings);
    const updated = { ...featureSettings, ...newSettings };
    setFeatureSettingsState(updated);
    try {
      await AsyncStorage.setItem(FEATURE_SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[SettingsContext] Error saving feature settings:', error);
    }
  }, [featureSettings]);

  const addSmartDevice = useCallback(async (device: Omit<SmartDeviceConfig, 'id'>) => {
    const newDevice: SmartDeviceConfig = { ...device, id: Date.now().toString() };
    const updated = [...smartDevices, newDevice];
    setSmartDevicesState(updated);
    try {
      await AsyncStorage.setItem(SMART_DEVICES_KEY, JSON.stringify(updated));
      console.log('[SettingsContext] Smart device added:', newDevice.name);
    } catch (error) {
      console.error('[SettingsContext] Error saving smart device:', error);
    }
    return newDevice;
  }, [smartDevices]);

  const updateSmartDevice = useCallback(async (id: string, updates: Partial<SmartDeviceConfig>) => {
    const updated = smartDevices.map(d => d.id === id ? { ...d, ...updates } : d);
    setSmartDevicesState(updated);
    try {
      await AsyncStorage.setItem(SMART_DEVICES_KEY, JSON.stringify(updated));
      console.log('[SettingsContext] Smart device updated:', id);
    } catch (error) {
      console.error('[SettingsContext] Error updating smart device:', error);
    }
  }, [smartDevices]);

  const removeSmartDevice = useCallback(async (id: string) => {
    const updated = smartDevices.filter(d => d.id !== id);
    setSmartDevicesState(updated);
    try {
      await AsyncStorage.setItem(SMART_DEVICES_KEY, JSON.stringify(updated));
      console.log('[SettingsContext] Smart device removed:', id);
    } catch (error) {
      console.error('[SettingsContext] Error removing smart device:', error);
    }
  }, [smartDevices]);

  const syncSmartDevice = useCallback(async (id: string) => {
    const device = smartDevices.find(d => d.id === id);
    if (!device) return null;
    console.log('[SettingsContext] Syncing smart device:', device.name);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const syncData: {
      pulse?: number;
      systolic?: number;
      diastolic?: number;
      weight?: number;
      glucose?: number;
      steps?: number;
      sleepHours?: number;
    } = {};
    if (device.syncPulse) syncData.pulse = Math.floor(60 + Math.random() * 40);
    if (device.syncBP) { syncData.systolic = Math.floor(110 + Math.random() * 30); syncData.diastolic = Math.floor(65 + Math.random() * 25); }
    if (device.syncWeight) syncData.weight = Math.round((55 + Math.random() * 40) * 10) / 10;
    if (device.syncGlucose) syncData.glucose = Math.floor(80 + Math.random() * 60);
    if (device.syncSteps) syncData.steps = Math.floor(2500 + Math.random() * 9500);
    if (device.syncSleep) syncData.sleepHours = Math.round((4.5 + Math.random() * 4.5) * 10) / 10;
    await updateSmartDevice(id, { lastSync: Date.now(), connected: true, lastSyncedData: syncData });
    console.log('[SettingsContext] Sync data:', syncData);
    return syncData;
  }, [smartDevices, updateSmartDevice]);

  const updateFastingSavings = useCallback(async (newSettings: Partial<FastingSavingsSettings>) => {
    console.log('[SettingsContext] Updating fasting savings:', newSettings);
    const updated = { ...fastingSavings, ...newSettings };
    setFastingSavingsState(updated);
    try {
      await AsyncStorage.setItem(FASTING_SAVINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[SettingsContext] Error saving fasting savings:', error);
    }
  }, [fastingSavings]);

  const getEnabledTabCount = useCallback((tabs: FloatingTabsSettings): number => {
    return Object.values(tabs).filter(Boolean).length;
  }, []);

  const updateFloatingTabs = useCallback(async (newSettings: Partial<FloatingTabsSettings>): Promise<boolean> => {
    console.log('[SettingsContext] Updating floating tabs:', newSettings);
    const updated = { ...floatingTabs, ...newSettings };
    const enabledCount = Object.values(updated).filter(Boolean).length;
    if (enabledCount > MAX_FLOATING_TABS) {
      console.log('[SettingsContext] Max floating tabs reached:', enabledCount);
      return false;
    }
    setFloatingTabsState(updated);
    try {
      await AsyncStorage.setItem(FLOATING_TABS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[SettingsContext] Error saving floating tabs:', error);
    }
    return true;
  }, [floatingTabs]);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !biometricAvailable) {
      return false;
    }
    
    try {
      const LocalAuthentication = await import('expo-local-authentication');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometricPrompt'),
        fallbackLabel: t('usePin'),
        disableDeviceFallback: true,
      });
      
      console.log('[SettingsContext] Biometric auth result:', result.success);
      return result.success;
    } catch (error) {
      console.error('[SettingsContext] Biometric auth error:', error);
      return false;
    }
  }, [biometricAvailable, t]);

  const unlockApp = useCallback(() => {
    console.log('[SettingsContext] App unlocked');
    setIsLocked(false);
  }, []);

  const lockApp = useCallback(() => {
    if (appLockSettings.enabled) {
      console.log('[SettingsContext] App locked');
      setIsLocked(true);
    }
  }, [appLockSettings.enabled]);

  const grantNotificationQuickLogAccess = useCallback((route: QuickLogRoute): string => {
    const token = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    setPendingNotificationQuickLog(route, token);
    setNotificationQuickLogAccess(true);
    setNotificationQuickLogToken(token);
    setNotificationQuickLogExpiresAt(Date.now() + NOTIFICATION_QUICK_LOG_TTL_MS);
    setNotificationQuickLogRoute(route);
    return token;
  }, []);

  const revokeNotificationQuickLogAccess = useCallback(() => {
    clearPendingNotificationQuickLog();
    setNotificationQuickLogAccess(false);
    setNotificationQuickLogToken(null);
    setNotificationQuickLogExpiresAt(0);
    setNotificationQuickLogRoute(null);
  }, []);

  const isNotificationQuickLogAccessValid = useCallback((
    route?: QuickLogRoute,
    token?: string,
  ): boolean => {
    if (!notificationQuickLogAccess) return false;
    if (!notificationQuickLogToken || !notificationQuickLogRoute) return false;
    if (notificationQuickLogExpiresAt <= Date.now()) return false;
    if (route && notificationQuickLogRoute !== route) return false;
    if (token && notificationQuickLogToken !== token) return false;
    return true;
  }, [notificationQuickLogAccess, notificationQuickLogExpiresAt, notificationQuickLogRoute, notificationQuickLogToken]);

  return {
    language,
    setLanguage,
    theme,
    setTheme,
    notificationSettings,
    updateNotificationSettings,
    rescheduleNotifications,
    notificationPermission,
    requestNotificationPermission,
    sendCalorieExceededNotification,
    appLockSettings,
    updateAppLockSettings,
    setPin,
    verifyPin,
    authenticateWithBiometric,
    biometricAvailable,
    isLocked,
    notificationQuickLogAccess,
    notificationQuickLogToken,
    unlockApp,
    lockApp,
    grantNotificationQuickLogAccess,
    revokeNotificationQuickLogAccess,
    isNotificationQuickLogAccessValid,
    isLoading,
    t,
    floatingTabs,
    updateFloatingTabs,
    getEnabledTabCount,
    maxFloatingTabs: MAX_FLOATING_TABS,
    maxVisibleFloatingTabs: MAX_VISIBLE_FLOATING_TABS,
    fastingSavings,
    updateFastingSavings,
    donationHistory,
    totalDonated,
    addDonation,
    updateDonation,
    deleteDonation,
    dashboardWidgets,
    updateDashboardWidgets,
    featureSettings,
    updateFeatureSettings,
    smartDevices,
    addSmartDevice,
    updateSmartDevice,
    removeSmartDevice,
    syncSmartDevice,
  };
});
