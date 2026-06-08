import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { createThemedStyles } from '@/constants/colors';

const PUBLICATIONS = [
  'Adhikari, B., Poudel, L., Thapa, T. B., Neupane, D., Maharjan, P., Hagaman, A., ... & Shrestha, A. (2022). Prevalence and factors associated with depression, anxiety, and stress symptoms among home isolated COVID-19 patients in Western Nepal. Dialogues in Health, 100090.',
  'Shrestha, A., Shrestha, P., Shrestha, T., Shrestha, R. M., Sujakhu, D., Dhakal, K. & Adhikari, B. 2022. Awareness and Knowledge of Glaucoma and their Associated Factors among People Visiting a Tertiary Level Hospital in Central Nepal. Kathmandu Univ Med J, 77(1), 56-60.',
  'Tandon, K., Adhikari, N., Adhikari, B., & Pradhan, P. M. S. Co-occurrence of non-communicable disease risk factors and its determinants among school-going adolescents of Kathmandu Metropolitan City. 2022. PloS one, 17(8), e0272266.',
  'Rajbhandari B, Adhikari B, et al. The Impact of Basic Police Training and Scale Diet on Body Composition and Aerobic Performance of Nepal Police Officers Trainees. J Nepal Health Res Counc. 2022 March.19(53):830-7.',
  'Adhikari B., Ghimire A, Jha N, Karkee R, Shrestha A, Dhakal R, et al. Factors associated with low back pain among construction workers in Nepal: A cross-sectional study. PloS One. 2021;16(6):e0252564.',
  'Ansari, Z., Chaurasiya, B. D., Adhikari, S., Prakash, U. C., Adhikari, B., & Khatoon, S. 2020. Knowledge, attitude and practice among Ophthalmic Health Care Personnel (HCP) towards COVID-19 pandemic in Nepal: A web-based cross-sectional study. medRxiv.',
  'Alexander T Yu, Shakya R, Adhikari B, Tamrakar D, et al. A Cluster-based, Spatial-sampling Method for Assessing Household Healthcare Utilization Patterns in Resource-limited Settings, Clinical Infectious Diseases, Volume 71, Issue Supplement_3, 1 November 2020, Pages S239-S247.',
  'Bhujel S, Khadka R, Baskota S, Poudel L, Bista S, Gurung M, Neupane T, Adhikari B. Knowledge and Practice of Complementary Feeding among the Mothers of the Child Aged Group 6-24 Months, Tanahu District, Nepal. J Nepal Health Res Counc. 2021 Apr 23;19(1):127-34.',
  'Risal P, Adhikari B, Shrestha R, Manandhar S, Bhatt RD, Hada M. Analysis of Factors Associated with Thyroid Dysfunction: A Hospital-Based Study. Kathmandu Univ Med J (KUMJ). 2019 Apr-Jun;17(66):88-92. PMID: 32632053.',
];

const COMPUTER_SKILLS = [
  'Office Package: Microsoft Word, Excel, PowerPoint, Publisher.',
  'Statistical Analysis: R-programming, STATA, SPSS.',
  'Data Collection Tools: Kobotoolbox, Open Data Kit (ODK), Epidata Manager.',
  'Reference Management Tools: Zotero, Mendeley, Endnote.',
  'Spatial Analysis: QGIS and ArcGIS.',
  'Qualitative Analysis: Qualcoder, RQDA in R program, ATLAS.ti, NVIVO.',
];

const HOBBIES = [
  'Trekking',
  'Animation',
  'Writing stories and poems',
  'Badminton',
  'Taekwondo',
  'Photography',
  'Cinematography',
];

async function openExternal(url: string) {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.log('[AboutUs] Failed to open URL:', error);
  }
}

export default function AboutUsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={styles.title}>Public Health Nepal Updates (phnupdates)</Text>
          <Text style={styles.body}>
            Public health Nepal Updates (phnupdates) is a blog site to support and help all the public health professionals.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bikram Adhikari</Text>
          <Text style={styles.body}>
            Hi, Hello and Namastey, I am a highly motivated and enthusiastic public health professional with a more specific interest in utilizing research data for decision-making and the betterment of humanity. In addition, I like to support people in need. I am ready to help if you have any problem related to public health research upon my ability. My interests include Public Health, Data analysis, Photography, Videography, Trekking, Badminton, Music, Story and Poems writing.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Publications</Text>
          {PUBLICATIONS.map((item, index) => (
            <Text key={`pub-${index}`} style={styles.bullet}>{`- ${item}`}</Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Computer Skills</Text>
          {COMPUTER_SKILLS.map((item, index) => (
            <Text key={`skill-${index}`} style={styles.bullet}>{`- ${item}`}</Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hobbies and Interests</Text>
          <Text style={styles.body}>{HOBBIES.join(', ')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.body}>
            Please do not hesitate to share your problems related to public health research and data analysis. We are happy to help you and support you.
          </Text>

          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.body}>Viber and WhatsApp: +977-9849746375</Text>

          <TouchableOpacity onPress={() => { void openExternal('https://www.facebook.com/groups/422941674943950'); }}>
            <Text style={styles.link}>Facebook group: https://www.facebook.com/groups/422941674943950</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { void openExternal('https://www.facebook.com/phnupdates'); }}>
            <Text style={styles.link}>Facebook page: https://www.facebook.com/phnupdates</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { void openExternal('https://phnupdates.blogspot.com'); }}>
            <Text style={styles.link}>Blogger site: phnupdates.blogspot.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  logoImage: {
    width: '100%',
    height: 150,
    alignSelf: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  bullet: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
}));