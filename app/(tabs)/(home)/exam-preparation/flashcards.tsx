import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { Flashcard, loadFlashcards } from '@/services/examPreparation';

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function difficultyColor(diff: string): string {
  switch (diff.toLowerCase()) {
    case 'easy': return colors.success;
    case 'hard': return colors.error;
    default: return colors.warning;
  }
}

export default function FlashcardsScreen() {
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [judgedMap, setJudgedMap] = useState<Record<string, 'known' | 'review'>>({});
  const [studyPool, setStudyPool] = useState<Flashcard[] | null>(null);

  const flipAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await loadFlashcards();
      setAllCards(result.cards);
      setLoadError(result.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sourceCards = studyPool ?? allCards;

  const subjects = useMemo(() => {
    const unique = [...new Set(sourceCards.map((c) => c.subject))].sort();
    return ['All', ...unique];
  }, [sourceCards]);

  const difficulties = useMemo(() => {
    const base = selectedSubject === 'All'
      ? sourceCards
      : sourceCards.filter((c) => c.subject === selectedSubject);
    const unique = [...new Set(base.map((c) => c.difficulty))].sort();
    return unique.length > 1 ? ['All', ...unique] : [];
  }, [sourceCards, selectedSubject]);

  const filteredCards = useMemo(() => {
    let cards = selectedSubject === 'All' ? sourceCards : sourceCards.filter((c) => c.subject === selectedSubject);
    if (selectedDifficulty !== 'All') cards = cards.filter((c) => c.difficulty === selectedDifficulty);
    return cards;
  }, [sourceCards, selectedSubject, selectedDifficulty]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const displayCards = useMemo(
    () => isShuffled ? shuffleArray(filteredCards) : filteredCards,
    [filteredCards, isShuffled, shuffleSeed],
  );

  const resetFlip = useCallback(() => {
    flipAnim.setValue(0);
    setIsFlipped(false);
  }, [flipAnim]);

  useEffect(() => {
    setCurrentIndex(0);
    resetFlip();
  }, [selectedSubject, selectedDifficulty, isShuffled, shuffleSeed, studyPool, resetFlip]);

  const card = displayCards[currentIndex] ?? null;
  const total = displayCards.length;
  const judgedCount = displayCards.filter((c) => judgedMap[c.id] !== undefined).length;
  const sessionComplete = total > 0 && judgedCount === total;

  const handleFlip = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setIsFlipped((prev) => !prev);
  };

  const navigate = (delta: number) => {
    const next = currentIndex + delta;
    if (next < 0 || next >= total) return;
    flipAnim.setValue(0);
    setIsFlipped(false);
    setCurrentIndex(next);
  };

  const judge = (verdict: 'known' | 'review') => {
    if (!card) return;
    setJudgedMap((prev) => ({ ...prev, [card.id]: verdict }));
    if (currentIndex < total - 1) {
      flipAnim.setValue(0);
      setIsFlipped(false);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const resetSession = () => {
    setJudgedMap({});
    setStudyPool(null);
    setCurrentIndex(0);
    resetFlip();
  };

  const startStudyRemaining = () => {
    const remaining = displayCards.filter((c) => judgedMap[c.id] === 'review');
    setStudyPool(remaining);
    setJudgedMap({});
    setCurrentIndex(0);
    resetFlip();
  };

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.centerText}>Loading flashcards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Session complete screen
  if (sessionComplete) {
    const knownCount = displayCards.filter((c) => judgedMap[c.id] === 'known').length;
    const reviewCount = displayCards.filter((c) => judgedMap[c.id] === 'review').length;
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.center}>
          <Text style={styles.completeTitle}>Session Complete!</Text>
          <Text style={styles.completeSubtitle}>You reviewed {total} card{total !== 1 ? 's' : ''}</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: colors.success + '55', backgroundColor: colors.success + '14' }]}>
              <Text style={[styles.statNum, { color: colors.success }]}>{knownCount}</Text>
              <Text style={[styles.statLabel, { color: colors.success }]}>Know it</Text>
            </View>
            <View style={[styles.statBox, { borderColor: colors.warning + '55', backgroundColor: colors.warning + '14' }]}>
              <Text style={[styles.statNum, { color: colors.warning }]}>{reviewCount}</Text>
              <Text style={[styles.statLabel, { color: colors.warning }]}>Study more</Text>
            </View>
          </View>
          {reviewCount > 0 ? (
            <TouchableOpacity style={styles.completePrimaryBtn} onPress={startStudyRemaining}>
              <Text style={styles.completePrimaryText}>Study remaining ({reviewCount})</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.completeSecondaryBtn} onPress={resetSession}>
            <RotateCcw size={15} color={colors.primary} />
            <Text style={styles.completeSecondaryText}>Restart session</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.container}>

        {/* Error banner */}
        {loadError ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={13} color={colors.error} style={{ marginTop: 1 }} />
            <Text style={styles.errorText} numberOfLines={2}>{loadError}</Text>
          </View>
        ) : null}

        {/* Subject filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {subjects.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, selectedSubject === s && styles.chipActive]}
              onPress={() => { setSelectedSubject(s); setSelectedDifficulty('All'); }}
            >
              <Text style={[styles.chipText, selectedSubject === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Difficulty filter */}
        {difficulties.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}
          >
            {difficulties.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chipSm, selectedDifficulty === d && styles.chipActive]}
                onPress={() => setSelectedDifficulty(d)}
              >
                <Text style={[styles.chipTextSm, selectedDifficulty === d && styles.chipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {/* Progress row */}
        {total > 0 ? (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressCounter}>{currentIndex + 1} / {total}</Text>
              {judgedCount > 0 ? (
                <Text style={styles.progressJudged}>{judgedCount} judged</Text>
              ) : null}
              <TouchableOpacity
                style={[styles.shuffleBtn, isShuffled && styles.shuffleBtnActive]}
                onPress={() => { setIsShuffled((v) => !v); setShuffleSeed((v) => v + 1); }}
              >
                <Shuffle size={13} color={isShuffled ? colors.surface : colors.textSecondary} />
                <Text style={[styles.shuffleText, isShuffled && styles.shuffleTextActive]}>Shuffle</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((currentIndex + 1) / total) * 100}%` as any }]} />
            </View>
          </View>
        ) : null}

        {/* Card area */}
        <View style={styles.cardArea}>
          {total === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No flashcards</Text>
              <Text style={styles.emptyText}>
                {loadError
                  ? 'Configure a Flashcard GAS URL in Settings.'
                  : 'No cards match the selected filters.'}
              </Text>
            </View>
          ) : card ? (
            <View style={styles.cardStack}>

              {/* Front face — Term (purely visual, no touch handling) */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.card,
                  {
                    opacity: frontOpacity,
                    transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
                  },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.faceLabel}>TERM</Text>
                  <View style={[styles.diffBadge, {
                    backgroundColor: difficultyColor(card.difficulty) + '22',
                    borderColor: difficultyColor(card.difficulty) + '55',
                  }]}>
                    <Text style={[styles.diffText, { color: difficultyColor(card.difficulty) }]}>
                      {card.difficulty}
                    </Text>
                  </View>
                </View>
                <Text style={styles.subjectText}>{card.subject}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.termText}>{card.term}</Text>
                  <Text style={styles.tapHint}>Tap to reveal definition</Text>
                </View>
              </Animated.View>

              {/* Back face — Definition */}
              <Animated.View
                pointerEvents={isFlipped ? 'auto' : 'none'}
                style={[
                  styles.card,
                  styles.cardAbsolute,
                  {
                    opacity: backOpacity,
                    transform: [{ perspective: 1200 }, { rotateY: backRotate }],
                  },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.faceLabel}>DEFINITION</Text>
                  <View style={[styles.diffBadge, {
                    backgroundColor: difficultyColor(card.difficulty) + '22',
                    borderColor: difficultyColor(card.difficulty) + '55',
                  }]}>
                    <Text style={[styles.diffText, { color: difficultyColor(card.difficulty) }]}>
                      {card.difficulty}
                    </Text>
                  </View>
                </View>
                <Text style={styles.subjectText}>{card.subject}</Text>

                <ScrollView style={styles.defScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.defText}>{card.definition}</Text>
                </ScrollView>

                <TouchableOpacity style={styles.flipBackBtn} onPress={handleFlip} activeOpacity={0.7}>
                  <Text style={styles.flipBackText}>Tap to flip back</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Transparent tap target — only present while showing front face.
                  Lives above both Animated.View layers so transforms never block it. */}
              {!isFlipped && (
                <TouchableOpacity
                  style={StyleSheet.absoluteFillObject}
                  onPress={handleFlip}
                  activeOpacity={0.04}
                />
              )}

            </View>
          ) : null}
        </View>

        {/* Navigation */}
        {total > 0 ? (
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              onPress={() => navigate(-1)}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={18} color={currentIndex === 0 ? colors.textSecondary : colors.primary} />
              <Text style={[styles.navText, currentIndex === 0 && styles.navTextDisabled]}>Prev</Text>
            </TouchableOpacity>

            <Text style={styles.navCounter}>{currentIndex + 1} of {total}</Text>

            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnRight, currentIndex === total - 1 && styles.navBtnDisabled]}
              onPress={() => navigate(1)}
              disabled={currentIndex === total - 1}
            >
              <Text style={[styles.navText, currentIndex === total - 1 && styles.navTextDisabled]}>Next</Text>
              <ChevronRight size={18} color={currentIndex === total - 1 ? colors.textSecondary : colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Judge buttons */}
        {total > 0 && isFlipped ? (
          <View style={styles.judgeRow}>
            <TouchableOpacity style={styles.judgeReview} onPress={() => judge('review')}>
              <Text style={styles.judgeReviewText}>Study more</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.judgeKnown} onPress={() => judge('known')}>
              <Text style={styles.judgeKnownText}>Know it</Text>
            </TouchableOpacity>
          </View>
        ) : total > 0 ? (
          <View style={styles.judgeHintRow}>
            <Text style={styles.judgeHint}>Flip the card to mark your confidence</Text>
          </View>
        ) : null}

      </View>
    </SafeAreaView>
  );
}

const CARD_MIN_HEIGHT = 280;

const styles = createThemedStyles((c) => ({
  safeArea: { flex: 1, backgroundColor: c.background },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  centerText: { color: c.textSecondary, fontSize: 14, marginTop: 8 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.error + '44',
    backgroundColor: c.error + '12',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: { flex: 1, color: c.error, fontSize: 12, lineHeight: 17 },

  // Chips
  chipScroll: { flexGrow: 0 },
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: c.surface },
  chipSm: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  chipTextSm: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },

  // Progress
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressCounter: { color: c.text, fontSize: 14, fontWeight: '700' },
  progressJudged: { color: c.textSecondary, fontSize: 12, flex: 1 },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    marginLeft: 'auto',
  },
  shuffleBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
  shuffleText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
  shuffleTextActive: { color: c.surface },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: c.primary,
  },

  // Card stack
  cardArea: { flex: 1, minHeight: CARD_MIN_HEIGHT },
  cardStack: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    padding: 20,
    gap: 6,
  },
  cardAbsolute: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faceLabel: {
    color: c.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  diffBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  diffText: { fontSize: 11, fontWeight: '700' },
  subjectText: {
    color: c.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Front card body (tappable)
  cardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  termText: {
    color: c.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
  },
  tapHint: {
    color: c.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },

  // Back card body
  defScroll: { flex: 1, marginTop: 4 },
  defText: {
    color: c.text,
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
  },
  flipBackBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    marginTop: 6,
  },
  flipBackText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },

  // Navigation
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.primary + '44',
    backgroundColor: c.primary + '10',
  },
  navBtnRight: {},
  navBtnDisabled: { borderColor: c.border, backgroundColor: c.surfaceAlt },
  navText: { color: c.primary, fontSize: 14, fontWeight: '700' },
  navTextDisabled: { color: c.textSecondary },
  navCounter: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },

  // Judge buttons
  judgeRow: { flexDirection: 'row', gap: 10 },
  judgeReview: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.warning + '66',
    backgroundColor: c.warning + '15',
  },
  judgeReviewText: { color: c.warning, fontSize: 15, fontWeight: '700' },
  judgeKnown: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: c.success,
  },
  judgeKnownText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  judgeHintRow: { alignItems: 'center', paddingVertical: 6 },
  judgeHint: { color: c.textSecondary, fontSize: 12, fontStyle: 'italic' },

  // Empty state inside card
  emptyCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: c.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // Session complete
  completeTitle: { color: c.text, fontSize: 26, fontWeight: '800' },
  completeSubtitle: { color: c.textSecondary, fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 16, marginVertical: 8 },
  statBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statNum: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 13, fontWeight: '700' },
  completePrimaryBtn: {
    backgroundColor: c.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
  },
  completePrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  completeSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  completeSecondaryText: { color: c.primary, fontSize: 14, fontWeight: '700' },
}));
