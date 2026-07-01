import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FoodProvider } from "@/contexts/FoodContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { MealPlanProvider } from "@/contexts/MealPlanContext";
import { MedicationProvider } from "@/contexts/MedicationContext";
import { CalorieNotificationWatcher } from "@/components/CalorieNotificationWatcher";
import { FloatingVoiceButtons } from "@/components/FloatingVoiceButtons";
import { colors } from "@/constants/colors";
import { checkForAppUpdate } from '@/services/appUpdate';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const APP_UPDATE_SKIP_KEY = 'app_update_skipped_version';

function AppUpdateWatcher() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const openStorePage = async (storeUrl: string) => {
      try {
        await Linking.openURL(storeUrl);
      } catch (error) {
        console.log('[AppUpdate] Failed to open store URL:', error);
      }
    };

    const runUpdateCheck = async () => {
      const update = await checkForAppUpdate();
      if (!update?.updateAvailable) return;

      if (!update.shouldForceUpdate) {
        const skippedVersion = await AsyncStorage.getItem(APP_UPDATE_SKIP_KEY);
        if (skippedVersion === update.latestVersion) return;
      }

      if (update.shouldForceUpdate) {
        Alert.alert(
          'Update required',
          `A newer version (${update.latestVersion}) is required to continue. Please update from the Play Store.`,
          [
            {
              text: 'Update now',
              onPress: () => { void openStorePage(update.storeUrl); },
            },
          ],
          { cancelable: false }
        );
        return;
      }

      Alert.alert(
        'Update available',
        `HealthyME ${update.latestVersion} is available on Play Store.`,
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {
              void AsyncStorage.setItem(APP_UPDATE_SKIP_KEY, update.latestVersion);
            },
          },
          {
            text: 'Update now',
            onPress: () => { void openStorePage(update.storeUrl); },
          },
        ]
      );
    };

    void runUpdateCheck();
  }, []);

  return null;
}

// Stores a route to navigate to after notification handling when the router is ready.
let pendingPostUnlockRoute: string | null = null;

interface NotificationNavigationHandlerProps {
  onReady: () => void;
}

