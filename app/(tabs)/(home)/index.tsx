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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookMarked, BookOpen, Briefcase, Building2, Calculator, CalendarDays, ChevronLeft, ChevronRight, Facebook, FileText, Globe, GraduationCap, ImageIcon, Lightbulb, Menu, Newspaper, ScanLine, ScrollText, Settings, Sparkles, ChevronRightCircle, NotebookPen, Youtube } from 'lucide-react-native';
import adbs from 'ad-bs-converter';
import { DASHBOARD_MENUS, DashboardMenuKey, getMenuThemeColor } from '@/constants/blogMenus';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, gradients, radii, spacing, glow } from '@/constants/theme';
import { AnimatedEntrance, GradientHero, PressableScale, SectionHeader } from '@/components/ui';
import { ALL_HEALTH_TIPS } from '@/mocks/healthTips';
import { PUBLIC_HEALTH_DAYS } from '@/constants/publicHealthDays';
import { PUBLIC_HEALTH_QUOTES } from '@/constants/publicHealthQuotes';
import { useSettings } from '@/contexts/SettingsContext';
import { getHealthTipDetails, HealthTipDetails } from '@/services/healthTipInfo';
import { fetchPostsByLabels, BlogPost } from '@/services/bloggerApi';

const MONTH_LOCALE_MAP = {
  en: 'en-US',
  es: 'es-ES',
  ne: 'ne-NP',
} as const;

