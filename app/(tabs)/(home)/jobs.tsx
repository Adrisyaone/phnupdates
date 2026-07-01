import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { CheckCircle2, PlusCircle, Search, Star, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JOB_PORTAL_LABELS, getMenuThemeColor } from '@/constants/blogMenus';
import { BlogPost, extractImageFromContent, fetchPostsByLabels, getExcerpt } from '@/services/bloggerApi';
import { colors, createThemedStyles } from '@/constants/colors';
import { AnimatedEntrance, AuroraBackground, PressableScale } from '@/components/ui';
import { getInterestedPostIds, toggleInterestedPost } from '@/services/interestedPosts';

type OpportunityFilter = {
  key: 'job' | 'grant' | 'scholarship' | 'expression-of-interest' | 'call-for-paper' | 'call-for-abstract';
  title: string;
  label: string;
};

const OPPORTUNITY_FILTERS: OpportunityFilter[] = [
  { key: 'job', title: 'Job', label: 'vacancy' },
  { key: 'grant', title: 'Grant', label: 'Grants' },
  { key: 'scholarship', title: 'Scholarship', label: 'scholarships' },
  { key: 'expression-of-interest', title: 'Expression of Interest', label: 'expression of interest' },
  { key: 'call-for-paper', title: 'Call for Paper', label: 'call for papers' },
  { key: 'call-for-abstract', title: 'Call for Abstract', label: 'call for abstract' },
];

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface JobReminder {
  id: string;
  date: string;
  hour: number;
  minute: number;
}

const JOB_REMINDERS_STORAGE_KEY = 'jobReminders_v1';

