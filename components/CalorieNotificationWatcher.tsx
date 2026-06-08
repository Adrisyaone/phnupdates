import { useEffect, useRef } from 'react';
import { useFood } from '@/contexts/FoodContext';
import { useSettings } from '@/contexts/SettingsContext';

export function CalorieNotificationWatcher() {
  const { todayTotals, goals } = useFood();
  const { sendCalorieExceededNotification, notificationSettings } = useSettings();
  const hasNotifiedToday = useRef(false);
  const lastCalories = useRef(0);

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const checkAndResetDaily = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 5) {
        hasNotifiedToday.current = false;
      }
    };
    
    checkAndResetDaily();
  }, []);

  useEffect(() => {
    if (!notificationSettings.calorieAlertEnabled) {
      return;
    }

    const previousCalories = lastCalories.current;
    const currentCalories = todayTotals.calories;
    lastCalories.current = currentCalories;

    if (
      currentCalories > goals.calories &&
      previousCalories <= goals.calories &&
      !hasNotifiedToday.current &&
      currentCalories > 0
    ) {
      console.log('[CalorieNotificationWatcher] Calorie goal exceeded, sending notification');
      sendCalorieExceededNotification();
      hasNotifiedToday.current = true;
    }
  }, [todayTotals.calories, goals.calories, notificationSettings.calorieAlertEnabled, sendCalorieExceededNotification]);

  return null;
}
