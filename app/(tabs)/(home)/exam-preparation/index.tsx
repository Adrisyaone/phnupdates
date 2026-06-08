import { useRouter } from 'expo-router';
import { BookOpen, Brain, ChartColumnIncreasing, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors, createThemedStyles } from '@/constants/colors';

const MENU_ITEMS = [
  {
    title: 'Syllabus',
    description: 'Review subject-wise study topics and important areas.',
    icon: BookOpen,
    route: '/(tabs)/(home)/exam-preparation/syllabus' as const,
  },
  {
    title: 'Practice MCQs',
    description: 'Practice subject-wise multiple choice questions from Google Sheets.',
    icon: Brain,
    route: '/(tabs)/(home)/exam-preparation/practice-mcqs' as const,
  },
  {
    title: 'Ask the AI Tutor',
    description: 'Get Gemini-powered explanations and study support.',
    icon: Sparkles,
    route: '/(tabs)/(home)/exam-preparation/tutor' as const,
  },
  {
    title: 'Progress',
    description: 'Check accuracy, attempts, and your current practice momentum.',
    icon: ChartColumnIncreasing,
    route: '/(tabs)/(home)/exam-preparation/progress' as const,
  },
];

export default function ExamPreparationHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.title}
                style={styles.card}
                activeOpacity={0.86}
                onPress={() => {
                  router.push(item.route);
                }}
              >
                <View style={styles.cardIconWrap}>
                  <Icon size={22} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 10,
    gap: 12,
  },
  grid: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '14',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
}));