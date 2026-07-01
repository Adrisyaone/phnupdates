import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookMarked, BookOpen, BriefcaseBusiness, Briefcase, Calculator, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Facebook, FileText, Globe, Info, ImageIcon, Lightbulb, Menu, Newspaper, ScanLine, ScrollText, Settings, Shield, Sparkles, ChevronRightCircle, NotebookPen, Youtube } from 'lucide-react-native';
import { DASHBOARD_MENUS, DashboardMenuKey, getMenuThemeColor } from '@/constants/blogMenus';
import { colors, createThemedStyles } from '@/constants/colors';
import { ALL_HEALTH_TIPS } from '@/mocks/healthTips';
import { PUBLIC_HEALTH_DAYS } from '@/constants/publicHealthDays';
import { PUBLIC_HEALTH_QUOTES } from '@/constants/publicHealthQuotes';
import { useSettings } from '@/contexts/SettingsContext';
import { getHealthTipDetails, HealthTipDetails } from '@/services/healthTipInfo';
import { fetchPostsByLabels, BlogPost } from '@/services/bloggerApi';
import { formatDeadline, isDeadlinePassed, JobPosting, loadJobPostings } from '@/services/jobPortal';

const MONTH_LOCALE_MAP = {
  en: 'en-US',
  es: 'es-ES',
  ne: 'ne-NP',
} as const;

const HOME_COPY = {
  en: {
    title: 'Public health Updates',
    subtitle: 'A blog site to support and help all the public health professionals.',
    healthTips: 'Health Tips',
    quoteTitle: 'Public Health Quote of the Day',
    quoteFallback: 'Stay informed and protect community health.',
    unknown: 'Unknown',
    publicHealthDays: 'Public Health Days',
    previous: 'Previous',
    next: 'Next',
    today: 'Today',
    monthList: 'Month List',
    noToday: 'No listed public health day for today.',
    noMonthDays: 'No listed public health days in this month.',
  },
  es: {
    title: 'Public health Updates',
    subtitle: 'A blog site to support and help all the public health professionals.',
    healthTips: 'Consejos de Salud',
    quoteTitle: 'Frase de Salud Publica del Dia',
    quoteFallback: 'Mantente informado y protege la salud de la comunidad.',
    unknown: 'Desconocido',
    publicHealthDays: 'Dias de Salud Publica',
    previous: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
    monthList: 'Lista del Mes',
    noToday: 'No hay un dia de salud publica listado para hoy.',
    noMonthDays: 'No hay dias de salud publica listados en este mes.',
  },
  ne: {
    title: 'Public health Updates',
    subtitle: 'A blog site to support and help all the public health professionals.',
    healthTips: 'Swasthya Tips',
    quoteTitle: 'Aajko Public Health Quote',
    quoteFallback: 'Suchit rahanu ra samudayik swasthya ko surakshya garnu.',
    unknown: 'Ajnat',
    publicHealthDays: 'Public Health Days',
    previous: 'Pahilo',
    next: 'Arko',
    today: 'Aaja',
    monthList: 'Mahina Suchi',
    noToday: 'Aaja ko lagi listed public health day chaina.',
    noMonthDays: 'Yo mahinama listed public health days chainan.',
  },
} as const;

function stableHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

function chooseCoprimeStep(length: number, seed: string): number {
  if (length <= 1) return 1;
  const preferred = (stableHash(seed) % (length - 1)) + 1;
  if (gcd(preferred, length) === 1) {
    return preferred;
  }

  for (let step = 1; step < length; step += 1) {
    if (gcd(step, length) === 1) {
      return step;
    }
  }

  return 1;
}

function rotatingDailyIndex(daySerial: number, length: number, channel: string): number {
  if (length <= 0) return 0;
  const base = stableHash(`${channel}-base`) % length;
  const step = chooseCoprimeStep(length, `${channel}-step`);
  return (base + ((daySerial % length) * step)) % length;
}


