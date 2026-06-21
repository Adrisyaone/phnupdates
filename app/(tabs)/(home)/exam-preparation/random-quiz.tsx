import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  RefreshCw,
  Shuffle,
  Square,
  XCircle,
} from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import {
  ExamMcqQuestion,
  groupBySubject,
  loadExamMcqQuestions,
  recordExamAttempt,
  resolveCorrectOptionIndices,
} from '@/services/examPreparation';

const QUICK_COUNTS = [5, 10, 20, 30];

type Phase = 'setup' | 'loading' | 'quiz' | 'result';

export default function RandomQuizScreen() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [allQuestions, setAllQuestions] = useState<ExamMcqQuestion[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [count, setCount] = useState(10);
  const [customCount, setCustomCount] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<ExamMcqQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [submittedIds, setSubmittedIds] = useState<Record<string, true>>({});

  // Load all questions once for setup
  const ensureLoaded = useCallback(async () => {
    if (allQuestions.length > 0) return allQuestions;
    const result = await loadExamMcqQuestions();
    setAllQuestions(result.questions);
    return result.questions;
  }, [allQuestions]);

  const grouped = useMemo(() => groupBySubject(allQuestions), [allQuestions]);
  const subjects = useMemo(() => ['All', ...Object.keys(grouped).sort()], [grouped]);

  const effectiveCount = useMemo(() => {
    const n = customCount.trim() ? parseInt(customCount, 10) : count;
    return Number.isFinite(n) && n > 0 ? n : count;
  }, [count, customCount]);

  const handleStart = useCallback(async () => {
    setPhase('loading');
    const pool = await ensureLoaded();
    const filtered = selectedSubject === 'All' ? pool : (groupBySubject(pool)[selectedSubject] ?? []);
    if (filtered.length === 0) {
      setPhase('setup');
      return;
    }
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(effectiveCount, filtered.length));
    setQuizQuestions(picked);
    setCurrentIndex(0);
    setAnswers({});
    setPhase('quiz');
  }, [ensureLoaded, selectedSubject, effectiveCount]);

  const handleOptionPress = useCallback(async (question: ExamMcqQuestion, optionIndex: number) => {
    if (submittedIds[question.id]) return;
    const correctIndices = resolveCorrectOptionIndices(question.options, question.answer);
    const isMultiCorrect = correctIndices.length > 1;

    if (isMultiCorrect) {
      setAnswers((prev) => {
        const cur = prev[question.id] ?? [];
        const next = cur.includes(optionIndex) ? cur.filter((i) => i !== optionIndex) : [...cur, optionIndex];
        return { ...prev, [question.id]: next };
      });
    } else {
      // single choice — select and immediately submit
      const isCorrect = correctIndices.includes(optionIndex);
      setAnswers((prev) => ({ ...prev, [question.id]: [optionIndex] }));
      setSubmittedIds((prev) => ({ ...prev, [question.id]: true }));
      await recordExamAttempt({ question, chosenOption: question.options[optionIndex], isCorrect });
    }
  }, [submittedIds]);

  const checkAnswer = useCallback(async (question: ExamMcqQuestion) => {
    const selected = answers[question.id] ?? [];
    if (selected.length === 0 || submittedIds[question.id]) return;
    const correctIndices = resolveCorrectOptionIndices(question.options, question.answer);
    const isCorrect =
      correctIndices.every((i) => selected.includes(i)) &&
      selected.every((i) => correctIndices.includes(i));
    setSubmittedIds((prev) => ({ ...prev, [question.id]: true }));
    await recordExamAttempt({ question, chosenOption: selected.map((i) => question.options[i]).join(', '), isCorrect });
  }, [answers, submittedIds]);

  const handleFinish = useCallback(() => setPhase('result'), []);

  const handleRestart = useCallback(() => {
    setPhase('setup');
    setQuizQuestions([]);
    setAnswers({});
    setSubmittedIds({});
    setCurrentIndex(0);
  }, []);

  // ── RESULT PHASE ──────────────────────────────────────────────────────────
  if (phase === 'result') {
    const total = quizQuestions.length;
    const correctCount = quizQuestions.filter((q) => {
      const chosen = answers[q.id] ?? [];
      if (chosen.length === 0) return false;
      const correctIndices = resolveCorrectOptionIndices(q.options, q.answer);
      return correctIndices.every((i) => chosen.includes(i)) && chosen.every((i) => correctIndices.includes(i));
    }).length;
    const skipped = quizQuestions.filter((q) => (answers[q.id] ?? []).length === 0).length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Quiz Complete</Text>
            <Text style={styles.resultScore}>{correctCount}/{total}</Text>
            <Text style={styles.resultAccuracy}>{accuracy}% accuracy</Text>

            <View style={styles.resultMetrics}>
              <View style={styles.resultMetricBox}>
                <Text style={[styles.resultMetricVal, { color: colors.success }]}>{correctCount}</Text>
                <Text style={styles.resultMetricLabel}>Correct</Text>
              </View>
              <View style={styles.resultMetricBox}>
                <Text style={[styles.resultMetricVal, { color: colors.error }]}>{total - correctCount - skipped}</Text>
                <Text style={styles.resultMetricLabel}>Wrong</Text>
              </View>
              <View style={styles.resultMetricBox}>
                <Text style={[styles.resultMetricVal, { color: colors.textSecondary }]}>{skipped}</Text>
                <Text style={styles.resultMetricLabel}>Skipped</Text>
              </View>
            </View>
          </View>

          {/* Review answers */}
          {quizQuestions.map((q, i) => {
            const chosen = answers[q.id];
            const correctIndices = resolveCorrectOptionIndices(q.options, q.answer);
            const isCorrect = chosen !== undefined && correctIndices.includes(chosen);
            return (
              <View key={q.id} style={styles.reviewCard}>
                <Text style={styles.reviewMeta}>{i + 1}. {q.subject} · {q.topic}</Text>
                <Text style={styles.reviewQuestion}>{q.question}</Text>
                {q.options.map((opt, oi) => {
                  const isChosen = (chosen ?? []).includes(oi);
                  const isRight = correctIndices.includes(oi);
                  const bg = isRight
                    ? styles.reviewOptCorrect
                    : isChosen && !isRight
                      ? styles.reviewOptWrong
                      : styles.reviewOpt;
                  return (
                    <View key={oi} style={bg}>
                      <Text style={styles.reviewOptText}>{opt}</Text>
                    </View>
                  );
                })}
                {q.explanation ? (
                  <Text style={styles.reviewExplanation}>{q.explanation}</Text>
                ) : null}
              </View>
            );
          })}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleRestart}>
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>New Quiz</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── QUIZ PHASE ────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const q = quizQuestions[currentIndex];
    const correctIndices = resolveCorrectOptionIndices(q.options, q.answer);
    const isMultiCorrect = correctIndices.length > 1;
    const selected: number[] = answers[q.id] ?? [];
    const submitted = !!submittedIds[q.id];
    const hasSelection = selected.length > 0;
    const isLast = currentIndex === quizQuestions.length - 1;
    const submittedCount = Object.keys(submittedIds).length;

    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / quizQuestions.length) * 100}%` as any }]} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Counter */}
          <View style={styles.quizCounterRow}>
            <Text style={styles.quizCounter}>{currentIndex + 1} / {quizQuestions.length}</Text>
            <Text style={styles.quizMeta}>{q.subject} · {q.topic}</Text>
          </View>

          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{q.question}</Text>
            {isMultiCorrect ? (
              <Text style={styles.multiCorrectHint}>Select all correct answers</Text>
            ) : null}

            <View style={styles.optionList}>
              {q.options.map((option, oi) => {
                const isSelected = selected.includes(oi);
                const isRight = correctIndices.includes(oi);

                let style = styles.optionButton;
                let icon = isMultiCorrect
                  ? <Square size={16} color={colors.textSecondary} />
                  : <Circle size={16} color={colors.textSecondary} />;

                if (!submitted && isSelected) {
                  style = styles.optionSelected;
                  icon = isMultiCorrect
                    ? <CheckSquare size={16} color={colors.primary} />
                    : <Circle size={16} color={colors.primary} />;
                } else if (submitted) {
                  if (isRight) {
                    style = styles.correctOption;
                    icon = <CheckCircle2 size={16} color={colors.success} />;
                  } else if (isSelected && !isRight) {
                    style = styles.wrongOption;
                    icon = <XCircle size={16} color={colors.error} />;
                  }
                }

                return (
                  <TouchableOpacity
                    key={oi}
                    style={style}
                    disabled={submitted}
                    onPress={() => { void handleOptionPress(q, oi); }}
                  >
                    {icon}
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isMultiCorrect && !submitted && hasSelection ? (
              <TouchableOpacity style={styles.checkBtn} onPress={() => { void checkAnswer(q); }}>
                <Text style={styles.checkBtnText}>Check Answer</Text>
              </TouchableOpacity>
            ) : null}

            {submitted && q.explanation ? (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>
                  {correctIndices.every((i) => selected.includes(i)) && selected.every((i) => correctIndices.includes(i))
                    ? 'Correct!' : 'Incorrect'}
                </Text>
                <Text style={styles.explanationAnswer}>
                  {`Correct: ${correctIndices.map((i) => q.options[i]).join(' / ')}`}
                </Text>
                <Text style={styles.explanationText}>{q.explanation}</Text>
              </View>
            ) : null}
          </View>

          {/* Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              disabled={currentIndex === 0}
              onPress={() => setCurrentIndex((i) => i - 1)}
            >
              <ChevronLeft size={18} color={currentIndex === 0 ? colors.textSecondary : colors.primary} />
              <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDim]}>Prev</Text>
            </TouchableOpacity>

            {isLast ? (
              <TouchableOpacity
                style={[styles.primaryBtn, styles.navFinishBtn]}
                onPress={handleFinish}
              >
                <Text style={styles.primaryBtnText}>
                  {submittedCount < quizQuestions.length
                    ? `Finish (${submittedCount}/${quizQuestions.length} checked)`
                    : 'See Results'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => setCurrentIndex((i) => i + 1)}
              >
                <Text style={styles.navBtnText}>Next</Text>
                <ChevronRight size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Preparing your quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── SETUP PHASE ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Subject filter */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {subjects.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, s === selectedSubject && styles.chipActive]}
                onPress={async () => {
                  setSelectedSubject(s);
                  await ensureLoaded();
                }}
              >
                <Text style={[styles.chipText, s === selectedSubject && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Question count */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Number of Questions</Text>
          <View style={styles.countChips}>
            {QUICK_COUNTS.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.countChip, n === count && !customCount && styles.chipActive]}
                onPress={() => { setCount(n); setCustomCount(''); }}
              >
                <Text style={[styles.chipText, n === count && !customCount && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.customInput}
            placeholder="Custom number..."
            placeholderTextColor={colors.textSecondary + '88'}
            keyboardType="number-pad"
            value={customCount}
            onChangeText={setCustomCount}
          />
        </View>

        {/* Start */}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => { void handleStart(); }}>
          <Shuffle size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>
            Start Quiz · {effectiveCount} Questions
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { color: colors.textSecondary, fontSize: 14 },

  card: {
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 16, gap: 12,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },

  chipsScroll: { gap: 8 },
  countChips: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  countChip: {
    borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  customInput: {
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background, color: colors.text,
    fontSize: 14, paddingHorizontal: 12, paddingVertical: 10,
  },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Progress bar
  progressBarBg: { height: 4, backgroundColor: colors.border },
  progressBarFill: { height: 4, backgroundColor: colors.primary },

  // Quiz
  quizCounterRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 2,
  },
  quizCounter: { color: colors.text, fontSize: 14, fontWeight: '700' },
  quizMeta: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  questionCard: {
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 16, gap: 14,
  },
  questionText: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  optionList: { gap: 8 },
  multiCorrectHint: { color: colors.primary, fontSize: 11, fontWeight: '700', fontStyle: 'italic' },
  optionButton: {
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  optionSelected: {
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: colors.primary + '12', paddingHorizontal: 12, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  checkBtn: {
    borderRadius: 12, backgroundColor: colors.primary,
    paddingVertical: 11, alignItems: 'center',
  },
  checkBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  correctOption: {
    borderRadius: 12, borderWidth: 1, borderColor: colors.success,
    backgroundColor: colors.success + '18', paddingHorizontal: 12, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  wrongOption: {
    borderRadius: 12, borderWidth: 1, borderColor: colors.error,
    backgroundColor: colors.error + '12', paddingHorizontal: 12, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  optionText: { color: colors.text, fontSize: 14, fontWeight: '500', flex: 1 },

  explanationBox: {
    borderRadius: 14, padding: 12, backgroundColor: colors.surfaceAlt, gap: 5,
  },
  explanationTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  explanationAnswer: { color: colors.primary, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  explanationText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },

  // Navigation
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  navBtnTextDim: { color: colors.textSecondary },
  navFinishBtn: { flex: 1 },

  // Result
  resultCard: {
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 20, gap: 6, alignItems: 'center',
  },
  resultTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  resultScore: { color: colors.text, fontSize: 52, fontWeight: '800', lineHeight: 60 },
  resultAccuracy: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  resultMetrics: { flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' },
  resultMetricBox: {
    flex: 1, borderRadius: 14, padding: 12,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', gap: 3,
  },
  resultMetricVal: { fontSize: 22, fontWeight: '800' },
  resultMetricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },

  // Review
  reviewCard: {
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 14, gap: 8,
  },
  reviewMeta: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  reviewQuestion: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  reviewOpt: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt, padding: 10,
  },
  reviewOptCorrect: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.success,
    backgroundColor: colors.success + '18', padding: 10,
  },
  reviewOptWrong: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.error,
    backgroundColor: colors.error + '12', padding: 10,
  },
  reviewOptText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  reviewExplanation: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
}));
