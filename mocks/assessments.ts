export interface AssessmentOption {
  label: string;
  value: number;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: AssessmentOption[];
}

export interface ScoreRange {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

export type AssessmentType = 'screening' | 'self_care';

export interface Assessment {
  id: string;
  name: string;
  shortName: string;
  description: string;
  toolInfo: string;
  icon: string;
  color: string;
  accentColor: string;
  category: 'mental' | 'diabetes' | 'cardiovascular' | 'general';
  assessmentType: AssessmentType;
  questions: AssessmentQuestion[];
  scoreRanges: ScoreRange[];
  maxScore: number;
  reference: string;
}

const phq9Options: AssessmentOption[] = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
];

const gad7Options: AssessmentOption[] = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
];

const ascvdOptions: AssessmentOption[] = [
  { label: 'No', value: 0 },
  { label: 'Yes', value: 1 },
];

export const assessments: Assessment[] = [
  {
    id: 'phq9',
    name: 'Depression Screening',
    shortName: 'Depression Screening',
    description: 'Check for signs of depression over the last 2 weeks',
    toolInfo: 'This is a widely used 9-question tool (PHQ-9) developed by doctors to help identify depression. It asks about common symptoms like low mood, sleep problems, and energy levels over the past two weeks. Your answers help determine if you may benefit from professional support.',
    icon: 'brain',
    color: '#6366F1',
    accentColor: '#818CF8',
    category: 'mental',
    assessmentType: 'screening',
    maxScore: 27,
    reference: 'Kroenke K, Spitzer RL, Williams JB. J Gen Intern Med. 2001',
    scoreRanges: [
      { min: 0, max: 4, label: 'Minimal', color: '#22C55E', description: 'Minimal depression. No treatment typically needed.' },
      { min: 5, max: 9, label: 'Mild', color: '#84CC16', description: 'Mild depression. Watchful waiting; repeat PHQ-9 at follow-up.' },
      { min: 10, max: 14, label: 'Moderate', color: '#F59E0B', description: 'Moderate depression. Consider counseling or medication.' },
      { min: 15, max: 19, label: 'Moderately Severe', color: '#F97316', description: 'Moderately severe depression. Active treatment with medication and/or therapy recommended.' },
      { min: 20, max: 27, label: 'Severe', color: '#EF4444', description: 'Severe depression. Immediate treatment with medication and therapy strongly recommended.' },
    ],
    questions: [
      { id: 'phq1', text: 'Little interest or pleasure in doing things', options: phq9Options },
      { id: 'phq2', text: 'Feeling down, depressed, or hopeless', options: phq9Options },
      { id: 'phq3', text: 'Trouble falling or staying asleep, or sleeping too much', options: phq9Options },
      { id: 'phq4', text: 'Feeling tired or having little energy', options: phq9Options },
      { id: 'phq5', text: 'Poor appetite or overeating', options: phq9Options },
      { id: 'phq6', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down', options: phq9Options },
      { id: 'phq7', text: 'Trouble concentrating on things, such as reading the newspaper or watching television', options: phq9Options },
      { id: 'phq8', text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless', options: phq9Options },
      { id: 'phq9', text: 'Thoughts that you would be better off dead or of hurting yourself in some way', options: phq9Options },
    ],
  },
  {
    id: 'gad7',
    name: 'Anxiety Screening',
    shortName: 'Anxiety Screening',
    description: 'Check your anxiety level over the last 2 weeks',
    toolInfo: 'This is a 7-question screening tool (GAD-7) used by healthcare providers worldwide to measure anxiety severity. It asks about feelings of nervousness, worry, and restlessness over the past two weeks. It helps identify whether anxiety may be affecting your daily life.',
    icon: 'heart-pulse',
    color: '#EC4899',
    accentColor: '#F472B6',
    category: 'mental',
    assessmentType: 'screening',
    maxScore: 21,
    reference: 'Spitzer RL, Kroenke K, Williams JB, Lowe B. Arch Intern Med. 2006',
    scoreRanges: [
      { min: 0, max: 4, label: 'Minimal', color: '#22C55E', description: 'Minimal anxiety. Monitor as needed.' },
      { min: 5, max: 9, label: 'Mild', color: '#84CC16', description: 'Mild anxiety. Watchful waiting and follow-up.' },
      { min: 10, max: 14, label: 'Moderate', color: '#F59E0B', description: 'Moderate anxiety. Consider counseling or medication.' },
      { min: 15, max: 21, label: 'Severe', color: '#EF4444', description: 'Severe anxiety. Active treatment strongly recommended.' },
    ],
    questions: [
      { id: 'gad1', text: 'Feeling nervous, anxious, or on edge', options: gad7Options },
      { id: 'gad2', text: 'Not being able to stop or control worrying', options: gad7Options },
      { id: 'gad3', text: 'Worrying too much about different things', options: gad7Options },
      { id: 'gad4', text: 'Trouble relaxing', options: gad7Options },
      { id: 'gad5', text: 'Being so restless that it is hard to sit still', options: gad7Options },
      { id: 'gad6', text: 'Becoming easily annoyed or irritable', options: gad7Options },
      { id: 'gad7', text: 'Feeling afraid as if something awful might happen', options: gad7Options },
    ],
  },
  {
    id: 'idrs',
    name: 'Diabetes Risk Screening',
    shortName: 'Diabetes Risk Screening',
    description: 'Evaluate your risk of developing Type 2 Diabetes',
    toolInfo: 'This simple 4-question tool (IDRS) estimates your risk of developing Type 2 Diabetes based on factors like age, waist size, physical activity, and family history. It was developed specifically for South Asian populations and helps identify people who should get their blood sugar tested.',
    icon: 'droplets',
    color: '#0EA5E9',
    accentColor: '#38BDF8',
    category: 'diabetes',
    assessmentType: 'screening',
    maxScore: 100,
    reference: 'Mohan V, Deepa R, Deepa M, et al. JAPI. 2005',
    scoreRanges: [
      { min: 0, max: 29, label: 'Low Risk', color: '#22C55E', description: 'Low risk of developing diabetes. Maintain healthy lifestyle.' },
      { min: 30, max: 49, label: 'Moderate Risk', color: '#F59E0B', description: 'Moderate risk. Lifestyle modifications recommended. Get screened.' },
      { min: 50, max: 59, label: 'High Risk', color: '#F97316', description: 'High risk. Strongly recommended to get blood glucose tested.' },
      { min: 60, max: 100, label: 'Very High Risk', color: '#EF4444', description: 'Very high risk. Immediate medical consultation and glucose testing needed.' },
    ],
    questions: [
      {
        id: 'idrs1', text: 'What is your age?',
        options: [
          { label: 'Less than 35 years', value: 0 },
          { label: '35-49 years', value: 20 },
          { label: '50 years or above', value: 30 },
        ],
      },
      {
        id: 'idrs2', text: 'What is your waist circumference?',
        options: [
          { label: 'Less than 80 cm (F) / 90 cm (M)', value: 0 },
          { label: '80-89 cm (F) / 90-99 cm (M)', value: 10 },
          { label: '90 cm or more (F) / 100 cm or more (M)', value: 20 },
        ],
      },
      {
        id: 'idrs3', text: 'Do you do regular physical activity?',
        options: [
          { label: 'Regular vigorous exercise or heavy physical labor', value: 0 },
          { label: 'Regular moderate exercise or moderate physical labor', value: 10 },
          { label: 'Regular mild exercise or mild physical labor', value: 20 },
          { label: 'No exercise and sedentary work', value: 30 },
        ],
      },
      {
        id: 'idrs4', text: 'Family history of diabetes?',
        options: [
          { label: 'No diabetes in parents', value: 0 },
          { label: 'One parent is diabetic', value: 10 },
          { label: 'Both parents are diabetic', value: 20 },
        ],
      },
    ],
  },
  {
    id: 'dsmq',
    name: 'Diabetes Self-Care Check',
    shortName: 'Diabetes Self-Care',
    description: 'Evaluate how well you manage your diabetes care',
    toolInfo: 'This 10-question tool (DSMQ) helps you reflect on how well you are managing your diabetes day-to-day. It covers areas like blood sugar monitoring, diet, medication, physical activity, and doctor visits. Your score shows where you are doing well and where you could improve.',
    icon: 'clipboard-check',
    color: '#14B8A6',
    accentColor: '#2DD4BF',
    category: 'diabetes',
    assessmentType: 'self_care',
    maxScore: 30,
    reference: 'Schmitt A, Gahr A, Hermanns N, et al. Exp Clin Endocrinol Diabetes. 2013',
    scoreRanges: [
      { min: 0, max: 10, label: 'Poor', color: '#EF4444', description: 'Poor self-management. Consider diabetes education and support programs.' },
      { min: 11, max: 17, label: 'Fair', color: '#F59E0B', description: 'Fair self-management. Room for improvement in diabetes care routine.' },
      { min: 18, max: 24, label: 'Good', color: '#84CC16', description: 'Good self-management. Keep up the good work with minor adjustments.' },
      { min: 25, max: 30, label: 'Excellent', color: '#22C55E', description: 'Excellent self-management. You are doing a great job managing your diabetes.' },
    ],
    questions: [
      { id: 'dsmq1', text: 'I check my blood sugar levels with care and attention', options: [{ label: 'Does not apply to me', value: 0 }, { label: 'Applies to some degree', value: 1 }, { label: 'Applies considerably', value: 2 }, { label: 'Applies very much', value: 3 }] },
      { id: 'dsmq2', text: 'The food I choose makes it easy to achieve optimal blood sugar levels', options: [{ label: 'Does not apply to me', value: 0 }, { label: 'Applies to some degree', value: 1 }, { label: 'Applies considerably', value: 2 }, { label: 'Applies very much', value: 3 }] },
      { id: 'dsmq3', text: 'I keep all doctors appointments recommended for my diabetes treatment', options: [{ label: 'Does not apply to me', value: 0 }, { label: 'Applies to some degree', value: 1 }, { label: 'Applies considerably', value: 2 }, { label: 'Applies very much', value: 3 }] },
      { id: 'dsmq4', text: 'I take my diabetes medication as prescribed', options: [{ label: 'Does not apply to me', value: 0 }, { label: 'Applies to some degree', value: 1 }, { label: 'Applies considerably', value: 2 }, { label: 'Applies very much', value: 3 }] },
      { id: 'dsmq5', text: 'I do regular physical activity to achieve optimal blood sugar levels', options: [{ label: 'Does not apply to me', value: 0 }, { label: 'Applies to some degree', value: 1 }, { label: 'Applies considerably', value: 2 }, { label: 'Applies very much', value: 3 }] },
      { id: 'dsmq6', text: 'I strictly follow the dietary recommendations given by my doctor', options: [{ label: 'Does not apply to me', value: 0 }, { label: 'Applies to some degree', value: 1 }, { label: 'Applies considerably', value: 2 }, { label: 'Applies very much', value: 3 }] },
      { id: 'dsmq7', text: 'I record my blood sugar levels regularly', options: [{ label: 'Does not apply to me', value: 0 }, { label: 'Applies to some degree', value: 1 }, { label: 'Applies considerably', value: 2 }, { label: 'Applies very much', value: 3 }] },
      { id: 'dsmq8', text: 'I tend to avoid diabetes-related doctor appointments', options: [{ label: 'Applies very much', value: 0 }, { label: 'Applies considerably', value: 1 }, { label: 'Applies to some degree', value: 2 }, { label: 'Does not apply to me', value: 3 }] },
      { id: 'dsmq9', text: 'I do regular physical activities', options: [{ label: 'Does not apply to me', value: 0 }, { label: 'Applies to some degree', value: 1 }, { label: 'Applies considerably', value: 2 }, { label: 'Applies very much', value: 3 }] },
      { id: 'dsmq10', text: 'My diabetes self-care is poor', options: [{ label: 'Applies very much', value: 0 }, { label: 'Applies considerably', value: 1 }, { label: 'Applies to some degree', value: 2 }, { label: 'Does not apply to me', value: 3 }] },
    ],
  },
  {
    id: 'hscale',
    name: 'Blood Pressure Self-Care Check',
    shortName: 'BP Self-Care Check',
    description: 'Assess your self-care habits for managing high blood pressure',
    toolInfo: 'This 7-question tool (H-SCALE) evaluates your weekly habits related to managing high blood pressure. It covers medication adherence, diet (salt and fruits/vegetables), physical activity, blood pressure monitoring, smoking, and alcohol use. It helps identify areas where better self-care can improve your blood pressure control.',
    icon: 'activity',
    color: '#E11D48',
    accentColor: '#FB7185',
    category: 'cardiovascular',
    assessmentType: 'self_care',
    maxScore: 28,
    reference: 'Warren-Findlow J, Seymour RB, Brunner Huber LR. J Clin Nurs. 2012',
    scoreRanges: [
      { min: 0, max: 7, label: 'Poor', color: '#EF4444', description: 'Poor self-care. Significant improvement needed in managing hypertension.' },
      { min: 8, max: 14, label: 'Fair', color: '#F59E0B', description: 'Fair self-care. Several areas need attention for better BP control.' },
      { min: 15, max: 21, label: 'Good', color: '#84CC16', description: 'Good self-care. You are doing well with room for improvement.' },
      { min: 22, max: 28, label: 'Excellent', color: '#22C55E', description: 'Excellent self-care. Outstanding hypertension management habits.' },
    ],
    questions: [
      { id: 'hs1', text: 'How many days in the past week did you take your blood pressure medication?', options: [{ label: '0 days', value: 0 }, { label: '1-2 days', value: 1 }, { label: '3-4 days', value: 2 }, { label: '5-6 days', value: 3 }, { label: 'Every day', value: 4 }] },
      { id: 'hs2', text: 'How many days did you eat a low-salt diet?', options: [{ label: '0 days', value: 0 }, { label: '1-2 days', value: 1 }, { label: '3-4 days', value: 2 }, { label: '5-6 days', value: 3 }, { label: 'Every day', value: 4 }] },
      { id: 'hs3', text: 'How many days did you eat 5+ servings of fruits and vegetables?', options: [{ label: '0 days', value: 0 }, { label: '1-2 days', value: 1 }, { label: '3-4 days', value: 2 }, { label: '5-6 days', value: 3 }, { label: 'Every day', value: 4 }] },
      { id: 'hs4', text: 'How many days did you do at least 30 minutes of physical activity?', options: [{ label: '0 days', value: 0 }, { label: '1-2 days', value: 1 }, { label: '3-4 days', value: 2 }, { label: '5-6 days', value: 3 }, { label: 'Every day', value: 4 }] },
      { id: 'hs5', text: 'How many days did you check your blood pressure at home?', options: [{ label: '0 days', value: 0 }, { label: '1-2 days', value: 1 }, { label: '3-4 days', value: 2 }, { label: '5-6 days', value: 3 }, { label: 'Every day', value: 4 }] },
      { id: 'hs6', text: 'How many days did you avoid smoking or tobacco use?', options: [{ label: '0 days', value: 0 }, { label: '1-2 days', value: 1 }, { label: '3-4 days', value: 2 }, { label: '5-6 days', value: 3 }, { label: 'Every day', value: 4 }] },
      { id: 'hs7', text: 'How many days did you limit alcohol consumption?', options: [{ label: '0 days', value: 0 }, { label: '1-2 days', value: 1 }, { label: '3-4 days', value: 2 }, { label: '5-6 days', value: 3 }, { label: 'Every day', value: 4 }] },
    ],
  },
  {
    id: 'pss10',
    name: 'Stress Level Check',
    shortName: 'Stress Level Check',
    description: 'Measure your stress level over the past month',
    toolInfo: 'This 10-question tool (PSS-10) measures how stressed you have been feeling over the past month. It asks about how often you felt overwhelmed, unable to cope, or in control of your life. Your score helps you understand whether your stress levels may need attention.',
    icon: 'zap',
    color: '#8B5CF6',
    accentColor: '#A78BFA',
    category: 'mental',
    assessmentType: 'screening',
    maxScore: 40,
    reference: 'Cohen S, Kamarck T, Mermelstein R. J Health Soc Behav. 1983',
    scoreRanges: [
      { min: 0, max: 13, label: 'Low Stress', color: '#22C55E', description: 'Low perceived stress. Your coping mechanisms seem effective.' },
      { min: 14, max: 26, label: 'Moderate Stress', color: '#F59E0B', description: 'Moderate stress. Consider stress-reduction techniques and self-care.' },
      { min: 27, max: 40, label: 'High Stress', color: '#EF4444', description: 'High perceived stress. Professional support and stress management recommended.' },
    ],
    questions: [
      { id: 'pss1', text: 'How often have you been upset because of something unexpected?', options: [{ label: 'Never', value: 0 }, { label: 'Almost never', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Fairly often', value: 3 }, { label: 'Very often', value: 4 }] },
      { id: 'pss2', text: 'How often have you felt unable to control important things?', options: [{ label: 'Never', value: 0 }, { label: 'Almost never', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Fairly often', value: 3 }, { label: 'Very often', value: 4 }] },
      { id: 'pss3', text: 'How often have you felt nervous and stressed?', options: [{ label: 'Never', value: 0 }, { label: 'Almost never', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Fairly often', value: 3 }, { label: 'Very often', value: 4 }] },
      { id: 'pss4', text: 'How often have you felt confident about handling personal problems?', options: [{ label: 'Very often', value: 0 }, { label: 'Fairly often', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Almost never', value: 3 }, { label: 'Never', value: 4 }] },
      { id: 'pss5', text: 'How often have you felt things were going your way?', options: [{ label: 'Very often', value: 0 }, { label: 'Fairly often', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Almost never', value: 3 }, { label: 'Never', value: 4 }] },
      { id: 'pss6', text: 'How often have you found you could not cope with things you had to do?', options: [{ label: 'Never', value: 0 }, { label: 'Almost never', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Fairly often', value: 3 }, { label: 'Very often', value: 4 }] },
      { id: 'pss7', text: 'How often have you been able to control irritations in your life?', options: [{ label: 'Very often', value: 0 }, { label: 'Fairly often', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Almost never', value: 3 }, { label: 'Never', value: 4 }] },
      { id: 'pss8', text: 'How often have you felt that you were on top of things?', options: [{ label: 'Very often', value: 0 }, { label: 'Fairly often', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Almost never', value: 3 }, { label: 'Never', value: 4 }] },
      { id: 'pss9', text: 'How often have you been angered because of things outside your control?', options: [{ label: 'Never', value: 0 }, { label: 'Almost never', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Fairly often', value: 3 }, { label: 'Very often', value: 4 }] },
      { id: 'pss10', text: 'How often have you felt difficulties were piling up so high you could not overcome them?', options: [{ label: 'Never', value: 0 }, { label: 'Almost never', value: 1 }, { label: 'Sometimes', value: 2 }, { label: 'Fairly often', value: 3 }, { label: 'Very often', value: 4 }] },
    ],
  },
  {
    id: 'audit',
    name: 'Alcohol Use Screening',
    shortName: 'Alcohol Use Screening',
    description: 'Check for risky alcohol consumption patterns',
    toolInfo: 'This quick 3-question screening tool (AUDIT-C) helps identify whether your drinking habits may be putting your health at risk. It asks about how often and how much you drink. It is widely used by doctors to start conversations about alcohol use and health.',
    icon: 'wine',
    color: '#D97706',
    accentColor: '#FBBF24',
    category: 'general',
    assessmentType: 'screening',
    maxScore: 12,
    reference: 'Bush K, Kivlahan DR, McDonell MB, et al. Arch Intern Med. 1998',
    scoreRanges: [
      { min: 0, max: 2, label: 'Low Risk', color: '#22C55E', description: 'Low risk drinking pattern. No intervention needed.' },
      { min: 3, max: 5, label: 'Moderate Risk', color: '#F59E0B', description: 'Moderate risk. Brief advice on reducing drinking recommended.' },
      { min: 6, max: 8, label: 'High Risk', color: '#F97316', description: 'High risk. Brief counseling and continued monitoring recommended.' },
      { min: 9, max: 12, label: 'Very High Risk', color: '#EF4444', description: 'Very high risk. Further evaluation for alcohol dependence recommended.' },
    ],
    questions: [
      { id: 'au1', text: 'How often do you have a drink containing alcohol?', options: [{ label: 'Never', value: 0 }, { label: 'Monthly or less', value: 1 }, { label: '2-4 times a month', value: 2 }, { label: '2-3 times a week', value: 3 }, { label: '4+ times a week', value: 4 }] },
      { id: 'au2', text: 'How many standard drinks on a typical day when drinking?', options: [{ label: '1-2', value: 0 }, { label: '3-4', value: 1 }, { label: '5-6', value: 2 }, { label: '7-9', value: 3 }, { label: '10+', value: 4 }] },
      { id: 'au3', text: 'How often do you have 6+ drinks on one occasion?', options: [{ label: 'Never', value: 0 }, { label: 'Less than monthly', value: 1 }, { label: 'Monthly', value: 2 }, { label: 'Weekly', value: 3 }, { label: 'Daily or almost daily', value: 4 }] },
    ],
  },
  {
    id: 'epworth',
    name: 'Daytime Sleepiness Check',
    shortName: 'Sleepiness Check',
    description: 'Check if you have excessive daytime sleepiness',
    toolInfo: 'This 8-question tool (ESS) measures how likely you are to doze off during common daily activities like reading, watching TV, or sitting in traffic. Excessive daytime sleepiness can be a sign of sleep disorders. Your score helps determine if you should consult a sleep specialist.',
    icon: 'moon',
    color: '#1E40AF',
    accentColor: '#3B82F6',
    category: 'general',
    assessmentType: 'screening',
    maxScore: 24,
    reference: 'Johns MW. Sleep. 1991',
    scoreRanges: [
      { min: 0, max: 7, label: 'Normal', color: '#22C55E', description: 'Normal daytime sleepiness. Unlikely to have a sleep disorder.' },
      { min: 8, max: 9, label: 'Borderline', color: '#84CC16', description: 'Borderline sleepiness. Monitor and improve sleep hygiene.' },
      { min: 10, max: 15, label: 'Mild to Moderate', color: '#F59E0B', description: 'Excessive sleepiness. Consider consulting a sleep specialist.' },
      { min: 16, max: 24, label: 'Severe', color: '#EF4444', description: 'Severe excessive sleepiness. Consult a sleep specialist urgently.' },
    ],
    questions: [
      { id: 'ess1', text: 'Chance of dozing: Sitting and reading', options: [{ label: 'Never doze', value: 0 }, { label: 'Slight chance', value: 1 }, { label: 'Moderate chance', value: 2 }, { label: 'High chance', value: 3 }] },
      { id: 'ess2', text: 'Chance of dozing: Watching TV', options: [{ label: 'Never doze', value: 0 }, { label: 'Slight chance', value: 1 }, { label: 'Moderate chance', value: 2 }, { label: 'High chance', value: 3 }] },
      { id: 'ess3', text: 'Chance of dozing: Sitting inactive in a public place', options: [{ label: 'Never doze', value: 0 }, { label: 'Slight chance', value: 1 }, { label: 'Moderate chance', value: 2 }, { label: 'High chance', value: 3 }] },
      { id: 'ess4', text: 'Chance of dozing: As a passenger in a car for an hour', options: [{ label: 'Never doze', value: 0 }, { label: 'Slight chance', value: 1 }, { label: 'Moderate chance', value: 2 }, { label: 'High chance', value: 3 }] },
      { id: 'ess5', text: 'Chance of dozing: Lying down to rest in the afternoon', options: [{ label: 'Never doze', value: 0 }, { label: 'Slight chance', value: 1 }, { label: 'Moderate chance', value: 2 }, { label: 'High chance', value: 3 }] },
      { id: 'ess6', text: 'Chance of dozing: Sitting and talking to someone', options: [{ label: 'Never doze', value: 0 }, { label: 'Slight chance', value: 1 }, { label: 'Moderate chance', value: 2 }, { label: 'High chance', value: 3 }] },
      { id: 'ess7', text: 'Chance of dozing: Sitting quietly after lunch (no alcohol)', options: [{ label: 'Never doze', value: 0 }, { label: 'Slight chance', value: 1 }, { label: 'Moderate chance', value: 2 }, { label: 'High chance', value: 3 }] },
      { id: 'ess8', text: 'Chance of dozing: In a car, while stopped in traffic', options: [{ label: 'Never doze', value: 0 }, { label: 'Slight chance', value: 1 }, { label: 'Moderate chance', value: 2 }, { label: 'High chance', value: 3 }] },
    ],
  },
  {
    id: 'ascvd',
    name: 'Heart Disease Risk Check',
    shortName: 'Heart Risk Check',
    description: 'Estimate your 10-year risk of heart attack or stroke',
    toolInfo: 'This 9-question tool (ASCVD Risk Estimator) helps estimate your risk of having a heart attack or stroke in the next 10 years. It considers factors like age, gender, cholesterol levels, blood pressure, diabetes, smoking, and family history. Doctors use this to decide if preventive treatments like statins are needed.',
    icon: 'heart-pulse',
    color: '#DC2626',
    accentColor: '#F87171',
    category: 'cardiovascular',
    assessmentType: 'screening',
    maxScore: 40,
    reference: 'Goff DC Jr, Lloyd-Jones DM, et al. 2013 ACC/AHA Guideline on the Assessment of Cardiovascular Risk. Circulation. 2014',
    scoreRanges: [
      { min: 0, max: 7, label: 'Low Risk (<5%)', color: '#22C55E', description: 'Low 10-year ASCVD risk. Continue healthy lifestyle habits. Reassess in 4-6 years.' },
      { min: 8, max: 14, label: 'Borderline (5-7.4%)', color: '#84CC16', description: 'Borderline risk. Focus on lifestyle modifications: healthy diet, regular exercise, smoking cessation.' },
      { min: 15, max: 24, label: 'Intermediate (7.5-19.9%)', color: '#F59E0B', description: 'Intermediate risk. Discuss statin therapy with your doctor. Coronary artery calcium (CAC) scoring may help refine risk.' },
      { min: 25, max: 40, label: 'High (≥20%)', color: '#EF4444', description: 'High 10-year ASCVD risk. High-intensity statin therapy recommended. Consult cardiologist for comprehensive risk management.' },
    ],
    questions: [
      {
        id: 'ascvd1', text: 'What is your age group?',
        options: [
          { label: '20-39 years', value: 0 },
          { label: '40-49 years', value: 3 },
          { label: '50-59 years', value: 6 },
          { label: '60-69 years', value: 8 },
          { label: '70-79 years', value: 10 },
        ],
      },
      {
        id: 'ascvd2', text: 'What is your gender?',
        options: [
          { label: 'Female', value: 0 },
          { label: 'Male', value: 2 },
        ],
      },
      {
        id: 'ascvd3', text: 'What is your total cholesterol level?',
        options: [
          { label: 'Less than 170 mg/dL (Optimal)', value: 0 },
          { label: '170-199 mg/dL (Near Optimal)', value: 1 },
          { label: '200-239 mg/dL (Borderline High)', value: 3 },
          { label: '240-279 mg/dL (High)', value: 4 },
          { label: '280+ mg/dL (Very High)', value: 5 },
        ],
      },
      {
        id: 'ascvd4', text: 'What is your HDL cholesterol level?',
        options: [
          { label: '60+ mg/dL (Optimal)', value: 0 },
          { label: '50-59 mg/dL (Good)', value: 1 },
          { label: '40-49 mg/dL (Borderline)', value: 2 },
          { label: 'Less than 40 mg/dL (Low)', value: 3 },
        ],
      },
      {
        id: 'ascvd5', text: 'What is your systolic blood pressure range?',
        options: [
          { label: 'Less than 120 mmHg (Normal)', value: 0 },
          { label: '120-129 mmHg (Elevated)', value: 1 },
          { label: '130-139 mmHg (High Stage 1)', value: 3 },
          { label: '140-159 mmHg (High Stage 2)', value: 4 },
          { label: '160+ mmHg (Crisis)', value: 6 },
        ],
      },
      {
        id: 'ascvd6', text: 'Are you currently on blood pressure medication?',
        options: ascvdOptions,
      },
      {
        id: 'ascvd7', text: 'Do you have diabetes?',
        options: [
          { label: 'No', value: 0 },
          { label: 'Yes', value: 4 },
        ],
      },
      {
        id: 'ascvd8', text: 'Are you a current smoker?',
        options: [
          { label: 'No', value: 0 },
          { label: 'Yes', value: 4 },
        ],
      },
      {
        id: 'ascvd9', text: 'Do you have a family history of premature heart disease (father <55 or mother <65)?',
        options: [
          { label: 'No', value: 0 },
          { label: 'Yes', value: 3 },
        ],
      },
    ],
  },
];
