import { DailyGoals, UserProfile } from '@/types/food';

export const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: 25,
  gender: 'male',
  height: 170,
  weight: 70,
  targetWeight: 0,
  activityLevel: 'moderate',
};

export const MEAL_TYPES = [
  { key: 'breakfast' as const, label: 'Breakfast', icon: 'sunrise' },
  { key: 'lunch' as const, label: 'Lunch', icon: 'sun' },
  { key: 'dinner' as const, label: 'Dinner', icon: 'sunset' },
  { key: 'snack' as const, label: 'Snack', icon: 'cookie' },
];

export const ACTIVITY_TYPES = [
  { key: 'walking' as const, label: 'Walking', metLight: 3.0, metModerate: 4.3, metVigorous: 5.0 },
  { key: 'running' as const, label: 'Running', metLight: 6.0, metModerate: 9.8, metVigorous: 11.5 },
  { key: 'cycling' as const, label: 'Cycling', metLight: 4.0, metModerate: 6.8, metVigorous: 10.0 },
  { key: 'swimming' as const, label: 'Swimming', metLight: 4.5, metModerate: 7.0, metVigorous: 10.0 },
  { key: 'gym' as const, label: 'Gym/Weights', metLight: 3.5, metModerate: 5.0, metVigorous: 6.0 },
  { key: 'sports' as const, label: 'Sports', metLight: 4.5, metModerate: 6.5, metVigorous: 8.0 },
  { key: 'other' as const, label: 'Other', metLight: 3.0, metModerate: 5.0, metVigorous: 7.0 },
];

export const ACTIVITY_LEVELS = [
  { key: 'sedentary' as const, label: 'Sedentary', multiplier: 1.2 },
  { key: 'light' as const, label: 'Lightly Active', multiplier: 1.375 },
  { key: 'moderate' as const, label: 'Moderately Active', multiplier: 1.55 },
  { key: 'active' as const, label: 'Active', multiplier: 1.725 },
  { key: 'very_active' as const, label: 'Very Active', multiplier: 1.9 },
];

export const APP_UPDATE_CONFIG = {
  // Set true after you configure a backend endpoint that returns latest version metadata.
  enabled: false,
  // Example endpoint response:
  // { "latestVersion": "2.3.0", "minSupportedVersion": "2.2.0", "forceUpdate": false }
  checkUrl: '',
  androidPackage: 'app.publichealthnepalupdates.com',
} as const;
