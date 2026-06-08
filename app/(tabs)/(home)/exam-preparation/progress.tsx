import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadExamAttempts, loadExamMcqQuestions } from '@/services/examPreparation';
import { colors, createThemedStyles } from '@/constants/colors';

export default function ExamProgressScreen() {
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [questions, setQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [loadedAttempts, loadedQuestions] = await Promise.all([loadExamAttempts(), loadExamMcqQuestions()]);
        setAttempts(loadedAttempts.length);
        setCorrect(loadedAttempts.filter((attempt) => attempt.isCorrect).length);
        setQuestions(loadedQuestions.length);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const accuracy = useMemo(() => {
    if (attempts === 0) return 0;
    return Math.round((correct / attempts) * 100);
  }, [attempts, correct]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading progress...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Practice summary</Text>
            <View style={styles.metricRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{questions}</Text>
                <Text style={styles.metricLabel}>Available MCQs</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{attempts}</Text>
                <Text style={styles.metricLabel}>Attempts</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{accuracy}%</Text>
                <Text style={styles.metricLabel}>Accuracy</Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Next step</Text>
            <Text style={styles.summaryText}>
              Keep practicing by subject, review wrong answers, and use the AI tutor when a concept needs extra explanation.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricBox: {
    flexGrow: 1,
    flexBasis: 100,
    borderRadius: 16,
    padding: 14,
    backgroundColor: colors.surfaceAlt,
    gap: 4,
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
}));