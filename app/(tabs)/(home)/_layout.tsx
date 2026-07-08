import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';
import { getDashboardMenu } from '@/constants/blogMenus';

export default function HomeLayout() {
  return (
    <Stack
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
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="jobs"
        options={{
          title: 'Opportunities',
        }}
      />
      <Stack.Screen
        name="books"
        options={{
          title: 'Books',
        }}
      />
      <Stack.Screen
        name="calculator"
        options={{
          title: 'Calculator',
        }}
      />
      <Stack.Screen
        name="exam-preparation"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="calorie-estimator"
        options={{
          title: 'Calorie Estimation',
        }}
      />
      <Stack.Screen
        name="bmi-calculator"
        options={{
          title: 'BMI Calculator',
        }}
      />
      <Stack.Screen
        name="measurement-converter"
        options={{
          title: 'Measurement Conversion',
        }}
      />
      <Stack.Screen
        name="date-converter"
        options={{
          title: 'Date Converter',
        }}
      />
      <Stack.Screen
        name="interested"
        options={({ route }: any) => ({
          title: route?.params?.menuKey
            ? `${getDashboardMenu(route.params.menuKey || '')?.title || 'Menu'} Interested`
            : 'Interested',
        })}
      />
      <Stack.Screen
        name="category"
        options={({ route }: any) => {
          const submenuKey = route?.params?.submenuKey;
          if (submenuKey === 'research-tools') {
            return { title: 'Research tools' };
          }

          return {
            title: getDashboardMenu(route?.params?.menuKey || '')?.title || 'Posts',
          };
        }}
      />
      <Stack.Screen
        name="selected-blogs"
        options={{
          title: 'Selected Blogs',
        }}
      />
      <Stack.Screen
        name="keep-notes"
        options={{
          title: 'Keep Notes',
        }}
      />
      <Stack.Screen
        name="camscanner"
        options={{
          title: 'CamScanner',
        }}
      />
      <Stack.Screen
        name="pdf-converter"
        options={{
          title: 'PDF Converter',
        }}
      />
      <Stack.Screen
        name="pdf-tools"
        options={{
          title: 'PDF Tools',
        }}
      />
      <Stack.Screen
        name="job-portal"
        options={{
          title: 'Job Portal',
        }}
      />
      <Stack.Screen
        name="research-grants"
        options={{
          title: 'Research Grants',
        }}
      />
    </Stack>
  );
}
