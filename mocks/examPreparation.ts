export interface ExamMcqSeed {
  subject: string;
  topic: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty?: string;
}

export interface ExamSyllabusSeed {
  subject: string;
  topic: string;
  details: string;
  order?: number;
}

export const EXAM_MCQ_SEED: ExamMcqSeed[] = [
  {
    subject: 'Biostatistics',
    topic: 'Measures of central tendency',
    question: 'Which measure is most affected by extreme outliers?',
    options: ['Mean', 'Median', 'Mode', 'Range'],
    answer: 'Mean',
    explanation: 'The mean uses every value in the data set, so a very large or small value shifts it more than the median or mode.',
    difficulty: 'Easy',
  },
  {
    subject: 'Epidemiology',
    topic: 'Study design',
    question: 'A study that compares people with a disease to those without it is called what?',
    options: ['Cohort study', 'Case-control study', 'Cross-sectional study', 'Randomized trial'],
    answer: 'Case-control study',
    explanation: 'Case-control studies start with outcome status and then look back to compare exposures.',
    difficulty: 'Easy',
  },
  {
    subject: 'Public Health',
    topic: 'Prevention levels',
    question: 'Health education campaigns are an example of which prevention level?',
    options: ['Primary prevention', 'Secondary prevention', 'Tertiary prevention', 'Quaternary prevention'],
    answer: 'Primary prevention',
    explanation: 'Primary prevention aims to stop disease before it starts through education, vaccination, and protection.',
    difficulty: 'Easy',
  },
  {
    subject: 'Research Methods',
    topic: 'Sampling',
    question: 'Which sampling method gives every person in the population an equal chance of selection?',
    options: ['Convenience sampling', 'Purposive sampling', 'Simple random sampling', 'Quota sampling'],
    answer: 'Simple random sampling',
    explanation: 'Simple random sampling is the classical probability method where selection is based on chance only.',
    difficulty: 'Medium',
  },
  {
    subject: 'Nutrition',
    topic: 'Macro nutrients',
    question: 'Which nutrient provides the most energy per gram?',
    options: ['Carbohydrate', 'Protein', 'Fat', 'Water'],
    answer: 'Fat',
    explanation: 'Fat provides about 9 kcal per gram, while carbohydrate and protein provide about 4 kcal per gram.',
    difficulty: 'Easy',
  },
  {
    subject: 'Health Policy',
    topic: 'Policy cycle',
    question: 'Which step comes first in a typical policy cycle?',
    options: ['Evaluation', 'Agenda setting', 'Implementation', 'Monitoring'],
    answer: 'Agenda setting',
    explanation: 'Agenda setting is the stage where a problem gains attention and moves onto the policy agenda.',
    difficulty: 'Medium',
  },
];

export const EXAM_SYLLABUS_SEED: ExamSyllabusSeed[] = [
  { subject: 'Biostatistics', topic: 'Descriptive statistics', details: 'Mean, median, mode, variance, standard deviation, and data presentation.', order: 1 },
  { subject: 'Biostatistics', topic: 'Inferential statistics', details: 'Hypothesis testing, confidence intervals, p-values, and interpretation of results.', order: 2 },
  { subject: 'Epidemiology', topic: 'Study designs', details: 'Case-control, cohort, cross-sectional, ecological, and experimental studies.', order: 1 },
  { subject: 'Epidemiology', topic: 'Measures of disease', details: 'Incidence, prevalence, risk, odds, and rate calculations.', order: 2 },
  { subject: 'Public Health', topic: 'Prevention and promotion', details: 'Levels of prevention, health promotion, and community intervention approaches.', order: 1 },
  { subject: 'Research Methods', topic: 'Sampling and tools', details: 'Sampling methods, questionnaires, validity, reliability, and ethics.', order: 1 },
];