import { useState, useEffect, useMemo, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { FoodEntry, DailyGoals, UserProfile, ActivityEntry, WeightEntry } from '@/types/food';
import { DEFAULT_GOALS, DEFAULT_PROFILE, ACTIVITY_TYPES, ACTIVITY_LEVELS } from '@/constants/config';
import { validateImportData } from '@/constants/security';

const STORAGE_KEY = 'healthme_food_entries';
const GOALS_KEY = 'healthme_goals';
const PROFILE_KEY = 'healthme_profile';
const ACTIVITIES_KEY = 'healthme_activities';
const WEIGHT_KEY = 'healthme_weight';
const ONBOARDING_KEY = 'healthme_onboarding_complete';
const LAST_BACKUP_AT_KEY = 'healthme_last_backup_at';
const SYNC_PENDING_COUNT_KEY = 'healthme_sync_pending_count';

const APP_EXPORT_KEYS = [
  STORAGE_KEY,
  GOALS_KEY,
  PROFILE_KEY,
  ACTIVITIES_KEY,
  WEIGHT_KEY,
  ONBOARDING_KEY,
  'blood_pressure_entries',
  'blood_glucose_entries',
  'fasting_data',
  'fasting_history',
  'fasting_settings',
  'healthme_medications',
  'healthme_medication_logs',
  'healthme_language',
  'healthme_notification_settings',
  'healthme_app_lock_settings',
  'healthme_floating_tabs',
  'healthme_fasting_savings',
  'healthme_donation_history',
  'healthme_dashboard_widgets',
  'healthme_smart_devices',
  'healthme_pin_attempts',
  'healthme_pin_lockout',
  'healthme_meal_plans',
  'healthme_fasting_session',
  'healthme_fasting_schedule',
  'healthme_activity_plans',
  'healthme_health_reports',
  'lipid_profile_entries',
] as const;

const APP_STORAGE_IMPORT_KEYS = [
  STORAGE_KEY,
  GOALS_KEY,
  PROFILE_KEY,
  ACTIVITIES_KEY,
  WEIGHT_KEY,
  ONBOARDING_KEY,
  'blood_pressure_entries',
  'blood_glucose_entries',
  'fasting_data',
  'fasting_history',
  'fasting_session',
  'fasting_settings',
  'healthme_medications',
  'healthme_medication_logs',
  'healthme_meal_plans',
  'healthme_fasting_session',
  'healthme_fasting_schedule',
  'healthme_activity_plans',
  'healthme_health_reports',
  'lipid_profile_entries',
] as const;

const APP_STORAGE_EXPORT_KEYS = APP_STORAGE_IMPORT_KEYS;

function stripProfilePersonalIdentifiers(input: UserProfile): UserProfile {
  return {
    ...input,
    name: '',
    imageUri: undefined,
  };
}

const MEAL_TYPES: FoodEntry['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
const ACTIVITY_TYPES_ALLOWED: ActivityEntry['type'][] = ['walking', 'running', 'cycling', 'swimming', 'gym', 'sports', 'other'];
const ACTIVITY_INTENSITIES: ActivityEntry['intensity'][] = ['light', 'moderate', 'vigorous'];
const GENDERS: UserProfile['gender'][] = ['male', 'female', 'other'];
const ACTIVITY_LEVEL_KEYS: UserProfile['activityLevel'][] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

function toSafeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function sanitizeFoodInput(raw: any): Omit<FoodEntry, 'id' | 'timestamp'> | null {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  const calories = Math.max(0, toSafeNumber(raw?.calories));
  const protein = Math.max(0, toSafeNumber(raw?.protein));
  const carbs = Math.max(0, toSafeNumber(raw?.carbs));
  const fat = Math.max(0, toSafeNumber(raw?.fat));
  const servingSize = typeof raw?.servingSize === 'string' ? raw.servingSize.trim() : '';
  const mealType = MEAL_TYPES.includes(raw?.mealType) ? raw.mealType : 'snack';

  if (!name || name.length > 120) return null;
  if (![calories, protein, carbs, fat].every(Number.isFinite)) return null;
  if (calories > 10000 || protein > 1000 || carbs > 2000 || fat > 1000) return null;

  return { name, calories, protein, carbs, fat, servingSize, mealType };
}

function sanitizeActivityInput(raw: any): Omit<ActivityEntry, 'id' | 'timestamp' | 'caloriesBurned'> | null {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  const type = ACTIVITY_TYPES_ALLOWED.includes(raw?.type) ? raw.type : 'other';
  const intensity = ACTIVITY_INTENSITIES.includes(raw?.intensity) ? raw.intensity : 'moderate';
  const duration = toSafeNumber(raw?.duration);

  if (!name || name.length > 120) return null;
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1440) return null;

  return { name, type, intensity, duration };
}

function sanitizeWeightValue(value: unknown): number | null {
  const weight = toSafeNumber(value);
  if (!Number.isFinite(weight)) return null;
  if (weight < 20 || weight > 400) return null;
  return weight;
}

function sanitizeProfileInput(raw: any, fallback: UserProfile): UserProfile {
  const age = toSafeNumber(raw?.age);
  const height = toSafeNumber(raw?.height);
  const weight = toSafeNumber(raw?.weight);
  const targetWeight = toSafeNumber(raw?.targetWeight);

  return {
    name: typeof raw?.name === 'string' ? raw.name.slice(0, 120) : fallback.name,
    age: Number.isFinite(age) && age >= 1 && age <= 120 ? age : fallback.age,
    gender: GENDERS.includes(raw?.gender) ? raw.gender : fallback.gender,
    height: Number.isFinite(height) && height >= 50 && height <= 280 ? height : fallback.height,
    weight: Number.isFinite(weight) && weight >= 20 && weight <= 400 ? weight : fallback.weight,
    activityLevel: ACTIVITY_LEVEL_KEYS.includes(raw?.activityLevel) ? raw.activityLevel : fallback.activityLevel,
    targetWeight: Number.isFinite(targetWeight) && targetWeight >= 20 && targetWeight <= 400 ? targetWeight : fallback.targetWeight,
    ncds: Array.isArray(raw?.ncds) ? raw.ncds.filter((v: unknown) => typeof v === 'string').slice(0, 20) : fallback.ncds,
    imageUri: typeof raw?.imageUri === 'string' ? raw.imageUri : fallback.imageUri,
  };
}

function sanitizeGoalsInput(raw: any, fallback: DailyGoals): DailyGoals {
  const calories = toSafeNumber(raw?.calories);
  const protein = toSafeNumber(raw?.protein);
  const carbs = toSafeNumber(raw?.carbs);
  const fat = toSafeNumber(raw?.fat);
  return {
    calories: Number.isFinite(calories) && calories >= 500 && calories <= 10000 ? Math.round(calories) : fallback.calories,
    protein: Number.isFinite(protein) && protein >= 0 && protein <= 1000 ? Math.round(protein) : fallback.protein,
    carbs: Number.isFinite(carbs) && carbs >= 0 && carbs <= 2000 ? Math.round(carbs) : fallback.carbs,
    fat: Number.isFinite(fat) && fat >= 0 && fat <= 1000 ? Math.round(fat) : fallback.fat,
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseDateTime(dateStr: string, timeStr: string): number {
  try {
    if (!dateStr) return Date.now();
    const combined = timeStr ? `${dateStr} ${timeStr}` : dateStr;
    const parsed = new Date(combined);
    if (!isNaN(parsed.getTime())) return parsed.getTime();

    const dateParts = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateParts) {
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);
      const year = parseInt(dateParts[3]);
      let hours = 0, minutes = 0;
      if (timeStr) {
        const timeParts = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (timeParts) {
          hours = parseInt(timeParts[1]);
          minutes = parseInt(timeParts[2]);
          const ampm = timeParts[4];
          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
            if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          }
        }
      }
      return new Date(year, month, day, hours, minutes).getTime();
    }
    return Date.now();
  } catch {
    return Date.now();
  }
}

