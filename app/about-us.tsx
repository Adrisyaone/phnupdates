import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BookOpen, Facebook, Globe, Mail, Phone, ChevronDown, ChevronUp, GraduationCap, Monitor, Heart } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero, PressableScale } from '@/components/ui';

const PUBLICATIONS = [
  'Adhikari, B., Poudel, L., Thapa, T. B., Neupane, D., Maharjan, P., Hagaman, A., ... & Shrestha, A. (2022). Prevalence and factors associated with depression, anxiety, and stress symptoms among home isolated COVID-19 patients in Western Nepal. Dialogues in Health, 100090.',
  'Shrestha, A., Shrestha, P., Shrestha, T., Shrestha, R. M., Sujakhu, D., Dhakal, K. & Adhikari, B. 2022. Awareness and Knowledge of Glaucoma and their Associated Factors among People Visiting a Tertiary Level Hospital in Central Nepal. Kathmandu Univ Med J, 77(1), 56-60.',
  'Tandon, K., Adhikari, N., Adhikari, B., & Pradhan, P. M. S. Co-occurrence of non-communicable disease risk factors and its determinants among school-going adolescents of Kathmandu Metropolitan City. 2022. PloS one, 17(8), e0272266.',
  'Rajbhandari B, Adhikari B, et al. The Impact of Basic Police Training and Scale Diet on Body Composition and Aerobic Performance of Nepal Police Officers Trainees. J Nepal Health Res Counc. 2022 March.19(53):830-7.',
  'Adhikari B., Ghimire A, Jha N, Karkee R, Shrestha A, Dhakal R, et al. Factors associated with low back pain among construction workers in Nepal. PloS One. 2021;16(6):e0252564.',
  'Ansari, Z., Chaurasiya, B. D., Adhikari, S., Prakash, U. C., Adhikari, B., & Khatoon, S. 2020. Knowledge, attitude and practice among Ophthalmic HCP towards COVID-19 in Nepal. medRxiv.',
  'Alexander T Yu, Shakya R, Adhikari B, et al. A Cluster-based, Spatial-sampling Method for Assessing Household Healthcare Utilization Patterns. Clinical Infectious Diseases, 2020.',
  'Bhujel S, Khadka R, ..., Adhikari B. Knowledge and Practice of Complementary Feeding among Mothers of Children Aged 6-24 Months. J Nepal Health Res Counc. 2021.',
  'Risal P, Adhikari B, et al. Analysis of Factors Associated with Thyroid Dysfunction: A Hospital-Based Study. Kathmandu Univ Med J. 2019.',
];

const COMPUTER_SKILLS = [
  { label: 'Office Suite', detail: 'Word, Excel, PowerPoint, Publisher' },
  { label: 'Statistics', detail: 'R, STATA, SPSS' },
  { label: 'Data Collection', detail: 'KoBoToolbox, ODK, EpiData' },
  { label: 'Reference Mgmt', detail: 'Zotero, Mendeley, Endnote' },
  { label: 'Spatial Analysis', detail: 'QGIS, ArcGIS' },
  { label: 'Qualitative', detail: 'Qualcoder, ATLAS.ti, NVIVO' },
];

const HOBBIES = ['Trekking', 'Animation', 'Writing', 'Badminton', 'Taekwondo', 'Photography', 'Cinematography'];

const SOCIAL_LINKS = [
  { label: 'Facebook Group', icon: Facebook, url: 'https://www.facebook.com/groups/422941674943950', color: '#1877F2' },
  { label: 'Facebook Page', icon: Facebook, url: 'https://www.facebook.com/phnupdates', color: '#1877F2' },
  { label: 'Blog Site', icon: Globe, url: 'https://phnupdates.blogspot.com', color: '#F97316' },
];

