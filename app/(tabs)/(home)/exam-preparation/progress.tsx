import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, CheckCircle2, Target, TrendingUp, XCircle } from 'lucide-react-native';
import { loadExamAttempts, loadExamMcqQuestions } from '@/services/examPreparation';
import { colors, createThemedStyles } from '@/constants/colors';

interface DayStats {
  date: string;       // 'YYYY-MM-DD'
  label: string;      // 'Mon, 16 Jun'
  attempts: number;
  correct: number;
  accuracy: number;
}

function toDateKey(isoString: string): string {
  return isoString.substring(0, 10);
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isToday(dateKey: string): boolean {
  return dateKey === toDateKey(new Date().toISOString());
}

export default function ExamProgressScreen() {
  const [attempts, setAttempts] = useState<Awaited<ReturnType<typeof loadExamAttempts>>>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [loadedAttempts, loadedQuestions] = await Promise.all([
          loadExamAttempts(),
          loadExamMcqQuestions(),
        ]);
        setAttempts(loadedAttempts);
        setTotalQuestions(loadedQuestions.questions.length);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const overall = useMemo(() => {
    const total = attempts.length;
    const correct = attempts.filter((a) => a.isCorrect).length;
    return {
      total,
      correct,
      wrong: total - correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  }, [attempts]);

  const dayStats = useMemo((): DayStats[] => {
    const map = new Map<string, { attempts: number; correct: number }>();
    for (const a of attempts) {
      const key = toDateKey(a.createdAt);
      const existing = map.get(key) ?? { attempts: 0, correct: 0 };
      map.set(key, {
        attempts: existing.attempts + 1,
        correct: existing.correct + (a.isCorrect ? 1 : 0),
      });
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, stats]) => ({
        date,
        label: formatDateLabel(date),
        attempts: stats.attempts,
        correct: stats.correct,
        accuracy: Math.round((stats.correct / stats.attempts) * 100),
      }));
  }, [attempts]);

  const subjectStats = useMemo(() => {
    const map = new Map<string, { attempts: number; correct: number }>();
    for (const a of attempts) {
      const existing = map.get(a.subject) ?? { attempts: 0, correct: 0 };
      map.set(a.subject, {
        attempts: existing.attempts + 1,
        correct: existing.correct + (a.isCorrect ? 1 : 0),
      });
    }
    return [...map.entries()]
      .sort((a, b) => b[1].attempts - a[1].attempts)
      .map(([subject, stats]) => ({
        subject,
        attempts: stats.attempts,
        correct: stats.correct,
        accuracy: Math.round((stats.correct / stats.attempts) * 100),
      }));
  }, [attempts]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <FlatList
        data={dayStats}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            {/* Overall summary */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Target size={16} color={colors.primary} />
                <Text style={styles.cardTitle}>Overall Summary</Text>
              </View>
              <View style={styles.metricRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>{totalQuestions}</Text>
                  <Text style={styles.metricLabel}>Available</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricValue}>{overall.total}</Text>
                  <Text style={styles.metricLabel}>Attempted</Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: colors.success + '18' }]}>
                  <Text style={[styles.metricValue, { color: colors.success }]}>{overall.correct}</Text>
                  <Text style={styles.metricLabel}>Correct</Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: colors.error + '12' }]}>
                  <Text style={[styles.metricValue, { color: colors.error }]}>{overall.wrong}</Text>
                  <Text style={styles.metricLabel}>Wrong</Text>
                </View>
              </View>

              {/* Accuracy bar */}
              <View style={styles.accuracyRow}>
                <View style={styles.accuracyBarBg}>
                  <View style={[styles.accuracyBarFill, { width: `${overall.accuracy}%` as any }]} />
                </View>
                <Text style={styles.accuracyLabel}>{overall.accuracy}%</Text>
              </View>
            </View>

            {/* Subject breakdown */}
            {subjectStats.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <TrendingUp size={16} color={colors.primary} />
                  <Text style={styles.cardTitle}>By Subject</Text>
                </View>
                {subjectStats.map((s) => (
                  <View key={s.subject} style={styles.subjectRow}>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{s.subject}</Text>
                      <Text style={styles.subjectAttempts}>{s.attempts} attempts</Text>
                    </View>
                    <View style={styles.subjectBarWrap}>
                      <View style={styles.subjectBarBg}>
                        <View style={[styles.subjectBarFill, { width: `${s.accuracy}%` as any }]} />
                      </View>
                    </View>
                    <Text style={styles.subjectAccuracy}>{s.accuracy}%</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Day heading */}
            {dayStats.length > 0 ? (
              <View style={styles.cardHeader}>
                <Calendar size={16} color={colors.primary} />
                <Text style={styles.cardTitle}>Day-wise History</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No attempts yet</Text>
                <Text style={styles.emptyText}>Practice MCQs or take a Random Quiz to see your progress here.</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.dayCard, isToday(item.date) && styles.dayCardToday]}>
            <View style={styles.dayLeft}>
              {isToday(item.date) ? (
                <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>TODAY</Text></View>
              ) : null}
              <Text style={styles.dayLabel}>{item.label}</Text>
              <Text style={styles.dayAttempts}>{item.attempts} question{item.attempts !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.dayRight}>
              <View style={styles.dayStatItem}>
                <CheckCircle2 size={13} color={colors.success} />
                <Text style={[styles.dayStatVal, { color: colors.success }]}>{item.correct}</Text>
              </View>
              <View style={styles.dayStatItem}>
                <XCircle size={13} color={colors.error} />
                <Text style={[styles.dayStatVal, { color: colors.error }]}>{item.attempts - item.correct}</Text>
              </View>
              <View style={styles.accuracyPill}>
                <Text style={styles.accuracyPillText}>{item.accuracy}%</Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={dayStats.length > 0 ? <View style={{ height: 16 }} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16, gap: 10 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateText: { color: colors.textSecondary, fontSize: 13 },

  card: {
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 16, gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },

  metricRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metricBox: {
    flexGrow: 1, flexBasis: 70, borderRadius: 14, padding: 12,
    backgroundColor: colors.surfaceAlt, gap: 3, alignItems: 'center',
  },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  metricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },

  accuracyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accuracyBarBg: {
    flex: 1, height: 8, borderRadius: 999,
    backgroundColor: colors.border, overflow: 'hidden',
  },
  accuracyBarFill: { height: 8, borderRadius: 999, backgroundColor: colors.primary },
  accuracyLabel: { color: colors.primary, fontSize: 14, fontWeight: '700', minWidth: 40, textAlign: 'right' },

  // Subject rows
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjectInfo: { width: 120 },
  subjectName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  subjectAttempts: { color: colors.textSecondary, fontSize: 11 },
  subjectBarWrap: { flex: 1 },
  subjectBarBg: {
    height: 6, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden',
  },
  subjectBarFill: { height: 6, borderRadius: 999, backgroundColor: colors.primary + 'cc' },
  subjectAccuracy: { color: colors.text, fontSize: 12, fontWeight: '700', minWidth: 34, textAlign: 'right' },

  // Day cards
  dayCard: {
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dayCardToday: { borderColor: colors.primary + '88', backgroundColor: colors.primary + '08' },
  dayLeft: { gap: 2 },
  todayBadge: {
    alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    backgroundColor: colors.primary, marginBottom: 2,
  },
  todayBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  dayLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  dayAttempts: { color: colors.textSecondary, fontSize: 12 },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayStatVal: { fontSize: 14, fontWeight: '700' },
  accuracyPill: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: colors.primary + '18',
  },
  accuracyPillText: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
}));
