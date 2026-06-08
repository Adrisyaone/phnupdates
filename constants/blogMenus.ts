export type DashboardMenuKey =
  | 'opportunities'
  | 'dashboards'
  | 'news'
  | 'articles'
  | 'factsheet'
  | 'literatures'
  | 'exam-preparation'
  | 'books'
  | 'calculator'
  | 'selected-blogs'
  | 'keep-notes';

export interface BlogSubmenuDefinition {
  key: string;
  title: string;
  description: string;
  labels: string[];
  emptyMessage: string;
  type?: 'jobs' | 'posts';
  url?: string;
  route?: string;
}

export interface DashboardMenuDefinition {
  key: DashboardMenuKey;
  title: string;
  description: string;
  submenus: BlogSubmenuDefinition[];
}

export const MENU_THEME_COLORS: Record<DashboardMenuKey, string> = {
  opportunities: '#2563EB',
  dashboards: '#0D9488',
  news: '#EA580C',
  articles: '#4F46E5',
  factsheet: '#0891B2',
  literatures: '#DB2777',
  'exam-preparation': '#16A34A',
  books: '#7C3AED',
  calculator: '#F97316',
  'selected-blogs': '#7C3AED',
  'keep-notes': '#0F766E',
};

export const JOB_PORTAL_LABELS = ['vacancy', 'Opportunities'];

