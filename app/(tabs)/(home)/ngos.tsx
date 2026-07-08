import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Briefcase, Building2, ChevronRight, Facebook, Globe, MapPin, Search } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, PressableScale } from '@/components/ui';
import { loadNgos, Ngo, normalizeOrgName } from '@/services/ngos';
import { formatDeadline, isDeadlinePassed, JobPosting, loadJobPostings } from '@/services/jobPortal';

function openLink(url: string) {
  if (!url) return;
  const href = url.startsWith('http') ? url : `https://${url}`;
  void Linking.openURL(href);
}

const ALL_FILTER = 'All';

export default function NgosScreen() {
  const router = useRouter();
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [jobsByOrg, setJobsByOrg] = useState<Map<string, JobPosting[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>(ALL_FILTER);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const [ngosResult, jobsResult] = await Promise.all([loadNgos(), loadJobPostings()]);

    const byOrg = new Map<string, JobPosting[]>();
    for (const job of jobsResult.jobs) {
      if (isDeadlinePassed(job.applicationDeadline)) continue;
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

  const sectors = useMemo(() => {
    const set = new Set(ngos.map((n) => n.sector).filter(Boolean));
    return [ALL_FILTER, ...Array.from(set)];
  }, [ngos]);

  const filteredNgos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return ngos.filter((n) => {
      if (selectedSector !== ALL_FILTER && n.sector !== selectedSector) return false;
      if (normalizedQuery) {
        const haystack = `${n.name} ${n.sector} ${n.headquarters} ${n.officeLocation}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [ngos, selectedSector, query]);

  const openNgoJobs = useCallback((ngo: Ngo) => {
    router.push({
      pathname: '/(tabs)/(home)/job-portal',
      params: { organization: ngo.name },
    });
  }, [router]);

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
            <Text style={styles.summaryLabel}>NGOs</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{Array.from(jobsByOrg.values()).reduce((sum, jobs) => sum + jobs.length, 0)}</Text>
            <Text style={styles.summaryLabel}>Open Jobs</Text>
          </View>
        </LinearGradient>

        <View style={styles.searchWrap}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search NGOs by name, sector, or location"
            placeholderTextColor={colors.textLight}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

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

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading NGOs...</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error && filteredNgos.length === 0 && ngos.length > 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>No NGOs match the current filters.</Text>
          </View>
        ) : null}

        {!isLoading && !error && ngos.length === 0 ? (
          <View style={styles.centerBox}>
            <Building2 size={40} color={colors.textLight} />
            <Text style={styles.emptyText}>No NGOs available yet.</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh.</Text>
          </View>
        ) : null}

        {!isLoading ? (
          <View style={styles.list}>
            {filteredNgos.map((ngo, index) => {
              const matchedJobs = jobsByOrg.get(normalizeOrgName(ngo.name)) || [];
              const location = [ngo.officeLocation, ngo.headquarters].filter(Boolean).join(' · ');
              return (
                <AnimatedEntrance key={ngo.id} index={Math.min(index, 8)} from="up">
                  <View style={styles.card}>
                    <View style={styles.cardTop}>
                      {ngo.logo ? (
                        <Image source={{ uri: ngo.logo }} style={styles.logo} />
                      ) : (
                        <View style={styles.logoFallback}>
                          <Building2 size={20} color={colors.primary} />
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

                    {(ngo.website || ngo.facebook) ? (
                      <View style={styles.linksRow}>
                        {ngo.website ? (
                          <PressableScale style={styles.linkBtn} onPress={() => openLink(ngo.website)}>
                            <Globe size={13} color={colors.primary} />
                            <Text style={styles.linkBtnText} numberOfLines={1}>Website</Text>
                          </PressableScale>
                        ) : null}
                        {ngo.facebook ? (
                          <PressableScale style={styles.linkBtn} onPress={() => openLink(ngo.facebook)}>
                            <Facebook size={13} color={colors.primary} />
                            <Text style={styles.linkBtnText} numberOfLines={1}>Facebook</Text>
                          </PressableScale>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={styles.cardDivider} />

                    {matchedJobs.length > 0 ? (
                      <View style={styles.jobsSection}>
                        <View style={styles.jobsSectionHeader}>
                          <Briefcase size={13} color={colors.primary} />
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
    backgroundColor: c.primary + '18',
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
    backgroundColor: c.primary + '18',
    borderWidth: 1,
    borderColor: c.primary + '40',
  },
  badgeText: {
    color: c.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeAlt: {
    backgroundColor: c.secondary + '18',
    borderColor: c.secondary + '40',
  },
  badgeTextAlt: {
    color: c.secondary,
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
    color: c.primary,
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
    color: c.primary,
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
    color: c.primary,
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
