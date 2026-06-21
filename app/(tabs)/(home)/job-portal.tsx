import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, Building2, Calendar, ChevronDown, ChevronRight, Clock, ExternalLink, Mail, MapPin, X } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { formatDeadline, isDeadlinePassed, JobPosting, loadJobPostings } from '@/services/jobPortal';

const ALL_FILTER = 'All';

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55' }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  if (!text) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 }}>
      <View style={{ marginTop: 2 }}>{icon}</View>
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

function SectionBlock({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <View style={{ gap: 4, marginTop: 6 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

function JobDetailModal({
  job,
  visible,
  onClose,
}: {
  job: JobPosting | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!job) return null;

  const deadline = formatDeadline(job.applicationDeadline);
  const deadlinePassed = isDeadlinePassed(job.applicationDeadline);

  const openLink = (url: string) => {
    if (!url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    void Linking.openURL(href);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.card}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle} numberOfLines={2}>{job.jobTitle}</Text>
            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modalStyles.content} showsVerticalScrollIndicator={false}>
            <Text style={modalStyles.orgName}>{job.organization}</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {job.jobType ? <Badge label={job.jobType} color={colors.primary} /> : null}
              {job.workArrangement ? <Badge label={job.workArrangement} color={colors.secondary} /> : null}
              {job.companyType ? <Badge label={job.companyType} color={colors.primaryDark} /> : null}
              {deadlinePassed ? <Badge label="Deadline Passed" color={colors.error} /> : null}
            </View>

            <View style={{ gap: 4, marginTop: 10 }}>
              <InfoRow icon={<MapPin size={13} color={colors.textLight} />} text={[job.jobLocation, job.orgLocation].filter(Boolean).join(' · ')} />
              <InfoRow icon={<Calendar size={13} color={deadlinePassed ? colors.error : colors.textLight} />} text={deadline ? `Deadline: ${deadline}` : ''} />
              <InfoRow icon={<Building2 size={13} color={colors.textLight} />} text={job.companyType} />
              <InfoRow icon={<Mail size={13} color={colors.textLight} />} text={job.contactEmail} />
            </View>

            <View style={modalStyles.divider} />

            <SectionBlock title="Job Summary" text={job.summary} />
            <SectionBlock title="Key Responsibilities" text={job.responsibilities} />
            <SectionBlock title="Required Skills & Qualifications" text={job.requiredQualifications} />
            {job.preferredQualifications ? (
              <SectionBlock title="Preferred Qualifications" text={job.preferredQualifications} />
            ) : null}

            <View style={modalStyles.divider} />

            {job.salaryRange ? (
              <View style={{ gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Salary Range</Text>
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{job.salaryRange}</Text>
              </View>
            ) : null}

            <SectionBlock title="Benefits" text={job.benefits} />

            <View style={modalStyles.divider} />

            <SectionBlock title="How to Apply" text={job.howToApply} />
            {job.additionalNotes ? <SectionBlock title="Additional Notes" text={job.additionalNotes} /> : null}

            {job.applicationLink ? (
              <TouchableOpacity
                style={modalStyles.applyButton}
                onPress={() => openLink(job.applicationLink)}
              >
                <ExternalLink size={16} color="#fff" />
                <Text style={modalStyles.applyButtonText}>Apply Now</Text>
              </TouchableOpacity>
            ) : null}

            {job.website ? (
              <TouchableOpacity
                style={modalStyles.websiteButton}
                onPress={() => openLink(job.website)}
              >
                <ExternalLink size={14} color={colors.primary} />
                <Text style={modalStyles.websiteButtonText}>{job.website}</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = {
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end' as const,
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%' as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 22,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0 as const,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 4,
  },
  orgName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  applyButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  websiteButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  websiteButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
};

export default function JobPortalScreen() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>(ALL_FILTER);
  const [selectedArrangement, setSelectedArrangement] = useState<string>(ALL_FILTER);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showExpired, setShowExpired] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    const result = await loadJobPostings();
    setJobs(result.jobs);
    setError(result.error);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const jobTypes = useMemo(() => {
    const types = new Set(jobs.map((j) => j.jobType).filter(Boolean));
    return [ALL_FILTER, ...Array.from(types)];
  }, [jobs]);

  const arrangements = useMemo(() => {
    const arr = new Set(jobs.map((j) => j.workArrangement).filter(Boolean));
    return [ALL_FILTER, ...Array.from(arr)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (selectedType !== ALL_FILTER && j.jobType !== selectedType) return false;
      if (selectedArrangement !== ALL_FILTER && j.workArrangement !== selectedArrangement) return false;
      if (!showExpired && isDeadlinePassed(j.applicationDeadline)) return false;
      return true;
    });
  }, [jobs, selectedType, selectedArrangement, showExpired]);

  const expiredCount = useMemo(
    () => jobs.filter((j) => isDeadlinePassed(j.applicationDeadline)).length,
    [jobs]
  );

  const activeCount = jobs.length - expiredCount;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} colors={[colors.primary]} />}
      >
        {/* Header summary */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Active Jobs</Text>
          </View>
          {expiredCount > 0 ? (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: colors.error }]}>{expiredCount}</Text>
              <Text style={styles.summaryLabel}>Expired</Text>
            </View>
          ) : null}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{jobs.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        {/* Filters */}
        {jobTypes.length > 1 ? (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {jobTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, selectedType === type && styles.chipActive]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {arrangements.length > 1 ? (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Work Arrangement</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {arrangements.map((arr) => (
                <TouchableOpacity
                  key={arr}
                  style={[styles.chip, selectedArrangement === arr && styles.chipActive]}
                  onPress={() => setSelectedArrangement(arr)}
                >
                  <Text style={[styles.chipText, selectedArrangement === arr && styles.chipTextActive]}>{arr}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {expiredCount > 0 ? (
          <TouchableOpacity style={styles.expiredToggle} onPress={() => setShowExpired((v) => !v)}>
            <Clock size={13} color={colors.textLight} />
            <Text style={styles.expiredToggleText}>
              {showExpired ? `Hide ${expiredCount} expired` : `Show ${expiredCount} expired`}
            </Text>
            <ChevronDown size={13} color={colors.textLight} style={showExpired ? { transform: [{ rotate: '180deg' }] } : undefined} />
          </TouchableOpacity>
        ) : null}

        {/* Loading */}
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading job postings...</Text>
          </View>
        ) : null}

        {/* Error */}
        {!isLoading && error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Empty */}
        {!isLoading && !error && filteredJobs.length === 0 && jobs.length > 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>No jobs match the current filters.</Text>
          </View>
        ) : null}

        {!isLoading && !error && jobs.length === 0 ? (
          <View style={styles.centerBox}>
            <Briefcase size={40} color={colors.textLight} />
            <Text style={styles.emptyText}>No job postings available yet.</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh.</Text>
          </View>
        ) : null}

        {/* Job Cards */}
        {!isLoading ? (
          <View style={styles.jobList}>
            {filteredJobs.map((job) => {
              const passed = isDeadlinePassed(job.applicationDeadline);
              const deadline = formatDeadline(job.applicationDeadline);
              return (
                <TouchableOpacity
                  key={job.id}
                  style={[styles.jobCard, passed && styles.jobCardExpired]}
                  onPress={() => setSelectedJob(job)}
                  activeOpacity={0.8}
                >
                  <View style={styles.jobCardTop}>
                    <View style={styles.jobIconWrap}>
                      <Briefcase size={20} color={passed ? colors.textLight : colors.primary} />
                    </View>
                    <View style={styles.jobCardMeta}>
                      <Text style={[styles.jobTitle, passed && styles.jobTitleExpired]} numberOfLines={2}>
                        {job.jobTitle}
                      </Text>
                      <Text style={styles.jobOrg} numberOfLines={1}>{job.organization}</Text>
                    </View>
                    <ChevronRight size={16} color={colors.textLight} />
                  </View>

                  <View style={styles.jobCardBadges}>
                    {job.jobType ? <Badge label={job.jobType} color={passed ? colors.textLight : colors.primary} /> : null}
                    {job.workArrangement ? <Badge label={job.workArrangement} color={passed ? colors.textLight : colors.secondary} /> : null}
                    {passed ? <Badge label="Expired" color={colors.error} /> : null}
                  </View>

                  <View style={styles.jobCardFooter}>
                    {job.jobLocation ? (
                      <View style={styles.footerItem}>
                        <MapPin size={11} color={colors.textLight} />
                        <Text style={styles.footerText} numberOfLines={1}>{job.jobLocation}</Text>
                      </View>
                    ) : null}
                    {deadline ? (
                      <View style={styles.footerItem}>
                        <Calendar size={11} color={passed ? colors.error : colors.textLight} />
                        <Text style={[styles.footerText, passed && { color: colors.error }]}>
                          {deadline}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <JobDetailModal
        job={selectedJob}
        visible={selectedJob !== null}
        onClose={() => setSelectedJob(null)}
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyles((c) => ({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryNum: {
    color: c.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    color: c.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  filterSection: {
    gap: 6,
  },
  filterLabel: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  chipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  chipText: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  expiredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  expiredToggleText: {
    color: c.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    color: c.textSecondary,
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: c.error + '15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.error + '40',
    padding: 12,
  },
  errorText: {
    color: c.error,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    color: c.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    color: c.textLight,
    fontSize: 13,
    textAlign: 'center',
  },
  jobList: {
    gap: 10,
  },
  jobCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  jobCardExpired: {
    opacity: 0.65,
  },
  jobCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  jobIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  jobCardMeta: {
    flex: 1,
    gap: 2,
  },
  jobTitle: {
    color: c.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  jobTitleExpired: {
    color: c.textSecondary,
  },
  jobOrg: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  jobCardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  jobCardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: c.textLight,
    fontSize: 11,
    fontWeight: '500',
  },
}));