export const DASHBOARD_MENUS: DashboardMenuDefinition[] = [
  {
    key: 'opportunities',
    title: 'Opportunities',
    description: 'Funding, calls, and vacancy opportunities.',
    submenus: [
      {
        key: 'jobs-portal',
        title: 'Jobs Portal',
        description: 'Browse and search vacancy posts as a job portal.',
        labels: JOB_PORTAL_LABELS,
        emptyMessage: 'No job opportunities found yet.',
        type: 'jobs',
      },
      {
        key: 'grants',
        title: 'Grants',
        description: 'Grants and proposal opportunities.',
        labels: ['Grants'],
        emptyMessage: 'No grant opportunities found yet.',
      },
      {
        key: 'expression-of-interest',
        title: 'Expression of Interest',
        description: 'EOI-related calls and notices.',
        labels: ['Expression of Interest', 'Opportunities'],
        emptyMessage: 'No EOI posts found yet.',
      },
      {
        key: 'call-for-paper',
        title: 'Call for Paper',
        description: 'Paper submission calls and notices.',
        labels: ['Call for papers', 'Opportunities'],
        emptyMessage: 'No call for paper posts found yet.',
      },
      {
        key: 'call-for-abstract',
        title: 'Call for Abstract',
        description: 'Abstract submission calls and notices.',
        labels: ['Call for abstract', 'Call for papers', 'Opportunities'],
        emptyMessage: 'No call for abstract posts found yet.',
      },
    ],
  },
  {
    key: 'dashboards',
    title: 'Dashboards',
    description: 'Public health dashboard-focused posts and reports.',
    submenus: [
      {
        key: 'public-health-dashboard',
        title: 'Public Health Dashboard',
        description: 'Dashboard-oriented public health posts.',
        labels: ['Public health Dashboard'],
        emptyMessage: 'No public health dashboard posts found yet.',
      },
      {
        key: 'national-reports-dashboard',
        title: 'National Reports',
        description: 'National report updates for dashboard view.',
        labels: ['National Document'],
        emptyMessage: 'No national report posts found yet.',
      },
      {
        key: 'international-reports-dashboard',
        title: 'International Reports',
        description: 'International report updates for dashboard view.',
        labels: ['International Document'],
        emptyMessage: 'No international report posts found yet.',
      },
    ],
  },
  {
    key: 'news',
    title: 'News',
    description: 'Latest public health updates and reports.',
    submenus: [
      {
        key: 'public-health-news',
        title: 'Public Health News',
        description: 'Recent public health news posts.',
        labels: ['Public Health News'],
        emptyMessage: 'No public health news posts found yet.',
      },
      {
        key: 'campaign-updates',
        title: 'Campaign Updates',
        description: 'Campaign and awareness related updates.',
        labels: ['Public Health Campaign'],
        emptyMessage: 'No campaign updates found yet.',
      },
      {
        key: 'reports',
        title: 'National & International Reports',
        description: 'National and international report posts.',
        labels: ['National Document', 'International Document'],
        emptyMessage: 'No report posts found yet.',
      },
    ],
  },
  {
    key: 'articles',
    title: 'Reports and Documents',
    description: 'Reports, documents, and technical knowledge resources.',
    submenus: [
      {
        key: 'epidemiology',
        title: 'Epidemiology',
        description: 'Epidemiology and research related articles.',
        labels: ['article', 'Article', 'Epidemiology', 'Public health research scale'],
        emptyMessage: 'No epidemiology articles found yet.',
      },
      {
        key: 'research-tools',
        title: 'Research Tools',
        description: 'Public health research tools and scales.',
        labels: ['public health research scale', 'Public health research scale'],
        emptyMessage: 'No research tools posts found yet.',
      },
      {
        key: 'study-materials',
        title: 'Study Materials',
        description: 'Basic study materials and syllabus posts.',
        labels: ['article', 'Article', 'Basic Study materials', 'Syllabus', 'Exam', 'MCQs', 'Epidemiology-quiz'],
        emptyMessage: 'No study material posts found yet.',
      },
      {
        key: 'software-learning',
        title: 'Software Learning',
        description: 'Articles for tools and software learning.',
        labels: ['article', 'Article', 'Learn software', 'SPSS', 'R-program', 'Kobotoolbox', 'Epidata Manager', 'Zotero', 'Analysis in Excel'],
        emptyMessage: 'No software learning posts found yet.',
      },
      {
        key: 'documents',
        title: 'Documents',
        description: 'International and national document resources.',
        labels: ['International Document', 'National Document'],
        emptyMessage: 'No document posts found yet.',
      },
      {
        key: 'courses-videos',
        title: 'Courses & Videos',
        description: 'Free course and video learning resources.',
        labels: ['article', 'Article', 'Free public health courses', 'Videos'],
        emptyMessage: 'No courses or videos posts found yet.',
      },
    ],
  },
  {
    key: 'factsheet',
    title: 'Factsheet',
    description: 'Scales, policies, and dashboard fact resources.',
    submenus: [
      {
        key: 'scales-indexes',
        title: 'Scales & Indexes',
        description: 'Public health and socio-economic scales.',
        labels: ['Factsheet'],
        emptyMessage: 'No scale-related fact sheets found yet.',
      },
      {
        key: 'plans-and-policies',
        title: 'Plans & Policies',
        description: 'National plans and policy references.',
        labels: ['Factsheet'],
        emptyMessage: 'No plans and policies posts found yet.',
      },
      {
        key: 'dashboard-facts',
        title: 'Public Health Dashboard Facts',
        description: 'Fact sheet style dashboard posts.',
        labels: ['Factsheet'],
        emptyMessage: 'No dashboard fact posts found yet.',
      },
    ],
  },
  {
    key: 'literatures',
    title: 'Literatures',
    description: 'Stories, poems, and creative public health literature.',
    submenus: [
      {
        key: 'stories',
        title: 'Stories',
        description: 'Story-based literature posts.',
        labels: ['Story'],
        emptyMessage: 'No story posts found yet.',
      },
      {
        key: 'creativity',
        title: 'Creativity',
        description: 'Creative writing and poem-like posts.',
        labels: ['Creativity'],
        emptyMessage: 'No creativity posts found yet.',
      },
      {
        key: 'others',
        title: 'Other Literature',
        description: 'Other literature-oriented posts.',
        labels: ['Other'],
        emptyMessage: 'No other literature posts found yet.',
      },
    ],
  },
  {
    key: 'exam-preparation',
    title: 'Exam Preparation',
    description: 'Syllabus, MCQs, AI tutoring, and practice progress.',
    submenus: [
      {
        key: 'syllabus',
        title: 'Syllabus',
        description: 'Review subject-wise syllabus topics.',
        labels: [],
        emptyMessage: 'No syllabus content found yet.',
        route: '/(tabs)/(home)/exam-preparation/syllabus',
      },
      {
        key: 'practice-mcqs',
        title: 'Practice MCQs',
        description: 'Practice subject-wise MCQs from Google Sheets.',
        labels: [],
        emptyMessage: 'No MCQs available yet.',
        route: '/(tabs)/(home)/exam-preparation/practice-mcqs',
      },
      {
        key: 'ai-tutor',
        title: 'Ask the AI Tutor',
        description: 'Get Gemini-powered study help and explanations.',
        labels: [],
        emptyMessage: 'Open the AI tutor.',
        route: '/(tabs)/(home)/exam-preparation/tutor',
      },
      {
        key: 'progress',
        title: 'Progress',
        description: 'Track your practice accuracy and study progress.',
        labels: [],
        emptyMessage: 'Open your progress summary.',
        route: '/(tabs)/(home)/exam-preparation/progress',
      },
    ],
  },
  {
    key: 'books',
    title: 'Books',
    description: 'Open recommended learning books and references.',
    submenus: [
      {
        key: 'biostatistics-for-beginners',
        title: 'Biostatistics for beginners',
        description: 'Open the Biostatistics for beginners book resource.',
        labels: [],
        emptyMessage: 'Open the book resource.',
        type: 'posts',
        url: 'https://biostatisticsforbeginners.netlify.app/',
      },
      {
        key: 'epidemiology-and-biostat-with-r',
        title: 'Epidemiology and Biostat with R',
        description: 'Open the Epidemiology and Biostat with R book resource.',
        labels: [],
        emptyMessage: 'Open the book resource.',
        type: 'posts',
        url: 'https://epidemiologywithr.netlify.app/',
      },
    ],
  },
  {
    key: 'calculator',
    title: 'Calculator',
    description: 'Quick health calculation tools and unit converters.',
    submenus: [
      {
        key: 'calorie-estimation',
        title: 'Calorie Estimation',
        description: 'Estimate calories from food text or photos.',
        labels: [],
        emptyMessage: 'Open the calorie estimation tool.',
        route: '/(tabs)/(home)/calorie-estimator',
      },
      {
        key: 'bmi-calculator',
        title: 'BMI Calculator',
        description: 'Calculate body mass index from height and weight.',
        labels: [],
        emptyMessage: 'Open the BMI calculator.',
        route: '/(tabs)/(home)/bmi-calculator',
      },
      {
        key: 'measurement-converter',
        title: 'Measurement Conversion',
        description: 'Convert weight, height, temperature, and volume values.',
        labels: [],
        emptyMessage: 'Open the measurement converter.',
        route: '/(tabs)/(home)/measurement-converter',
      },
      {
        key: 'date-converter',
        title: 'Date Converter',
        description: 'Convert dates between Gregorian and Bikram Sambat.',
        labels: [],
        emptyMessage: 'Open the date converter.',
        route: '/(tabs)/(home)/date-converter',
      },
    ],
  },
  {
    key: 'selected-blogs',
    title: 'Selected Blogs',
    description: 'Blogs saved or selected across different categories.',
    submenus: [],
  },
  {
    key: 'keep-notes',
    title: 'Keep Notes',
    description: 'Day-wise notes and document records.',
    submenus: [],
  },
];