function getStartOfDay(date: Date = new Date()): number {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

function calculateBMR(profile: UserProfile, formula: 'mifflin' | 'harris' = 'mifflin'): number {
  const { weight, height, age, gender } = profile;
  
  if (formula === 'mifflin') {
    // Mifflin-St Jeor Equation (more accurate for modern populations)
    // Men: BMR = (10 × weight in kg) + (6.25 × height in cm) – (5 × age in years) + 5
    // Women: BMR = (10 × weight in kg) + (6.25 × height in cm) – (5 × age in years) – 161
    const baseBMR = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender === 'male') {
      return baseBMR + 5;
    } else {
      return baseBMR - 161;
    }
  } else {
    // Harris-Benedict Revised Equation
    // Men: BMR = 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) – (5.677 × age in years)
    // Women: BMR = 447.593 + (9.247 × weight in kg) + (3.098 × height in cm) – (4.330 × age in years)
    if (gender === 'male') {
      return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
  }
}

function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const level = ACTIVITY_LEVELS.find(l => l.key === profile.activityLevel);
  return bmr * (level?.multiplier || 1.55);
}

function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

function calculateActivityCalories(
  activityType: ActivityEntry['type'],
  intensity: ActivityEntry['intensity'],
  durationMinutes: number,
  weightKg: number
): number {
  const activity = ACTIVITY_TYPES.find(a => a.key === activityType);
  if (!activity) return 0;
  
  let met = activity.metModerate;
  if (intensity === 'light') met = activity.metLight;
  if (intensity === 'vigorous') met = activity.metVigorous;
  
  return Math.round((met * weightKg * durationMinutes) / 60);
}

