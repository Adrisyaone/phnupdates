import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { DayMealPlan, PlannedMeal, FastingSession, FastingSchedule, Recipe } from '@/types/food';

const MEAL_PLANS_KEY = 'healthme_meal_plans';
const FASTING_SESSION_KEY = 'healthme_fasting_session';
const FASTING_SCHEDULE_KEY = 'healthme_fasting_schedule';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const FASTING_SCHEDULES: FastingSchedule[] = [
  { id: '16-8', name: '16:8', fastingHours: 16, eatingHours: 8 },
  { id: '18-6', name: '18:6', fastingHours: 18, eatingHours: 6 },
  { id: '20-4', name: '20:4', fastingHours: 20, eatingHours: 4 },
  { id: '14-10', name: '14:10', fastingHours: 14, eatingHours: 10 },
  { id: '12-12', name: '12:12', fastingHours: 12, eatingHours: 12 },
];

export const SAMPLE_RECIPES: Recipe[] = [
  {
    id: 'r1',
    name: 'Greek Yogurt Parfait',
    description: 'Creamy yogurt layered with fresh berries and crunchy granola',
    calories: 320,
    protein: 18,
    carbs: 42,
    fat: 8,
    prepTime: 5,
    ingredients: ['1 cup Greek yogurt', '1/2 cup mixed berries', '1/4 cup granola', '1 tbsp honey'],
    instructions: ['Layer yogurt in a glass', 'Add half the berries', 'Add granola', 'Top with remaining berries', 'Drizzle with honey'],
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    category: 'breakfast',
    tags: ['high-protein', 'quick', 'vegetarian'],
  },
  {
    id: 'r2',
    name: 'Avocado Toast with Eggs',
    description: 'Whole grain toast topped with creamy avocado and poached eggs',
    calories: 380,
    protein: 16,
    carbs: 28,
    fat: 24,
    prepTime: 10,
    ingredients: ['2 slices whole grain bread', '1 ripe avocado', '2 eggs', 'Salt and pepper', 'Red pepper flakes'],
    instructions: ['Toast bread until golden', 'Mash avocado with salt', 'Spread on toast', 'Top with poached eggs', 'Season to taste'],
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400',
    category: 'breakfast',
    tags: ['high-protein', 'healthy-fats', 'vegetarian'],
  },
  {
    id: 'r3',
    name: 'Grilled Chicken Salad',
    description: 'Fresh mixed greens with grilled chicken breast and light vinaigrette',
    calories: 420,
    protein: 38,
    carbs: 18,
    fat: 22,
    prepTime: 20,
    ingredients: ['150g chicken breast', '4 cups mixed greens', '1/2 cucumber', '10 cherry tomatoes', '2 tbsp olive oil', '1 tbsp balsamic vinegar'],
    instructions: ['Grill chicken until cooked through', 'Slice and let rest', 'Combine greens, cucumber, tomatoes', 'Top with sliced chicken', 'Drizzle with oil and vinegar'],
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    category: 'lunch',
    tags: ['high-protein', 'low-carb', 'gluten-free'],
  },
  {
    id: 'r4',
    name: 'Quinoa Buddha Bowl',
    description: 'Nutritious bowl with quinoa, roasted vegetables, and tahini dressing',
    calories: 480,
    protein: 14,
    carbs: 58,
    fat: 22,
    prepTime: 30,
    ingredients: ['1 cup cooked quinoa', '1 cup roasted chickpeas', '1 cup roasted sweet potato', '1 cup steamed broccoli', '2 tbsp tahini', 'Lemon juice'],
    instructions: ['Cook quinoa according to package', 'Roast chickpeas and sweet potato', 'Steam broccoli', 'Arrange in bowl', 'Drizzle with tahini dressing'],
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    category: 'lunch',
    tags: ['vegan', 'high-fiber', 'meal-prep'],
  },
  {
    id: 'r5',
    name: 'Salmon with Vegetables',
    description: 'Pan-seared salmon fillet with roasted seasonal vegetables',
    calories: 520,
    protein: 42,
    carbs: 22,
    fat: 28,
    prepTime: 25,
    ingredients: ['200g salmon fillet', '2 cups mixed vegetables', '1 tbsp olive oil', 'Lemon', 'Fresh dill', 'Garlic'],
    instructions: ['Season salmon with salt and pepper', 'Heat oil in pan', 'Sear salmon 4 min each side', 'Roast vegetables with garlic', 'Serve with lemon and dill'],
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
    category: 'dinner',
    tags: ['high-protein', 'omega-3', 'gluten-free'],
  },
  {
    id: 'r6',
    name: 'Chicken Stir-Fry',
    description: 'Quick and healthy chicken stir-fry with colorful vegetables',
    calories: 450,
    protein: 35,
    carbs: 32,
    fat: 18,
    prepTime: 20,
    ingredients: ['150g chicken breast', '2 cups mixed stir-fry vegetables', '2 tbsp soy sauce', '1 tbsp sesame oil', 'Ginger', 'Garlic'],
    instructions: ['Slice chicken thinly', 'Heat sesame oil in wok', 'Stir-fry chicken until cooked', 'Add vegetables and stir-fry', 'Add soy sauce and serve'],
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
    category: 'dinner',
    tags: ['high-protein', 'quick', 'asian'],
  },
  {
    id: 'r7',
    name: 'Turkey Meatballs',
    description: 'Lean turkey meatballs with zucchini noodles and marinara',
    calories: 380,
    protein: 32,
    carbs: 18,
    fat: 20,
    prepTime: 35,
    ingredients: ['200g ground turkey', '1 egg', '2 zucchinis', '1 cup marinara sauce', 'Italian herbs', 'Parmesan'],
    instructions: ['Mix turkey with egg and herbs', 'Form into meatballs', 'Bake at 375°F for 20 min', 'Spiralize zucchini', 'Serve with sauce and cheese'],
    imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400',
    category: 'dinner',
    tags: ['high-protein', 'low-carb', 'gluten-free'],
  },
  {
    id: 'r8',
    name: 'Protein Smoothie Bowl',
    description: 'Thick berry smoothie bowl topped with seeds and fruit',
    calories: 350,
    protein: 24,
    carbs: 45,
    fat: 8,
    prepTime: 5,
    ingredients: ['1 scoop protein powder', '1 frozen banana', '1 cup frozen berries', '1/2 cup almond milk', 'Chia seeds', 'Sliced almonds'],
    instructions: ['Blend protein, banana, berries, milk until thick', 'Pour into bowl', 'Top with chia seeds', 'Add sliced almonds', 'Add fresh fruit'],
    imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400',
    category: 'breakfast',
    tags: ['high-protein', 'quick', 'post-workout'],
  },
  {
    id: 'r9',
    name: 'Apple Slices with Almond Butter',
    description: 'Crisp apple slices with creamy almond butter',
    calories: 220,
    protein: 6,
    carbs: 28,
    fat: 12,
    prepTime: 3,
    ingredients: ['1 medium apple', '2 tbsp almond butter', 'Cinnamon (optional)'],
    instructions: ['Slice apple into wedges', 'Spread almond butter on each slice', 'Sprinkle with cinnamon if desired'],
    imageUrl: 'https://images.unsplash.com/photo-1568702846914-96b305d2uj3g?w=400',
    category: 'snack',
    tags: ['quick', 'healthy-fats', 'fiber'],
  },
  {
    id: 'r10',
    name: 'Cottage Cheese with Fruit',
    description: 'Protein-rich cottage cheese with fresh seasonal fruit',
    calories: 180,
    protein: 14,
    carbs: 18,
    fat: 5,
    prepTime: 2,
    ingredients: ['1 cup low-fat cottage cheese', '1/2 cup mixed fruit', 'Honey (optional)'],
    instructions: ['Scoop cottage cheese into bowl', 'Top with fresh fruit', 'Drizzle with honey if desired'],
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    category: 'snack',
    tags: ['high-protein', 'quick', 'low-calorie'],
  },
  {
    id: 'r11',
    name: 'Mediterranean Wrap',
    description: 'Whole wheat wrap with hummus, feta, and fresh vegetables',
    calories: 410,
    protein: 16,
    carbs: 48,
    fat: 18,
    prepTime: 10,
    ingredients: ['1 whole wheat wrap', '3 tbsp hummus', '30g feta cheese', 'Cucumber', 'Tomato', 'Lettuce', 'Olives'],
    instructions: ['Spread hummus on wrap', 'Layer vegetables', 'Crumble feta on top', 'Add olives', 'Roll tightly and serve'],
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
    category: 'lunch',
    tags: ['vegetarian', 'mediterranean', 'fiber'],
  },
  {
    id: 'r12',
    name: 'Overnight Oats',
    description: 'Creamy overnight oats with chia seeds and fresh berries',
    calories: 340,
    protein: 12,
    carbs: 52,
    fat: 10,
    prepTime: 5,
    ingredients: ['1/2 cup rolled oats', '1/2 cup milk', '1/4 cup Greek yogurt', '1 tbsp chia seeds', '1/2 cup berries', 'Maple syrup'],
    instructions: ['Combine oats, milk, yogurt in jar', 'Add chia seeds', 'Refrigerate overnight', 'Top with berries', 'Drizzle with maple syrup'],
    imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400',
    category: 'breakfast',
    tags: ['meal-prep', 'fiber', 'vegetarian'],
  },
];