export default function DashboardScreen() {
  const router = useRouter();
  const { language, featureSettings, updateFeatureSettings } = useSettings();
  const [monthOffset, setMonthOffset] = useState(0);
  const [isMonthListExpanded, setIsMonthListExpanded] = useState(false);
  const [isTipDetailVisible, setIsTipDetailVisible] = useState(false);
  const [tipDetails, setTipDetails] = useState<HealthTipDetails | null>(null);
  const [isTipDetailsLoading, setIsTipDetailsLoading] = useState(false);
  const [tipDetailsError, setTipDetailsError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [latestNews, setLatestNews] = useState<BlogPost[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [latestOpportunities, setLatestOpportunities] = useState<BlogPost[]>([]);
  const [isOpportunitiesLoading, setIsOpportunitiesLoading] = useState(true);
  const [latestJobs, setLatestJobs] = useState<JobPosting[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState(true);

  useEffect(() => {
    const loadLatestNews = async () => {
      try {
        setIsNewsLoading(true);
        const posts = await fetchPostsByLabels(['Public Health News'], 5, 5);
        setLatestNews(posts);
      } catch (error) {
        console.log('[Dashboard] Failed to load latest news:', error);
        setLatestNews([]);
      } finally {
        setIsNewsLoading(false);
      }
    };
    const loadLatestOpportunities = async () => {
      try {
        setIsOpportunitiesLoading(true);
        const posts = await fetchPostsByLabels([
          'vacancy',
          'Grants',
          'scholarships',
          'expression of interest',
          'call for papers',
          'call for abstract',
        ], 5, 5);
        // Sort newest to oldest
        posts.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
        setLatestOpportunities(posts);
      } catch (error) {
        console.log('[Dashboard] Failed to load latest opportunities:', error);
        setLatestOpportunities([]);
      } finally {
        setIsOpportunitiesLoading(false);
      }
    };
    const loadLatestJobs = async () => {
      try {
        setIsJobsLoading(true);
        const result = await loadJobPostings();
        const active = result.jobs.filter((j) => !isDeadlinePassed(j.applicationDeadline));
        setLatestJobs(active.slice(0, 5));
      } catch (error) {
        console.log('[Dashboard] Failed to load job postings:', error);
        setLatestJobs([]);
      } finally {
        setIsJobsLoading(false);
      }
    };
    loadLatestNews();
    loadLatestOpportunities();
    loadLatestJobs();
  }, []);

  const drawerWidth = Math.min(320, Dimensions.get('window').width * 0.82);
  const drawerTranslateX = React.useRef(new Animated.Value(-drawerWidth)).current;

  const openDrawer = React.useCallback(() => {
    setIsDrawerOpen(true);
    Animated.spring(drawerTranslateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 16,
    }).start();
  }, [drawerTranslateX]);

  const closeDrawer = React.useCallback(() => {
    Animated.timing(drawerTranslateX, {
      toValue: -drawerWidth,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsDrawerOpen(false);
      }
    });
  }, [drawerTranslateX, drawerWidth]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 24 && Math.abs(gesture.dy) < 22,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 60) {
            openDrawer();
            return;
          }
          if (gesture.dx < -60) {
            closeDrawer();
          }
        },
      }),
    [closeDrawer, openDrawer]
  );

  const copy = HOME_COPY[language] ?? HOME_COPY.en;

  const { dailyTip, dailyQuote, todayDays, selectedMonthDays, selectedMonthName } = useMemo(() => {
    const now = new Date();
    const daySerial = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    const currentMonth = now.getMonth() + 1;
    const day = now.getDate();
    const selectedDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const selectedMonth = selectedDate.getMonth() + 1;
    const selectedMonthLabel = selectedDate.toLocaleString(MONTH_LOCALE_MAP[language], { month: 'long' });
    const tipIndex = rotatingDailyIndex(daySerial, ALL_HEALTH_TIPS.length, 'tip');
    const quoteIndex = rotatingDailyIndex(daySerial, PUBLIC_HEALTH_QUOTES.length, 'quote');
    const selectedTip = ALL_HEALTH_TIPS[tipIndex];
    const selectedQuote = PUBLIC_HEALTH_QUOTES[quoteIndex];

    const byCurrentMonth = PUBLIC_HEALTH_DAYS.filter((item) => item.month === currentMonth);
    const byToday = byCurrentMonth.filter((item) => item.day === day);
    const bySelectedMonth = PUBLIC_HEALTH_DAYS.filter((item) => item.month === selectedMonth);

    return {
      dailyTip: selectedTip,
      dailyQuote: selectedQuote,
      todayDays: byToday,
      selectedMonthDays: bySelectedMonth,
      selectedMonthName: selectedMonthLabel,
    };
  }, [monthOffset, language]);

  const otherMonthDays = useMemo(() => {
    const todayKeys = new Set(todayDays.map((item) => `${item.month}-${item.day}-${item.title}`));
    return selectedMonthDays.filter((item) => !todayKeys.has(`${item.month}-${item.day}-${item.title}`));
  }, [selectedMonthDays, todayDays]);

  const visibleOtherMonthDays = isMonthListExpanded ? otherMonthDays : otherMonthDays.slice(0, 3);

  const openTipDetails = async () => {
    if (!dailyTip?.tip) return;
    setIsTipDetailVisible(true);
    setIsTipDetailsLoading(true);
    setTipDetailsError(null);

    try {
      const details = await getHealthTipDetails(dailyTip.tip);
      setTipDetails(details);
    } catch (error) {
      console.log('[Dashboard] Failed to load health tip details:', error);
      setTipDetails(null);
      setTipDetailsError('Could not load detailed tip information. Please try again.');
    } finally {
      setIsTipDetailsLoading(false);
    }
  };

  const closeTipDetails = () => {
    setIsTipDetailVisible(false);
  };

  const openDashboardMenuByKey = React.useCallback((menuKey: DashboardMenuKey) => {
    if (menuKey === 'exam-preparation') {
      router.push('/(tabs)/(home)/exam-preparation');
      return;
    }

    const menu = DASHBOARD_MENUS.find((item) => item.key === menuKey);
    const defaultSubmenu = menu?.submenus?.[0];
    if (!defaultSubmenu) return;

    if (defaultSubmenu.type === 'jobs') {
      router.push({
        pathname: '/(tabs)/(home)/jobs',
        params: { menuKey },
      });
      return;
    }

    router.push({
      pathname: '/(tabs)/(home)/category',
      params: {
        menuKey,
        submenuKey: defaultSubmenu.key,
      },
    });
  }, [router]);

  const homeMenuItems = [
    {
      key: 'job-portal',
      title: 'Job Portal',
      description: 'Browse job openings posted by organizations.',
      color: '#7C3AED',
      icon: Briefcase,
      onPress: () => { router.push('/(tabs)/(home)/job-portal'); },
    },
    {
      key: 'opportunities',
      title: 'Opportunities',
      description: 'Funding, calls, and vacancy opportunities.',
      color: getMenuThemeColor('opportunities'),
      icon: BriefcaseBusiness,
      onPress: () => { openDashboardMenuByKey('opportunities'); },
    },
    {
      key: 'news',
      title: 'News',
      description: 'Latest public health updates and reports.',
      color: getMenuThemeColor('news'),
      icon: Newspaper,
      onPress: () => { openDashboardMenuByKey('news'); },
    },
    {
      key: 'knowledge-hub',
      title: 'Knowledge Hub',
      description: 'Open curated knowledge posts and resources.',
      color: colors.primary,
      icon: BookOpen,
      onPress: () => { router.push('/(tabs)/knowledge'); },
    },
    {
      key: 'articles',
      title: 'Reports and documents',
      description: 'Open posts tagged as international and national documents.',
      color: getMenuThemeColor('articles'),
      icon: FileText,
      onPress: () => {
        router.push({
          pathname: '/(tabs)/(home)/category',
          params: { menuKey: 'articles', submenuKey: 'documents' },
        });
      },
    },
      {
        key: 'books',
        title: 'Books',
        description: 'Open recommended learning books and references.',
        color: getMenuThemeColor('books'),
        icon: BookOpen,
        onPress: () => { router.push('/(tabs)/(home)/books'); },
      },
      {
        key: 'calculator',
        title: 'Calculator',
        description: 'Calorie estimation, BMI, and quick health conversions.',
        color: getMenuThemeColor('calculator'),
        icon: Calculator,
        onPress: () => { router.push('/(tabs)/(home)/calculator'); },
      },
      {
        key: 'image-size',
        title: 'Image Size',
        description: `Current: ${featureSettings.imageSizeWidth}×${featureSettings.imageSizeHeight}`,
        color: colors.primary,
        icon: ImageIcon,
        onPress: () => { router.push('/(tabs)/(home)/image-size'); },
      },
      {
        key: 'camscanner',
        title: 'CamScanner',
        description: 'Scan images and convert to PDF.',
        color: colors.primary,
        icon: ScanLine,
        onPress: () => { router.push('/(tabs)/(home)/camscanner'); },
      },
      {
        key: 'pdf-converter',
        title: 'PDF Converter',
        description: 'Merge, split, compress, and convert PDF files.',
        color: '#DC2626',
        icon: FileText,
        onPress: () => { router.push('/(tabs)/(home)/pdf-converter'); },
      },
    {
      key: 'factsheet',
      title: 'Fact Sheet',
      description: 'Scales, policies, and dashboard fact resources.',
      color: getMenuThemeColor('factsheet'),
      icon: ScrollText,
      onPress: () => { openDashboardMenuByKey('factsheet'); },
    },
    {
      key: 'research-tools',
      title: 'Research Tools',
      description: 'Public health research tools and scales.',
      color: colors.primary,
      icon: BookOpen,
      onPress: () => {
        router.push({
          pathname: '/(tabs)/(home)/category',
          params: { menuKey: 'articles', submenuKey: 'research-tools' },
        });
      },
    },
    {
      key: 'literatures',
      title: 'Literature',
      description: 'Stories, poems, and creative public health literature.',
      color: getMenuThemeColor('literatures'),
      icon: BookOpen,
      onPress: () => { openDashboardMenuByKey('literatures'); },
    },
    {
      key: 'exam-preparation',
      title: 'Exam Preparation',
      description: 'Syllabus, MCQs, AI tutor, and progress.',
      color: getMenuThemeColor('exam-preparation'),
      icon: Sparkles,
      onPress: () => { openDashboardMenuByKey('exam-preparation'); },
    },
    {
      key: 'selected-blogs',
      title: 'Selected Blogs',
      description: 'Selected posts grouped by category.',
      color: getMenuThemeColor('selected-blogs'),
      icon: BookMarked,
      onPress: () => { router.push('/(tabs)/(home)/selected-blogs'); },
    },
    {
      key: 'keep-notes',
      title: 'Keep Notes',
      description: 'Day-wise notes and document records.',
      color: getMenuThemeColor('keep-notes'),
      icon: NotebookPen,
      onPress: () => { router.push('/(tabs)/(home)/keep-notes'); },
    },
    {
      key: 'nagarik-awaz',
      title: 'NagarikAwaz',
      description: 'Civic pulse and citizen voice platform.',
      color: colors.primary,
      icon: Globe,
      onPress: () => {
        router.push({
          pathname: '/web-viewer',
          params: { url: 'https://civicpulse4u.netlify.app/', title: 'NagarikAwaz' },
        });
      },
    },
    {
      key: 'fb-page',
      title: 'FB page',
      description: 'Open our official Facebook page.',
      color: colors.primary,
      icon: Facebook,
      onPress: () => {
        void Linking.openURL('https://www.facebook.com/phnupdates').catch((error) => {
          console.log('[Dashboard] Failed to open Facebook page:', error);
        });
      },
    },
    {
      key: 'our-youtube',
      title: 'Our Youtube',
      description: 'Open our official YouTube channel.',
      color: colors.primary,
      icon: Youtube,
      onPress: () => {
        void Linking.openURL('https://www.youtube.com/@HealthyMe4u').catch((error) => {
          console.log('[Dashboard] Failed to open YouTube channel:', error);
        });
      },
    },
    {
      key: 'settings',
      title: 'Settings',
      description: 'Change theme, language, and notification preferences.',
      color: colors.primary,
      icon: Settings,
      onPress: () => { router.push('/settings'); },
    },
  ] as const;

  const homeMenuItemMap = new Map(homeMenuItems.map((item) => [item.key, item] as const));

  const homeMenuSections = [
    {
      title: 'Updates',
      subtitle: 'Latest posts and public health alerts.',
      keys: ['job-portal', 'opportunities', 'news', 'nagarik-awaz'],
    },
    {
      title: 'Learning & Resources',
      subtitle: 'Knowledge, references, and reading material.',
      keys: ['knowledge-hub', 'articles', 'books', 'factsheet', 'research-tools', 'literatures', 'exam-preparation'],
    },
    {
      title: 'Tools',
      subtitle: 'Quick calculators and converters.',
      keys: ['calculator', 'image-size', 'camscanner', 'pdf-converter'],
    },
    {
      title: 'Saved & Notes',
      subtitle: 'Posts and personal notes you return to often.',
      keys: ['selected-blogs', 'keep-notes'],
    },
    {
      title: 'Community',
      subtitle: 'Social links and community channels.',
      keys: ['fb-page', 'our-youtube'],
    },
    {
      title: 'Settings',
      subtitle: 'Theme, language, and notification preferences.',
      keys: ['settings'],
    },
  ] as const;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.screen} {...panResponder.panHandlers}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Hero Banner */}
          <View style={styles.heroBanner}>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.heroLogo}
              />
            </View>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{copy.title}</Text>
              <Text style={styles.heroSubtitle}>{copy.subtitle}</Text>
            </View>
          </View>

          {/* Menu Button */}
          <View style={styles.topBarRow}>
            <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
              <Menu size={18} color={colors.text} />
              <Text style={styles.menuButtonLabel}>Menu</Text>
            </TouchableOpacity>
          </View>

          {/* Health Tips Card */}
          



          {/* Menu Grid Sections */}
          {featureSettings.menuGridSection ? (
          <View style={styles.menuGridSection}>
            <Text style={styles.sectionSeparator}>Menu</Text>
            <View style={styles.sectionList}>
              {homeMenuSections.map((section) => (
                <View key={section.title} style={styles.sectionBlock}>
                  <View style={styles.sectionLabelBlock}>
                    <Text style={styles.sectionHeading}>{section.title}</Text>
                    <Text style={styles.sectionSubheading}>{section.subtitle}</Text>
                  </View>
                  <View style={styles.menuGrid}>
                    {section.keys.map((key) => {
                      const menu = homeMenuItemMap.get(key);
                      if (!menu) return null;
                      const Icon = menu.icon;
                      const menuColor = menu.color;
                      return (
                        <TouchableOpacity
                          key={menu.key}
                          style={[styles.gridCard, { backgroundColor: menuColor + '15', borderColor: menuColor + '40' }]}
                          onPress={menu.onPress}
                        >
                          <View style={[styles.gridIconContainer, { backgroundColor: menuColor + '20' }]}>
                            <Icon size={28} color={menuColor} />
                          </View>
                          <Text style={styles.gridCardTitle}>{menu.title}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
          ) : null}

          {/* Latest News Section with Hide/Unhide */}
          {featureSettings.latestNewsSection ? (
          <View style={styles.newsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.newsSectionTitle}>Latest News</Text>
              <TouchableOpacity
                onPress={() => {
                  void updateFeatureSettings({ latestNewsSection: false });
                }}
              >
                <Text style={styles.hideButtonText}>Hide</Text>
              </TouchableOpacity>
            </View>
            {isNewsLoading ? (
              <View style={styles.newsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : latestNews.length > 0 ? (
              <>
                {latestNews.slice(0, 5).map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.newsCard}
                    onPress={() => {
                      router.push({
                        pathname: '/web-viewer',
                        params: { url: post.url },
                      });
                    }}
                  >
                    <View style={styles.newsCardContent}>
                      <Text style={styles.newsCardTitle} numberOfLines={2}>{post.title}</Text>
                      <Text style={styles.newsCardDate}>
                        {new Date(post.published).toLocaleDateString()}
                      </Text>
                    </View>
                    <ChevronRightCircle size={24} color={colors.primary} />
                  </TouchableOpacity>
                ))}
                {latestNews.length > 5 && (
                  <TouchableOpacity style={styles.moreButton} onPress={() => router.push('/(tabs)/(home)/category?menuKey=news&submenuKey=public-health-news')}>
                    <Text style={styles.moreButtonText}>More News</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </View>
          ) : null}


          {/* Job Portal Section */}
          {featureSettings.jobPortalSection ? (
          <View style={styles.newsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.newsSectionTitle}>Job Portal</Text>
              <TouchableOpacity
                onPress={() => {
                  void updateFeatureSettings({ jobPortalSection: false });
                }}
              >
                <Text style={styles.hideButtonText}>Hide</Text>
              </TouchableOpacity>
            </View>
            {isJobsLoading ? (
              <View style={styles.newsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : latestJobs.length > 0 ? (
              <>
                {latestJobs.slice(0, 5).map((job) => {
                  const deadline = formatDeadline(job.applicationDeadline);
                  return (
                    <TouchableOpacity
                      key={job.id}
                      style={styles.newsCard}
                      onPress={() => { router.push('/(tabs)/(home)/job-portal'); }}
                    >
                      <View style={styles.newsCardContent}>
                        <Text style={styles.newsCardTitle} numberOfLines={2}>{job.jobTitle}</Text>
                        <Text style={styles.newsCardDate}>
                          {[job.organization, job.jobType, deadline ? `Deadline: ${deadline}` : null].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <ChevronRightCircle size={24} color="#7C3AED" />
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={styles.moreButton} onPress={() => router.push('/(tabs)/(home)/job-portal')}>
                  <Text style={styles.moreButtonText}>View All Jobs</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
          ) : null}

          {/* New Opportunities Section with Hide/Unhide */}
          {featureSettings.opportunitiesSection ? (
          <View style={styles.newsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.newsSectionTitle}>New Opportunities</Text>
              <TouchableOpacity
                onPress={() => {
                  void updateFeatureSettings({ opportunitiesSection: false });
                }}
              >
                <Text style={styles.hideButtonText}>Hide</Text>
              </TouchableOpacity>
            </View>
            {isOpportunitiesLoading ? (
              <View style={styles.newsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : latestOpportunities.length > 0 ? (
              <>
                {latestOpportunities.slice(0, 5).map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.newsCard}
                    onPress={() => {
                      router.push({
                        pathname: '/web-viewer',
                        params: { url: post.url },
                      });
                    }}
                  >
                    <View style={styles.newsCardContent}>
                      <Text style={styles.newsCardTitle} numberOfLines={2}>{post.title}</Text>
                      <Text style={styles.newsCardDate}>
                        {new Date(post.published).toLocaleDateString()}
                      </Text>
                    </View>
                    <ChevronRightCircle size={24} color={colors.primary} />
                  </TouchableOpacity>
                ))}
                {latestOpportunities.length > 5 && (
                  <TouchableOpacity style={styles.moreButton} onPress={() => router.push('/(tabs)/(home)/jobs?menuKey=opportunities')}>
                    <Text style={styles.moreButtonText}>More Opportunities</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </View>
          ) : null}

          {/* Bottom duplicate of Health Tips / Public Health Days / Quote - keep identical to top */}
          {featureSettings.healthTipsCard ? (
            <TouchableOpacity style={[styles.topCard, styles.highlightCard]} activeOpacity={0.9} onPress={() => { void openTipDetails(); }}>
              <View style={styles.topCardTitleRow}>
                <Lightbulb size={18} color={colors.primary} />
                <Text style={styles.topCardTitle}>{copy.healthTips}</Text>
              </View>
              <Text style={styles.tipText}>{dailyTip?.tip || 'No health tip available today.'}</Text>
              <Text style={styles.tipTapHint}>Tap to view detailed guidance</Text>
            </TouchableOpacity>
          ) : null}

          {featureSettings.publicHealthDaysCard ? (
          <View style={[styles.topCard, styles.publicHealthCard]}>
            {/* Header row */}
            <View style={styles.phdHeader}>
              <View style={styles.topCardTitleRow}>
                <CalendarDays size={18} color={colors.primary} />
                <Text style={styles.topCardTitle}>{copy.publicHealthDays}</Text>
              </View>
              <View style={styles.phdMonthPill}>
                <Text style={styles.phdMonthPillText}>{selectedMonthName}</Text>
              </View>
            </View>

            {/* Today section */}
            <View style={styles.phdSection}>
              <View style={styles.phdTodayBadge}>
                <Text style={styles.phdTodayBadgeText}>{copy.today.toUpperCase()}</Text>
              </View>
              {todayDays.length > 0 ? (
                todayDays.map((item) => (
                  <TouchableOpacity
                    key={`today-${item.month}-${item.day}-${item.title}`}
                    style={styles.phdTodayCard}
                    activeOpacity={0.82}
                    onPress={() => {
                      router.push({
                        pathname: '/public-health-day',
                        params: { month: String(item.month), day: String(item.day), title: item.title, type: item.type },
                      });
                    }}
                  >
                    <View style={styles.phdTodayDot} />
                    <Text style={styles.phdTodayTitle} numberOfLines={2}>{item.title}</Text>
                    {item.type === 'week' && (
                      <View style={styles.phdWeekBadge}>
                        <Text style={styles.phdWeekBadgeText}>Week</Text>
                      </View>
                    )}
                    <ChevronRight size={14} color={colors.primary} />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyTopText}>{copy.noToday}</Text>
              )}
            </View>

            {/* Month list header */}
            <View style={styles.monthListHeaderRow}>
              <Text style={styles.phdMonthListLabel}>
                {`${copy.monthList}`}
                {otherMonthDays.length > 0 ? (
                  <Text style={styles.phdMonthListCount}>{`  ${otherMonthDays.length}`}</Text>
                ) : null}
              </Text>
              <TouchableOpacity
                onPress={() => setIsMonthListExpanded((prev) => !prev)}
                style={styles.showHideButton}
              >
                <Text style={styles.showHideButtonText}>{isMonthListExpanded ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            {/* Month events */}
            {visibleOtherMonthDays.length > 0 ? (
              visibleOtherMonthDays.map((item) => (
                <TouchableOpacity
                  key={`month-${selectedMonthName}-${item.month}-${item.day}-${item.title}`}
                  style={styles.phdEventRow}
                  activeOpacity={0.82}
                  onPress={() => {
                    router.push({
                      pathname: '/public-health-day',
                      params: { month: String(item.month), day: String(item.day), title: item.title, type: item.type },
                    });
                  }}
                >
                  <View style={styles.phdDateBox}>
                    <Text style={styles.phdDateNum}>{item.day}</Text>
                  </View>
                  <Text style={styles.phdEventTitle} numberOfLines={2}>{item.title}</Text>
                  {item.type === 'week' && (
                    <View style={styles.phdWeekBadge}>
                      <Text style={styles.phdWeekBadgeText}>Wk</Text>
                    </View>
                  )}
                  <ChevronRight size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyTopText}>{copy.noMonthDays}</Text>
            )}

            {/* Month navigation */}
            <View style={styles.phdNavRow}>
              <TouchableOpacity
                style={styles.phdNavButton}
                onPress={() => setMonthOffset((prev) => prev - 1)}
              >
                <ChevronLeft size={15} color={colors.text} />
                <Text style={styles.monthNavButtonText}>{copy.previous}</Text>
              </TouchableOpacity>

              {monthOffset !== 0 ? (
                <TouchableOpacity
                  style={styles.phdNavTodayBtn}
                  onPress={() => setMonthOffset(0)}
                >
                  <Text style={styles.phdNavTodayBtnText}>{copy.today}</Text>
                </TouchableOpacity>
              ) : <View style={styles.phdNavSpacer} />}

              <TouchableOpacity
                style={styles.phdNavButton}
                onPress={() => setMonthOffset((prev) => prev + 1)}
              >
                <Text style={styles.monthNavButtonText}>{copy.next}</Text>
                <ChevronRight size={15} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          ) : null}

          {featureSettings.quoteCard ? (
          <View style={[styles.topCard, styles.quoteCard]}>
            <View style={styles.topCardTitleRow}>
              <Sparkles size={18} color={colors.secondary} />
              <Text style={styles.topCardTitle}>{copy.quoteTitle}</Text>
            </View>
            <Text style={styles.quoteText}>&quot;{dailyQuote?.quote || copy.quoteFallback}&quot;</Text>
            <Text style={styles.quoteAuthor}>- {dailyQuote?.author || copy.unknown}</Text>
          </View>
          ) : null}
        </ScrollView>

        {isDrawerOpen ? <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeDrawer} /> : null}
        <Animated.View style={[styles.drawer, { width: drawerWidth, transform: [{ translateX: drawerTranslateX }] }]}> 
          <View style={styles.drawerHeaderCard}> 
            <View style={styles.drawerLogoRow}> 
              <Image source={require('@/assets/images/logo.png')} style={styles.drawerLogo} /> 
              <Text style={styles.drawerAppName}>Public Health Updates</Text> 
            </View> 
          </View> 
          <ScrollView contentContainerStyle={styles.drawerContent}> 
            <Text style={styles.drawerSectionLabel}>Menus</Text> 
            {homeMenuSections.map((section) => (
              <View key={`drawer-section-${section.title}`} style={styles.drawerSectionBlock}>
                <Text style={styles.drawerGroupTitle}>{section.title}</Text>
                {section.keys.map((key) => {
                  const menu = homeMenuItemMap.get(key);
                  if (!menu) return null;
                  const Icon = menu.icon;
                  return (
                    <TouchableOpacity 
                      key={`drawer-${menu.key}`} 
                      style={styles.drawerItem} 
                      onPress={() => { 
                        closeDrawer(); 
                        menu.onPress(); 
                      }} 
                    > 
                      <View style={[styles.drawerIconWrap, { backgroundColor: menu.color + '1A' }]}> 
                        <Icon size={18} color={menu.color} /> 
                      </View> 
                      <View style={styles.drawerItemBody}> 
                        <Text style={styles.drawerItemText}>{menu.title}</Text> 
                        <Text style={styles.drawerItemSubtext}>{menu.description}</Text> 
                      </View> 
                      <ChevronRight size={16} color={colors.textLight} /> 
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))} 
          </ScrollView> 
        </Animated.View> 
      </View>

      <Modal
        visible={isTipDetailVisible}
        animationType="slide"
        transparent
        onRequestClose={closeTipDetails}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Health Tip Details</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeTipDetails}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTip}>{dailyTip?.tip || ''}</Text>

              {isTipDetailsLoading ? (
                <View style={styles.modalLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.modalInfoText}>Generating detailed guidance...</Text>
                </View>
              ) : null}

              {!isTipDetailsLoading && tipDetailsError ? (
                <Text style={styles.modalErrorText}>{tipDetailsError}</Text>
              ) : null}

              {!isTipDetailsLoading && !tipDetailsError && tipDetails ? (
                <>
                  <Text style={styles.modalSectionTitle}>Overview</Text>
                  <Text style={styles.modalInfoText}>{tipDetails.summary}</Text>

                  <Text style={styles.modalSectionTitle}>Why It Matters</Text>
                  <Text style={styles.modalInfoText}>{tipDetails.whyItMatters}</Text>

                  <Text style={styles.modalSectionTitle}>How To Apply Today</Text>
                  {tipDetails.howToApplyToday.map((item, index) => (
                    <Text key={`apply-${index}`} style={styles.modalBullet}>{`• ${item}`}</Text>
                  ))}

                  <Text style={styles.modalSectionTitle}>Common Mistakes</Text>
                  {tipDetails.commonMistakes.map((item, index) => (
                    <Text key={`mistake-${index}`} style={styles.modalBullet}>{`• ${item}`}</Text>
                  ))}

                  <Text style={styles.modalSectionTitle}>Caution</Text>
                  <Text style={styles.modalInfoText}>{tipDetails.caution}</Text>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  drawerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  drawerLogo: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  drawerAppName: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  hideButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 0,
    paddingBottom: 30,
  },
  heroBanner: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 28,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heroLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.95,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  menuButtonLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  moreButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  moreButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  newsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  newsSectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  newsLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  newsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  newsCardContent: {
    flex: 1,
    gap: 4,
  },
  newsCardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  newsCardDate: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  topCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  highlightCard: {
    borderColor: colors.primary + '66',
    backgroundColor: colors.primary + '0F',
  },
  quoteCard: {
    borderColor: colors.secondary + '55',
    backgroundColor: colors.secondary + '0D',
  },
  publicHealthCard: {
    borderColor: colors.primaryDark + '55',
    backgroundColor: colors.primaryDark + '0D',
  },
  topCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  topCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  tipText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  tipTapHint: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  quoteText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  publicHealthToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayHeading: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  monthListHeaderRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  showHideButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  showHideButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  topListItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 2,
  },
  topListTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTopText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  monthListToggle: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  monthListArrowWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  monthNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  monthNavButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  // Public Health Days redesign
  phdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phdMonthPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primary + '1A',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  phdMonthPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  phdSection: {
    gap: 6,
    marginTop: 2,
  },
  phdTodayBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: colors.primary,
  },
  phdTodayBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  phdTodayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '12',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.primary + '35',
  },
  phdTodayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  phdTodayTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  phdWeekBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.primaryDark + '25',
  },
  phdWeekBadgeText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '700',
  },
  phdMonthListLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  phdMonthListCount: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  phdEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  phdDateBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  phdDateNum: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  phdEventTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  phdNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  phdNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  phdNavTodayBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + '18',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  phdNavTodayBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  phdNavSpacer: {
    flex: 1,
  },
  menuGridSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  sectionSeparator: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionList: {
    gap: 14,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionLabelBlock: {
    gap: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
    borderRadius: 2,
  },
  sectionHeading: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubheading: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  gridIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  drawerBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#00000044',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: 48,
    paddingHorizontal: 14,
  },
  drawerHeaderCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  drawerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  drawerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  drawerContent: {
    gap: 8,
    paddingBottom: 20,
  },
  drawerSectionLabel: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  drawerSectionBlock: {
    gap: 8,
    marginBottom: 6,
  },
  drawerGroupTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 2,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.background,
  },
  drawerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemBody: {
    flex: 1,
    gap: 1,
  },
  drawerItemText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  drawerItemSubtext: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
  },
  modalCloseText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  modalContent: {
    padding: 14,
    gap: 8,
    paddingBottom: 24,
  },
  modalTip: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  modalSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  modalInfoText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  modalBullet: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  modalLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  modalErrorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
}));