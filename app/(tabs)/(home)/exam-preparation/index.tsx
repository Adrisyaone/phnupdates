import { useRouter } from 'expo-router';
import { BookOpen, Brain, ChartColumnIncreasing, GraduationCap, Layers, Shuffle, Sparkles, Wand2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, glow, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero, PressableScale } from '@/components/ui';

const SYLLABUS_URL = 'https://www.phnupdates.com/search/label/Syllabus';

const MENU_ITEMS = [
  {
    title: 'Syllabus',
    description: 'Review subject-wise study topics and important areas.',
    icon: BookOpen,
    color: '#2DD4BF',
    route: null as null,
    webUrl: SYLLABUS_URL,
  },
  {
    title: 'Flashcards',
    description: 'Study key terms and definitions with flippable cards — sorted by subject and difficulty.',
    icon: Layers,
    color: '#3B82F6',
    route: '/(tabs)/(home)/exam-preparation/flashcards' as const,
    webUrl: null as null,
  },
  {
    title: 'Practice MCQs',
    description: 'Practice subject-wise multiple choice questions from Google Sheets.',
    icon: Brain,
    color: '#8B5CF6',
    route: '/(tabs)/(home)/exam-preparation/practice-mcqs' as const,
    webUrl: null as null,
  },
  {
    title: 'Random Quiz',
    description: 'Pick a number of questions, get a random mix from all subjects and chapters.',
    icon: Shuffle,
    color: '#F59E0B',
    route: '/(tabs)/(home)/exam-preparation/random-quiz' as const,
    webUrl: null as null,
  },
  {
    title: 'AI Quiz Generator',
    description: 'Generate fresh MCQs on any public health topic instantly using Gemini AI.',
    icon: Wand2,
    color: '#EC4899',
    route: '/(tabs)/(home)/exam-preparation/ai-quiz' as const,
    webUrl: null as null,
  },
  {
    title: 'Ask the AI Tutor',
    description: 'Get Gemini-powered explanations and study support.',
    icon: Sparkles,
    color: '#F97316',
    route: '/(tabs)/(home)/exam-preparation/tutor' as const,
    webUrl: null as null,
  },
  {
    title: 'Progress',
    description: 'Check accuracy, attempts, and your current practice momentum.',
    icon: ChartColumnIncreasing,
    color: '#22C55E',
    route: '/(tabs)/(home)/exam-preparation/progress' as const,
    webUrl: null as null,
  },
];

export default function ExamPreparationHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground tint="#8B5CF6" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GradientHero rounded colorsOverride={['#8B5CF6', '#6D28D9']} style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroIcon}>
              <GraduationCap size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Exam Preparation</Text>
            <Text style={styles.heroSubtitle}>Syllabus, MCQs, flashcards, an AI tutor, and progress tracking — all in one place.</Text>
          </View>
        </GradientHero>

        <View style={styles.grid}>
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <AnimatedEntrance key={item.title} index={i} from="up">
                <PressableScale
                  style={[styles.card, { borderColor: item.color + '2E' }]}
                  haptic
                  onPress={() => {
                    if (item.webUrl) {
                      router.push({ pathname: '/web-viewer', params: { url: item.webUrl, title: item.title } });
                      return;
                    }
                    if (item.route) {
                      router.push(item.route);
                    }
                  }}
                >
                  <LinearGradient
                    colors={[item.color + '12', item.color + '03']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardBg}
                  />
                  <LinearGradient
                    colors={[item.color, item.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.cardIconWrap, glow(item.color, 0.3)]}
                  >
                    <Icon size={22} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </PressableScale>
              </AnimatedEntrance>
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
    paddingBottom: spacing.xxl,
  },
  hero: {
    paddingBottom: spacing.xl,
  },
  heroInner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF2E',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#FFFFFFE6',
    fontSize: 13,
    lineHeight: 20,
  },
  grid: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.lg,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    overflow: 'hidden',
    ...elevation('md'),
  },
  cardBg: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const),
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
}));