export function getDashboardMenu(menuKey: string): DashboardMenuDefinition | undefined {
  return DASHBOARD_MENUS.find((menu) => menu.key === menuKey);
}

export function getSubmenu(menuKey: string, submenuKey: string): BlogSubmenuDefinition | undefined {
  const normalizedMenuKey = (menuKey || '').trim().toLowerCase();
  const normalizedSubmenuKey = (submenuKey || '').trim().toLowerCase();

  const menu = DASHBOARD_MENUS.find((item) => item.key === normalizedMenuKey);
  if (!menu) return undefined;

  if (menu.key === 'books') {
    const exactBookMatch = menu.submenus.find((submenu) => submenu.key.toLowerCase() === normalizedSubmenuKey);
    if (exactBookMatch) {
      return exactBookMatch;
    }

    if (!normalizedSubmenuKey) {
      return menu.submenus[0];
    }

    return undefined;
  }

  // For Articles menu with no submenu, always force document labels.
  if (menu.key === 'articles' && !normalizedSubmenuKey) {
    return {
      key: menu.key,
      title: menu.title,
      description: menu.description,
      labels: ['International Document', 'National Document'],
      emptyMessage: `No ${menu.title.toLowerCase()} posts found yet.`,
    };
  }

  const exactMatch = menu.submenus.find((submenu) => submenu.key.toLowerCase() === normalizedSubmenuKey);
  if (exactMatch) {
    return exactMatch;
  }

  // Accept common aliases/typos so deep links do not fail.
  if (normalizedSubmenuKey.includes('report')) {
    const reportsMatch = menu.submenus.find((submenu) => submenu.key === 'reports');
    if (reportsMatch) {
      return reportsMatch;
    }
  }

  if (normalizedSubmenuKey.includes('document') || normalizedSubmenuKey.includes('dociment')) {
    const documentsMatch = menu.submenus.find((submenu) => submenu.key === 'documents');
    if (documentsMatch) {
      return documentsMatch;
    }
  }

  // Fallback to first submenu if route params are missing/invalid.
  if (!normalizedSubmenuKey) {
    return menu.submenus[0];
  }

  return undefined;
}

export function getMenuThemeColor(menuKey?: string): string {
  if (!menuKey) return '#2DD4BF';
  const key = menuKey as DashboardMenuKey;
  return MENU_THEME_COLORS[key] || '#2DD4BF';
}
