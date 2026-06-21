import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  Circle,
  RefreshCw,
  Sparkles,
  Square,
  XCircle,
} from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import {
  AiMcq,
  generateAiMcqs,
  recordExamAttempt,
} from '@/services/examPreparation';

// ── Constants ─────────────────────────────────────────────────────────────

const TOPICS = [
  'Public Health',
  'Biostatistics',
  'Epidemiology',
  'Health Policy',
  'International Health',
  'Environmental Health',
  'Nutrition & Public Health',
  'Communicable Diseases',
  'Social Determinants of Health',
  'Health Promotion',
  'Maternal & Child Health',
  'Non-Communicable Diseases',
];

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
  { key: 'mixed', label: 'Mixed' },
] as const;

const COUNTS = [5, 10, 15, 20];

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type Phase = 'setup' | 'generating' | 'quiz' | 'result';

// ── Component ─────────────────────────────────────────────────────────────

export default function AiQuizScreen() {
  const [phase, setPhase] = useState<Phase>('setup');

  const [topic, setTopic] = useState('Public Health');
  const [subtopic, setSubtopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [count, setCount] = useState(10);

  const [questions, setQuestions] = useState<AiMcq[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Record<string, number[]>>({});
  const [submitted, setSubmitted] = useState<Record<string, true>>({});

  const scrollRef = useRef<ScrollView>(null);

  const handleGenerate = useCallback(async () => {
    setPhase('generating');
    setGenError(null);
    setSelected({});
    setSubmitted({});
    try {
      const qs = await generateAiMcqs({ topic, subtopic, difficulty, count });
      setQuestions(qs);
      setPhase('quiz');
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e));
      setPhase('setup');
    }
  }, [topic, subtopic, difficulty, count]);

  const handleOptionPress = useCallback(async (q: AiMcq, oi: number) => {
    if (submitted[q.id]) return;
    const isMulti = q.correct.length > 1;

    if (!isMulti) {
      const isCorrect = q.correct.includes(oi);
      setSelected((prev) => ({ ...prev, [q.id]: [oi] }));
      setSubmitted((prev) => ({ ...prev, [q.id]: true }));
      await recordExamAttempt({
        question: {
          id: q.id, subject: topic, topic: subtopic || topic,
          question: q.question, options: q.options,
          answer: q.correct.map((i) => String.fromCharCode(65 + i)).join(', '),
          explanation: q.explanation, difficulty,
        },
        chosenOption: q.options[oi],
        isCorrect,
      });
    } else {
      setSelected((prev) => {
        const cur = prev[q.id] ?? [];
        const next = cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi];
        return { ...prev, [q.id]: next };
      });
    }
  }, [submitted, topic, subtopic, difficulty]);

  const handleCheck = useCallback(async (q: AiMcq) => {
    const sel = selected[q.id] ?? [];
    if (sel.length === 0 || submitted[q.id]) return;
    const isCorrect =
      q.correct.every((i) => sel.includes(i)) && sel.every((i) => q.correct.includes(i));
    setSubmitted((prev) => ({ ...prev, [q.id]: true }));
    await recordExamAttempt({
      question: {
        id: q.id, subject: topic, topic: subtopic || topic,
        question: q.question, options: q.options,
        answer: q.correct.map((i) => String.fromCharCode(65 + i)).join(', '),
        explanation: q.explanation, difficulty,
      },
      chosenOption: sel.map((i) => q.options[i]).join(', '),
      isCorrect,
    });
  }, [selected, submitted, topic, subtopic, difficulty]);

  const handleFinish = useCallback(() => setPhase('result'), []);

  const handleRegenerate = useCallback(() => {
    setPhase('setup');
    setQuestions([]);
    setSelected({});
    setSubmitted({});
    setGenError(null);
  }, []);

  // ── GENERATING ────────────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.centerState}>
          <Sparkles size={40} color={colors.primary} />
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 10 }} />
          <Text style={styles.genTitle}>Generating questions...</Text>
          <Text style={styles.genSub}>{count} questions · {topic}{difficulty !== 'mixed' ? ` · ${difficulty}` : ''}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const total = questions.length;
    const correctCount = questions.filter((q) => {
      const sel = selected[q.id] ?? [];
      return q.correct.every((i) => sel.includes(i)) && sel.every((i) => q.correct.includes(i));
    }).length;
    const skipped = questions.filter((q) => (selected[q.id] ?? []).length === 0).length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>AI Quiz Complete</Text>
            <Text style={styles.resultScore}>{correctCount}/{total}</Text>
            <Text style={styles.resultAccuracy}>{accuracy}% accuracy</Text>
            <View style={styles.resultMetrics}>
              <View style={styles.metricBox}>
                <Text style={[styles.metricVal, { color: colors.success }]}>{correctCount}</Text>
                <Text style={styles.metricLabel}>Correct</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={[styles.metricVal, { color: colors.error }]}>{total - correctCount - skipped}</Text>
                <Text style={styles.metricLabel}>Wrong</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={[styles.metricVal, { color: colors.textSecondary }]}>{skipped}</Text>
                <Text style={styles.metricLabel}>Skipped</Text>
              </View>
            </View>
          </View>

          {questions.map((q, i) => {
            const sel = selected[q.id] ?? [];
            return (
              <View key={q.id} style={styles.reviewCard}>
                <Text style={styles.reviewIdx}>Q{i + 1}</Text>
                <Text style={styles.reviewQ}>{q.question}</Text>
                {q.options.map((opt, oi) => {
                  const isChosen = sel.includes(oi);
                  const isRight = q.correct.includes(oi);
                  return (
                    <View key={oi} style={isRight ? styles.revOptCorrect : isChosen ? styles.revOptWrong : styles.revOpt}>
                      <Text style={styles.revOptText}>{opt}</Text>
                    </View>
                  );
                })}
                {q.explanation ? <Text style={styles.reviewExp}>{q.explanation}</Text> : null}
              </View>
            );
          })}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleRegenerate}>
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Generate New Quiz</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const submittedCount = Object.keys(submitted).length;

    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
          <View style={styles.quizHeader}>
            <View style={styles.quizHeaderLeft}>
              <Sparkles size={13} color={colors.primary} />
              <Text style={styles.quizHeaderText}>{topic} · AI Generated</Text>
            </View>
            <Text style={styles.quizHeaderCount}>{submittedCount}/{questions.length} answered</Text>
          </View>

          {questions.map((q, i) => {
            const isMulti = q.correct.length > 1;
            const sel = selected[q.id] ?? [];
            const isSubmitted = !!submitted[q.id];
            const hasSelection = sel.length > 0;
            const allCorrect =
              q.correct.every((x) => sel.includes(x)) && sel.every((x) => q.correct.includes(x));

            return (
              <View key={q.id} style={styles.questionCard}>
                <Text style={styles.questionIdx}>Q{i + 1} of {questions.length}</Text>
                <Text style={styles.questionText}>{q.question}</Text>
                {isMulti ? <Text style={styles.multiHint}>Select all correct answers</Text> : null}

                <View style={styles.optionList}>
                  {q.options.map((opt, oi) => {
                    const isSelected = sel.includes(oi);
                    const isRight = q.correct.includes(oi);

                    let optStyle = styles.optionButton;
                    let icon = isMulti
                      ? <Square size={16} color={colors.textSecondary} />
                      : <Circle size={16} color={colors.textSecondary} />;

                    if (!isSubmitted && isSelected) {
                      optStyle = styles.optionSelected;
                      icon = isMulti
                        ? <CheckSquare size={16} color={colors.primary} />
                        : <Circle size={16} color={colors.primary} />;
                    } else if (isSubmitted) {
                      if (isRight) {
                        optStyle = styles.correctOption;
                        icon = <CheckCircle2 size={16} color={colors.success} />;
                      } else if (isSelected && !isRight) {
                        optStyle = styles.wrongOption;
                        icon = <XCircle size={16} color={colors.error} />;
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={oi}
                        style={optStyle}
                        disabled={isSubmitted}
                        onPress={() => { void handleOptionPress(q, oi); }}
                      >
                        {icon}
                        <Text style={styles.optionText}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {isMulti && !isSubmitted && hasSelection ? (
                  <TouchableOpacity style={styles.checkBtn} onPress={() => { void handleCheck(q); }}>
                    <Text style={styles.checkBtnText}>Check Answer</Text>
                  </TouchableOpacity>
                ) : null}

                {isSubmitted ? (
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationTitle}>{allCorrect ? 'Correct!' : 'Incorrect'}</Text>
                    <Text style={styles.explanationAnswer}>
                      {'Correct: ' + q.correct.map((x) => q.options[x]).join(' / ')}
                    </Text>
                    {q.explanation ? <Text style={styles.explanationText}>{q.explanation}</Text> : null}
                  </View>
                ) : null}
              </View>
            );
          })}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
            <Text style={styles.primaryBtnText}>
              {submittedCount < questions.length
                ? `Finish (${submittedCount}/${questions.length} answered)`
                : 'See Results'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleRegenerate}>
            <RefreshCw size={14} color={colors.primary} />
            <Text style={styles.secondaryBtnText}>Generate New Quiz</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={styles.infoText}>
              AI generates fresh questions on any topic — free, no account needed.
            </Text>
          </View>

          {genError ? (
            <View style={styles.errorBanner}>
              <XCircle size={14} color={colors.error} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Generation failed</Text>
                <Text style={styles.errorText}>{genError}</Text>
              </View>
            </View>
          ) : null}

          {/* Topic */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Topic</Text>
            <View style={styles.chipWrap}>
              {TOPICS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, t === topic && styles.chipActive]}
                  onPress={() => setTopic(t)}
                >
                  <Text style={[styles.chipText, t === topic && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subtopic */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Focus Area <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={subtopic}
              onChangeText={setSubtopic}
              placeholder="e.g. Sample size, Herd immunity, DALY..."
              placeholderTextColor={colors.textSecondary + '88'}
              autoCapitalize="sentences"
            />
          </View>

          {/* Difficulty */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Difficulty</Text>
            <View style={styles.rowChips}>
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.chip, styles.chipFlex, d.key === difficulty && styles.chipActive]}
                  onPress={() => setDifficulty(d.key)}
                >
                  <Text style={[styles.chipText, d.key === difficulty && styles.chipTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Count */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Number of Questions</Text>
            <View style={styles.rowChips}>
              {COUNTS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, styles.chipFlex, n === count && styles.chipActive]}
                  onPress={() => setCount(n)}
                >
                  <Text style={[styles.chipText, n === count && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => { void handleGenerate(); }}>
            <Sparkles size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Generate {count} Questions</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = createThemedStyles((colors) => ({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  genTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 6 },
  genSub: { color: colors.textSecondary, fontSize: 13 },

  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    borderColor: colors.primary + '44', backgroundColor: colors.primary + '0e', padding: 12,
  },
  infoText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },

  errorBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    borderRadius: 14, borderWidth: 1,
    borderColor: colors.error + '55', backgroundColor: colors.error + '12', padding: 12,
  },
  errorTitle: { color: colors.error, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  errorText: { color: colors.error, fontSize: 12, lineHeight: 18 },

  card: {
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 16, gap: 12,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  optional: { color: colors.textSecondary, fontSize: 12, fontWeight: '400' },

  input: {
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background, color: colors.text,
    fontSize: 13, paddingHorizontal: 12, paddingVertical: 10,
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowChips: { flexDirection: 'row', gap: 8 },
  chip: {
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  chipFlex: { flex: 1, alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 12, borderWidth: 1,
    borderColor: colors.primary + '44', backgroundColor: colors.primary + '0e',
  },
  secondaryBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  quizHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2,
  },
  quizHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quizHeaderText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  quizHeaderCount: { color: colors.textSecondary, fontSize: 12 },

  questionCard: {
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 16, gap: 12,
  },
  questionIdx: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  questionText: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  multiHint: { color: colors.primary, fontSize: 11, fontWeight: '700', fontStyle: 'italic' },

  optionList: { gap: 8 },
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

  checkBtn: {
    borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 11, alignItems: 'center',
  },
  checkBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  explanationBox: {
    borderRadius: 14, padding: 12, backgroundColor: colors.surfaceAlt, gap: 5,
  },
  explanationTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  explanationAnswer: { color: colors.primary, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  explanationText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },

  resultCard: {
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 20, gap: 6, alignItems: 'center',
  },
  resultLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  resultScore: { color: colors.text, fontSize: 52, fontWeight: '800', lineHeight: 60 },
  resultAccuracy: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  resultMetrics: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  metricBox: {
    flex: 1, borderRadius: 14, padding: 12,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', gap: 3,
  },
  metricVal: { fontSize: 22, fontWeight: '800' },
  metricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },

  reviewCard: {
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 14, gap: 8,
  },
  reviewIdx: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  reviewQ: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  revOpt: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt, padding: 10,
  },
  revOptCorrect: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.success,
    backgroundColor: colors.success + '18', padding: 10,
  },
  revOptWrong: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.error,
    backgroundColor: colors.error + '12', padding: 10,
  },
  revOptText: { color: colors.text, fontSize: 13 },
  reviewExp: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
}));
