export interface PublicHealthDay {
  month: number; // 1-12
  day: number; // 1-31
  type: 'day' | 'week';
  title: string;
}

export const PUBLIC_HEALTH_DAYS: PublicHealthDay[] = [
  { month: 1, day: 4, type: 'day', title: 'World Braille Day' },
  { month: 1, day: 24, type: 'day', title: 'International Day of Education' },
  { month: 1, day: 30, type: 'day', title: 'World Leprosy Day' },

  { month: 2, day: 4, type: 'day', title: 'World Cancer Day' },
  { month: 2, day: 6, type: 'day', title: 'International Day of Zero Tolerance for Female Genital Mutilation' },
  { month: 2, day: 11, type: 'day', title: 'International Day of Women and Girls in Science' },
  { month: 2, day: 15, type: 'day', title: 'International Childhood Cancer Day' },
  { month: 2, day: 28, type: 'day', title: 'Rare Disease Day' },
  { month: 2, day: 29, type: 'day', title: 'Rare Disease Day (Leap Year)' },

  { month: 3, day: 1, type: 'day', title: 'Zero Discrimination Day' },
  { month: 3, day: 3, type: 'day', title: 'World Birth Defects Day' },
  { month: 3, day: 4, type: 'day', title: 'World Obesity Day' },
  { month: 3, day: 8, type: 'day', title: "International Women's Day" },
  { month: 3, day: 12, type: 'day', title: 'World Glaucoma Day' },
  { month: 3, day: 15, type: 'day', title: 'World Consumer Rights Day' },
  { month: 3, day: 20, type: 'day', title: 'World Oral Health Day' },
  { month: 3, day: 21, type: 'day', title: 'World Down Syndrome Day' },
  { month: 3, day: 22, type: 'day', title: 'World Water Day' },
  { month: 3, day: 24, type: 'day', title: 'World Tuberculosis Day' },

  { month: 4, day: 2, type: 'day', title: 'World Autism Awareness Day' },
  { month: 4, day: 7, type: 'day', title: 'World Health Day' },
  { month: 4, day: 11, type: 'day', title: "World Parkinson's Day" },
  { month: 4, day: 14, type: 'day', title: 'World Chagas Disease Day' },
  { month: 4, day: 17, type: 'day', title: 'World Hemophilia Day' },
  { month: 4, day: 22, type: 'day', title: 'Earth Day' },
  { month: 4, day: 24, type: 'week', title: 'World Immunization Week (April 24-30)' },
  { month: 4, day: 25, type: 'day', title: 'World Malaria Day' },
  { month: 4, day: 28, type: 'day', title: 'World Day for Safety and Health at Work' },

  { month: 5, day: 5, type: 'day', title: 'International Day of the Midwife' },
  { month: 5, day: 6, type: 'day', title: 'World Asthma Day' },
  { month: 5, day: 8, type: 'day', title: 'World Red Cross and Red Crescent Day' },
  { month: 5, day: 10, type: 'day', title: 'World Lupus Day' },
  { month: 5, day: 12, type: 'day', title: 'International Nurses Day' },
  { month: 5, day: 15, type: 'day', title: 'International Day of Families' },
  { month: 5, day: 17, type: 'day', title: 'World Hypertension Day' },
  { month: 5, day: 19, type: 'day', title: 'World IBD Day' },
  { month: 5, day: 20, type: 'day', title: 'Clinical Trials Day' },
  { month: 5, day: 28, type: 'day', title: 'Menstrual Hygiene Day' },
  { month: 5, day: 31, type: 'day', title: 'World No Tobacco Day' },

  { month: 6, day: 5, type: 'day', title: 'World Environment Day' },
  { month: 6, day: 8, type: 'day', title: 'World Brain Tumor Day' },
  { month: 6, day: 14, type: 'day', title: 'World Blood Donor Day' },
  { month: 6, day: 21, type: 'day', title: 'International Day of Yoga' },
  { month: 6, day: 26, type: 'day', title: 'International Day Against Drug Abuse and Illicit Trafficking' },

  { month: 7, day: 11, type: 'day', title: 'World Population Day' },
  { month: 7, day: 22, type: 'day', title: 'World Brain Day' },
  { month: 7, day: 24, type: 'day', title: 'International Self-Care Day' },
  { month: 7, day: 25, type: 'day', title: 'World IVF Day' },
  { month: 7, day: 28, type: 'day', title: 'World Hepatitis Day' },

  { month: 8, day: 1, type: 'week', title: 'World Breastfeeding Week (Aug 1-7)' },
  { month: 8, day: 12, type: 'day', title: 'International Youth Day' },
  { month: 8, day: 19, type: 'day', title: 'World Humanitarian Day' },

  { month: 9, day: 8, type: 'day', title: 'International Literacy Day' },
  { month: 9, day: 10, type: 'day', title: 'World Suicide Prevention Day' },
  { month: 9, day: 13, type: 'day', title: 'World Sepsis Day' },
  { month: 9, day: 17, type: 'day', title: 'World Patient Safety Day' },
  { month: 9, day: 21, type: 'day', title: "World Alzheimer's Day" },
  { month: 9, day: 25, type: 'day', title: 'World Pharmacists Day' },
  { month: 9, day: 28, type: 'day', title: 'World Rabies Day' },
  { month: 9, day: 29, type: 'day', title: 'World Heart Day' },

  { month: 10, day: 1, type: 'day', title: 'International Day of Older Persons' },
  { month: 10, day: 10, type: 'day', title: 'World Mental Health Day' },
  { month: 10, day: 11, type: 'day', title: 'International Day of the Girl Child' },
  { month: 10, day: 12, type: 'day', title: 'World Arthritis Day' },
  { month: 10, day: 13, type: 'day', title: 'International Day for Disaster Risk Reduction' },
  { month: 10, day: 15, type: 'day', title: 'Global Handwashing Day' },
  { month: 10, day: 16, type: 'day', title: 'World Food Day' },
  { month: 10, day: 17, type: 'day', title: 'International Day for the Eradication of Poverty' },
  { month: 10, day: 20, type: 'day', title: 'World Osteoporosis Day' },
  { month: 10, day: 24, type: 'day', title: 'World Polio Day' },
  { month: 10, day: 29, type: 'day', title: 'World Stroke Day' },

  { month: 11, day: 12, type: 'day', title: 'World Pneumonia Day' },
  { month: 11, day: 14, type: 'day', title: 'World Diabetes Day' },
  { month: 11, day: 17, type: 'day', title: 'World Prematurity Day' },
  { month: 11, day: 18, type: 'week', title: 'World Antibiotic Awareness Week (Nov 18-24)' },
  { month: 11, day: 19, type: 'day', title: 'World Toilet Day' },
  { month: 11, day: 20, type: 'day', title: "Universal Children's Day" },
  { month: 11, day: 25, type: 'day', title: 'International Day for the Elimination of Violence Against Women' },

  { month: 12, day: 1, type: 'day', title: 'World AIDS Day' },
  { month: 12, day: 3, type: 'day', title: 'International Day of Persons with Disabilities' },
  { month: 12, day: 5, type: 'day', title: 'International Volunteer Day' },
  { month: 12, day: 10, type: 'day', title: 'Human Rights Day' },
  { month: 12, day: 12, type: 'day', title: 'Universal Health Coverage Day' },
];
