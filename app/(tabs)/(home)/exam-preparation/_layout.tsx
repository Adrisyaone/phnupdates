import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

export default function ExamPreparationLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Exam Preparation' }} />
      <Stack.Screen name="syllabus" options={{ title: 'Syllabus' }} />
      <Stack.Screen name="practice-mcqs" options={{ title: 'Practice MCQs' }} />
      <Stack.Screen name="tutor" options={{ title: 'AI Tutor' }} />
      <Stack.Screen name="progress" options={{ title: 'Progress' }} />
    </Stack>
  );
}