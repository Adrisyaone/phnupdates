import { ActivityEntry, DailyGoals, UserProfile } from '@/types/food';

export interface AppUpdateConfig {
  enabled: boolean;
  checkUrl: string;
  androidPackage: string;
}

export const APP_UPDATE_CONFIG: AppUpdateConfig = {
  enabled: false,
  checkUrl: '',
  androidPackage: 'app.publichealthnepalupdates.com',
};

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: 25,
  gender: 'male',
  height: 170,
  weight: 70,
  targetWeight: undefined,
  activityLevel: 'moderate',
  ncds: [],
};

export const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

export const ACTIVITY_LEVELS: { key: UserProfile['activityLevel']; multiplier: number }[] = [
  { key: 'sedentary', multiplier: 1.2 },
  { key: 'light', multiplier: 1.375 },
  { key: 'moderate', multiplier: 1.55 },
  { key: 'active', multiplier: 1.725 },
  { key: 'very_active', multiplier: 1.9 },
];

export const ACTIVITY_TYPES: { key: ActivityEntry['type']; metLight: number; metModerate: number; metVigorous: number }[] = [
  { key: 'walking', metLight: 2.5, metModerate: 3.5, metVigorous: 4.5 },
  { key: 'running', metLight: 6, metModerate: 9.8, metVigorous: 12.8 },
  { key: 'cycling', metLight: 4, metModerate: 8, metVigorous: 10 },
  { key: 'swimming', metLight: 5.8, metModerate: 7, metVigorous: 9.8 },
  { key: 'gym', metLight: 3, metModerate: 5, metVigorous: 6 },
  { key: 'sports', metLight: 4, metModerate: 7, metVigorous: 10 },
  { key: 'other', metLight: 3, metModerate: 4, metVigorous: 6 },
];