async function getJobReminders(): Promise<Record<string, JobReminder[]>> {
  try {
    const data = await AsyncStorage.getItem(JOB_REMINDERS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftIsoDate(date: string, days: number): string {
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) {
    return todayIsoDate();
  }
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function formatReminderDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function saveJobReminder(jobId: string, remindersForJob: JobReminder[]): Promise<void> {
  try {
    const reminders = await getJobReminders();
    reminders[jobId] = remindersForJob;
    await AsyncStorage.setItem(JOB_REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.log('[Jobs] Failed to save reminder:', error);
  }
}

export default function JobsPortalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ menuKey?: string | string[] }>();
  const menuKey = Array.isArray(params.menuKey) ? params.menuKey[0] : params.menuKey;
  const menuColor = getMenuThemeColor(menuKey || 'opportunities');
  const [jobs, setJobs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  
  // No filters selected at first; only one can be selected at a time
  const [selectedFilter, setSelectedFilter] = useState<OpportunityFilter['key'] | null>(null);
  
  // Reminder modal state
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [pendingJob, setPendingJob] = useState<BlogPost | null>(null);
  const [reminderEntries, setReminderEntries] = useState<JobReminder[]>([
    { id: '1', date: todayIsoDate(), hour: 9, minute: 0 },
  ]);

  const loadJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const labelsToLoad = Array.from(
        new Set([
          ...JOB_PORTAL_LABELS,
          ...OPPORTUNITY_FILTERS.map((filter) => filter.label),
        ])
      );
      const posts = await fetchPostsByLabels(labelsToLoad, 25, 80);
      setJobs(posts);
    } catch (error) {
      console.log('[Jobs] Failed to load jobs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const loadInterested = async () => {
      const ids = await getInterestedPostIds();
      setInterestedIds(ids);
    };
    void loadInterested();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const refreshInterested = async () => {
        const ids = await getInterestedPostIds();
        setInterestedIds(ids);
      };
      void refreshInterested();
    }, [])
  );

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let filtered = jobs.slice();
    if (selectedFilter) {
      const filterObj = OPPORTUNITY_FILTERS.find((f) => f.key === selectedFilter);
      if (filterObj) {
        const filterLabel = normalizeLabel(filterObj.label);
        filtered = filtered.filter((post) => {
          const postLabels = new Set((post.labels || []).map((label) => normalizeLabel(label)));
          return postLabels.has(filterLabel);
        });
      }
    }
    if (normalized) {
      filtered = filtered.filter((post) => {
        const titleHit = post.title.toLowerCase().includes(normalized);
        const contentHit = post.content.toLowerCase().includes(normalized);
        return titleHit || contentHit;
      });
    }
    filtered.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    return filtered;
  }, [jobs, query, selectedFilter]);

  const openPost = useCallback(
    (post: BlogPost) => {
      router.push({
        pathname: '/web-viewer',
        params: {
          url: encodeURIComponent(post.url),
          title: encodeURIComponent(post.title),
        },
      });
    },
    [router]
  );

  const toggleInterested = useCallback(async (post: BlogPost) => {
    // If already interested, remove without showing modal
    if (interestedIds.has(post.id)) {
      const added = await toggleInterestedPost(post);
      setInterestedIds((prev) => {
        const next = new Set(prev);
        if (added) {
          next.add(post.id);
        } else {
          next.delete(post.id);
        }
        return next;
      });
    } else {
      // If not interested, show modal to set reminder time
      setPendingJob(post);
      setReminderEntries([{ id: Date.now().toString(), date: todayIsoDate(), hour: 9, minute: 0 }]);
      setReminderModalVisible(true);
    }
  }, [interestedIds]);

  const handleConfirmReminder = useCallback(async () => {
    if (!pendingJob) return;

    const normalizedReminders = reminderEntries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      hour: ((entry.hour % 24) + 24) % 24,
      minute: ((entry.minute % 60) + 60) % 60,
    }));
    await saveJobReminder(pendingJob.id, normalizedReminders);

    // Toggle interested status
    const added = await toggleInterestedPost(pendingJob);
    setInterestedIds((prev) => {
      const next = new Set(prev);
      if (added) {
        next.add(pendingJob.id);
      } else {
        next.delete(pendingJob.id);
      }
      return next;
    });

    // Close modal
    setPendingJob(null);
    setReminderModalVisible(false);
  }, [pendingJob, reminderEntries]);

  const updateReminderEntry = useCallback((id: string, updater: (entry: JobReminder) => JobReminder) => {
    setReminderEntries((prev) => prev.map((entry) => (entry.id === id ? updater(entry) : entry)));
  }, []);

  const addReminderEntry = useCallback(() => {
    setReminderEntries((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length + 1}`, date: todayIsoDate(), hour: 9, minute: 0 },
    ]);
  }, []);

  const removeReminderEntry = useCallback((id: string) => {
    setReminderEntries((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((entry) => entry.id !== id);
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground tint={menuColor} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterButtonsRow}
        style={styles.filterButtonsScroll}
      >
        {OPPORTUNITY_FILTERS.map((filter) => (
          <PressableScale
            key={filter.key}
            style={[
              styles.filterChip,
              { borderColor: menuColor },
              selectedFilter === filter.key && [styles.filterChipActive, { backgroundColor: menuColor + '18' }],
            ]}
            onPress={() => {
              setSelectedFilter((prev) => (prev === filter.key ? null : filter.key));
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter.key && { color: menuColor },
              ]}
            >
              {filter.title}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>

      <View style={styles.topActionsRow}>
        <TouchableOpacity
          style={[styles.interestedShortcut, { borderColor: menuColor }]}
          onPress={() => {
            router.push({ pathname: '/(tabs)/(home)/interested', params: { menuKey: menuKey || 'opportunities' } });
          }}
        >
          <Star size={16} color={menuColor} />
          <Text style={styles.interestedShortcutText}>Interested</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { borderColor: menuColor + '55', backgroundColor: menuColor + '0D' }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title or text"
          placeholderTextColor={colors.textLight}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={menuColor} />
          <Text style={styles.loaderText}>Loading jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadJobs(true)} />}
          renderItem={({ item, index }) => {
            const imageUrl = item.images?.[0]?.url || extractImageFromContent(item.content);
            return (
            <AnimatedEntrance index={Math.min(index, 8)} from="up">
            <View style={[styles.jobCard, { borderColor: menuColor + '55', backgroundColor: menuColor + '0A' }]}>
              {imageUrl ? (
                <TouchableOpacity style={styles.jobImageWrap} onPress={() => openPost(item)} activeOpacity={0.85}>
                  <Image source={{ uri: imageUrl }} style={styles.jobImage} contentFit="cover" />
                </TouchableOpacity>
              ) : null}
              <View style={styles.cardHeaderRow}>
                <TouchableOpacity style={styles.cardMainArea} onPress={() => openPost(item)} activeOpacity={0.8}>
                  <Text style={styles.jobTitle}>{item.title}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { void toggleInterested(item); }}
                  style={styles.addBtn}
                >
                  {interestedIds.has(item.id) ? (
                    <CheckCircle2 size={22} color={colors.success} />
                  ) : (
                    <PlusCircle size={22} color={menuColor} />
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.cardMainArea} onPress={() => openPost(item)} activeOpacity={0.8}>
              <Text style={styles.jobMeta}>{formatDate(item.published)}</Text>
              <Text style={styles.jobExcerpt} numberOfLines={3}>{getExcerpt(item.content, 180)}</Text>
              </TouchableOpacity>
            </View>
            </AnimatedEntrance>
          )}}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No matching jobs found.</Text>
              <Text style={styles.emptySubtitle}>Try a broader keyword or pull to refresh.</Text>
            </View>
          }
        />
      )}

      {/* Reminder Modal */}
      <Modal
        visible={reminderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPendingJob(null);
          setReminderModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Application Reminder</Text>
              <TouchableOpacity
                onPress={() => {
                  setPendingJob(null);
                  setReminderModalVisible(false);
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {pendingJob && (
              <Text style={styles.jobTitleInModal} numberOfLines={2}>
                {pendingJob.title}
              </Text>
            )}

            <View style={styles.reminderSection}>
              <Text style={styles.reminderLabel}>Reminder Date and Time</Text>
              {reminderEntries.map((entry, index) => (
                <View key={entry.id} style={styles.reminderEntryCard}>
                  <View style={styles.reminderEntryHeader}>
                    <Text style={styles.reminderEntryTitle}>Reminder {index + 1}</Text>
                    <TouchableOpacity onPress={() => removeReminderEntry(entry.id)}>
                      <Text style={styles.removeEntryText}>Remove</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeEditorRow}>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => {
                        updateReminderEntry(entry.id, (current) => ({
                          ...current,
                          date: shiftIsoDate(current.date, -1),
                        }));
                      }}
                    >
                      <Text style={styles.timeAdjustBtnText}>-1d</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => {
                        updateReminderEntry(entry.id, (current) => ({
                          ...current,
                          date: shiftIsoDate(current.date, 1),
                        }));
                      }}
                    >
                      <Text style={styles.timeAdjustBtnText}>+1d</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeEditorRow}>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => {
                        updateReminderEntry(entry.id, (current) => ({
                          ...current,
                          hour: ((current.hour - 1) % 24 + 24) % 24,
                        }));
                      }}
                    >
                      <Text style={styles.timeAdjustBtnText}>-H</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => {
                        updateReminderEntry(entry.id, (current) => ({
                          ...current,
                          hour: (current.hour + 1) % 24,
                        }));
                      }}
                    >
                      <Text style={styles.timeAdjustBtnText}>+H</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => {
                        updateReminderEntry(entry.id, (current) => ({
                          ...current,
                          minute: ((current.minute - 5) % 60 + 60) % 60,
                        }));
                      }}
                    >
                      <Text style={styles.timeAdjustBtnText}>-5m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => {
                        updateReminderEntry(entry.id, (current) => ({
                          ...current,
                          minute: (current.minute + 5) % 60,
                        }));
                      }}
                    >
                      <Text style={styles.timeAdjustBtnText}>+5m</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.timeDisplay}>
                    {formatReminderDate(entry.date)} at {String(entry.hour).padStart(2, '0')}:{String(entry.minute).padStart(2, '0')}
                  </Text>
                </View>
              ))}

              <TouchableOpacity style={styles.addReminderBtn} onPress={addReminderEntry}>
                <Text style={styles.addReminderBtnText}>+ Add another date & time</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPendingJob(null);
                  setReminderModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: menuColor }]}
                onPress={() => {
                  void handleConfirmReminder();
                }}
              >
                <Text style={styles.confirmButtonText}>Add to Interested</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    display: 'none',
  },
  topActionsRow: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  interestedShortcut: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  interestedShortcutText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  filterButtonsRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterButtonsScroll: {
    flexGrow: 0,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    color: colors.text,
    fontSize: 14,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  jobCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  jobImageWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  jobImage: {
    width: '100%',
    height: 170,
    backgroundColor: colors.surfaceAlt,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardMainArea: {
    flex: 1,
  },
  jobTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  addBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  jobMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  jobExcerpt: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 4,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  jobTitleInModal: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  reminderSection: {
    gap: 12,
  },
  reminderEntryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    padding: 10,
    gap: 8,
  },
  reminderEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderEntryTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  removeEntryText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  reminderLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  timeEditorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeAdjustBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
  },
  timeAdjustBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeDisplay: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'left',
    marginTop: 2,
  },
  addReminderBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
  },
  addReminderBtnText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
}));