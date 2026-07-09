import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  ExternalLink,
  Facebook,
  Globe,
  Heart,
  Linkedin,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  Search,
  X,
} from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, InterestButton, PressableScale } from '@/components/ui';
import { loadNgos, Ngo, normalizeOrgName, parseLocationGps } from '@/services/ngos';
import { formatDeadline, isDeadlinePassed, JobPosting, loadJobPostings } from '@/services/jobPortal';
import { useInterested } from '@/services/interests';

// Page accent colors — deliberately darker than colors.primary/secondary so
// text and icons keep sufficient contrast against light card/badge backgrounds.
const ACCENT = '#0E7490';
const ACCENT_ALT = '#B45309';

function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  if (!text) return null;
  return (
    <View style={modalStyles.infoRow}>
      <View style={{ marginTop: 2 }}>{icon}</View>
      <Text style={modalStyles.infoRowText}>{text}</Text>
    </View>
  );
}

function NgoDetailModal({
  ngo,
  jobs,
  visible,
  onClose,
  onViewJobs,
  onOpenLink,
  onOpenMap,
  isInterested,
  onToggleInterested,
}: {
  ngo: Ngo | null;
  jobs: JobPosting[];
  visible: boolean;
  onClose: () => void;
  onViewJobs: (ngo: Ngo) => void;
  onOpenLink: (url: string, title: string) => void;
  onOpenMap: (ngo: Ngo) => void;
  isInterested: boolean;
  onToggleInterested: () => void;
}) {
  if (!ngo) return null;

  const location = [ngo.officeLocation, ngo.headquarters].filter(Boolean).join(' · ');
  const hasGps = !!parseLocationGps(ngo.locationGps);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.card}>
          <View style={modalStyles.header}>
            {ngo.logo ? (
              <Image source={{ uri: ngo.logo }} style={modalStyles.headerLogo} />
            ) : (
              <View style={modalStyles.headerLogoFallback}>
                <Building2 size={20} color={ACCENT} />
              </View>
            )}
            <Text style={modalStyles.headerTitle} numberOfLines={2}>{ngo.name}</Text>
            <InterestButton interested={isInterested} onToggle={onToggleInterested} color={ACCENT} size={32} />
            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modalStyles.content} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ngo.ngoType ? <View style={styles.badge}><Text style={styles.badgeText}>{ngo.ngoType}</Text></View> : null}
              {ngo.sector ? <View style={[styles.badge, styles.badgeAlt]}><Text style={[styles.badgeText, styles.badgeTextAlt]}>{ngo.sector}</Text></View> : null}
              {ngo.establishedYear ? <View style={[styles.badge, styles.badgeMuted]}><Text style={[styles.badgeText, styles.badgeTextMuted]}>Est. {ngo.establishedYear}</Text></View> : null}
            </View>

            <View style={{ gap: 4, marginTop: 10 }}>
              <InfoRow icon={<MapPin size={13} color={colors.textLight} />} text={location} />
              <InfoRow icon={<Mail size={13} color={colors.textLight} />} text={ngo.contactEmail} />
              <InfoRow icon={<Phone size={13} color={colors.textLight} />} text={ngo.contactPhone} />
            </View>

            {ngo.description ? (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>About</Text>
                <Text style={modalStyles.sectionText}>{ngo.description}</Text>
              </View>
            ) : null}

            {ngo.keyPrograms ? (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Key Programs</Text>
                <Text style={modalStyles.sectionText}>{ngo.keyPrograms}</Text>
              </View>
            ) : null}

            {(ngo.website || ngo.facebook || ngo.linkedin) ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {ngo.website ? (
                  <TouchableOpacity style={modalStyles.linkButton} onPress={() => onOpenLink(ngo.website, ngo.name)}>
                    <Globe size={14} color={ACCENT} />
                    <Text style={modalStyles.linkButtonText} numberOfLines={1}>Website</Text>
                  </TouchableOpacity>
                ) : null}
                {ngo.facebook ? (
                  <TouchableOpacity style={modalStyles.linkButton} onPress={() => onOpenLink(ngo.facebook, `${ngo.name} · Facebook`)}>
                    <Facebook size={14} color={ACCENT} />
                    <Text style={modalStyles.linkButtonText} numberOfLines={1}>Facebook</Text>
                  </TouchableOpacity>
                ) : null}
                {ngo.linkedin ? (
                  <TouchableOpacity style={modalStyles.linkButton} onPress={() => onOpenLink(ngo.linkedin, `${ngo.name} · LinkedIn`)}>
                    <Linkedin size={14} color={ACCENT} />
                    <Text style={modalStyles.linkButtonText} numberOfLines={1}>LinkedIn</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {hasGps ? (
              <TouchableOpacity style={modalStyles.mapButton} onPress={() => onOpenMap(ngo)}>
                <MapPinned size={14} color="#fff" />
                <Text style={modalStyles.mapButtonText}>View on Map</Text>
              </TouchableOpacity>
            ) : null}

            <View style={modalStyles.divider} />

            <Text style={modalStyles.sectionTitle}>
              {jobs.length > 0 ? `Jobs at this organization (${jobs.length})` : 'Jobs at this organization'}
            </Text>

            {jobs.length > 0 ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                {jobs.map((job) => {
                  const passed = isDeadlinePassed(job.applicationDeadline);
                  const deadline = formatDeadline(job.applicationDeadline);
                  return (
                    <TouchableOpacity
                      key={job.id}
                      style={[modalStyles.jobRow, passed && { opacity: 0.6 }]}
                      onPress={() => onViewJobs(ngo)}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={modalStyles.jobRowTitle} numberOfLines={1}>{job.jobTitle}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {job.jobType ? <Text style={modalStyles.jobRowSub}>{job.jobType}</Text> : null}
                          {deadline ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Calendar size={10} color={passed ? colors.error : colors.textLight} />
                              <Text style={[modalStyles.jobRowSub, passed && { color: colors.error }]}>
                                {passed ? `Expired ${deadline}` : deadline}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <ChevronRight size={16} color={colors.textLight} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={modalStyles.sectionText}>No jobs found for this organization yet.</Text>
            )}

            {jobs.length > 0 ? (
              <TouchableOpacity style={modalStyles.viewAllButton} onPress={() => onViewJobs(ngo)}>
                <ExternalLink size={14} color="#fff" />
                <Text style={modalStyles.viewAllButtonText}>View in Job Portal</Text>
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
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  headerLogoFallback: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ACCENT + '18',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
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
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 6,
    marginTop: 2,
  },
  infoRowText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 4,
    marginTop: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  linkButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
  },
  linkButtonText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  mapButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  jobRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  jobRowTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  jobRowSub: {
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  viewAllButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 14,
  },
  viewAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
};

const ALL_FILTER = 'All';

export default function NgosScreen() {
  const router = useRouter();
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [jobsByOrg, setJobsByOrg] = useState<Map<string, JobPosting[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>(ALL_FILTER);
  const [selectedSector, setSelectedSector] = useState<string>(ALL_FILTER);
  const [interestedOnly, setInterestedOnly] = useState(false);
  const [selectedNgo, setSelectedNgo] = useState<Ngo | null>(null);
  const { isInterested, toggleInterested } = useInterested('organizations');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const [ngosResult, jobsResult] = await Promise.all([loadNgos(), loadJobPostings()]);

    const byOrg = new Map<string, JobPosting[]>();
    for (const job of jobsResult.jobs) {
      const key = normalizeOrgName(job.organization || '');
      if (!key) continue;
      const list = byOrg.get(key) || [];
      list.push(job);
      byOrg.set(key, list);
    }

    setNgos(ngosResult.ngos);
    setJobsByOrg(byOrg);
    setError(ngosResult.error);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const types = useMemo(() => {
    const set = new Set(ngos.map((n) => n.ngoType).filter(Boolean));
    return [ALL_FILTER, ...Array.from(set)];
  }, [ngos]);

  const sectors = useMemo(() => {
    const set = new Set(ngos.map((n) => n.sector).filter(Boolean));
    return [ALL_FILTER, ...Array.from(set)];
  }, [ngos]);

  const hasAnyJobsFor = useCallback((ngo: Ngo) => {
    return (jobsByOrg.get(normalizeOrgName(ngo.name)) || []).length > 0;
  }, [jobsByOrg]);

  // Organizations with job postings (active or expired) surface first;
  // order is otherwise preserved.
  const sortedNgos = useMemo(() => {
    return [...ngos].sort((a, b) => {
      const aHasJobs = hasAnyJobsFor(a) ? 1 : 0;
      const bHasJobs = hasAnyJobsFor(b) ? 1 : 0;
      return bHasJobs - aHasJobs;
    });
  }, [ngos, hasAnyJobsFor]);

  const filteredNgos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortedNgos.filter((n) => {
      if (selectedType !== ALL_FILTER && n.ngoType !== selectedType) return false;
      if (selectedSector !== ALL_FILTER && n.sector !== selectedSector) return false;
      if (interestedOnly && !isInterested(n.id)) return false;
      if (normalizedQuery) {
        const haystack = `${n.name} ${n.sector} ${n.headquarters} ${n.officeLocation}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [sortedNgos, selectedType, selectedSector, interestedOnly, isInterested, query]);

  const openWebsite = useCallback((url: string, title: string) => {
    if (!url) return;
    router.push({
      pathname: '/web-viewer',
      params: { url: normalizeUrl(url), title },
    });
  }, [router]);

  const openMap = useCallback((ngo: Ngo) => {
    const coords = parseLocationGps(ngo.locationGps);
    if (!coords) return;
    const { latitude, longitude } = coords;
    const label = encodeURIComponent(ngo.name);
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const nativeUrl = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
    });

    const openWeb = () => {
      void Linking.openURL(webUrl).catch((error) => {
        console.log('[Organizations] Failed to open map:', error);
      });
    };

    if (nativeUrl) {
      Linking.openURL(nativeUrl).catch(openWeb);
    } else {
      openWeb();
    }
  }, []);

  const openNgoJobs = useCallback((ngo: Ngo) => {
    setSelectedNgo(null);
    router.push({
      pathname: '/(tabs)/(home)/job-portal',
      params: { organization: ngo.name },
    });
  }, [router]);

  const activeJobCount = useMemo(() => {
    let total = 0;
    for (const jobs of jobsByOrg.values()) {
      total += jobs.filter((j) => !isDeadlinePassed(j.applicationDeadline)).length;
    }
    return total;
  }, [jobsByOrg]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground tint="#0891B2" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} colors={[colors.primary]} />}
      >
        <LinearGradient
          colors={['#0891B2', '#0E7490']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryBar}
        >
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{ngos.length}</Text>
            <Text style={styles.summaryLabel}>Organizations</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{activeJobCount}</Text>
            <Text style={styles.summaryLabel}>Open Jobs</Text>
          </View>
        </LinearGradient>

        <View style={styles.searchWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search organizations by name, sector, or location"
            placeholderTextColor={colors.textLight}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {types.length > 1 ? (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Type</Text>
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

        {sectors.length > 1 ? (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sector</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {sectors.map((sector) => (
                <PressableScale
                  key={sector}
                  style={[styles.chip, selectedSector === sector && styles.chipActive]}
                  onPress={() => setSelectedSector(sector)}
                >
                  <Text style={[styles.chipText, selectedSector === sector && styles.chipTextActive]}>{sector}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.interestedToggle, interestedOnly && styles.interestedToggleActive]}
          onPress={() => setInterestedOnly((v) => !v)}
        >
          <Heart size={13} color={interestedOnly ? '#fff' : colors.textLight} fill={interestedOnly ? '#fff' : 'none'} />
          <Text style={[styles.interestedToggleText, interestedOnly && styles.interestedToggleTextActive]}>Interested</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading organizations...</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && filteredNgos.length === 0 && ngos.length > 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>No organizations match the current filters.</Text>
          </View>
        ) : null}

        {!isLoading && !error && ngos.length === 0 ? (
          <View style={styles.centerBox}>
            <Building2 size={40} color={colors.textLight} />
            <Text style={styles.emptyText}>No organizations available yet.</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh.</Text>
          </View>
        ) : null}

        {!isLoading ? (
          <View style={styles.list}>
            {filteredNgos.map((ngo, index) => {
              const allJobs = jobsByOrg.get(normalizeOrgName(ngo.name)) || [];
              const matchedJobs = allJobs.filter((j) => !isDeadlinePassed(j.applicationDeadline));
              const location = [ngo.officeLocation, ngo.headquarters].filter(Boolean).join(' · ');
              return (
                <AnimatedEntrance key={ngo.id} index={Math.min(index, 8)} from="up">
                  <View style={styles.card}>
                    <PressableScale style={styles.cardTop} onPress={() => setSelectedNgo(ngo)} activeScale={0.99}>
                      {ngo.logo ? (
                        <Image source={{ uri: ngo.logo }} style={styles.logo} />
                      ) : (
                        <View style={styles.logoFallback}>
                          <Building2 size={20} color={ACCENT} />
                        </View>
                      )}
                      <View style={styles.cardMeta}>
                        <Text style={styles.name} numberOfLines={2}>{ngo.name}</Text>
                        {location ? (
                          <View style={styles.locationRow}>
                            <MapPin size={11} color={colors.textLight} />
                            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
                          </View>
                        ) : null}
                      </View>
                      <ChevronRight size={16} color={colors.textLight} />
                    </PressableScale>
                    <View style={styles.interestCorner} pointerEvents="box-none">
                      <InterestButton interested={isInterested(ngo.id)} onToggle={() => toggleInterested(ngo.id)} color={ACCENT} />
                    </View>

                    <View style={styles.cardBadges}>
                      {ngo.ngoType ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{ngo.ngoType}</Text>
                        </View>
                      ) : null}
                      {ngo.sector ? (
                        <View style={[styles.badge, styles.badgeAlt]}>
                          <Text style={[styles.badgeText, styles.badgeTextAlt]}>{ngo.sector}</Text>
                        </View>
                      ) : null}
                      {ngo.establishedYear ? (
                        <View style={[styles.badge, styles.badgeMuted]}>
                          <Text style={[styles.badgeText, styles.badgeTextMuted]}>Est. {ngo.establishedYear}</Text>
                        </View>
                      ) : null}
                    </View>

                    {ngo.description ? (
                      <Text style={styles.description} numberOfLines={5}>{ngo.description}</Text>
                    ) : null}

                    {ngo.keyPrograms ? (
                      <View style={styles.programsBlock}>
                        <Text style={styles.programsLabel}>Key Programs</Text>
                        <Text style={styles.programsText} numberOfLines={3}>{ngo.keyPrograms}</Text>
                      </View>
                    ) : null}

                    {(ngo.website || ngo.facebook || ngo.linkedin || parseLocationGps(ngo.locationGps)) ? (
                      <View style={styles.linksRow}>
                        {ngo.website ? (
                          <PressableScale style={styles.linkBtn} onPress={() => openWebsite(ngo.website, ngo.name)}>
                            <Globe size={13} color={ACCENT} />
                            <Text style={styles.linkBtnText} numberOfLines={1}>Website</Text>
                          </PressableScale>
                        ) : null}
                        {ngo.facebook ? (
                          <PressableScale style={styles.linkBtn} onPress={() => openWebsite(ngo.facebook, `${ngo.name} · Facebook`)}>
                            <Facebook size={13} color={ACCENT} />
                            <Text style={styles.linkBtnText} numberOfLines={1}>Facebook</Text>
                          </PressableScale>
                        ) : null}
                        {ngo.linkedin ? (
                          <PressableScale style={styles.linkBtn} onPress={() => openWebsite(ngo.linkedin, `${ngo.name} · LinkedIn`)}>
                            <Linkedin size={13} color={ACCENT} />
                            <Text style={styles.linkBtnText} numberOfLines={1}>LinkedIn</Text>
                          </PressableScale>
                        ) : null}
                        {parseLocationGps(ngo.locationGps) ? (
                          <PressableScale style={styles.linkBtn} onPress={() => openMap(ngo)}>
                            <MapPinned size={13} color={ACCENT} />
                            <Text style={styles.linkBtnText} numberOfLines={1}>Map</Text>
                          </PressableScale>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={styles.cardDivider} />

                    {matchedJobs.length > 0 ? (
                      <View style={styles.jobsSection}>
                        <View style={styles.jobsSectionHeader}>
                          <Briefcase size={13} color={ACCENT} />
                          <Text style={styles.jobsSectionTitle}>
                            {matchedJobs.length} open job{matchedJobs.length === 1 ? '' : 's'}
                          </Text>
                        </View>
                        {matchedJobs.map((job) => {
                          const deadline = formatDeadline(job.applicationDeadline);
                          return (
                            <PressableScale
                              key={job.id}
                              style={styles.jobRow}
                              onPress={() => openNgoJobs(ngo)}
                              activeScale={0.98}
                            >
                              <View style={styles.jobRowMeta}>
                                <Text style={styles.jobRowTitle} numberOfLines={1}>{job.jobTitle}</Text>
                                <Text style={styles.jobRowSub} numberOfLines={1}>
                                  {[job.jobType, deadline && `Due ${deadline}`].filter(Boolean).join(' · ')}
                                </Text>
                              </View>
                              <ChevronRight size={14} color={colors.textLight} />
                            </PressableScale>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.cardFooter}>
                        <Briefcase size={13} color={colors.textLight} />
                        <Text style={styles.jobsText}>No open jobs right now</Text>
                      </View>
                    )}
                  </View>
                </AnimatedEntrance>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <NgoDetailModal
        ngo={selectedNgo}
        jobs={selectedNgo ? jobsByOrg.get(normalizeOrgName(selectedNgo.name)) || [] : []}
        visible={selectedNgo !== null}
        onClose={() => setSelectedNgo(null)}
        onViewJobs={openNgoJobs}
        onOpenLink={openWebsite}
        onOpenMap={openMap}
        isInterested={selectedNgo ? isInterested(selectedNgo.id) : false}
        onToggleInterested={() => selectedNgo && toggleInterested(selectedNgo.id)}
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
  searchWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    color: c.text,
    fontSize: 14,
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
  interestedToggle: {
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
  interestedToggleActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  interestedToggleText: {
    color: c.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  interestedToggleTextActive: {
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
    position: 'relative',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    padding: 14,
    gap: 8,
    ...elevation('md'),
  },
  interestCorner: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingRight: 36,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
  },
  logoFallback: {
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
  name: {
    color: c.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: ACCENT + '18',
    borderWidth: 1,
    borderColor: ACCENT + '40',
  },
  badgeText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeAlt: {
    backgroundColor: ACCENT_ALT + '18',
    borderColor: ACCENT_ALT + '40',
  },
  badgeTextAlt: {
    color: ACCENT_ALT,
  },
  badgeMuted: {
    backgroundColor: c.surfaceAlt,
    borderColor: c.border,
  },
  badgeTextMuted: {
    color: c.textSecondary,
  },
  description: {
    color: c.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  programsBlock: {
    gap: 2,
  },
  programsLabel: {
    color: c.text,
    fontSize: 12,
    fontWeight: '700',
  },
  programsText: {
    color: c.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkBtnText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: c.border,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobsText: {
    color: c.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  jobsTextActive: {
    color: ACCENT,
  },
  jobsSection: {
    gap: 6,
  },
  jobsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobsSectionTitle: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '700',
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  jobRowMeta: {
    flex: 1,
    gap: 1,
  },
  jobRowTitle: {
    color: c.text,
    fontSize: 12,
    fontWeight: '700',
  },
  jobRowSub: {
    color: c.textLight,
    fontSize: 11,
    fontWeight: '500',
  },
}));
