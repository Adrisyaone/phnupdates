export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  imageUri?: string;
  timestamp: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface NutritionEstimate {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserProfile {
  name: string;
  imageUri?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number;
  weight: number;
  targetWeight?: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  ncds?: string[];
}

export interface ActivityEntry {
  id: string;
  name: string;
  duration: number;
  caloriesBurned: number;
  timestamp: number;
  type: 'walking' | 'running' | 'cycling' | 'swimming' | 'gym' | 'sports' | 'other';
  intensity: 'light' | 'moderate' | 'vigorous';
}

export interface WeightEntry {
  id: string;
  weight: number;
  timestamp: number;
  bmi?: number;
}

export interface DailyStats {
  date: number;
  caloriesIn: number;
  caloriesOut: number;
  weight?: number;
  bmi?: number;
}

export interface PlannedMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: string;
}

export interface DayMealPlan {
  date: string;
  meals: PlannedMeal[];
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;
  ingredients: string[];
  instructions: string[];
  imageUrl: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  tags: string[];
}

export interface FastingSchedule {
  id: string;
  name: string;
  fastingHours: number;
  eatingHours: number;
}

export interface FastingSession {
  id: string;
  scheduleId: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  completedAt?: number;
}

export type MedicationFrequency = 'daily' | 'twice_daily' | 'three_times' | 'weekly' | 'as_needed';
export type MedicationUnit = 'mg' | 'ml' | 'tablet' | 'capsule' | 'drops' | 'puff';
export type MedicationCategory = 'prescription' | 'otc' | 'supplement' | 'vitamin' | 'other';

export interface MedicationTime {
  id: string;
  hour: number;
  minute: number;
  label: string;
}

export interface Medication {
  id: string;
  name: string;
  imageUri?: string;
  dosage: string;
  unit: MedicationUnit;
  frequency: MedicationFrequency;
  category: MedicationCategory;
  times: MedicationTime[];
  startDate: number;
  endDate?: number;
  notes?: string;
  color: string;
  isActive: boolean;
  notificationsEnabled: boolean;
  refillReminder: boolean;
  refillDate?: number;
  currentSupply?: number;
  totalSupply?: number;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledTime: number;
  takenTime?: number;
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  date: string;
}

export interface MedicationAdherence {
  medicationId: string;
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  totalSkipped: number;
  adherenceRate: number;
}
