import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Banknote, Calendar, CheckCircle2, ChevronDown, ChevronRight, Clock, ExternalLink, FlaskConical, Globe2, Mail, MapPin, X, XCircle } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, PressableScale } from '@/components/ui';
import {
  formatResearchDate,
  isResearchDeadlinePassed,
  isYes,
  loadResearchGrants,
  ResearchOpportunity,
} from '@/services/researchGrants';

const ALL_FILTER = 'All';

// Page accent colors — deliberately darker than colors.primary/secondary so
// text and icons keep sufficient contrast against light card/badge backgrounds.
const ACCENT = '#0F766E';
const ACCENT_ALT = '#B45309';

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55' }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function YesNoBadge({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  const yes = isYes(value);
  const color = yes ? colors.success : colors.textLight;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: color + '18', borderWidth: 1, borderColor: color + '40' }}>
      {yes ? <CheckCircle2 size={11} color={color} /> : <XCircle size={11} color={color} />}
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}: {value}</Text>
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
  if (!text?.trim()) return null;
  return (
    <View style={{ gap: 4, marginTop: 6 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

function FactsGrid({ facts }: { facts: { label: string; value: string }[] }) {
  const visible = facts.filter((f) => f.value?.trim());
  if (visible.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {visible.map((f) => (
        <View key={f.label} style={{ minWidth: '46%', flexGrow: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 8, gap: 2 }}>
          <Text style={{ color: colors.textLight, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{f.label}</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{f.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ResearchDetailModal({
  opportunity,
  visible,
  onClose,
  onOpenWebsite,
}: {
  opportunity: ResearchOpportunity | null;
  visible: boolean;
  onClose: () => void;
  onOpenWebsite: (url: string, title: string) => void;
}) {
  if (!opportunity) return null;

  const deadline = formatResearchDate(opportunity.applicationDeadline);
  const opens = formatResearchDate(opportunity.applicationOpensDate);
  const deadlinePassed = isResearchDeadlinePassed(opportunity.applicationDeadline);
  const fundedKnown = opportunity.isFunded?.trim().length > 0;
  const funded = isYes(opportunity.isFunded || '');

  const openLink = (url: string) => {
    if (!url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    void Linking.openURL(href);
  };

  const quickFacts = [
    { label: 'Research Area', value: opportunity.researchArea },
    { label: 'Eligible Countries', value: opportunity.eligibleCountries },
    { label: 'Duration', value: opportunity.duration },
    { label: 'University', value: opportunity.universityName },
    { label: 'Host Department', value: opportunity.hostDepartment },
    { label: 'Funding Agency', value: opportunity.fundingAgency },
    { label: 'Application Method', value: opportunity.applicationMethod },
    { label: 'Max Participants', value: opportunity.maxParticipants },
  ];

  const fundingFacts = [
    { label: 'Max Grant Amount', value: opportunity.maxGrantAmount },
    { label: 'Monthly Stipend', value: opportunity.monthlyStipend },
    { label: 'Tuition Covered', value: opportunity.tuitionCovered },
    { label: 'Registration Fee', value: opportunity.registrationFee },
  ];

  const textSections = [
    { title: 'Short Description', text: opportunity.shortDescription },
    { title: 'Opportunity Highlights', text: opportunity.highlights },
    { title: 'Eligible Applicants', text: opportunity.eligibleApplicants },
    { title: 'Required Qualifications', text: opportunity.requiredQualifications },
    { title: 'Preferred Qualifications', text: opportunity.preferredQualifications },
    { title: 'Required Skills', text: opportunity.requiredSkills },
    { title: 'Funding / Scholarship Details', text: opportunity.fundingDetails },
    { title: 'Benefits', text: opportunity.benefits },
    { title: 'Required Documents', text: opportunity.requiredDocuments },
    { title: 'Additional Instructions', text: opportunity.additionalInstructions },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.card}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle} numberOfLines={2}>{opportunity.title}</Text>
            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modalStyles.content} showsVerticalScrollIndicator={false}>
            <Text style={modalStyles.orgName}>{opportunity.organization}</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {opportunity.type ? <Badge label={opportunity.type} color={ACCENT} /> : null}
              {opportunity.scholarshipFor ? <Badge label={opportunity.scholarshipFor} color={ACCENT_ALT} /> : null}
              {opportunity.mode ? <Badge label={opportunity.mode} color={ACCENT} /> : null}
              {opportunity.skillLevel ? <Badge label={opportunity.skillLevel} color={ACCENT} /> : null}
              {fundedKnown ? <Badge label={funded ? 'Funded' : 'Unfunded'} color={funded ? (colors.success) : colors.textLight} /> : null}
              {deadlinePassed ? <Badge label="Deadline Passed" color={colors.error} /> : null}
            </View>

            <View style={{ gap: 4, marginTop: 10 }}>
              {opens ? <InfoRow icon={<Calendar size={13} color={colors.textLight} />} text={`Opens: ${opens}`} /> : null}
              <InfoRow icon={<Calendar size={13} color={deadlinePassed ? colors.error : colors.textLight} />} text={deadline ? `Deadline: ${deadline}` : ''} />
              <InfoRow icon={<Mail size={13} color={colors.textLight} />} text={opportunity.contactEmail} />
              <InfoRow icon={<Globe2 size={13} color={colors.textLight} />} text={opportunity.eligibleCountries} />
            </View>

            <FactsGrid facts={quickFacts} />

            <View style={modalStyles.divider} />

            {textSections.map((s) => <SectionBlock key={s.title} title={s.title} text={s.text} />)}

            {fundingFacts.some((f) => f.value?.trim()) ? (
              <>
                <View style={modalStyles.divider} />
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Funding Breakdown</Text>
                <FactsGrid facts={fundingFacts} />
              </>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <YesNoBadge label="IELTS/TOEFL" value={opportunity.ieltsToeflRequired} />
              <YesNoBadge label="GRE" value={opportunity.greRequired} />
              <YesNoBadge label="Certificate" value={opportunity.certificateProvided} />
            </View>

            {opportunity.applicationLink ? (
              <TouchableOpacity
                style={modalStyles.applyButton}
                onPress={() => openLink(opportunity.applicationLink)}
              >
                <ExternalLink size={16} color="#fff" />
                <Text style={modalStyles.applyButtonText}>Apply Now</Text>
              </TouchableOpacity>
            ) : null}

            {opportunity.website ? (
              <TouchableOpacity
                style={modalStyles.websiteButton}
                onPress={() => onOpenWebsite(opportunity.website, opportunity.title)}
              >
                <ExternalLink size={14} color={ACCENT} />
                <Text style={modalStyles.websiteButtonText}>{opportunity.website}</Text>
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
    backgroundColor: ACCENT,
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
    color: ACCENT,
    fontSize: 12,
    fontWeight: '600' as const,
  },
};

export default function ResearchGrantsScreen() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<ResearchOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>(ALL_FILTER);
  const [fundedOnly, setFundedOnly] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ResearchOpportunity | null>(null);
  const [showExpired, setShowExpired] = useState(false);

  const openWebsite = useCallback((url: string, title: string) => {
    if (!url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    router.push({ pathname: '/web-viewer', params: { url: href, title } });
  }, [router]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    const result = await loadResearchGrants();
    setOpportunities(result.opportunities);
    setError(result.error);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const types = useMemo(() => {
    const set = new Set(opportunities.map((o) => o.type).filter(Boolean));
    return [ALL_FILTER, ...Array.from(set)];
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      if (selectedType !== ALL_FILTER && o.type !== selectedType) return false;
      if (fundedOnly && !isYes(o.isFunded || '')) return false;
      if (!showExpired && isResearchDeadlinePassed(o.applicationDeadline)) return false;
      return true;
    });
  }, [opportunities, selectedType, fundedOnly, showExpired]);

  const expiredCount = useMemo(
    () => opportunities.filter((o) => isResearchDeadlinePassed(o.applicationDeadline)).length,
    [opportunities]
  );

  const fundedCount = useMemo(
    () => opportunities.filter((o) => isYes(o.isFunded || '')).length,
    [opportunities]
  );

  const activeCount = opportunities.length - expiredCount;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground tint="#0D9488" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} colors={[colors.primary]} />}
      >
        {/* Header summary */}
        <LinearGradient
          colors={['#0D9488', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryBar}
        >
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{fundedCount}</Text>
            <Text style={styles.summaryLabel}>Funded</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{opportunities.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </LinearGradient>

        {/* Filters */}
        {types.length > 1 ? (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Opportunity Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {types.map((type) => (
                <PressableScale
                  key={type}
                  style={[styles.chip, selectedType === type && styles.chipActive]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>{type}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.expiredToggle, fundedOnly && styles.expiredToggleActive]} onPress={() => setFundedOnly((v) => !v)}>
            <Banknote size={13} color={fundedOnly ? '#fff' : colors.textLight} />
            <Text style={[styles.expiredToggleText, fundedOnly && styles.expiredToggleTextActive]}>Funded only</Text>
          </TouchableOpacity>

          {expiredCount > 0 ? (
            <TouchableOpacity style={styles.expiredToggle} onPress={() => setShowExpired((v) => !v)}>
              <Clock size={13} color={colors.textLight} />
              <Text style={styles.expiredToggleText}>
                {showExpired ? `Hide ${expiredCount} expired` : `Show ${expiredCount} expired`}
              </Text>
              <ChevronDown size={13} color={colors.textLight} style={showExpired ? { transform: [{ rotate: '180deg' }] } : undefined} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Loading */}
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading research opportunities...</Text>
          </View>
        ) : null}

        {/* Error */}
        {!isLoading && error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Empty */}
        {!isLoading && !error && filteredOpportunities.length === 0 && opportunities.length > 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>No opportunities match the current filters.</Text>
          </View>
        ) : null}

        {!isLoading && !error && opportunities.length === 0 ? (
          <View style={styles.centerBox}>
            <FlaskConical size={40} color={colors.textLight} />
            <Text style={styles.emptyText}>No research opportunities available yet.</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh.</Text>
          </View>
        ) : null}

        {/* Cards */}
        {!isLoading ? (
          <View style={styles.list}>
            {filteredOpportunities.map((opportunity, index) => {
              const passed = isResearchDeadlinePassed(opportunity.applicationDeadline);
              const deadline = formatResearchDate(opportunity.applicationDeadline);
              const fundedKnown = opportunity.isFunded?.trim().length > 0;
              const funded = isYes(opportunity.isFunded || '');
              return (
                <AnimatedEntrance key={opportunity.id} index={Math.min(index, 8)} from="up">
                <PressableScale
                  style={[styles.card, passed && styles.cardExpired]}
                  onPress={() => setSelectedOpportunity(opportunity)}
                  activeScale={0.99}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.iconWrap}>
                      <FlaskConical size={20} color={passed ? colors.textLight : ACCENT} />
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={[styles.title, passed && styles.titleExpired]} numberOfLines={2}>
                        {opportunity.title}
                      </Text>
                      <Text style={styles.org} numberOfLines={1}>{opportunity.organization}</Text>
                    </View>
                    <ChevronRight size={16} color={colors.textLight} />
                  </View>

                  <View style={styles.cardBadges}>
                    {opportunity.type ? <Badge label={opportunity.type} color={passed ? colors.textLight : ACCENT} /> : null}
                    {opportunity.scholarshipFor ? <Badge label={opportunity.scholarshipFor} color={passed ? colors.textLight : ACCENT_ALT} /> : null}
                    {fundedKnown ? <Badge label={funded ? 'Funded' : 'Unfunded'} color={passed ? colors.textLight : (funded ? (colors.success) : colors.textLight)} /> : null}
                    {passed ? <Badge label="Expired" color={colors.error} /> : null}
                  </View>

                  <View style={styles.cardFooter}>
                    {opportunity.researchArea ? (
                      <View style={styles.footerItem}>
                        <MapPin size={11} color={colors.textLight} />
                        <Text style={styles.footerText} numberOfLines={1}>{opportunity.researchArea}</Text>
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
                </PressableScale>
                </AnimatedEntrance>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <ResearchDetailModal
        opportunity={selectedOpportunity}
        visible={selectedOpportunity !== null}
        onClose={() => setSelectedOpportunity(null)}
        onOpenWebsite={openWebsite}
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
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.lg,
    padding: 18,
    ...elevation('md'),
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
    backgroundColor: '#FFFFFF33',
  },
  summaryNum: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#FFFFFFDD',
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  expiredToggleActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  expiredToggleText: {
    color: c.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  expiredToggleTextActive: {
    color: '#fff',
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
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    padding: 14,
    gap: 8,
    ...elevation('md'),
  },
  cardExpired: {
    opacity: 0.65,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ACCENT + '18',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardMeta: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: c.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  titleExpired: {
    color: c.textSecondary,
  },
  org: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  cardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardFooter: {
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
