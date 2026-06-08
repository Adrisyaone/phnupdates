import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import Constants from 'expo-constants';
import {
  Medication,
  MedicationLog,
  MedicationAdherence,
  MedicationFrequency,
  MedicationTime,
} from '@/types/food';
import { useSettings } from '@/contexts/SettingsContext';

const MEDICATIONS_KEY = 'healthme_medications';
const MEDICATION_LOGS_KEY = 'healthme_medication_logs';

const MEDICATION_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#22C55E',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function getTimesForFrequency(frequency: MedicationFrequency): MedicationTime[] {
  switch (frequency) {
    case 'daily':
      return [{ id: generateId(), hour: 8, minute: 0, label: 'Morning' }];
    case 'twice_daily':
      return [
        { id: generateId(), hour: 8, minute: 0, label: 'Morning' },
        { id: generateId(), hour: 20, minute: 0, label: 'Evening' },
      ];
    case 'three_times':
      return [
        { id: generateId(), hour: 8, minute: 0, label: 'Morning' },
        { id: generateId(), hour: 14, minute: 0, label: 'Afternoon' },
        { id: generateId(), hour: 20, minute: 0, label: 'Evening' },
      ];
    case 'weekly':
      return [{ id: generateId(), hour: 8, minute: 0, label: 'Weekly' }];
    case 'as_needed':
      return [];
    default:
      return [{ id: generateId(), hour: 8, minute: 0, label: 'Morning' }];
  }
}

function getFrequencyLabel(frequency: MedicationFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Daily';
    case 'twice_daily':
      return 'Twice daily';
    case 'three_times':
      return 'Three times daily';
    case 'weekly':
      return 'Weekly';
    case 'as_needed':
      return 'As needed';
    default:
      return 'Scheduled';
  }
}

let Notifications: typeof import('expo-notifications') | null = null;
let notificationPermissionGranted = false;

const MEDICATION_CATEGORY_ID = 'medication-actions';
const IS_EXPO_GO = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

const initNotifications = async () => {
  if (Platform.OS === 'web') return;
  if (IS_EXPO_GO) {
    console.log('[MedicationContext] Skipping expo-notifications init in Expo Go');
    return;
  }
  try {
    Notifications = await import('expo-notifications');
    console.log('[MedicationContext] Notifications module loaded');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    notificationPermissionGranted = finalStatus === 'granted';
    console.log('[MedicationContext] Notification permission:', finalStatus);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medication-reminders', {
        name: 'Medication Reminders',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    await Notifications.setNotificationCategoryAsync(MEDICATION_CATEGORY_ID, [
      {
        identifier: 'MARK_TAKEN',
        buttonTitle: 'Mark as Taken ✓',
        options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
      },
      {
        identifier: 'SKIP',
        buttonTitle: 'Skip',
        options: { opensAppToForeground: false, isDestructive: true, isAuthenticationRequired: false },
      },
    ]);
    console.log('[MedicationContext] Notification category registered');
  } catch (error) {
    console.log('[MedicationContext] Notifications not available:', error);
    Notifications = null;
  }
};

let notificationResponseHandler: ((response: any) => void) | null = null;

export const setNotificationResponseHandler = (handler: (response: any) => void) => {
  notificationResponseHandler = handler;
};

if (Platform.OS !== 'web') {
  initNotifications().then(() => {
    if (Notifications) {
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data;
        const notificationId = response.notification.request.identifier;
        console.log('[MedicationContext] Notification action:', actionId, data);
        if (actionId === 'MARK_TAKEN' || actionId === 'SKIP') {
          if (notificationResponseHandler) {
            notificationResponseHandler(response);
          }
          try {
            await Notifications!.dismissNotificationAsync(notificationId);
            console.log('[MedicationContext] Dismissed notification:', notificationId);
          } catch (e) {
            console.log('[MedicationContext] Error dismissing notification:', e);
          }
        }
      });
    }
  });
}