function NotificationNavigationHandler({ onReady }: NotificationNavigationHandlerProps) {
  const lastHandledResponseKeyRef = useRef<string | null>(null);
  const didSetupRef = useRef(false);
  const didHandleInitialResponseRef = useRef(false);

  // Navigate once router is warm.
  const navigateOrDefer = React.useCallback((route: string, delay = 500) => {
    setTimeout(() => {
      try { router.push(route as any); } catch {}
    }, delay);
  }, []);

  const buildResponseKey = (response: any): string => {
    const notificationId = response?.notification?.request?.identifier ?? 'unknown';
    const actionId = response?.actionIdentifier ?? 'default';
    return `${notificationId}:${actionId}`;
  };

  const alreadyHandledResponse = (response: any): boolean => {
    const key = buildResponseKey(response);
    if (lastHandledResponseKeyRef.current === key) {
      return true;
    }
    lastHandledResponseKeyRef.current = key;
    return false;
  };

  useEffect(() => {
    if (didSetupRef.current) {
      return;
    }
    didSetupRef.current = true;

    if (Platform.OS === 'web') {
      onReady();
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let isDisposed = false;

    const setup = async () => {
      try {
        const Notifications = await import('expo-notifications');
        const isDefaultAction = (actionId?: string) => (
          !actionId
          || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER
          || actionId === 'expo.modules.notifications.actions.DEFAULT'
        );
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          if (alreadyHandledResponse(response)) return;
          const data = response.notification.request.content.data;
          const actionId = response.actionIdentifier;
          if (actionId === 'MARK_TAKEN' || actionId === 'SKIP') return;

          const storeUrl = data?.storeUrl as string | undefined;
          const notificationType = data?.type as string | undefined;

          // For reminder notifications with action buttons, only navigate on explicit button taps.
          // Default body-tap should open the tracker hub after unlock.
          if (
            isDefaultAction(actionId)
            && notificationType === 'activity_reminder'
          ) {
            navigateOrDefer('/(tabs)/(home)', 0);
            return;
          }

          if (notificationType === 'app_update' || storeUrl) {
            const targetUrl = storeUrl || 'https://play.google.com/store/apps/details?id=app.healthyme.health';
            void Linking.openURL(targetUrl).catch((error) => {
              console.log('[NotificationNav] Failed to open update URL:', error);
            });
            return;
          }

          if (actionId === 'LOG_ACTIVITY' || actionId === 'VOICE_LOG_ACTIVITY') {
            navigateOrDefer('/(tabs)/(home)', 0);
            return;
          }

          if (actionId === 'LOG_FOOD' || actionId === 'VOICE_LOG_FOOD') {
            navigateOrDefer('/add-food', 0);
            return;
          }

          // Health tip: dismiss from notification drawer and open app naturally.
          if (notificationType === 'health_tip') {
            void Notifications.dismissNotificationAsync(
              response.notification.request.identifier
            ).catch(() => {});
            return;
          }

          const route = data?.route as string | undefined;
          if (route) {
            console.log('[NotificationNav] Navigating to:', route);
            navigateOrDefer(route);
          } else {
            const type = data?.type as string | undefined;
            if (type === 'activity_reminder') {
              navigateOrDefer('/(tabs)/(home)');
            } else if (type === 'fasting') {
              navigateOrDefer('/(tabs)/(home)');
            } else if (type) {
              console.log('[NotificationNav] Unknown notification type:', type);
            }
          }
        });

        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse && !didHandleInitialResponseRef.current) {
          didHandleInitialResponseRef.current = true;
          if (alreadyHandledResponse(lastResponse)) return;
          const data = lastResponse.notification.request.content.data;
          const actionId = lastResponse.actionIdentifier;
          if (actionId !== 'MARK_TAKEN' && actionId !== 'SKIP') {
            const storeUrl = data?.storeUrl as string | undefined;
            const notificationType = data?.type as string | undefined;

            if (
              isDefaultAction(actionId)
              && notificationType === 'activity_reminder'
            ) {
              pendingPostUnlockRoute = '/(tabs)/(home)';
              return;
            }

            if (notificationType === 'app_update' || storeUrl) {
              const targetUrl = storeUrl || 'https://play.google.com/store/apps/details?id=app.healthyme.health';
              void Linking.openURL(targetUrl).catch((error) => {
                console.log('[NotificationNav] Failed to open cold-start update URL:', error);
              });
              return;
            }

            if (actionId === 'LOG_ACTIVITY' || actionId === 'VOICE_LOG_ACTIVITY') {
              pendingPostUnlockRoute = '/(tabs)/(home)';
              return;
            }
            if (actionId === 'LOG_FOOD' || actionId === 'VOICE_LOG_FOOD') {
              pendingPostUnlockRoute = '/add-food';
              return;
            }
            // Health tip: dismiss from notification drawer and open app naturally.
            if (notificationType === 'health_tip') {
              void Notifications.dismissNotificationAsync(
                lastResponse.notification.request.identifier
              ).catch(() => {});
              return;
            }
            const route = data?.route as string | undefined;
            if (route) {
              // During cold-start the router is still warming up; always defer.
              pendingPostUnlockRoute = route;
            }
          }
        }
      } catch (e) {
        console.log('[NotificationNav] Setup error:', e);
      } finally {
        if (!isDisposed) {
          onReady();
        }
      }
    };
    setup();
    return () => {
      isDisposed = true;
      subscription?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReady]);
  return null;
}

interface RootLayoutNavProps {
  isNotificationNavigationReady: boolean;
}

function RootLayoutNav({ isNotificationNavigationReady }: RootLayoutNavProps) {
  const { isLoading, theme } = useSettings();
  const statusBarStyle = theme === 'dark' ? 'light' : 'dark';

  // Fire any deferred notification route once app and router are ready.
  useEffect(() => {
    if (!isLoading && isNotificationNavigationReady && pendingPostUnlockRoute) {
      const route = pendingPostUnlockRoute;
      pendingPostUnlockRoute = null;
      setTimeout(() => {
        try { router.push(route as any); } catch {}
      }, 300);
    }
  }, [isLoading, isNotificationNavigationReady]);

  if (isLoading || !isNotificationNavigationReady) {
    return null;
  }

  return (
    <>
      <StatusBar style={statusBarStyle} backgroundColor={colors.background} />
      <Stack
        key={`app-${theme}`}
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-food" options={{ presentation: "modal", title: "Add Food", headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="web-viewer" options={{ headerShown: false, presentation: "modal", gestureEnabled: true }} />
        <Stack.Screen name="about-us" options={{ title: 'About Us' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="public-health-day" options={{ title: 'Public Health Day' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [isNotificationNavigationReady, setIsNotificationNavigationReady] = useState(Platform.OS === 'web');
  const handleNotificationReady = React.useCallback(() => {
    setIsNotificationNavigationReady(true);
  }, []);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SettingsProvider>
            <FoodProvider>
              <MealPlanProvider>
                <MedicationProvider>
                  <RootLayoutNav isNotificationNavigationReady={isNotificationNavigationReady} />
                  <AppUpdateWatcher />
                  <NotificationNavigationHandler onReady={handleNotificationReady} />
                  <CalorieNotificationWatcher />
                  <FloatingVoiceButtons />
                </MedicationProvider>
              </MealPlanProvider>
            </FoodProvider>
          </SettingsProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