export const [FoodProvider, useFood] = createContextHook(() => {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [syncPendingCount, setSyncPendingCount] = useState(0);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('[FoodContext] Loading data from storage');
      const [storedEntries, storedGoals, storedProfile, storedActivities, storedWeight, onboardingComplete] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(GOALS_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(ACTIVITIES_KEY),
        AsyncStorage.getItem(WEIGHT_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      const [storedSyncPendingCount, storedLastBackupAt] = await Promise.all([
        AsyncStorage.getItem(SYNC_PENDING_COUNT_KEY),
        AsyncStorage.getItem(LAST_BACKUP_AT_KEY),
      ]);

      if (!onboardingComplete) {
        setIsFirstTimeUser(true);
      }

      if (storedEntries) setEntries(JSON.parse(storedEntries));
      if (storedGoals) setGoals(JSON.parse(storedGoals));
      if (storedProfile) setProfile(JSON.parse(storedProfile));
      if (storedActivities) setActivities(JSON.parse(storedActivities));
      if (storedWeight) setWeightHistory(JSON.parse(storedWeight));
      const pending = storedSyncPendingCount ? parseInt(storedSyncPendingCount, 10) : 0;
      setSyncPendingCount(Number.isFinite(pending) ? Math.max(0, pending) : 0);
      const backupAt = storedLastBackupAt ? parseInt(storedLastBackupAt, 10) : NaN;
      setLastBackupAt(Number.isFinite(backupAt) && backupAt > 0 ? backupAt : null);
    } catch (error) {
      console.error('[FoodContext] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markSyncPending = useCallback(() => {
    setSyncPendingCount((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(SYNC_PENDING_COUNT_KEY, String(next));
      return next;
    });
  }, []);

  const saveEntries = async (newEntries: FoodEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    } catch (error) {
      console.error('[FoodContext] Error saving entries:', error);
    }
  };

  const saveActivities = async (newActivities: ActivityEntry[]) => {
    try {
      await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(newActivities));
    } catch (error) {
      console.error('[FoodContext] Error saving activities:', error);
    }
  };

  const saveWeightHistory = async (newHistory: WeightEntry[]) => {
    try {
      await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('[FoodContext] Error saving weight history:', error);
    }
  };

  const addEntry = useCallback((entry: Omit<FoodEntry, 'id' | 'timestamp'>) => {
    const sanitized = sanitizeFoodInput(entry);
    if (!sanitized) {
      console.log('[FoodContext] Rejected malformed food entry');
      return;
    }
    const newEntry: FoodEntry = {
      ...sanitized,
      id: generateId(),
      timestamp: Date.now(),
    };
    console.log('[FoodContext] Adding entry:', newEntry);
    setEntries((prev) => {
      const updated = [newEntry, ...prev];
      saveEntries(updated);
      markSyncPending();
      return updated;
    });
  }, [markSyncPending]);

  const addEntryWithDate = useCallback((entry: Omit<FoodEntry, 'id' | 'timestamp'>, timestamp: number) => {
    const sanitized = sanitizeFoodInput(entry);
    if (!sanitized) {
      console.log('[FoodContext] Rejected malformed food entry with custom date');
      return;
    }
    const newEntry: FoodEntry = {
      ...sanitized,
      id: generateId(),
      timestamp,
    };
    console.log('[FoodContext] Adding entry with custom date:', newEntry);
    setEntries((prev) => {
      const updated = [newEntry, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      saveEntries(updated);
      markSyncPending();
      return updated;
    });
  }, [markSyncPending]);

  const removeEntry = useCallback((id: string) => {
    console.log('[FoodContext] Removing entry:', id);
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveEntries(updated);
      markSyncPending();
      return updated;
    });
  }, [markSyncPending]);

  const updateGoals = useCallback(async (newGoals: DailyGoals) => {
    const sanitizedGoals = sanitizeGoalsInput(newGoals, goals);
    console.log('[FoodContext] Updating goals:', sanitizedGoals);
    setGoals(sanitizedGoals);
    try {
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(sanitizedGoals));
      markSyncPending();
    } catch (error) {
      console.error('[FoodContext] Error saving goals:', error);
    }
  }, [goals, markSyncPending]);

  const updateProfile = useCallback(async (newProfile: UserProfile) => {
    const sanitizedProfile = sanitizeProfileInput(newProfile, profile);
    console.log('[FoodContext] Updating profile:', sanitizedProfile);
    setProfile(sanitizedProfile);
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizedProfile));
      markSyncPending();
    } catch (error) {
      console.error('[FoodContext] Error saving profile:', error);
    }
  }, [profile, markSyncPending]);

  const addActivity = useCallback((activity: Omit<ActivityEntry, 'id' | 'timestamp' | 'caloriesBurned'>) => {
    const sanitized = sanitizeActivityInput(activity);
    if (!sanitized) {
      console.log('[FoodContext] Rejected malformed activity entry');
      return;
    }
    const caloriesBurned = calculateActivityCalories(
      sanitized.type,
      sanitized.intensity,
      sanitized.duration,
      profile.weight
    );
    const newActivity: ActivityEntry = {
      ...sanitized,
      id: generateId(),
      timestamp: Date.now(),
      caloriesBurned,
    };
    console.log('[FoodContext] Adding activity:', newActivity);
    setActivities((prev) => {
      const updated = [newActivity, ...prev];
      saveActivities(updated);
      markSyncPending();
      return updated;
    });
  }, [profile.weight, markSyncPending]);

  const addActivityWithDate = useCallback((activity: Omit<ActivityEntry, 'id' | 'timestamp' | 'caloriesBurned'>, timestamp: number) => {
    const sanitized = sanitizeActivityInput(activity);
    if (!sanitized) {
      console.log('[FoodContext] Rejected malformed activity entry with custom date');
      return;
    }
    const caloriesBurned = calculateActivityCalories(
      sanitized.type,
      sanitized.intensity,
      sanitized.duration,
      profile.weight
    );
    const newActivity: ActivityEntry = {
      ...sanitized,
      id: generateId(),
      timestamp,
      caloriesBurned,
    };
    console.log('[FoodContext] Adding activity with custom date:', newActivity);
    setActivities((prev) => {
      const updated = [newActivity, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      saveActivities(updated);
      markSyncPending();
      return updated;
    });
  }, [profile.weight, markSyncPending]);

  const removeActivity = useCallback((id: string) => {
    console.log('[FoodContext] Removing activity:', id);
    setActivities((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveActivities(updated);
      markSyncPending();
      return updated;
    });
  }, [markSyncPending]);

  const addWeightEntry = useCallback((weight: number) => {
    const safeWeight = sanitizeWeightValue(weight);
    if (safeWeight === null) {
      console.log('[FoodContext] Rejected malformed weight entry');
      return;
    }
    const bmi = calculateBMI(safeWeight, profile.height);
    const todayStart = getStartOfDay();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    
    setWeightHistory((prev) => {
      const existingTodayIndex = prev.findIndex(
        (w) => w.timestamp >= todayStart && w.timestamp < todayEnd
      );
      
      let updated: WeightEntry[];
      if (existingTodayIndex !== -1) {
        updated = [...prev];
        updated[existingTodayIndex] = {
          ...updated[existingTodayIndex],
          weight: safeWeight,
          bmi,
          timestamp: Date.now(),
        };
        console.log('[FoodContext] Updating today\'s weight entry:', updated[existingTodayIndex]);
      } else {
        const newEntry: WeightEntry = {
          id: generateId(),
          weight: safeWeight,
          timestamp: Date.now(),
          bmi,
        };
        console.log('[FoodContext] Adding new weight entry:', newEntry);
        updated = [newEntry, ...prev];
      }
      
      saveWeightHistory(updated);
      markSyncPending();
      return updated;
    });
    
    setProfile(prev => {
      const updated = { ...prev, weight: safeWeight };
      AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [profile.height, markSyncPending]);

  const addWeightEntryWithDate = useCallback((weight: number, timestamp: number) => {
    const safeWeight = sanitizeWeightValue(weight);
    if (safeWeight === null) {
      console.log('[FoodContext] Rejected malformed weight entry with custom date');
      return;
    }
    const bmi = calculateBMI(safeWeight, profile.height);
    const targetDate = new Date(timestamp);
    const dayStart = getStartOfDay(targetDate);
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    
    setWeightHistory((prev) => {
      const existingDayIndex = prev.findIndex(
        (w) => w.timestamp >= dayStart && w.timestamp < dayEnd
      );
      
      let updated: WeightEntry[];
      if (existingDayIndex !== -1) {
        updated = [...prev];
        updated[existingDayIndex] = {
          ...updated[existingDayIndex],
          weight: safeWeight,
          bmi,
          timestamp,
        };
        console.log('[FoodContext] Updating weight entry for date:', updated[existingDayIndex]);
      } else {
        const newEntry: WeightEntry = {
          id: generateId(),
          weight: safeWeight,
          timestamp,
          bmi,
        };
        console.log('[FoodContext] Adding new weight entry for date:', newEntry);
        updated = [newEntry, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      }
      
      saveWeightHistory(updated);
      markSyncPending();
      return updated;
    });
    
    const todayStart = getStartOfDay();
    if (timestamp >= todayStart) {
      setProfile(prev => {
        const updated = { ...prev, weight: safeWeight };
        AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, [profile.height, markSyncPending]);

  const todayEntries = useMemo(() => {
    const todayStart = getStartOfDay();
    return entries.filter((e) => e.timestamp >= todayStart);
  }, [entries]);

  const todayActivities = useMemo(() => {
    const todayStart = getStartOfDay();
    return activities.filter((a) => a.timestamp >= todayStart);
  }, [activities]);

  const todayTotals = useMemo(() => {
    return todayEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayEntries]);

  const todayCaloriesBurned = useMemo(() => {
    // Only count calories from logged activities (exercises)
    return todayActivities.reduce((acc, a) => acc + a.caloriesBurned, 0);
  }, [todayActivities]);

  const todayBasalCaloriesBurned = useMemo(() => {
    // Calculate basal calories burned based on hours elapsed today
    const now = new Date();
    const hoursElapsed = now.getHours() + (now.getMinutes() / 60);
    const hourlyBMR = calculateBMR(profile) / 24;
    return Math.round(hourlyBMR * hoursElapsed);
  }, [profile]);

  const totalCaloriesBurned = useMemo(() => {
    // Total = Activity calories + Basal calories burned today
    return todayCaloriesBurned + todayBasalCaloriesBurned;
  }, [todayCaloriesBurned, todayBasalCaloriesBurned]);

  const baseBMR = useMemo(() => Math.round(calculateBMR(profile)), [profile]);

  const baseTDEE = useMemo(() => calculateTDEE(profile), [profile]);

  const currentBMI = useMemo(() => calculateBMI(profile.weight, profile.height), [profile]);

  const getEntriesByDate = useCallback(
    (date: Date) => {
      const dayStart = getStartOfDay(date);
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      return entries.filter((e) => e.timestamp >= dayStart && e.timestamp < dayEnd);
    },
    [entries]
  );

  const getActivitiesByDate = useCallback(
    (date: Date) => {
      const dayStart = getStartOfDay(date);
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      return activities.filter((a) => a.timestamp >= dayStart && a.timestamp < dayEnd);
    },
    [activities]
  );

  const getDailyStats = useCallback((days: number = 7) => {
    const stats = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = getStartOfDay(date);
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const dayEntries = entries.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd);
      const dayActivities = activities.filter(a => a.timestamp >= dayStart && a.timestamp < dayEnd);
      const dayWeight = weightHistory.find(w => w.timestamp >= dayStart && w.timestamp < dayEnd);
      
      const caloriesIn = dayEntries.reduce((acc, e) => acc + e.calories, 0);
      const activityCalories = dayActivities.reduce((acc, a) => acc + a.caloriesBurned, 0);
      const caloriesOut = activityCalories + Math.round(baseTDEE);
      
      const proteinIn = dayEntries.reduce((acc, e) => acc + e.protein, 0);
      const carbsIn = dayEntries.reduce((acc, e) => acc + e.carbs, 0);
      const fatIn = dayEntries.reduce((acc, e) => acc + e.fat, 0);
      
      stats.push({
        date: dayStart,
        caloriesIn,
        caloriesOut,
        proteinIn,
        carbsIn,
        fatIn,
        weight: dayWeight?.weight,
        bmi: dayWeight?.bmi,
      });
    }
    
    return stats;
  }, [entries, activities, weightHistory, baseTDEE]);

  const completeOnboarding = useCallback(async () => {
    console.log('[FoodContext] Completing onboarding');
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setIsFirstTimeUser(false);
    } catch (error) {
      console.error('[FoodContext] Error completing onboarding:', error);
    }
  }, []);

  const clearAllData = useCallback(async () => {
    console.log('[FoodContext] Clearing all data');
    try {
      const keysToClear = APP_EXPORT_KEYS.filter(
        (key) => key !== GOALS_KEY && key !== PROFILE_KEY && key !== ONBOARDING_KEY,
      );
      await Promise.all(keysToClear.map((key) => AsyncStorage.removeItem(key)));
      setEntries([]);
      setActivities([]);
      setWeightHistory([]);
      markSyncPending();
      console.log('[FoodContext] Data cleared while preserving profile, goals, and onboarding state');
    } catch (error) {
      console.error('[FoodContext] Error clearing data:', error);
      throw error;
    }
  }, [markSyncPending]);

  const loadExtraDataForExport = useCallback(async () => {
    try {
      const [bpData, bgData, fastingHistory, medsData, medLogsData] = await Promise.all([
        AsyncStorage.getItem('blood_pressure_entries'),
        AsyncStorage.getItem('blood_glucose_entries'),
        AsyncStorage.getItem('fasting_history'),
        AsyncStorage.getItem('healthme_medications'),
        AsyncStorage.getItem('healthme_medication_logs'),
      ]);
      return {
        bloodPressure: bpData ? JSON.parse(bpData) as { id: string; systolic: number; diastolic: number; pulse?: number; timestamp: number; notes?: string }[] : [],
        bloodGlucose: bgData ? JSON.parse(bgData) as { id: string; value: number; unit: string; type: string; timestamp: number; notes?: string }[] : [],
        fastingHistory: fastingHistory ? JSON.parse(fastingHistory) as { id: string; fastingType: string; startTime: number; endTime: number; duration: number; completed: boolean; note?: string }[] : [],
        medications: medsData ? JSON.parse(medsData) as { id: string; name: string; dosage: string; unit: string; frequency: string; category: string; isActive: boolean; times: { hour: number; minute: number; label: string }[] }[] : [],
        medicationLogs: medLogsData ? JSON.parse(medLogsData) as { id: string; medicationId: string; scheduledTime: number; takenTime?: number; status: string; date: string }[] : [],
      };
    } catch (error) {
      console.error('[FoodContext] Error loading extra export data:', error);
      return { bloodPressure: [], bloodGlucose: [], fastingHistory: [], medications: [], medicationLogs: [] };
    }
  }, []);

  const importJsonData = useCallback(async (jsonContent: string) => {
    console.log('[FoodContext] Starting JSON import');
    try {
      if (jsonContent.length > 50 * 1024 * 1024) {
        return { success: false, totalImported: 0, summary: 'File too large (max 50MB).' };
      }
      const data = JSON.parse(jsonContent);
      if (!data || typeof data !== 'object') {
        return { success: false, totalImported: 0, summary: 'Invalid JSON format.' };
      }

      const validation = validateImportData(data, 'json');
      if (!validation.valid) {
        return { success: false, totalImported: 0, summary: validation.error || 'Invalid data.' };
      }

      if (data.appStorageRaw && typeof data.appStorageRaw === 'object') {
        const rawMap = data.appStorageRaw as Record<string, string | null>;
        const keys = APP_STORAGE_IMPORT_KEYS.filter((key) => key in rawMap);
        for (const key of keys) {
          const rawValue = rawMap[key];
          if (rawValue === null || rawValue === undefined) {
            await AsyncStorage.removeItem(key);
          } else {
            await AsyncStorage.setItem(key, rawValue);
          }
        }

        const [storedEntries, storedGoals, storedProfile, storedActivities, storedWeight, onboardingComplete] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(GOALS_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(ACTIVITIES_KEY),
          AsyncStorage.getItem(WEIGHT_KEY),
          AsyncStorage.getItem(ONBOARDING_KEY),
        ]);

        setEntries(storedEntries ? JSON.parse(storedEntries) : []);
        setGoals(storedGoals ? JSON.parse(storedGoals) : DEFAULT_GOALS);
        setProfile(storedProfile ? JSON.parse(storedProfile) : DEFAULT_PROFILE);
        setActivities(storedActivities ? JSON.parse(storedActivities) : []);
        setWeightHistory(storedWeight ? JSON.parse(storedWeight) : []);
        setIsFirstTimeUser(!onboardingComplete);
        markSyncPending();

        return {
          success: true,
          totalImported: keys.length,
          summary: `Imported app data backup (${keys.length} allowed storage keys)`
        };
      }

      let importedFood = 0;
      let importedActivities = 0;
      let importedWeight = 0;
      let importedBP = 0;
      let importedBG = 0;
      let importedFasting = 0;
      let importedMeds = 0;
      let importedMedLogs = 0;

      if (Array.isArray(data.entries) && data.entries.length > 0) {
        const newEntries: FoodEntry[] = data.entries
          .map((e: any) => {
            const sanitized = sanitizeFoodInput(e);
            const timestamp = toSafeNumber(e?.timestamp);
            if (!sanitized || !Number.isFinite(timestamp) || timestamp <= 0) return null;
            return {
              id: typeof e?.id === 'string' && e.id ? e.id : generateId(),
              ...sanitized,
              timestamp,
            } as FoodEntry;
          })
          .filter((e: FoodEntry | null): e is FoodEntry => !!e);
        const existingKeys = new Set(entries.map(e => `${e.name}-${e.timestamp}`));
        const toAdd = newEntries.filter(e => !existingKeys.has(`${e.name}-${e.timestamp}`));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...entries].sort((a, b) => b.timestamp - a.timestamp);
          setEntries(merged);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          importedFood = toAdd.length;
        }
      }

      if (Array.isArray(data.activities) && data.activities.length > 0) {
        const newActs: ActivityEntry[] = data.activities
          .map((a: any) => {
            const sanitized = sanitizeActivityInput(a);
            const timestamp = toSafeNumber(a?.timestamp);
            const caloriesBurned = toSafeNumber(a?.caloriesBurned);
            if (!sanitized || !Number.isFinite(timestamp) || timestamp <= 0) return null;
            return {
              id: typeof a?.id === 'string' && a.id ? a.id : generateId(),
              ...sanitized,
              caloriesBurned: Number.isFinite(caloriesBurned) && caloriesBurned >= 0 ? caloriesBurned : 0,
              timestamp,
            } as ActivityEntry;
          })
          .filter((a: ActivityEntry | null): a is ActivityEntry => !!a);
        const existingKeys = new Set(activities.map(a => `${a.name}-${a.timestamp}`));
        const toAdd = newActs.filter(a => !existingKeys.has(`${a.name}-${a.timestamp}`));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...activities].sort((a, b) => b.timestamp - a.timestamp);
          setActivities(merged);
          await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(merged));
          importedActivities = toAdd.length;
        }
      }

      if (Array.isArray(data.weightHistory) && data.weightHistory.length > 0) {
        const newWeights: WeightEntry[] = data.weightHistory
          .map((w: any) => {
            const safeWeight = sanitizeWeightValue(w?.weight);
            const timestamp = toSafeNumber(w?.timestamp);
            const bmi = toSafeNumber(w?.bmi);
            if (safeWeight === null || !Number.isFinite(timestamp) || timestamp <= 0) return null;
            return {
              id: typeof w?.id === 'string' && w.id ? w.id : generateId(),
              weight: safeWeight,
              bmi: Number.isFinite(bmi) && bmi > 0 ? bmi : undefined,
              timestamp,
            } as WeightEntry;
          })
          .filter((w: WeightEntry | null): w is WeightEntry => !!w);
        const existingDays = new Set(weightHistory.map(w => {
          const d = new Date(w.timestamp);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        }));
        const toAdd = newWeights.filter(w => {
          const d = new Date(w.timestamp);
          return !existingDays.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        });
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...weightHistory].sort((a, b) => b.timestamp - a.timestamp);
          setWeightHistory(merged);
          await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(merged));
          importedWeight = toAdd.length;
        }
      }

      if (Array.isArray(data.bloodPressure) && data.bloodPressure.length > 0) {
        const existingBP = await AsyncStorage.getItem('blood_pressure_entries');
        const currentBP: any[] = existingBP ? JSON.parse(existingBP) : [];
        const existingKeys = new Set(currentBP.map(bp => `${bp.systolic}-${bp.diastolic}-${bp.timestamp}`));
        const toAdd = data.bloodPressure.filter((bp: any) => bp.systolic > 0 && bp.diastolic > 0 && !existingKeys.has(`${bp.systolic}-${bp.diastolic}-${bp.timestamp}`)).map((bp: any) => ({ ...bp, id: bp.id || generateId() }));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...currentBP].sort((a: any, b: any) => b.timestamp - a.timestamp);
          await AsyncStorage.setItem('blood_pressure_entries', JSON.stringify(merged));
          importedBP = toAdd.length;
        }
      }

      if (Array.isArray(data.bloodGlucose) && data.bloodGlucose.length > 0) {
        const existingBG = await AsyncStorage.getItem('blood_glucose_entries');
        const currentBG: any[] = existingBG ? JSON.parse(existingBG) : [];
        const existingKeys = new Set(currentBG.map(bg => `${bg.value}-${bg.timestamp}`));
        const toAdd = data.bloodGlucose.filter((bg: any) => bg.value > 0 && !existingKeys.has(`${bg.value}-${bg.timestamp}`)).map((bg: any) => ({ ...bg, id: bg.id || generateId() }));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...currentBG].sort((a: any, b: any) => b.timestamp - a.timestamp);
          await AsyncStorage.setItem('blood_glucose_entries', JSON.stringify(merged));
          importedBG = toAdd.length;
        }
      }

      if (Array.isArray(data.fastingHistory) && data.fastingHistory.length > 0) {
        const existingF = await AsyncStorage.getItem('fasting_history');
        const currentF: any[] = existingF ? JSON.parse(existingF) : [];
        const existingKeys = new Set(currentF.map(f => `${f.fastingType}-${f.startTime}`));
        const toAdd = data.fastingHistory.filter((f: any) => f.duration > 0 && !existingKeys.has(`${f.fastingType}-${f.startTime}`)).map((f: any) => ({ ...f, id: f.id || generateId() }));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...currentF].sort((a: any, b: any) => b.startTime - a.startTime);
          await AsyncStorage.setItem('fasting_history', JSON.stringify(merged));
          importedFasting = toAdd.length;
        }
      }

      if (Array.isArray(data.medications) && data.medications.length > 0) {
        const existingMeds = await AsyncStorage.getItem('healthme_medications');
        const currentMeds: any[] = existingMeds ? JSON.parse(existingMeds) : [];
        const existingNames = new Set(currentMeds.map(m => m.name.toLowerCase()));
        const toAdd = data.medications.filter((m: any) => m.name && !existingNames.has(m.name.toLowerCase())).map((m: any) => ({ ...m, id: m.id || generateId() }));
        if (toAdd.length > 0) {
          const merged = [...currentMeds, ...toAdd];
          await AsyncStorage.setItem('healthme_medications', JSON.stringify(merged));
          importedMeds = toAdd.length;
        }
      }

      if (Array.isArray(data.medicationLogs) && data.medicationLogs.length > 0) {
        const existingLogs = await AsyncStorage.getItem('healthme_medication_logs');
        const currentLogs: any[] = existingLogs ? JSON.parse(existingLogs) : [];
        const existingKeys = new Set(currentLogs.map(l => `${l.medicationId}-${l.date}-${l.scheduledTime}`));
        const toAdd = data.medicationLogs.filter((l: any) => l.date && !existingKeys.has(`${l.medicationId}-${l.date}-${l.scheduledTime}`)).map((l: any) => ({ ...l, id: l.id || generateId() }));
        if (toAdd.length > 0) {
          const merged = [...currentLogs, ...toAdd];
          await AsyncStorage.setItem('healthme_medication_logs', JSON.stringify(merged));
          importedMedLogs = toAdd.length;
        }
      }

      if (data.profile && typeof data.profile === 'object') {
        const importedProfile = sanitizeProfileInput(data.profile, profile);
        setProfile(importedProfile);
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(importedProfile));
      }

      if (data.goals && typeof data.goals === 'object') {
        const importedGoals = sanitizeGoalsInput(data.goals, goals);
        setGoals(importedGoals);
        await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(importedGoals));
      }

      const totalImported = importedFood + importedActivities + importedWeight + importedBP + importedBG + importedFasting + importedMeds + importedMedLogs;
      console.log('[FoodContext] JSON import complete. Total new records:', totalImported);
      if (totalImported > 0 || data.profile || data.goals) {
        markSyncPending();
      }

      const summary: string[] = [];
      if (importedFood > 0) summary.push(`${importedFood} food entries`);
      if (importedActivities > 0) summary.push(`${importedActivities} activities`);
      if (importedWeight > 0) summary.push(`${importedWeight} weight records`);
      if (importedBP > 0) summary.push(`${importedBP} blood pressure records`);
      if (importedBG > 0) summary.push(`${importedBG} blood glucose records`);
      if (importedFasting > 0) summary.push(`${importedFasting} fasting records`);
      if (importedMeds > 0) summary.push(`${importedMeds} medications`);
      if (importedMedLogs > 0) summary.push(`${importedMedLogs} medication logs`);
      if (data.profile) summary.push('profile');
      if (data.goals) summary.push('daily goals');

      return {
        success: true,
        totalImported,
        summary: summary.length > 0 ? `Imported: ${summary.join(', ')}` : 'No new data to import (all records already exist)',
      };
    } catch (error) {
      console.error('[FoodContext] JSON import failed:', error);
      return { success: false, totalImported: 0, summary: 'Import failed. Please check the file format.' };
    }
  }, [entries, activities, weightHistory, profile, goals, markSyncPending]);

  const importCsvData = useCallback(async (csvContent: string) => {
    console.log('[FoodContext] Starting CSV import');
    try {
      if (csvContent.length > 50 * 1024 * 1024) {
        return { success: false, totalImported: 0, summary: 'File too large (max 50MB).' };
      }
      const sections: Record<string, string[][]> = {};
      let currentSection = '';
      const lines = csvContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (
          trimmed === 'FOOD ENTRIES' ||
          trimmed === 'ACTIVITIES' ||
          trimmed === 'WEIGHT HISTORY' ||
          trimmed === 'BLOOD PRESSURE' ||
          trimmed === 'BLOOD GLUCOSE' ||
          trimmed === 'FASTING HISTORY' ||
          trimmed === 'MEDICATIONS' ||
          trimmed === 'MEDICATION LOGS' ||
          trimmed === 'ASSESSMENTS' ||
          trimmed === 'PROFILE' ||
          trimmed === 'DAILY GOALS'
        ) {
          currentSection = trimmed;
          sections[currentSection] = [];
          continue;
        }

        if (currentSection && sections[currentSection]) {
          const row = parseCsvRow(trimmed);
          sections[currentSection].push(row);
        }
      }

      let importedFood = 0;
      let importedActivities = 0;
      let importedWeight = 0;
      let importedBP = 0;
      let importedBG = 0;
      let importedFasting = 0;
      let importedMeds = 0;
      let importedMedLogs = 0;

      if (sections['FOOD ENTRIES'] && sections['FOOD ENTRIES'].length > 1) {
        const rows = sections['FOOD ENTRIES'].slice(1);
        const newEntries: FoodEntry[] = rows
          .map(row => {
            const timestamp = parseDateTime(row[0] || '', row[1] || '');
            const sanitized = sanitizeFoodInput({
              name: row[2],
              calories: parseFloat(row[3]),
              protein: parseFloat(row[4]),
              carbs: parseFloat(row[5]),
              fat: parseFloat(row[6]),
              servingSize: row[7],
              mealType: row[8],
            });
            if (!sanitized) return null;
            return { id: generateId(), ...sanitized, timestamp } as FoodEntry;
          })
          .filter((e: FoodEntry | null): e is FoodEntry => !!e);

        if (newEntries.length > 0) {
          const existingTimestamps = new Set(entries.map(e => `${e.name}-${e.timestamp}`));
          const toAdd = newEntries.filter(e => !existingTimestamps.has(`${e.name}-${e.timestamp}`));
          if (toAdd.length > 0) {
            const merged = [...toAdd, ...entries].sort((a, b) => b.timestamp - a.timestamp);
            setEntries(merged);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            importedFood = toAdd.length;
          }
        }
      }

      if (sections['ACTIVITIES'] && sections['ACTIVITIES'].length > 1) {
        const rows = sections['ACTIVITIES'].slice(1);
        const newActs: ActivityEntry[] = rows
          .map(row => {
            const timestamp = parseDateTime(row[0] || '', row[1] || '');
            const sanitized = sanitizeActivityInput({
              name: row[2],
              type: row[3],
              intensity: row[4],
              duration: parseFloat(row[5]),
            });
            const caloriesBurned = parseFloat(row[6]);
            if (!sanitized) return null;
            return {
              id: generateId(),
              ...sanitized,
              caloriesBurned: Number.isFinite(caloriesBurned) && caloriesBurned >= 0 ? caloriesBurned : 0,
              timestamp,
            } as ActivityEntry;
          })
          .filter((a: ActivityEntry | null): a is ActivityEntry => !!a);

        if (newActs.length > 0) {
          const existingKeys = new Set(activities.map(a => `${a.name}-${a.timestamp}`));
          const toAdd = newActs.filter(a => !existingKeys.has(`${a.name}-${a.timestamp}`));
          if (toAdd.length > 0) {
            const merged = [...toAdd, ...activities].sort((a, b) => b.timestamp - a.timestamp);
            setActivities(merged);
            await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(merged));
            importedActivities = toAdd.length;
          }
        }
      }

      if (sections['WEIGHT HISTORY'] && sections['WEIGHT HISTORY'].length > 1) {
        const rows = sections['WEIGHT HISTORY'].slice(1);
        const newWeights: WeightEntry[] = rows
          .map(row => {
            const timestamp = parseDateTime(row[0] || '', row[1] || '');
            const safeWeight = sanitizeWeightValue(parseFloat(row[2]));
            const bmi = parseFloat(row[3]);
            if (safeWeight === null) return null;
            return {
              id: generateId(),
              weight: safeWeight,
              bmi: Number.isFinite(bmi) && bmi > 0 ? bmi : undefined,
              timestamp,
            } as WeightEntry;
          })
          .filter((w: WeightEntry | null): w is WeightEntry => !!w);

        if (newWeights.length > 0) {
          const existingDays = new Set(weightHistory.map(w => {
            const d = new Date(w.timestamp);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          }));
          const toAdd = newWeights.filter(w => {
            const d = new Date(w.timestamp);
            return !existingDays.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
          });
          if (toAdd.length > 0) {
            const merged = [...toAdd, ...weightHistory].sort((a, b) => b.timestamp - a.timestamp);
            setWeightHistory(merged);
            await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(merged));
            importedWeight = toAdd.length;
          }
        }
      }

      if (sections['BLOOD PRESSURE'] && sections['BLOOD PRESSURE'].length > 1) {
        const rows = sections['BLOOD PRESSURE'].slice(1);
        const existingBP = await AsyncStorage.getItem('blood_pressure_entries');
        const currentBP: { id: string; systolic: number; diastolic: number; pulse?: number; timestamp: number; notes?: string }[] = existingBP ? JSON.parse(existingBP) : [];
        const newBP = rows.map(row => ({
          id: generateId(),
          systolic: parseFloat(row[2]) || 0,
          diastolic: parseFloat(row[3]) || 0,
          pulse: row[4] ? parseFloat(row[4]) : undefined,
          timestamp: parseDateTime(row[0] || '', row[1] || ''),
          notes: row[5] || '',
        })).filter(bp => bp.systolic > 0 && bp.diastolic > 0);

        const existingBPKeys = new Set(currentBP.map(bp => `${bp.systolic}-${bp.diastolic}-${bp.timestamp}`));
        const toAdd = newBP.filter(bp => !existingBPKeys.has(`${bp.systolic}-${bp.diastolic}-${bp.timestamp}`));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...currentBP].sort((a, b) => b.timestamp - a.timestamp);
          await AsyncStorage.setItem('blood_pressure_entries', JSON.stringify(merged));
          importedBP = toAdd.length;
        }
      }

      if (sections['BLOOD GLUCOSE'] && sections['BLOOD GLUCOSE'].length > 1) {
        const rows = sections['BLOOD GLUCOSE'].slice(1);
        const existingBG = await AsyncStorage.getItem('blood_glucose_entries');
        const currentBG: { id: string; value: number; unit: string; type: string; timestamp: number; notes?: string }[] = existingBG ? JSON.parse(existingBG) : [];
        const newBG = rows.map(row => ({
          id: generateId(),
          value: parseFloat(row[2]) || 0,
          unit: row[3] || 'mg/dL',
          type: row[4] || 'fasting',
          timestamp: parseDateTime(row[0] || '', row[1] || ''),
          notes: row[5] || '',
        })).filter(bg => bg.value > 0);

        const existingBGKeys = new Set(currentBG.map(bg => `${bg.value}-${bg.timestamp}`));
        const toAdd = newBG.filter(bg => !existingBGKeys.has(`${bg.value}-${bg.timestamp}`));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...currentBG].sort((a, b) => b.timestamp - a.timestamp);
          await AsyncStorage.setItem('blood_glucose_entries', JSON.stringify(merged));
          importedBG = toAdd.length;
        }
      }

      if (sections['FASTING HISTORY'] && sections['FASTING HISTORY'].length > 1) {
        const rows = sections['FASTING HISTORY'].slice(1);
        const existingFasting = await AsyncStorage.getItem('fasting_history');
        const currentFasting: { id: string; fastingType: string; startTime: number; endTime: number; duration: number; completed: boolean; note?: string }[] = existingFasting ? JSON.parse(existingFasting) : [];
        const newFasting = rows.map(row => {
          const dateStr = row[0] || '';
          const startTimeStr = row[2] || '';
          const endTimeStr = row[3] || '';
          const durationHrs = parseFloat(row[4]) || 0;
          const startTime = parseDateTime(dateStr, startTimeStr);
          const endTime = parseDateTime(dateStr, endTimeStr);
          return {
            id: generateId(),
            fastingType: row[1] || '16:8',
            startTime,
            endTime: endTime > startTime ? endTime : startTime + durationHrs * 3600000,
            duration: durationHrs * 3600000,
            completed: (row[5] || '').toLowerCase() === 'yes',
            note: row[6] || '',
          };
        }).filter(f => f.duration > 0);

        const existingFKeys = new Set(currentFasting.map(f => `${f.fastingType}-${f.startTime}`));
        const toAdd = newFasting.filter(f => !existingFKeys.has(`${f.fastingType}-${f.startTime}`));
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...currentFasting].sort((a, b) => b.startTime - a.startTime);
          await AsyncStorage.setItem('fasting_history', JSON.stringify(merged));
          importedFasting = toAdd.length;
        }
      }

      if (sections['MEDICATIONS'] && sections['MEDICATIONS'].length > 1) {
        const rows = sections['MEDICATIONS'].slice(1);
        const existingMeds = await AsyncStorage.getItem('healthme_medications');
        const currentMeds: any[] = existingMeds ? JSON.parse(existingMeds) : [];
        const newMeds = rows.map(row => {
          const timesStr = row[6] || '';
          const times = timesStr.split(';').map(t => t.trim()).filter(Boolean).map(t => {
            const match = t.match(/(\d{2}):(\d{2})\s*(.*)/);
            return match ? { id: generateId(), hour: parseInt(match[1]), minute: parseInt(match[2]), label: match[3] || '' } : null;
          }).filter(Boolean);
          return {
            id: generateId(),
            name: row[0] || '',
            dosage: row[1] || '',
            unit: row[2] || 'tablet',
            frequency: row[3] || 'daily',
            category: row[4] || 'prescription',
            isActive: (row[5] || '').toLowerCase() === 'yes',
            times: times.length > 0 ? times : [{ id: generateId(), hour: 8, minute: 0, label: 'Morning' }],
            startDate: Date.now(),
            color: '#3B82F6',
            notificationsEnabled: false,
            refillReminder: false,
          };
        }).filter(m => m.name);

        const existingMedNames = new Set(currentMeds.map(m => m.name.toLowerCase()));
        const toAdd = newMeds.filter(m => !existingMedNames.has(m.name.toLowerCase()));
        if (toAdd.length > 0) {
          const merged = [...currentMeds, ...toAdd];
          await AsyncStorage.setItem('healthme_medications', JSON.stringify(merged));
          importedMeds = toAdd.length;
        }
      }

      if (sections['MEDICATION LOGS'] && sections['MEDICATION LOGS'].length > 1) {
        const rows = sections['MEDICATION LOGS'].slice(1);
        const existingLogs = await AsyncStorage.getItem('healthme_medication_logs');
        const currentLogs: any[] = existingLogs ? JSON.parse(existingLogs) : [];
        const newLogs = rows.map(row => ({
          id: generateId(),
          date: row[0] || '',
          medicationId: row[1] || '',
          scheduledTime: parseDateTime(row[0] || '', row[2] || ''),
          takenTime: row[3] ? parseDateTime(row[0] || '', row[3]) : undefined,
          status: row[4] || 'pending',
        })).filter(l => l.date);

        const existingLogKeys = new Set(currentLogs.map(l => `${l.medicationId}-${l.date}-${l.scheduledTime}`));
        const toAdd = newLogs.filter(l => !existingLogKeys.has(`${l.medicationId}-${l.date}-${l.scheduledTime}`));
        if (toAdd.length > 0) {
          const merged = [...currentLogs, ...toAdd];
          await AsyncStorage.setItem('healthme_medication_logs', JSON.stringify(merged));
          importedMedLogs = toAdd.length;
        }
      }

      if (sections['PROFILE'] && sections['PROFILE'].length > 1) {
        const row = sections['PROFILE'][1];
        if (row && row.length >= 5) {
          const isLegacyWithName = row.length >= 6;
          const importedProfile = sanitizeProfileInput({
            name: isLegacyWithName ? row[0] : profile.name,
            age: parseInt(row[isLegacyWithName ? 1 : 0]),
            gender: row[isLegacyWithName ? 2 : 1],
            height: parseInt(row[isLegacyWithName ? 3 : 2]),
            weight: parseFloat(row[isLegacyWithName ? 4 : 3]),
            activityLevel: row[isLegacyWithName ? 5 : 4],
            targetWeight: profile.targetWeight,
            ncds: profile.ncds,
            imageUri: profile.imageUri,
          }, profile);
          setProfile(importedProfile);
          await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(importedProfile));
        }
      }

      if (sections['DAILY GOALS'] && sections['DAILY GOALS'].length > 1) {
        const row = sections['DAILY GOALS'][1];
        if (row && row.length >= 4) {
          const importedGoals = sanitizeGoalsInput({
            calories: parseInt(row[0]),
            protein: parseInt(row[1]),
            carbs: parseInt(row[2]),
            fat: parseInt(row[3]),
          }, goals);
          setGoals(importedGoals);
          await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(importedGoals));
        }
      }

      const totalImported = importedFood + importedActivities + importedWeight + importedBP + importedBG + importedFasting + importedMeds + importedMedLogs;
      console.log('[FoodContext] Import complete. Total new records:', totalImported);
      if (totalImported > 0 || (sections['PROFILE'] && sections['PROFILE'].length > 1) || (sections['DAILY GOALS'] && sections['DAILY GOALS'].length > 1)) {
        markSyncPending();
      }

      const summary: string[] = [];
      if (importedFood > 0) summary.push(`${importedFood} food entries`);
      if (importedActivities > 0) summary.push(`${importedActivities} activities`);
      if (importedWeight > 0) summary.push(`${importedWeight} weight records`);
      if (importedBP > 0) summary.push(`${importedBP} blood pressure records`);
      if (importedBG > 0) summary.push(`${importedBG} blood glucose records`);
      if (importedFasting > 0) summary.push(`${importedFasting} fasting records`);
      if (importedMeds > 0) summary.push(`${importedMeds} medications`);
      if (importedMedLogs > 0) summary.push(`${importedMedLogs} medication logs`);

      if (sections['PROFILE'] && sections['PROFILE'].length > 1) summary.push('profile');
      if (sections['DAILY GOALS'] && sections['DAILY GOALS'].length > 1) summary.push('daily goals');

      return {
        success: true,
        totalImported,
        summary: summary.length > 0 ? `Imported: ${summary.join(', ')}` : 'No new data to import (all records already exist)',
      };
    } catch (error) {
      console.error('[FoodContext] CSV import failed:', error);
      return { success: false, totalImported: 0, summary: 'Import failed. Please check the file format.' };
    }
  }, [entries, activities, weightHistory, profile, goals, markSyncPending]);

  const exportData = useCallback(async (format: 'json' | 'csv' | 'xls' = 'json') => {
    console.log('[FoodContext] Exporting data as', format);
    const dateStr = new Date().toISOString().split('T')[0];
    const extra = await loadExtraDataForExport();
    
    let content: string;
    let mimeType: string;
    let extension: string;
    
    const escCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
    const fmtDate = (ts: number) => new Date(ts).toLocaleDateString();
    const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString();
    
    if (format === 'csv') {
      let csv = '';
      csv += 'FOOD ENTRIES\n';
      csv += 'Date,Time,Name,Calories,Protein (g),Carbs (g),Fat (g),Portion Size,Meal Type\n';
      entries.forEach(entry => {
        csv += `${fmtDate(entry.timestamp)},${fmtTime(entry.timestamp)},${escCsv(entry.name)},${entry.calories},${entry.protein},${entry.carbs},${entry.fat},${escCsv(entry.servingSize || '')},${entry.mealType || ''}\n`;
      });
      csv += '\nACTIVITIES\n';
      csv += 'Date,Time,Name,Type,Intensity,Duration (min),Calories Burned\n';
      activities.forEach(activity => {
        csv += `${fmtDate(activity.timestamp)},${fmtTime(activity.timestamp)},${escCsv(activity.name)},${activity.type},${activity.intensity},${activity.duration},${activity.caloriesBurned}\n`;
      });
      csv += '\nWEIGHT HISTORY\n';
      csv += 'Date,Time,Weight (kg),BMI\n';
      weightHistory.forEach(entry => {
        csv += `${fmtDate(entry.timestamp)},${fmtTime(entry.timestamp)},${entry.weight},${(entry.bmi || 0).toFixed(1)}\n`;
      });
      csv += '\nBLOOD PRESSURE\n';
      csv += 'Date,Time,Systolic (mmHg),Diastolic (mmHg),Pulse (bpm),Notes\n';
      extra.bloodPressure.forEach(bp => {
        csv += `${fmtDate(bp.timestamp)},${fmtTime(bp.timestamp)},${bp.systolic},${bp.diastolic},${bp.pulse || ''},${escCsv(bp.notes || '')}\n`;
      });
      csv += '\nBLOOD GLUCOSE\n';
      csv += 'Date,Time,Value,Unit,Type,Notes\n';
      extra.bloodGlucose.forEach(bg => {
        csv += `${fmtDate(bg.timestamp)},${fmtTime(bg.timestamp)},${bg.value},${bg.unit},${bg.type},${escCsv(bg.notes || '')}\n`;
      });
      csv += '\nFASTING HISTORY\n';
      csv += 'Date,Fasting Type,Start Time,End Time,Duration (hrs),Completed,Note\n';
      extra.fastingHistory.forEach(f => {
        csv += `${fmtDate(f.startTime)},${f.fastingType},${fmtTime(f.startTime)},${fmtTime(f.endTime)},${(f.duration / 3600000).toFixed(1)},${f.completed ? 'Yes' : 'No'},${escCsv(f.note || '')}\n`;
      });
      csv += '\nMEDICATIONS\n';
      csv += 'Name,Dosage,Unit,Frequency,Category,Active,Times\n';
      extra.medications.forEach(med => {
        const times = med.times.map(t => `${t.hour.toString().padStart(2,'0')}:${t.minute.toString().padStart(2,'0')} ${t.label}`).join('; ');
        csv += `${escCsv(med.name)},${med.dosage},${med.unit},${med.frequency},${med.category},${med.isActive ? 'Yes' : 'No'},${escCsv(times)}\n`;
      });
      csv += '\nMEDICATION LOGS\n';
      csv += 'Date,Medication ID,Scheduled Time,Taken Time,Status\n';
      extra.medicationLogs.forEach(log => {
        csv += `${log.date},${log.medicationId},${fmtTime(log.scheduledTime)},${log.takenTime ? fmtTime(log.takenTime) : ''},${log.status}\n`;
      });
      csv += '\nASSESSMENTS\n';
      csv += 'Date,Time,Assessment ID,Score,Risk Level,Range Min,Range Max,Range Color,Range Description,Answers JSON\n';
      extra.assessments.forEach((assessment: any) => {
        csv += `${fmtDate(assessment.date)},${fmtTime(assessment.date)},${escCsv(assessment.assessmentId || '')},${assessment.score ?? ''},${escCsv(assessment.scoreRange?.label || '')},${assessment.scoreRange?.min ?? ''},${assessment.scoreRange?.max ?? ''},${escCsv(assessment.scoreRange?.color || '')},${escCsv(assessment.scoreRange?.description || '')},${escCsv(JSON.stringify(assessment.answers || {}))}\n`;
      });
      csv += '\nPROFILE\n';
      csv += 'Age,Gender,Height (cm),Weight (kg),Activity Level\n';
      csv += `${profile.age},${profile.gender},${profile.height},${profile.weight},${profile.activityLevel}\n`;
      csv += '\nDAILY GOALS\n';
      csv += 'Calories,Protein (g),Carbs (g),Fat (g)\n';
      csv += `${goals.calories},${goals.protein},${goals.carbs},${goals.fat}\n`;
      content = csv;
      mimeType = 'text/csv';
      extension = 'csv';
    } else if (format === 'xls') {
      const escXml = (val: string | number) => String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const numCell = (val: number | string) => `<Cell><Data ss:Type="Number">${val}</Data></Cell>`;
      const strCell = (val: string) => `<Cell><Data ss:Type="String">${escXml(val)}</Data></Cell>`;
      const headerCell = (val: string) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escXml(val)}</Data></Cell>`;

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<?mso-application progid="Excel.Sheet"?>\n';
      xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"';
      xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"';
      xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"';
      xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
      xml += '<Styles><Style ss:ID="Default" ss:Name="Normal"><Font ss:Size="11"/></Style>';
      xml += '<Style ss:ID="header"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style></Styles>\n';

      xml += '<Worksheet ss:Name="Food Entries"><Table>';
      xml += '<Row>' + ['Date','Time','Name','Calories','Protein (g)','Carbs (g)','Fat (g)','Portion Size','Meal Type'].map(h => headerCell(h)).join('') + '</Row>';
      entries.forEach(entry => {
        xml += `<Row>${strCell(fmtDate(entry.timestamp))}${strCell(fmtTime(entry.timestamp))}${strCell(entry.name)}${numCell(entry.calories)}${numCell(entry.protein)}${numCell(entry.carbs)}${numCell(entry.fat)}${strCell(entry.servingSize || '')}${strCell(entry.mealType || '')}</Row>`;
      });
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Activities"><Table>';
      xml += '<Row>' + ['Date','Time','Name','Type','Intensity','Duration (min)','Calories Burned'].map(h => headerCell(h)).join('') + '</Row>';
      activities.forEach(activity => {
        xml += `<Row>${strCell(fmtDate(activity.timestamp))}${strCell(fmtTime(activity.timestamp))}${strCell(activity.name)}${strCell(activity.type)}${strCell(activity.intensity)}${numCell(activity.duration)}${numCell(activity.caloriesBurned)}</Row>`;
      });
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Weight History"><Table>';
      xml += '<Row>' + ['Date','Time','Weight (kg)','BMI'].map(h => headerCell(h)).join('') + '</Row>';
      weightHistory.forEach(entry => {
        xml += `<Row>${strCell(fmtDate(entry.timestamp))}${strCell(fmtTime(entry.timestamp))}${numCell(entry.weight)}${numCell((entry.bmi || 0).toFixed(1))}</Row>`;
      });
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Blood Pressure"><Table>';
      xml += '<Row>' + ['Date','Time','Systolic (mmHg)','Diastolic (mmHg)','Pulse (bpm)','Notes'].map(h => headerCell(h)).join('') + '</Row>';
      extra.bloodPressure.forEach(bp => {
        xml += `<Row>${strCell(fmtDate(bp.timestamp))}${strCell(fmtTime(bp.timestamp))}${numCell(bp.systolic)}${numCell(bp.diastolic)}${bp.pulse ? numCell(bp.pulse) : strCell('')}${strCell(bp.notes || '')}</Row>`;
      });
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Blood Glucose"><Table>';
      xml += '<Row>' + ['Date','Time','Value','Unit','Type','Notes'].map(h => headerCell(h)).join('') + '</Row>';
      extra.bloodGlucose.forEach(bg => {
        xml += `<Row>${strCell(fmtDate(bg.timestamp))}${strCell(fmtTime(bg.timestamp))}${numCell(bg.value)}${strCell(bg.unit)}${strCell(bg.type)}${strCell(bg.notes || '')}</Row>`;
      });
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Fasting History"><Table>';
      xml += '<Row>' + ['Date','Fasting Type','Start Time','End Time','Duration (hrs)','Completed','Note'].map(h => headerCell(h)).join('') + '</Row>';
      extra.fastingHistory.forEach(f => {
        xml += `<Row>${strCell(fmtDate(f.startTime))}${strCell(f.fastingType)}${strCell(fmtTime(f.startTime))}${strCell(fmtTime(f.endTime))}${numCell((f.duration / 3600000).toFixed(1))}${strCell(f.completed ? 'Yes' : 'No')}${strCell(f.note || '')}</Row>`;
      });
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Medications"><Table>';
      xml += '<Row>' + ['Name','Dosage','Unit','Frequency','Category','Active','Times'].map(h => headerCell(h)).join('') + '</Row>';
      extra.medications.forEach(med => {
        const times = med.times.map(t => `${t.hour.toString().padStart(2,'0')}:${t.minute.toString().padStart(2,'0')} ${t.label}`).join('; ');
        xml += `<Row>${strCell(med.name)}${numCell(med.dosage)}${strCell(med.unit)}${strCell(med.frequency)}${strCell(med.category)}${strCell(med.isActive ? 'Yes' : 'No')}${strCell(times)}</Row>`;
      });
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Medication Logs"><Table>';
      xml += '<Row>' + ['Date','Medication ID','Scheduled Time','Taken Time','Status'].map(h => headerCell(h)).join('') + '</Row>';
      extra.medicationLogs.forEach(log => {
        xml += `<Row>${strCell(log.date)}${strCell(log.medicationId)}${strCell(fmtTime(log.scheduledTime))}${strCell(log.takenTime ? fmtTime(log.takenTime) : '')}${strCell(log.status)}</Row>`;
      });
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Assessments"><Table>';
      xml += '<Row>' + ['Date','Time','Assessment ID','Score','Risk Level','Range Min','Range Max','Range Color','Range Description','Answers JSON'].map(h => headerCell(h)).join('') + '</Row>';
      extra.assessments.forEach((assessment: any) => {
        xml += `<Row>${strCell(fmtDate(assessment.date))}${strCell(fmtTime(assessment.date))}${strCell(assessment.assessmentId || '')}${numCell(assessment.score ?? 0)}${strCell(assessment.scoreRange?.label || '')}${numCell(assessment.scoreRange?.min ?? 0)}${numCell(assessment.scoreRange?.max ?? 0)}${strCell(assessment.scoreRange?.color || '')}${strCell(assessment.scoreRange?.description || '')}${strCell(JSON.stringify(assessment.answers || {}))}</Row>`;
      });
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Profile"><Table>';
      xml += '<Row>' + ['Age','Gender','Height (cm)','Weight (kg)','Activity Level'].map(h => headerCell(h)).join('') + '</Row>';
      xml += `<Row>${numCell(profile.age)}${strCell(profile.gender)}${numCell(profile.height)}${numCell(profile.weight)}${strCell(profile.activityLevel)}</Row>`;
      xml += '</Table></Worksheet>';

      xml += '<Worksheet ss:Name="Daily Goals"><Table>';
      xml += '<Row>' + ['Calories','Protein (g)','Carbs (g)','Fat (g)'].map(h => headerCell(h)).join('') + '</Row>';
      xml += `<Row>${numCell(goals.calories)}${numCell(goals.protein)}${numCell(goals.carbs)}${numCell(goals.fat)}</Row>`;
      xml += '</Table></Worksheet>';

      xml += '</Workbook>';
      content = xml;
      mimeType = 'application/vnd.ms-excel';
      extension = 'xls';
    } else {
      const safeProfile = stripProfilePersonalIdentifiers(profile);
      const rawEntries = await Promise.all(
        APP_STORAGE_EXPORT_KEYS.map(async (key) => {
          const rawValue = await AsyncStorage.getItem(key);
          if (key === PROFILE_KEY && rawValue) {
            try {
              const parsed = JSON.parse(rawValue) as UserProfile;
              return [key, JSON.stringify(stripProfilePersonalIdentifiers(parsed))] as const;
            } catch {
              return [key, rawValue] as const;
            }
          }
          return [key, rawValue] as const;
        })
      );
      const exportObj = {
        exportDate: new Date().toISOString(),
        profile: safeProfile,
        goals,
        entries,
        activities,
        weightHistory,
        bloodPressure: extra.bloodPressure,
        bloodGlucose: extra.bloodGlucose,
        fastingHistory: extra.fastingHistory,
        medications: extra.medications,
        medicationLogs: extra.medicationLogs,
        assessments: extra.assessments,
        appStorageRaw: Object.fromEntries(rawEntries),
      };
      content = JSON.stringify(exportObj, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    }

    const fileName = `healthme_export_${dateStr}.${extension}`;
    
    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('[FoodContext] Web export completed:', fileName);
        const now = Date.now();
        setLastBackupAt(now);
        await AsyncStorage.setItem(LAST_BACKUP_AT_KEY, String(now));
        setSyncPendingCount(0);
        await AsyncStorage.setItem(SYNC_PENDING_COUNT_KEY, '0');
      } catch (e) {
        console.error('[FoodContext] Web export failed:', e);
        throw e;
      }
      return;
    }
    
    try {
      const { File, Paths } = await import('expo-file-system');
      const Sharing = await import('expo-sharing');

      const file = new File(Paths.cache, fileName);
      console.log('[FoodContext] Writing file to:', file.uri);
      
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(content);
      console.log('[FoodContext] File written successfully');

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType,
          dialogTitle: `Export Health Data (${extension.toUpperCase()})`,
          UTI: format === 'csv' ? 'public.comma-separated-values-text' : format === 'xls' ? 'com.microsoft.excel.xls' : 'public.json',
        });
        console.log('[FoodContext] File shared successfully');
      } else {
        Alert.alert('Export Complete', `File saved to: ${file.uri}`);
      }

      const now = Date.now();
      setLastBackupAt(now);
      await AsyncStorage.setItem(LAST_BACKUP_AT_KEY, String(now));
      setSyncPendingCount(0);
      await AsyncStorage.setItem(SYNC_PENDING_COUNT_KEY, '0');
    } catch (e) {
      console.error('[FoodContext] Native export failed:', e);
      throw e;
    }
  }, [profile, goals, entries, activities, weightHistory, loadExtraDataForExport]);

  return {
    entries,
    goals,
    profile,
    activities,
    weightHistory,
    isLoading,
    isFirstTimeUser,
    todayEntries,
    todayActivities,
    todayTotals,
    todayCaloriesBurned,
    todayBasalCaloriesBurned,
    totalCaloriesBurned,
    syncPendingCount,
    lastBackupAt,
    baseTDEE,
    baseBMR,
    currentBMI,
    addEntry,
    addEntryWithDate,
    removeEntry,
    updateGoals,
    updateProfile,
    addActivity,
    addActivityWithDate,
    removeActivity,
    addWeightEntry,
    addWeightEntryWithDate,
    getEntriesByDate,
    getActivitiesByDate,
    getDailyStats,
    completeOnboarding,
    clearAllData,
    exportData,
    importCsvData,
    importJsonData,
  };
});
