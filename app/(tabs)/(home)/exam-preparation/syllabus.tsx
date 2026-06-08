import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadExamSyllabus, ExamSyllabusItem, groupBySubject } from '@/services/examPreparation';
import { colors, createThemedStyles } from '@/constants/colors';

export default function ExamSyllabusScreen() {
  const [items, setItems] = useState<ExamSyllabusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const syllabus = await loadExamSyllabus();
      setItems(syllabus);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const grouped = useMemo(() => groupBySubject(items), [items]);
  const subjects = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading syllabus...</Text>
        </View>
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(subject) => subject}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadData(true); }} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: subject }) => (
            <View style={styles.subjectCard}>
              <Text style={styles.subjectTitle}>{subject}</Text>
              {grouped[subject].map((topic) => (
                <View key={topic.id} style={styles.topicRow}>
                  <Text style={styles.topicName}>{topic.topic}</Text>
                  <Text style={styles.topicDetails}>{topic.details}</Text>
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>No syllabus found</Text>
              <Text style={styles.stateText}>Connect a Google Sheet or keep the local syllabus seed data enabled.</Text>
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
  subjectCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  subjectTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  topicRow: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  topicName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  topicDetails: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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