import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, BookOpen, CheckCircle2, CheckSquare, Circle, Filter, Square, Tag, XCircle } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import {
  ExamMcqQuestion,
  groupBySubject,
  loadExamMcqQuestions,
  recordExamAttempt,
  resolveCorrectOptionIndices,
} from '@/services/examPreparation';

export default function PracticeMcqsScreen() {
  const [questions, setQuestions] = useState<ExamMcqQuestion[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number[]>>({});
  const [submittedIds, setSubmittedIds] = useState<Record<string, true>>({});

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await loadExamMcqQuestions();
      setQuestions(result.questions);
      setLoadError(result.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const grouped = useMemo(() => groupBySubject(questions), [questions]);
  const subjects = useMemo(() => ['All', ...Object.keys(grouped).sort()], [grouped]);

  const availableTopics = useMemo(() => {
    const source = selectedSubject === 'All' ? questions : (grouped[selectedSubject] ?? []);
    const topics = [...new Set(source.map((q) => q.topic))].sort();
    return ['All', ...topics];
  }, [selectedSubject, grouped, questions]);

  const handleSubjectChange = useCallback((subject: string) => {
    setSelectedSubject(subject);
    setSelectedTopic('All');
  }, []);

  const visibleQuestions = useMemo(() => {
    let base = selectedSubject === 'All' ? questions : (grouped[selectedSubject] ?? []);
    if (selectedTopic !== 'All') {
      base = base.filter((q) => q.topic === selectedTopic);
    }
    return base;
  }, [selectedSubject, selectedTopic, questions, grouped]);

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { void loadData(true); }}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              {/* Error / fallback banner */}
              {loadError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={15} color={colors.error} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.errorBannerTitle}>Could not load from Google Sheet</Text>
                    <Text style={styles.errorBannerBody}>{loadError}</Text>
                  </View>
                </View>
              ) : null}

            <View style={styles.headerCard}>
              {/* Subject filter */}
              <View style={styles.filterRow}>
                <Filter size={15} color={colors.primary} />
                <Text style={styles.filterLabel}>Subject</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {subjects.map((subject) => {
                  const active = subject === selectedSubject;
                  return (
                    <TouchableOpacity
                      key={subject}
                      onPress={() => handleSubjectChange(subject)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {subject}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Topic / Chapter filter */}
              {availableTopics.length > 2 ? (
                <>
                  <View style={[styles.filterRow, styles.filterRowGap]}>
                    <Tag size={15} color={colors.primary} />
                    <Text style={styles.filterLabel}>Chapter</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}
                  >
                    {availableTopics.map((topic) => {
                      const active = topic === selectedTopic;
                      return (
                        <TouchableOpacity
                          key={topic}
                          onPress={() => setSelectedTopic(topic)}
                          style={[styles.chip, styles.chipTopic, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {topic}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              {/* Count */}
              <View style={styles.countRow}>
                <BookOpen size={13} color={colors.textSecondary} />
                <Text style={styles.countText}>
                  {`${visibleQuestions.length} question${visibleQuestions.length !== 1 ? 's' : ''}`}
                  {selectedSubject !== 'All' ? ` · ${selectedSubject}` : ''}
                  {selectedTopic !== 'All' ? ` · ${selectedTopic}` : ''}
                </Text>
              </View>
            </View>
            </View>
          }
          renderItem={({ item, index }) => {
            const correctIndices = resolveCorrectOptionIndices(item.options, item.answer);
            const isMultiCorrect = correctIndices.length > 1;
            const selected: number[] = selectedAnswers[item.id] ?? [];
            const submitted = !!submittedIds[item.id];
            const hasSelection = selected.length > 0;

            const allCorrectChosen =
              correctIndices.every((i) => selected.includes(i)) &&
              selected.every((i) => correctIndices.includes(i));

            const handleOptionPress = async (optIdx: number) => {
              if (submitted) return;
              if (isMultiCorrect) {
                // toggle
                setSelectedAnswers((prev) => {
                  const cur = prev[item.id] ?? [];
                  const next = cur.includes(optIdx) ? cur.filter((i) => i !== optIdx) : [...cur, optIdx];
                  return { ...prev, [item.id]: next };
                });
              } else {
                // single choice — select and immediately submit
                const isCorrect = correctIndices.includes(optIdx);
                setSelectedAnswers((prev) => ({ ...prev, [item.id]: [optIdx] }));
                setSubmittedIds((prev) => ({ ...prev, [item.id]: true }));
                await recordExamAttempt({
                  question: item,
                  chosenOption: item.options[optIdx],
                  isCorrect,
                });
              }
            };

            const checkAnswer = async () => {
              if (!hasSelection || submitted) return;
              setSubmittedIds((prev) => ({ ...prev, [item.id]: true }));
              await recordExamAttempt({
                question: item,
                chosenOption: selected.map((i) => item.options[i]).join(', '),
                isCorrect: allCorrectChosen,
              });
            };

            return (
              <View style={styles.questionCard}>
                <Text style={styles.questionMeta}>
                  {item.subject} · {item.topic} · Q{index + 1}
                </Text>
                <Text style={styles.questionText}>{item.question}</Text>
                {isMultiCorrect ? (
                  <Text style={styles.multiCorrectHint}>Select all correct answers</Text>
                ) : null}
                <View style={styles.optionList}>
                  {item.options.map((option, optionIndex) => {
                    const isSelected = selected.includes(optionIndex);
                    const optionIsCorrect = correctIndices.includes(optionIndex);

                    let optionStyle = styles.optionButton;
                    let icon = isMultiCorrect
                      ? <Square size={16} color={colors.textSecondary} />
                      : <Circle size={16} color={colors.textSecondary} />;

                    if (!submitted && isSelected) {
                      optionStyle = styles.optionSelected;
                      icon = isMultiCorrect
                        ? <CheckSquare size={16} color={colors.primary} />
                        : <Circle size={16} color={colors.primary} />;
                    } else if (submitted) {
                      if (optionIsCorrect) {
                        optionStyle = styles.correctOption;
                        icon = <CheckCircle2 size={16} color={colors.success} />;
                      } else if (isSelected && !optionIsCorrect) {
                        optionStyle = styles.wrongOption;
                        icon = <XCircle size={16} color={colors.error} />;
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={`${item.id}-opt-${optionIndex}`}
                        style={optionStyle}
                        disabled={submitted}
                        onPress={() => { void handleOptionPress(optionIndex); }}
                      >
                        {icon}
                        <Text style={styles.optionText}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {isMultiCorrect && !submitted && hasSelection ? (
                  <TouchableOpacity style={styles.checkBtn} onPress={() => { void checkAnswer(); }}>
                    <Text style={styles.checkBtnText}>Check Answer</Text>
                  </TouchableOpacity>
                ) : null}

                {submitted ? (
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationTitle}>
                      {allCorrectChosen ? 'Correct!' : 'Incorrect — review the answer'}
                    </Text>
                    <Text style={styles.explanationAnswer}>
                      {`Correct: ${correctIndices.map((i) => item.options[i]).join(' / ')}`}
                    </Text>
                    {item.explanation ? (
                      <Text style={styles.explanationText}>{item.explanation}</Text>
                    ) : null}
                    {item.difficulty && item.difficulty !== 'Unknown' ? (
                      <Text style={styles.explanationMeta}>Difficulty: {item.difficulty}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>No MCQs found</Text>
              <Text style={styles.stateText}>
                Add a Google Apps Script URL in app.json → extra.examPreparation.gasUrl, or add a
                single sheet CSV URL in mcqSheetUrl.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16, gap: 12 },

  // Header / filters
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterRowGap: { marginTop: 6 },
  filterLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  chipsScroll: { gap: 8, paddingBottom: 2 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipTopic: { backgroundColor: colors.background },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.surface },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  countText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },

  // Question card
  questionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  questionMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  questionText: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  multiCorrectHint: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  optionList: { gap: 8 },
  optionButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionSelected: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  correctOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.success + '18',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wrongOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.error + '12',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkBtn: {
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    alignItems: 'center',
  },
  checkBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  optionText: { color: colors.text, fontSize: 14, fontWeight: '500', flex: 1 },

  // Explanation
  explanationBox: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: colors.surfaceAlt,
    gap: 5,
  },
  explanationTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  explanationAnswer: { color: colors.primary, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  explanationText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  explanationMeta: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },

  // Empty / loading states
  centerState: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  stateTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  stateText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.error + '55',
    backgroundColor: colors.error + '14',
    padding: 12,
  },
  errorBannerTitle: { color: colors.error, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  errorBannerBody: { color: colors.text, fontSize: 12, lineHeight: 18 },

}));