const HOME_COPY = {
  en: {
    title: 'Public Health Updates',
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
    title: 'Public Health Updates',
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
    title: 'Public Health Updates',
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
  const [dateMode, setDateMode] = useState<'ad' | 'bs'>('ad');
  const [isMonthListExpanded, setIsMonthListExpanded] = useState(false);
  const [isTipDetailVisible, setIsTipDetailVisible] = useState(false);
  const [tipDetails, setTipDetails] = useState<HealthTipDetails | null>(null);
  const [isTipDetailsLoading, setIsTipDetailsLoading] = useState(false);
  const [tipDetailsError, setTipDetailsError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [latestNews, setLatestNews] = useState<BlogPost[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);

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
    loadLatestNews();
  }, []);

  const drawerWidth = Math.min(320, Dimensions.get('window').width * 0.82);
  const drawerTranslateX = React.useRef(new Animated.Value(-drawerWidth)).current;
  const drawerBackdropOpacity = React.useRef(new Animated.Value(0)).current;

  const openDrawer = React.useCallback(() => {
    setIsDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 16,
      }),
      Animated.timing(drawerBackdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerTranslateX, drawerBackdropOpacity]);

  const closeDrawer = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: -drawerWidth,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(drawerBackdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsDrawerOpen(false);
      }
    });
  }, [drawerTranslateX, drawerBackdropOpacity, drawerWidth]);

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

  const { dailyTip, dailyQuote, todayDays, selectedMonthDays, selectedMonthName, featuredDay, featuredIsToday, featuredDaysLeft, todayAdLabel, todayBsLabel } = useMemo(() => {
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

    // Featured day for the hero banner: today's day if any, otherwise the next
    // upcoming awareness day in the current month (falling back to the earliest).
    let featured = byToday[0] ?? null;
    const featuredToday = !!featured;
    if (!featured) {
      const sorted = [...byCurrentMonth].sort((a, b) => a.day - b.day);
      featured = sorted.find((item) => item.day >= day) ?? sorted[0] ?? null;
    }

    let daysLeft = 0;
    if (featured && !featuredToday) {
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let target = new Date(now.getFullYear(), featured.month - 1, featured.day);
      if (target < todayMidnight) {
        target = new Date(now.getFullYear() + 1, featured.month - 1, featured.day);
      }
      daysLeft = Math.round((target.getTime() - todayMidnight.getTime()) / 86400000);
    }

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const adLabel = now.toLocaleDateString(MONTH_LOCALE_MAP[language], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    let bsLabel = '';
    try {
      const bsResult = adbs.ad2bs(`${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}`);
      bsLabel = `${bsResult.en.strShortMonth} ${bsResult.en.day}, ${bsResult.en.year} BS`;
    } catch {
      bsLabel = '';
    }

    return {
      dailyTip: selectedTip,
      dailyQuote: selectedQuote,
      todayDays: byToday,
      selectedMonthDays: bySelectedMonth,
      selectedMonthName: selectedMonthLabel,
      featuredDay: featured,
      featuredIsToday: featuredToday,
      featuredDaysLeft: daysLeft,
      todayAdLabel: adLabel,
      todayBsLabel: bsLabel,
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

  const openDayLookup = React.useCallback((item: { month: number; day: number; title: string; type: string }) => {
    router.push({
      pathname: '/public-health-day',
      params: {
        month: String(item.month),
        day: String(item.day),
        title: item.title,
        type: item.type,
      },
    });
  }, [router]);

  const openDashboardMenuByKey = React.useCallback((menuKey: DashboardMenuKey) => {
    if (menuKey === 'exam-preparation') {
      router.push('/(tabs)/(home)/exam-preparation');
      return;
    }

    const menu = DASHBOARD_MENUS.find((item) => item.key === menuKey);
    const defaultSubmenu = menu?.submenus?.[0];
    if (!defaultSubmenu) return;

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
      key: 'research-grants',
      title: 'Research Grants',
      description: 'Research grants, scholarships, fellowships, and workshops.',
      color: '#0D9488',
      icon: GraduationCap,
      onPress: () => { router.push('/(tabs)/(home)/research-grants'); },
    },
    {
      key: 'ngos',
      title: 'NGOs',
      description: 'Browse NGOs and open jobs at each organization.',
      color: '#0891B2',
      icon: Building2,
      onPress: () => { router.push('/(tabs)/(home)/ngos'); },
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
      keys: ['job-portal', 'research-grants', 'news', 'nagarik-awaz'],
    },
    {
      title: 'Learning & Resources',
      subtitle: 'Knowledge, references, and reading material.',
      keys: ['knowledge-hub', 'articles', 'books', 'factsheet', 'research-tools', 'literatures', 'exam-preparation'],
    },
    {
      title: 'Organizations in Nepal',
      subtitle: 'NGOs and their open opportunities.',
      keys: ['ngos'],
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
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Animated Gradient Hero */}
          <GradientHero rounded style={styles.hero}>
            <SafeAreaView edges={['top']} style={styles.heroSafe}>
              <View style={styles.heroTopRow}>
                <PressableScale style={styles.heroIconBtn} onPress={openDrawer} haptic accessibilityLabel="Open menu">
                  <Menu size={20} color="#FFFFFF" />
                </PressableScale>
                <PressableScale
                  style={styles.heroDateTogglePill}
                  onPress={() => setDateMode((prev) => (prev === 'ad' ? 'bs' : 'ad'))}
                  haptic
                  accessibilityLabel="Toggle between English and Bikram Sambat date"
                >
                  <CalendarDays size={13} color="#FFFFFF" />
                  <Text style={styles.heroDateTogglePillText}>
                    {dateMode === 'bs' && todayBsLabel ? todayBsLabel : todayAdLabel}
                  </Text>
                </PressableScale>
                <PressableScale style={styles.heroIconBtn} onPress={() => router.push('/settings')} haptic accessibilityLabel="Open settings">
                  <Settings size={20} color="#FFFFFF" />
                </PressableScale>
              </View>

              <AnimatedEntrance from="up" style={styles.heroCenter}>
                <View style={styles.logoRing}>
                  <View style={styles.logoRingInner}>
                    <Image source={require('@/assets/images/logo.png')} style={styles.heroLogo} />
                  </View>
                </View>
                <Text style={styles.heroTitle}>{copy.title}</Text>
                <Text style={styles.heroSubtitle}>{copy.subtitle}</Text>
              </AnimatedEntrance>

              {/* Quote + Public Health Day highlights inside the banner */}
              <AnimatedEntrance from="up" delay={90} style={styles.heroHighlights}>
                {featuredDay ? (
                  <PressableScale
                    style={[styles.heroDayCard, featuredIsToday ? styles.heroDayCardToday : styles.heroDayCardUpcoming]}
                    onPress={() => openDayLookup(featuredDay)}
                    haptic
                  >
                    <View style={[styles.heroDayIcon, featuredIsToday ? styles.heroDayIconToday : styles.heroDayIconUpcoming]}>
                      <CalendarDays size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.heroDayBody}>
                      <View style={styles.heroDayBadgeRow}>
                        <Text style={styles.heroDayBadge}>{featuredIsToday ? "TODAY'S HEALTH DAY" : 'UPCOMING HEALTH DAY'}</Text>
                        <View style={styles.heroDayCountdownPill}>
                          <Text style={styles.heroDayCountdownPillText}>
                            {featuredIsToday ? 'Today' : featuredDaysLeft === 1 ? '1 day left' : `${featuredDaysLeft} days left`}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.heroDayTitle} numberOfLines={2}>{featuredDay.title}</Text>
                    </View>
                    <ChevronRight size={18} color="#FFFFFFCC" />
                  </PressableScale>
                ) : null}

                <View style={styles.heroQuoteCard}>
                  <View style={styles.heroQuoteIcon}>
                    <Sparkles size={15} color="#FFFFFF" />
                  </View>
                  <View style={styles.heroQuoteBody}>
                    <Text style={styles.heroQuoteText}>&quot;{dailyQuote?.quote || copy.quoteFallback}&quot;</Text>
                    <Text style={styles.heroQuoteAuthor}>— {dailyQuote?.author || copy.unknown}</Text>
                  </View>
                </View>
              </AnimatedEntrance>
            </SafeAreaView>
          </GradientHero>

          {/* Menu Grid Sections */}
          {featureSettings.menuGridSection ? (
          <View style={styles.menuGridSection}>
            <View style={styles.sectionList}>
              {homeMenuSections.map((section, sectionIndex) => (
                <View key={section.title} style={styles.sectionBlock}>
                  <SectionHeader title={section.title} subtitle={section.subtitle} />
                  <View style={styles.menuGrid}>
                    {section.keys.map((key, i) => {
                      const menu = homeMenuItemMap.get(key);
                      if (!menu) return null;
                      const Icon = menu.icon;
                      const menuColor = menu.color;
                      return (
                        <AnimatedEntrance key={menu.key} index={i} delay={sectionIndex * 40} from="up" style={styles.gridCardWrap}>
                          <PressableScale style={[styles.gridCard, { borderColor: menuColor + '33' }]} onPress={menu.onPress} haptic>
                            <LinearGradient
                              colors={[menuColor + '14', menuColor + '05']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.gridCardBg}
                            />
                            <LinearGradient
                              colors={[menuColor, menuColor + 'CC']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={[styles.gridIconContainer, glow(menuColor, 0.3)]}
                            >
                              <Icon size={26} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={styles.gridCardTitle} numberOfLines={2}>{menu.title}</Text>
                          </PressableScale>
                        </AnimatedEntrance>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
          ) : null}

          {/* Latest News Section */}
          {featureSettings.latestNewsSection ? (
          <View style={styles.newsSection}>
            <SectionHeader
              title="Latest News"
              accent={colors.primary}
              right={(
                <TouchableOpacity onPress={() => { void updateFeatureSettings({ latestNewsSection: false }); }}>
                  <Text style={styles.hideButtonText}>Hide</Text>
                </TouchableOpacity>
              )}
            />
            {isNewsLoading ? (
              <View style={styles.newsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : latestNews.length > 0 ? (
              <>
                {latestNews.slice(0, 5).map((post, i) => (
                  <AnimatedEntrance key={post.id} index={i} from="up">
                    <PressableScale
                      style={styles.newsCard}
                      onPress={() => { router.push({ pathname: '/web-viewer', params: { url: post.url } }); }}
                    >
                      <View style={[styles.newsAccentRail, { backgroundColor: colors.primary }]} />
                      <View style={styles.newsCardContent}>
                        <Text style={styles.newsCardTitle} numberOfLines={2}>{post.title}</Text>
                        <Text style={styles.newsCardDate}>{new Date(post.published).toLocaleDateString()}</Text>
                      </View>
                      <ChevronRightCircle size={22} color={colors.primary} />
                    </PressableScale>
                  </AnimatedEntrance>
                ))}
                {latestNews.length > 5 && (
                  <PressableScale style={styles.moreButton} onPress={() => router.push('/(tabs)/(home)/category?menuKey=news&submenuKey=public-health-news')}>
                    <Text style={styles.moreButtonText}>More News</Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </PressableScale>
                )}
              </>
            ) : null}
          </View>
          ) : null}


          {/* Health Tips */}
          {featureSettings.healthTipsCard ? (
            <AnimatedEntrance from="up" style={styles.cardOuter}>
              <PressableScale style={[styles.topCard, styles.highlightCard]} onPress={() => { void openTipDetails(); }}>
                <View style={styles.topCardTitleRow}>
                  <View style={[styles.cardIconChip, { backgroundColor: colors.primary + '1F' }]}>
                    <Lightbulb size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.topCardTitle}>{copy.healthTips}</Text>
                </View>
                <Text style={styles.tipText}>{dailyTip?.tip || 'No health tip available today.'}</Text>
                <View style={styles.tipHintRow}>
                  <Text style={styles.tipTapHint}>Tap to view detailed guidance</Text>
                  <ChevronRight size={14} color={colors.primaryDark} />
                </View>
              </PressableScale>
            </AnimatedEntrance>
          ) : null}

          {featureSettings.publicHealthDaysCard ? (
          <AnimatedEntrance from="up" style={styles.cardOuter}>
          <View style={[styles.topCard, styles.publicHealthCard]}>
            {/* Header row */}
            <View style={styles.phdHeader}>
              <View style={styles.topCardTitleRow}>
                <View style={[styles.cardIconChip, { backgroundColor: colors.primaryDark + '1F' }]}>
                  <CalendarDays size={16} color={colors.primaryDark} />
                </View>
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
                  <PressableScale
                    key={`today-${item.month}-${item.day}-${item.title}`}
                    style={styles.phdTodayCard}
                    onPress={() => openDayLookup(item)}
                  >
                    <View style={styles.phdTodayDot} />
                    <Text style={styles.phdTodayTitle} numberOfLines={2}>{item.title}</Text>
                    {item.type === 'week' && (
                      <View style={styles.phdWeekBadge}>
                        <Text style={styles.phdWeekBadgeText}>Week</Text>
                      </View>
                    )}
                    <ChevronRight size={14} color={colors.primary} />
                  </PressableScale>
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
                <PressableScale
                  key={`month-${selectedMonthName}-${item.month}-${item.day}-${item.title}`}
                  style={styles.phdEventRow}
                  activeScale={0.98}
                  onPress={() => openDayLookup(item)}
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
                </PressableScale>
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
          </AnimatedEntrance>
          ) : null}

        </ScrollView>

        {isDrawerOpen ? (
          <Animated.View style={[styles.drawerBackdrop, { opacity: drawerBackdropOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.drawer, { width: drawerWidth, transform: [{ translateX: drawerTranslateX }] }]}>
          <GradientHero rounded={false} particles={false} style={styles.drawerHeaderCard}>
            <SafeAreaView edges={['top']} style={styles.drawerLogoRow}>
              <View style={styles.drawerLogoRing}>
                <Image source={require('@/assets/images/logo.png')} style={styles.drawerLogo} />
              </View>
              <Text style={styles.drawerAppName}>Public Health Updates</Text>
            </SafeAreaView>
          </GradientHero>
          <ScrollView contentContainerStyle={styles.drawerContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.drawerSectionLabel}>Menus</Text>
            {homeMenuSections.map((section) => (
              <View key={`drawer-section-${section.title}`} style={styles.drawerSectionBlock}>
                <Text style={styles.drawerGroupTitle}>{section.title}</Text>
                {section.keys.map((key) => {
                  const menu = homeMenuItemMap.get(key);
                  if (!menu) return null;
                  const Icon = menu.icon;
                  return (
                    <PressableScale
                      key={`drawer-${menu.key}`}
                      style={styles.drawerItem}
                      activeScale={0.98}
                      onPress={() => { closeDrawer(); menu.onPress(); }}
                    >
                      <View style={[styles.drawerIconWrap, { backgroundColor: menu.color + '1A' }]}>
                        <Icon size={18} color={menu.color} />
                      </View>
                      <View style={styles.drawerItemBody}>
                        <Text style={styles.drawerItemText}>{menu.title}</Text>
                        <Text style={styles.drawerItemSubtext} numberOfLines={1}>{menu.description}</Text>
                      </View>
                      <ChevronRight size={16} color={colors.textLight} />
                    </PressableScale>
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
            <View style={styles.modalGrabber} />
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
    paddingBottom: 40,
  },
  // Hero -------------------------------------------------------------------
  hero: {
    paddingBottom: spacing.xxl,
  },
  heroSafe: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heroIconBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF22',
    borderWidth: 1,
    borderColor: '#FFFFFF33',
  },
  heroCenter: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF22',
    borderWidth: 1,
    borderColor: '#FFFFFF3D',
    marginBottom: spacing.md,
  },
  logoRingInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heroLogo: {
    width: 66,
    height: 66,
    resizeMode: 'contain',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  heroDateTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E3A8A',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...elevation('sm'),
  },
  heroDateTogglePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.92,
    lineHeight: 19,
    paddingHorizontal: spacing.lg,
  },
  heroHighlights: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  heroDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...elevation('sm'),
  },
  heroDayCardUpcoming: {
    backgroundColor: '#C2410C66',
    borderColor: '#C2410C99',
  },
  heroDayCardToday: {
    backgroundColor: '#1E3A8A66',
    borderColor: '#1E3A8A99',
  },
  heroDayIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDayIconUpcoming: {
    backgroundColor: '#C2410C80',
  },
  heroDayIconToday: {
    backgroundColor: '#1E3A8A80',
  },
  heroDayBody: {
    flex: 1,
    gap: 2,
  },
  heroDayBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroDayCountdownPill: {
    backgroundColor: colors.warning,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  heroDayCountdownPillText: {
    color: '#1F2937',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroDayBadge: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroDayTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroQuoteCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#0B382F66',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...elevation('sm'),
  },
  heroQuoteIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000040',
    marginTop: 2,
  },
  heroQuoteBody: {
    flex: 1,
    gap: 3,
  },
  heroQuoteText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroQuoteAuthor: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Section shared ---------------------------------------------------------
  hideButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginTop: 4,
    ...elevation('sm'),
  },
  moreButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  newsSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  newsLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  newsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: 'hidden',
    ...elevation('sm'),
  },
  newsAccentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
  },
  newsCardContent: {
    flex: 1,
    gap: 4,
    paddingLeft: 4,
  },
  newsCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  newsCardDate: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  // Top cards --------------------------------------------------------------
  cardOuter: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  topCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 16,
    gap: spacing.sm,
    overflow: 'hidden',
    ...elevation('md'),
  },
  cardIconChip: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightCard: {
    borderColor: colors.primary + '55',
    backgroundColor: colors.primary + '0D',
  },
  quoteCard: {
    borderColor: colors.secondary + '4D',
  },
  quoteBg: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const),
  },
  publicHealthCard: {
    borderColor: colors.primaryDark + '4D',
    backgroundColor: colors.primaryDark + '0A',
  },
  topCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  tipText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  tipHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tipTapHint: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  quoteText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  monthListHeaderRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  showHideButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  showHideButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyTopText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Public Health Days -----------------------------------------------------
  phdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phdMonthPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.primary + '1A',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  phdMonthPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  phdSection: {
    gap: 6,
    marginTop: 2,
  },
  phdTodayBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: colors.primary,
  },
  phdTodayBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  phdTodayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '12',
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
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
    fontWeight: '700',
    lineHeight: 18,
  },
  phdWeekBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: colors.primaryDark + '25',
  },
  phdWeekBadgeText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
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
    gap: spacing.md,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  phdDateBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
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
    marginTop: 8,
    gap: spacing.sm,
  },
  phdNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  monthNavButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  phdNavTodayBtn: {
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.primary + '18',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  phdNavTodayBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  phdNavSpacer: {
    flex: 1,
  },
  // Menu grid --------------------------------------------------------------
  menuGridSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  sectionList: {
    gap: spacing.xl,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  gridCardWrap: {
    width: '48%',
  },
  gridCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...elevation('md'),
  },
  gridCardBg: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const),
  },
  gridIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Drawer -----------------------------------------------------------------
  drawerBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#00000066',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    ...elevation('xl'),
  },
  drawerHeaderCard: {
    paddingBottom: spacing.lg,
  },
  drawerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  drawerLogoRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  drawerLogo: {
    width: 38,
    height: 38,
    resizeMode: 'contain',
  },
  drawerAppName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
    flex: 1,
  },
  drawerContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  drawerSectionLabel: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  drawerSectionBlock: {
    gap: spacing.sm,
    marginBottom: 6,
  },
  drawerGroupTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.background,
  },
  drawerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
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
    fontWeight: '700',
  },
  drawerItemSubtext: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  // Modal ------------------------------------------------------------------
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000077',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '82%',
    ...elevation('xl'),
  },
  modalGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 10,
    marginBottom: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  modalCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
  },
  modalCloseText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  modalContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  modalTip: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  modalSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  modalInfoText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  modalBullet: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  modalLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  modalErrorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
}));