export const [MealPlanProvider, useMealPlan] = createContextHook(() => {
  const [mealPlans, setMealPlans] = useState<DayMealPlan[]>([]);
  const [fastingSession, setFastingSession] = useState<FastingSession | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<FastingSchedule>(FASTING_SCHEDULES[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('[MealPlanContext] Loading data');
      const [storedPlans, storedSession, storedSchedule] = await Promise.all([
        AsyncStorage.getItem(MEAL_PLANS_KEY),
        AsyncStorage.getItem(FASTING_SESSION_KEY),
        AsyncStorage.getItem(FASTING_SCHEDULE_KEY),
      ]);

      if (storedPlans) setMealPlans(JSON.parse(storedPlans));
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session.isActive && session.endTime < Date.now()) {
          session.isActive = false;
          session.completedAt = session.endTime;
        }
        setFastingSession(session);
      }
      if (storedSchedule) {
        const schedule = FASTING_SCHEDULES.find(s => s.id === storedSchedule);
        if (schedule) setSelectedSchedule(schedule);
      }
    } catch (error) {
      console.error('[MealPlanContext] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMealPlans = async (plans: DayMealPlan[]) => {
    try {
      await AsyncStorage.setItem(MEAL_PLANS_KEY, JSON.stringify(plans));
    } catch (error) {
      console.error('[MealPlanContext] Error saving meal plans:', error);
    }
  };

  const saveFastingSession = async (session: FastingSession | null) => {
    try {
      if (session) {
        await AsyncStorage.setItem(FASTING_SESSION_KEY, JSON.stringify(session));
      } else {
        await AsyncStorage.removeItem(FASTING_SESSION_KEY);
      }
    } catch (error) {
      console.error('[MealPlanContext] Error saving fasting session:', error);
    }
  };

  const addMealToPlan = useCallback((date: string, meal: Omit<PlannedMeal, 'id'>) => {
    const newMeal: PlannedMeal = { ...meal, id: generateId() };
    console.log('[MealPlanContext] Adding meal to plan:', date, newMeal);
    
    setMealPlans(prev => {
      const existingPlan = prev.find(p => p.date === date);
      let updated: DayMealPlan[];
      
      if (existingPlan) {
        updated = prev.map(p => 
          p.date === date 
            ? { ...p, meals: [...p.meals, newMeal] }
            : p
        );
      } else {
        updated = [...prev, { date, meals: [newMeal] }];
      }
      
      saveMealPlans(updated);
      return updated;
    });
  }, []);

  const removeMealFromPlan = useCallback((date: string, mealId: string) => {
    console.log('[MealPlanContext] Removing meal from plan:', date, mealId);
    setMealPlans(prev => {
      const updated = prev.map(p => 
        p.date === date 
          ? { ...p, meals: p.meals.filter(m => m.id !== mealId) }
          : p
      ).filter(p => p.meals.length > 0);
      
      saveMealPlans(updated);
      return updated;
    });
  }, []);

  const getMealPlanForDate = useCallback((date: string): DayMealPlan | undefined => {
    return mealPlans.find(p => p.date === date);
  }, [mealPlans]);

  const getWeekMealPlans = useCallback((startDate: Date): DayMealPlan[] => {
    const plans: DayMealPlan[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const plan = mealPlans.find(p => p.date === dateStr);
      plans.push(plan || { date: dateStr, meals: [] });
    }
    return plans;
  }, [mealPlans]);

  const startFasting = useCallback((schedule: FastingSchedule) => {
    const now = Date.now();
    const session: FastingSession = {
      id: generateId(),
      scheduleId: schedule.id,
      startTime: now,
      endTime: now + (schedule.fastingHours * 60 * 60 * 1000),
      isActive: true,
    };
    console.log('[MealPlanContext] Starting fasting session:', session);
    setFastingSession(session);
    setSelectedSchedule(schedule);
    saveFastingSession(session);
    AsyncStorage.setItem(FASTING_SCHEDULE_KEY, schedule.id);
  }, []);

  const endFasting = useCallback(() => {
    console.log('[MealPlanContext] Ending fasting session');
    if (fastingSession) {
      const completedSession = {
        ...fastingSession,
        isActive: false,
        completedAt: Date.now(),
      };
      setFastingSession(completedSession);
      saveFastingSession(completedSession);
    }
  }, [fastingSession]);

  const clearFastingSession = useCallback(() => {
    console.log('[MealPlanContext] Clearing fasting session');
    setFastingSession(null);
    saveFastingSession(null);
  }, []);

  const getRecipesByCalorieGoal = useCallback((calorieGoal: number, mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'): Recipe[] => {
    let filtered = SAMPLE_RECIPES;
    
    if (mealType) {
      filtered = filtered.filter(r => r.category === mealType);
    }
    
    const mealCalorieTarget = mealType === 'snack' 
      ? calorieGoal * 0.15 
      : calorieGoal * 0.28;
    
    return filtered.sort((a, b) => 
      Math.abs(a.calories - mealCalorieTarget) - Math.abs(b.calories - mealCalorieTarget)
    );
  }, []);

  const weekCalorieTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    mealPlans.forEach(plan => {
      totals[plan.date] = plan.meals.reduce((sum, meal) => sum + meal.calories, 0);
    });
    return totals;
  }, [mealPlans]);

  return {
    mealPlans,
    fastingSession,
    selectedSchedule,
    isLoading,
    addMealToPlan,
    removeMealFromPlan,
    getMealPlanForDate,
    getWeekMealPlans,
    startFasting,
    endFasting,
    clearFastingSession,
    getRecipesByCalorieGoal,
    weekCalorieTotals,
    recipes: SAMPLE_RECIPES,
    fastingSchedules: FASTING_SCHEDULES,
  };
});
