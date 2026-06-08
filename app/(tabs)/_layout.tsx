import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

export default function TabsAsStackLayout() {
  return (
    <Stack
      initialRouteName="(home)"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="(home)"
        options={{
          title: 'Dashboard',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="knowledge"
        options={{
          title: 'Knowledge Hub',
        }}
      />
    </Stack>
  );
}