export default function AboutUsScreen() {
  const router = useRouter();
  const [pubExpanded, setPubExpanded] = useState(false);

  const openInApp = (url: string, title: string) => {
    router.push({ pathname: '/web-viewer', params: { url, title } });
  };
  const visiblePubs = pubExpanded ? PUBLICATIONS : PUBLICATIONS.slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <GradientHero rounded style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.logoRing}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
            <Text style={styles.heroTitle}>Public Health Nepal Updates</Text>
            <Text style={styles.heroHandle}>phnupdates.com</Text>
            <Text style={styles.heroBody}>
              A blog platform dedicated to supporting public health professionals, students, and researchers across Nepal and beyond.
            </Text>
          </View>
        </GradientHero>

        <View style={styles.cardsWrap}>
        {/* About Author */}
        <AnimatedEntrance index={0} from="up"><View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <GraduationCap size={16} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Bikram Adhikari</Text>
          </View>
          <Text style={styles.body}>
            A highly motivated public health professional with a strong interest in utilizing research data for decision-making and the betterment of humanity. His areas of expertise include public health research, data analysis, photography, and creative writing.
          </Text>
          <Text style={styles.helpNote}>
            Available to help with public health research, data analysis, and related queries.
          </Text>
        </View></AnimatedEntrance>

        {/* Publications */}
        <AnimatedEntrance index={1} from="up"><View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <BookOpen size={16} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Publications</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{PUBLICATIONS.length}</Text>
            </View>
          </View>
          {visiblePubs.map((item, index) => (
            <View key={`pub-${index}`} style={styles.pubRow}>
              <View style={styles.pubNumBadge}>
                <Text style={styles.pubNumText}>{index + 1}</Text>
              </View>
              <Text style={styles.pubText}>{item}</Text>
            </View>
          ))}
          <PressableScale style={styles.expandBtn} onPress={() => setPubExpanded((v) => !v)}>
            {pubExpanded ? <ChevronUp size={14} color={colors.primary} /> : <ChevronDown size={14} color={colors.primary} />}
            <Text style={styles.expandBtnText}>{pubExpanded ? 'Show Less' : `Show ${PUBLICATIONS.length - 3} More`}</Text>
          </PressableScale>
        </View></AnimatedEntrance>

        {/* Computer Skills */}
        <AnimatedEntrance index={2} from="up"><View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Monitor size={16} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Computer Skills</Text>
          </View>
          <View style={styles.skillsGrid}>
            {COMPUTER_SKILLS.map((skill, index) => (
              <View key={`skill-${index}`} style={styles.skillChip}>
                <Text style={styles.skillLabel}>{skill.label}</Text>
                <Text style={styles.skillDetail}>{skill.detail}</Text>
              </View>
            ))}
          </View>
        </View></AnimatedEntrance>

        {/* Hobbies */}
        <AnimatedEntrance index={3} from="up"><View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Heart size={16} color={colors.error} />
            </View>
            <Text style={styles.cardTitle}>Hobbies & Interests</Text>
          </View>
          <View style={styles.hobbiesRow}>
            {HOBBIES.map((h, i) => (
              <View key={`hobby-${i}`} style={styles.hobbyPill}>
                <Text style={styles.hobbyText}>{h}</Text>
              </View>
            ))}
          </View>
        </View></AnimatedEntrance>

        {/* Contact */}
        <AnimatedEntrance index={4} from="up"><View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Mail size={16} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Contact & Links</Text>
          </View>

          <View style={styles.contactRow}>
            <Phone size={14} color={colors.textSecondary} />
            <Text style={styles.contactText}>Viber / WhatsApp: +977-9849746375</Text>
          </View>

          {SOCIAL_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <PressableScale
                key={link.url}
                style={styles.linkRow}
                onPress={() => openInApp(link.url, link.label)}
                haptic
              >
                <View style={[styles.linkIcon, { backgroundColor: link.color + '18' }]}>
                  <Icon size={15} color={link.color} />
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
                <View style={styles.linkArrow}>
                  <Text style={styles.linkArrowText}>↗</Text>
                </View>
              </PressableScale>
            );
          })}
        </View></AnimatedEntrance>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  cardsWrap: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Hero
  hero: {
    paddingBottom: spacing.xl,
  },
  heroInner: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: 6,
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFFEE',
    marginBottom: spacing.sm,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroHandle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.95,
  },
  heroBody: {
    color: '#FFFFFFE6',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
  },

  // Card base
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 16,
    gap: 10,
    ...elevation('sm'),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.primary + '18',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  helpNote: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  // Publications
  pubRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pubNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  pubNumText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  pubText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginTop: 2,
  },
  expandBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  // Skills grid
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '47%',
    gap: 2,
  },
  skillLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  skillDetail: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },

  // Hobbies
  hobbiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hobbyPill: {
    backgroundColor: colors.secondary + '14',
    borderWidth: 1,
    borderColor: colors.secondary + '35',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  hobbyText: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Contact
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  contactText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  linkArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkArrowText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
}));
