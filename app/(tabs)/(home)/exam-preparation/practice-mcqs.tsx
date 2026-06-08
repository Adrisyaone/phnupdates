import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Circle, Filter } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { ExamMcqQuestion, groupBySubject, loadExamMcqQuestions, recordExamAttempt } from '@/services/examPreparation';

export default function PracticeMcqsScreen() {
  const [questions, setQuestions] = useState<ExamMcqQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const loadedQuestions = await loadExamMcqQuestions();
      setQuestions(loadedQuestions);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const grouped = useMemo(() => groupBySubject(questions), [questions]);
  const subjects = useMemo(() => ['All', ...Object.keys(grouped).sort()], [grouped]);

  const visibleQuestions = selectedSubject === 'All' ? questions : (grouped[selectedSubject] ?? []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading MCQs...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleQuestions}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadData(true); }} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerCard}>
              <View style={styles.headerTopRow}>
                <Filter size={18} color={colors.primary} />
                <Text style={styles.headerTitle}>Subject filter</Text>
              </View>
              <View style={styles.subjectChips}>
                {subjects.map((subject) => {
                  const active = subject === selectedSubject;
                  return (
                    <TouchableOpacity
                      key={subject}
                      onPress={() => setSelectedSubject(subject)}
                      style={[styles.subjectChip, active && styles.subjectChipActive]}
                    >
                      <Text style={[styles.subjectChipText, active && styles.subjectChipTextActive]}>{subject}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          }
          renderItem={({ item, index }) => {
            const selectedIndex = selectedAnswers[item.id];
            const selectedOption = selectedIndex !== undefined ? item.options[selectedIndex] : undefined;
            const correctIndex = item.options.findIndex((option) => option.trim().toLowerCase() === item.answer.trim().toLowerCase());
            const isCorrect = selectedOption ? selectedOption.trim().toLowerCase() === item.answer.trim().toLowerCase() : false;

            return (
              <View style={styles.questionCard}>
                <Text style={styles.questionMeta}>{item.subject} • {item.topic} • Q{index + 1}</Text>
                <Text style={styles.questionText}>{item.question}</Text>
                <View style={styles.optionList}>
                  {item.options.map((option, optionIndex) => {
                    const isSelected = selectedIndex === optionIndex;
                    const optionIsCorrect = optionIndex === correctIndex;
                    const optionStyle = isSelected
                      ? (optionIsCorrect ? styles.correctOption : styles.wrongOption)
                      : optionIsCorrect && selectedIndex !== undefined
                        ? styles.correctOption
                        : styles.optionButton;

                    return (
                      <TouchableOpacity
                        key={`${item.id}-${option}`}
                        style={optionStyle}
                        onPress={async () => {
                          setSelectedAnswers((current) => ({ ...current, [item.id]: optionIndex }));
                          await recordExamAttempt({
                            question: item,
                            chosenOption: option,
                            isCorrect: option.trim().toLowerCase() === item.answer.trim().toLowerCase(),
                          });
                        }}
                      >
                        {isSelected ? <CheckCircle2 size={16} color={optionIsCorrect ? colors.success : colors.error} /> : <Circle size={16} color={colors.textSecondary} />}
                        <Text style={styles.optionText}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedIndex !== undefined ? (
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationTitle}>{isCorrect ? 'Correct answer' : 'Review the answer'}</Text>
                    <Text style={styles.explanationText}>Answer: {item.answer}</Text>
                    {item.explanation ? <Text style={styles.explanationText}>{item.explanation}</Text> : null}
                    <Text style={styles.explanationMeta}>Difficulty: {item.difficulty}</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>No MCQs found</Text>
              <Text style={styles.stateText}>Connect a Google Sheet with subject-wise MCQs, or keep the sample questions enabled.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  subjectChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceAlt,
  },
  subjectChipActive: {
    backgroundColor: colors.primary,
  },
  subjectChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  subjectChipTextActive: {
    color: colors.surface,
  },
  questionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  questionMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  questionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  optionList: {
    gap: 8,
  },
  optionButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  correctOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wrongOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.error + '12',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  explanationBox: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.surfaceAlt,
    gap: 6,
  },
  explanationTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  explanationText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  explanationMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  centerState: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
}));