export const [MedicationProvider, useMedications] = createContextHook(() => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useSettings();
  const logsRef = useRef<MedicationLog[]>([]);
  logsRef.current = logs;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('[MedicationContext] Loading data');
      const [storedMeds, storedLogs] = await Promise.all([
        AsyncStorage.getItem(MEDICATIONS_KEY),
        AsyncStorage.getItem(MEDICATION_LOGS_KEY),
      ]);

      if (storedMeds) {
        setMedications(JSON.parse(storedMeds));
      }
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    } catch (error) {
      console.error('[MedicationContext] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMedications = useCallback(async (meds: Medication[]) => {
    try {
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(meds));
    } catch (error) {
      console.error('[MedicationContext] Error saving medications:', error);
    }
  }, []);

  const saveLogs = useCallback(async (newLogs: MedicationLog[]) => {
    try {
      await AsyncStorage.setItem(MEDICATION_LOGS_KEY, JSON.stringify(newLogs));
    } catch (error) {
      console.error('[MedicationContext] Error saving logs:', error);
    }
  }, []);

  const cancelMedicationNotifications = useCallback(async (medId: string) => {
    if (Platform.OS === 'web' || !Notifications) return;
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.content.data?.medicationId === medId) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
      console.log(`[MedicationContext] Cancelled notifications for med: ${medId}`);
    } catch (error) {
      console.error('[MedicationContext] Error cancelling notifications:', error);
    }
  }, []);

  const scheduleMedicationNotifications = useCallback(async (med: Medication) => {
    if (Platform.OS === 'web' || !Notifications || !med.notificationsEnabled) return;

    if (!notificationPermissionGranted) {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        notificationPermissionGranted = status === 'granted';
        if (!notificationPermissionGranted) {
          console.log('[MedicationContext] Notification permission denied');
          return;
        }
      } catch (error) {
        console.error('[MedicationContext] Error requesting notification permission:', error);
        return;
      }
    }

    try {
      await cancelMedicationNotifications(med.id);

      for (const time of med.times) {
        const scheduleLabel = `${time.label} ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
        const fullBody = `${med.name} • ${med.dosage}${med.unit}\nSchedule: ${scheduleLabel}\nFrequency: ${getFrequencyLabel(med.frequency)}`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${t('medicationReminder')} - ${med.name}`,
            body: fullBody,
            sound: 'default',
            data: { medicationId: med.id, timeId: time.id },
            categoryIdentifier: MEDICATION_CATEGORY_ID,
            ...(Platform.OS === 'android' ? { channelId: 'medication-reminders' } : {}),
            ...(Platform.OS === 'android' && Notifications.AndroidNotificationPriority
              ? { priority: Notifications.AndroidNotificationPriority.MAX }
              : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: time.hour,
            minute: time.minute,
            ...(Platform.OS === 'android' ? { channelId: 'medication-reminders' } : {}),
          },
        });
      }
      console.log(`[MedicationContext] Scheduled ${med.times.length} notifications for ${med.name}`);
    } catch (error) {
      console.error('[MedicationContext] Error scheduling notifications:', error);
    }
  }, [t, cancelMedicationNotifications]);

  const cancelSnoozeNotifications = useCallback(async (medicationId: string) => {
    if (Platform.OS === 'web' || !Notifications) return;
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        const data = notif.content.data as any;
        if (data?.medicationId === medicationId && data?.snoozeReminder) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (error) {
      console.error('[MedicationContext] Error cancelling snooze notifications:', error);
    }
  }, []);

  const scheduleSkipReminderInFiveMinutes = useCallback(async (medicationId: string) => {
    if (Platform.OS === 'web' || !Notifications) return;

    const medication = medications.find((m) => m.id === medicationId);
    if (!medication || !medication.notificationsEnabled) return;

    try {
      await cancelSnoozeNotifications(medicationId);
      const fullBody = `${medication.name} • ${medication.dosage}${medication.unit}\nReminder again in 5 minutes\nFrequency: ${getFrequencyLabel(medication.frequency)}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${t('medicationReminder')} - ${medication.name}`,
          body: fullBody,
          sound: 'default',
          data: { medicationId, snoozeReminder: true },
          categoryIdentifier: MEDICATION_CATEGORY_ID,
          ...(Platform.OS === 'android' ? { channelId: 'medication-reminders' } : {}),
          ...(Platform.OS === 'android' && Notifications.AndroidNotificationPriority
            ? { priority: Notifications.AndroidNotificationPriority.MAX }
            : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 5 * 60 * 1000),
          ...(Platform.OS === 'android' ? { channelId: 'medication-reminders' } : {}),
        },
      });
      console.log(`[MedicationContext] Scheduled 5-minute skip reminder for med: ${medicationId}`);
    } catch (error) {
      console.error('[MedicationContext] Error scheduling skip reminder:', error);
    }
  }, [cancelSnoozeNotifications, medications, t]);

  const addMedication = useCallback((medData: Omit<Medication, 'id' | 'isActive' | 'color' | 'times'> & { times?: MedicationTime[] }) => {
    const newMed: Medication = {
      ...medData,
      id: generateId(),
      isActive: true,
      color: MEDICATION_COLORS[medications.length % MEDICATION_COLORS.length],
      times: medData.times || getTimesForFrequency(medData.frequency),
    };

    const updated = [...medications, newMed];
    setMedications(updated);
    saveMedications(updated);
    scheduleMedicationNotifications(newMed);

    generatePendingLogs(newMed);

    console.log('[MedicationContext] Added medication:', newMed.name);
    return newMed;
  }, [medications, saveMedications, scheduleMedicationNotifications]);

  const generatePendingLogs = useCallback((med: Medication) => {
    const today = getDateString();
    const existingLogs = logs.filter(l => l.medicationId === med.id && l.date === today);

    if (existingLogs.length === 0 && med.frequency !== 'as_needed') {
      const newLogs: MedicationLog[] = med.times.map(time => {
        const scheduledDate = new Date();
        scheduledDate.setHours(time.hour, time.minute, 0, 0);

        return {
          id: generateId(),
          medicationId: med.id,
          scheduledTime: scheduledDate.getTime(),
          status: 'pending' as const,
          date: today,
        };
      });

      const updatedLogs = [...logs, ...newLogs];
      setLogs(updatedLogs);
      saveLogs(updatedLogs);
    }
  }, [logs, saveLogs]);

  const updateMedication = useCallback((id: string, updates: Partial<Medication>) => {
    const updated = medications.map(m => m.id === id ? { ...m, ...updates } : m);
    setMedications(updated);
    saveMedications(updated);

    const med = updated.find(m => m.id === id);
    if (med) {
      if (med.notificationsEnabled) {
        scheduleMedicationNotifications(med);
      } else {
        cancelMedicationNotifications(med.id);
      }

      if (updates.times) {
        const today = getDateString();
        const existingPendingLogs = logs.filter(
          l => l.medicationId === id && l.date === today && l.status === 'pending'
        );
        const existingCompletedLogs = logs.filter(
          l => l.medicationId === id && l.date === today && l.status !== 'pending'
        );

        const clearedLogs = logs.filter(
          l => !(l.medicationId === id && l.date === today && l.status === 'pending')
        );

        const newPendingLogs: MedicationLog[] = med.times
          .filter(time => {
            return !existingCompletedLogs.some(log => {
              const logDate = new Date(log.scheduledTime);
              return logDate.getHours() === time.hour && logDate.getMinutes() === time.minute;
            });
          })
          .map(time => {
            const scheduledDate = new Date();
            scheduledDate.setHours(time.hour, time.minute, 0, 0);
            return {
              id: generateId(),
              medicationId: id,
              scheduledTime: scheduledDate.getTime(),
              status: 'pending' as const,
              date: today,
            };
          });

        const updatedLogs = [...clearedLogs, ...newPendingLogs];
        setLogs(updatedLogs);
        saveLogs(updatedLogs);
      }
    }

    console.log('[MedicationContext] Updated medication:', id);
  }, [medications, logs, saveMedications, saveLogs, scheduleMedicationNotifications, cancelMedicationNotifications]);

  const removeMedication = useCallback((id: string) => {
    const updated = medications.filter(m => m.id !== id);
    setMedications(updated);
    saveMedications(updated);

    const updatedLogs = logs.filter(l => l.medicationId !== id);
    setLogs(updatedLogs);
    saveLogs(updatedLogs);

    console.log('[MedicationContext] Removed medication:', id);
  }, [medications, logs, saveMedications, saveLogs]);

  const dismissMedicationNotifications = useCallback(async (medicationId: string) => {
    if (Platform.OS === 'web' || !Notifications) return;
    try {
      const presented = await Notifications.getPresentedNotificationsAsync();
      for (const notif of presented) {
        if (notif.request.content.data?.medicationId === medicationId) {
          await Notifications.dismissNotificationAsync(notif.request.identifier);
          console.log('[MedicationContext] Dismissed presented notification for med:', medicationId);
        }
      }
    } catch (e) {
      console.log('[MedicationContext] Error dismissing presented notifications:', e);
    }
  }, []);

  const logMedication = useCallback((logId: string, status: 'taken' | 'missed' | 'skipped') => {
    const logEntry = logs.find(l => l.id === logId);
    const updated = logs.map(l => {
      if (l.id === logId) {
        return {
          ...l,
          status,
          takenTime: status === 'taken' ? Date.now() : undefined,
        };
      }
      return l;
    });
    setLogs(updated);
    saveLogs(updated);

    if (logEntry && (status === 'taken' || status === 'skipped')) {
      dismissMedicationNotifications(logEntry.medicationId);
    }

    console.log('[MedicationContext] Logged medication:', logId, status);
  }, [logs, saveLogs, dismissMedicationNotifications]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handler = (response: any) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data;
      const medicationId = data?.medicationId;

      if (!medicationId) return;

      const currentLogs = logsRef.current;
      const today = getDateString();
      const pendingLog = currentLogs.find(
        l => l.medicationId === medicationId && l.date === today && l.status === 'pending'
      );

      if (pendingLog) {
        const status = actionId === 'MARK_TAKEN' ? 'taken' : 'skipped';
        const updated = currentLogs.map(l => {
          if (l.id === pendingLog.id) {
            return { ...l, status: status as 'taken' | 'skipped', takenTime: status === 'taken' ? Date.now() : undefined };
          }
          return l;
        });
        setLogs(updated);
        saveLogs(updated);
        if (status === 'skipped') {
          scheduleSkipReminderInFiveMinutes(medicationId);
        }
        console.log(`[MedicationContext] Notification action: ${status} for med ${medicationId}`);
      } else {
        console.log('[MedicationContext] No pending log found for notification action, checking all pending logs');
        const anyPending = currentLogs.filter(
          l => l.medicationId === medicationId && l.status === 'pending'
        );
        if (anyPending.length > 0) {
          const targetLog = anyPending[0];
          const status = actionId === 'MARK_TAKEN' ? 'taken' : 'skipped';
          const updated = currentLogs.map(l => {
            if (l.id === targetLog.id) {
              return { ...l, status: status as 'taken' | 'skipped', takenTime: status === 'taken' ? Date.now() : undefined };
            }
            return l;
          });
          setLogs(updated);
          saveLogs(updated);
          if (status === 'skipped') {
            scheduleSkipReminderInFiveMinutes(medicationId);
          }
          console.log(`[MedicationContext] Notification fallback action: ${status} for med ${medicationId}`);
        } else if (actionId === 'SKIP') {
          scheduleSkipReminderInFiveMinutes(medicationId);
        }
      }
    };

    setNotificationResponseHandler(handler);
    return () => {
      setNotificationResponseHandler(() => {});
    };
  }, [saveLogs, scheduleSkipReminderInFiveMinutes]);

  const logAsNeededMedication = useCallback((medicationId: string) => {
    const newLog: MedicationLog = {
      id: generateId(),
      medicationId,
      scheduledTime: Date.now(),
      takenTime: Date.now(),
      status: 'taken',
      date: getDateString(),
    };
    const updated = [...logs, newLog];
    setLogs(updated);
    saveLogs(updated);
    console.log('[MedicationContext] Logged as-needed medication:', medicationId);
  }, [logs, saveLogs]);

  useEffect(() => {
    const today = getDateString();
    const activeMeds = medications.filter(m => m.isActive && m.frequency !== 'as_needed');

    for (const med of activeMeds) {
      const existingLogs = logs.filter(l => l.medicationId === med.id && l.date === today);
      if (existingLogs.length === 0) {
        generatePendingLogs(med);
      }
    }
  }, [medications]);

  useEffect(() => {
    const now = new Date();
    const today = getDateString();
    const updatedLogs = logs.map(l => {
      if (l.date === today && l.status === 'pending') {
        const scheduledDate = new Date(l.scheduledTime);
        const diffMinutes = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);
        if (diffMinutes > 60) {
          return { ...l, status: 'missed' as const };
        }
      }
      return l;
    });

    const hasChanges = updatedLogs.some((l, i) => l.status !== logs[i]?.status);
    if (hasChanges) {
      setLogs(updatedLogs);
      saveLogs(updatedLogs);
    }
  }, []);

  const todayLogs = useMemo(() => {
    const today = getDateString();
    return logs.filter(l => l.date === today);
  }, [logs]);

  const todaySchedule = useMemo(() => {
    const today = getDateString();
    return medications
      .filter(m => m.isActive)
      .map(med => {
        const medLogs = logs.filter(l => l.medicationId === med.id && l.date === today);
        return {
          medication: med,
          logs: medLogs,
          nextPending: medLogs.find(l => l.status === 'pending'),
        };
      });
  }, [medications, logs]);

  const getAdherence = useCallback((medicationId: string, days: number = 7): MedicationAdherence => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    const relevantLogs = logs.filter(l => {
      if (l.medicationId !== medicationId) return false;
      const logDate = new Date(l.date);
      return logDate >= startDate && logDate <= now;
    });

    const totalScheduled = relevantLogs.length;
    const totalTaken = relevantLogs.filter(l => l.status === 'taken').length;
    const totalMissed = relevantLogs.filter(l => l.status === 'missed').length;
    const totalSkipped = relevantLogs.filter(l => l.status === 'skipped').length;
    const adherenceRate = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 100;

    return {
      medicationId,
      totalScheduled,
      totalTaken,
      totalMissed,
      totalSkipped,
      adherenceRate,
    };
  }, [logs]);

  const overallAdherence = useMemo(() => {
    const activeMeds = medications.filter(m => m.isActive && m.frequency !== 'as_needed');
    if (activeMeds.length === 0) return 100;

    const rates = activeMeds.map(m => getAdherence(m.id, 7).adherenceRate);
    return rates.reduce((sum, r) => sum + r, 0) / rates.length;
  }, [medications, getAdherence]);

  const todayProgress = useMemo(() => {
    const scheduledToday = todayLogs.filter(l => l.status !== 'pending');
    const takenToday = todayLogs.filter(l => l.status === 'taken');
    const totalToday = todayLogs.length;
    return {
      taken: takenToday.length,
      total: totalToday,
      completed: scheduledToday.length,
      percentage: totalToday > 0 ? (takenToday.length / totalToday) * 100 : 0,
    };
  }, [todayLogs]);

  const activeMedications = useMemo(() => {
    return medications.filter(m => m.isActive);
  }, [medications]);

  const adherenceStreakDays = useMemo(() => {
    const activeRegularMeds = medications.filter(m => m.isActive && m.frequency !== 'as_needed');
    if (activeRegularMeds.length === 0) return 0;

    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const dateStr = getDateString(addDays(now, -i));
      const dayLogs = logs.filter(
        (l) => dateStr === l.date && activeRegularMeds.some((m) => m.id === l.medicationId)
      );
      if (dayLogs.length === 0) break;

      const dayTaken = dayLogs.filter((l) => l.status === 'taken').length;
      const dayAdherence = (dayTaken / dayLogs.length) * 100;
      if (dayAdherence >= 80) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }, [logs, medications]);

  const missedDoseRecoverySuggestions = useMemo(() => {
    const suggestions: string[] = [];
    const now = Date.now();
    const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);

    const recentMissed = logs.filter((l) => {
      const ts = new Date(l.date).getTime();
      return ts >= threeDaysAgo && l.status === 'missed';
    }).length;

    if (recentMissed > 0) {
      suggestions.push('Set a second reminder 15 minutes after each medication time.');
    }
    if (todayProgress.total > 0 && todayProgress.taken < todayProgress.total) {
      suggestions.push('Use the medications tab now to mark remaining doses before they become missed.');
    }
    if (overallAdherence < 80) {
      suggestions.push('Link doses to routine anchors like breakfast or bedtime to improve consistency.');
    }

    if (suggestions.length === 0) {
      suggestions.push('Great job. Keep your current schedule and refill before your supply runs low.');
    }

    return suggestions;
  }, [logs, overallAdherence, todayProgress.taken, todayProgress.total]);

  return {
    medications,
    activeMedications,
    logs,
    todayLogs,
    todaySchedule,
    todayProgress,
    overallAdherence,
    adherenceStreakDays,
    missedDoseRecoverySuggestions,
    isLoading,
    addMedication,
    updateMedication,
    removeMedication,
    logMedication,
    logAsNeededMedication,
    getAdherence,
    MEDICATION_COLORS,
  };
});
