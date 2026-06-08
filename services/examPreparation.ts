import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { EXAM_MCQ_SEED, EXAM_SYLLABUS_SEED } from '@/mocks/examPreparation';

const EXAM_ATTEMPTS_STORAGE_KEY = 'exam_preparation_attempts_v1';

export interface ExamMcqQuestion {
  id: string;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: string;
  source?: string;
}

export interface ExamSyllabusItem {
  id: string;
  subject: string;
  topic: string;
  details: string;
  order: number;
  source?: string;
}

export interface ExamAttemptRecord {
  questionId: string;
  subject: string;
  chosenOption: string;
  isCorrect: boolean;
  createdAt: string;
}

interface ExamPreparationConfig {
  mcqSheetUrl?: string;
  syllabusSheetUrl?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

interface SheetRow {
  [key: string]: string;
}

function readExamPreparationConfig(): ExamPreparationConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { examPreparation?: ExamPreparationConfig };
  return extra.examPreparation ?? {};
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function parseCsvRows(csvText: string): SheetRow[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const next = csvText[index + 1];

    if (character === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (character === ',' || character === '\t')) {
      currentRow.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    if (!inQuotes && (character === '\n' || character === '\r')) {
      if (character === '\r' && next === '\n') {
        index += 1;
      }
      if (currentValue.length > 0 || currentRow.length > 0) {
        currentRow.push(currentValue.trim());
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => normalizeHeader(header));
  return rows.slice(1).map((row) => {
    const mapped: SheetRow = {};
    headers.forEach((header, index) => {
      mapped[header] = row[index] ?? '';
    });
    return mapped;
  });
}

function toCsvUrl(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/format=csv|output=csv/i.test(trimmed)) {
    return trimmed;
  }

  const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (!sheetMatch) {
    return trimmed;
  }

  const sheetId = sheetMatch[1];
  const gidMatch = trimmed.match(/[?#&]gid=(\d+)/i);
  const gid = gidMatch?.[1] ?? '0';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

async function fetchSheetRows(sheetUrl?: string): Promise<SheetRow[]> {
  const url = toCsvUrl(sheetUrl);
  if (!url) {
    return [];
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load sheet data (${response.status})`);
  }

  const text = await response.text();
  return parseCsvRows(text);
}

function buildMcqId(subject: string, topic: string, question: string, index: number): string {
  return `${subject}-${topic}-${question}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildSyllabusId(subject: string, topic: string, index: number): string {
  return `${subject}-${topic}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function readOption(row: SheetRow, names: string[]): string {
  for (const name of names) {
    const value = row[name];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function parseMcqRows(rows: SheetRow[], source: string): ExamMcqQuestion[] {
  return rows
    .filter((row) => (row.type ?? row.kind ?? 'mcq').toLowerCase() !== 'syllabus')
    .map((row, index) => {
      const subject = readOption(row, ['subject', 'category']) || 'General';
      const topic = readOption(row, ['topic', 'chapter']) || 'General';
      const question = readOption(row, ['question', 'mcq', 'prompt']) || readOption(row, ['title']);
      const options = [
        readOption(row, ['option_a', 'option1', 'a']),
        readOption(row, ['option_b', 'option2', 'b']),
        readOption(row, ['option_c', 'option3', 'c']),
        readOption(row, ['option_d', 'option4', 'd']),
      ].filter(Boolean);
      const answer = readOption(row, ['answer', 'correct_answer', 'correct', 'right_answer']);
      const explanation = readOption(row, ['explanation', 'rationale', 'notes']);
      const difficulty = readOption(row, ['difficulty']) || 'Unknown';

      if (!question || options.length < 2) {
        return null;
      }

      return {
        id: buildMcqId(subject, topic, question, index),
        subject,
        topic,
        question,
        options,
        answer: answer || options[0],
        explanation,
        difficulty,
        source,
      };
    })
    .filter((item): item is ExamMcqQuestion => Boolean(item));
}

function parseSyllabusRows(rows: SheetRow[], source: string): ExamSyllabusItem[] {
  return rows
    .filter((row) => (row.type ?? row.kind ?? 'syllabus').toLowerCase() === 'syllabus' || Boolean(row.details || row.sylla_bus))
    .map((row, index) => {
      const subject = readOption(row, ['subject', 'category']) || 'General';
      const topic = readOption(row, ['topic', 'chapter']) || readOption(row, ['title']) || 'Overview';
      const details = readOption(row, ['details', 'description', 'syllabus', 'notes']);
      const orderValue = Number(readOption(row, ['order', 'rank']));

      if (!details) {
        return null;
      }

      return {
        id: buildSyllabusId(subject, topic, index),
        subject,
        topic,
        details,
        order: Number.isFinite(orderValue) ? orderValue : index + 1,
        source,
      };
    })
    .filter((item): item is ExamSyllabusItem => Boolean(item));
}

function sortBySubjectAndOrder<T extends { subject: string; order?: number; topic: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const subjectDiff = left.subject.localeCompare(right.subject);
    if (subjectDiff !== 0) return subjectDiff;
    return (left.order ?? 0) - (right.order ?? 0) || left.topic.localeCompare(right.topic);
  });
}

export async function loadExamMcqQuestions(): Promise<ExamMcqQuestion[]> {
  const config = readExamPreparationConfig();
  try {
    const rows = await fetchSheetRows(config.mcqSheetUrl);
    const questions = parseMcqRows(rows, 'google-sheet');
    if (questions.length > 0) {
      return sortBySubjectAndOrder(questions);
    }
  } catch (error) {
    console.log('[ExamPreparation] Failed to load MCQ sheet:', error);
  }

  return sortBySubjectAndOrder(
    EXAM_MCQ_SEED.map((item, index) => ({
      id: buildMcqId(item.subject, item.topic, item.question, index),
      subject: item.subject,
      topic: item.topic,
      question: item.question,
      options: item.options,
      answer: item.answer,
      explanation: item.explanation,
      difficulty: item.difficulty ?? 'Unknown',
      source: 'local-seed',
    }))
  );
}

export async function loadExamSyllabus(): Promise<ExamSyllabusItem[]> {
  const config = readExamPreparationConfig();
  try {
    const rows = await fetchSheetRows(config.syllabusSheetUrl);
    const syllabus = parseSyllabusRows(rows, 'google-sheet');
    if (syllabus.length > 0) {
      return sortBySubjectAndOrder(syllabus);
    }
  } catch (error) {
    console.log('[ExamPreparation] Failed to load syllabus sheet:', error);
  }

  return sortBySubjectAndOrder(
    EXAM_SYLLABUS_SEED.map((item, index) => ({
      id: buildSyllabusId(item.subject, item.topic, index),
      subject: item.subject,
      topic: item.topic,
      details: item.details,
      order: item.order ?? index + 1,
      source: 'local-seed',
    }))
  );
}

export async function loadExamAttempts(): Promise<ExamAttemptRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(EXAM_ATTEMPTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExamAttemptRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.log('[ExamPreparation] Failed to load progress:', error);
    return [];
  }
}

export async function recordExamAttempt(params: {
  question: ExamMcqQuestion;
  chosenOption: string;
  isCorrect: boolean;
}): Promise<void> {
  try {
    const attempts = await loadExamAttempts();
    attempts.unshift({
      questionId: params.question.id,
      subject: params.question.subject,
      chosenOption: params.chosenOption,
      isCorrect: params.isCorrect,
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(EXAM_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts.slice(0, 500)));
  } catch (error) {
    console.log('[ExamPreparation] Failed to save attempt:', error);
  }
}

export async function askGeminiTutor(params: {
  question: string;
  subject?: string;
  syllabusContext?: string;
  chatHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
}): Promise<{ reply: string; usedAi: boolean }> {
  const config = readExamPreparationConfig();
  if (!config.geminiApiKey) {
    return {
      reply: 'Add a Gemini API key in app.json extra.examPreparation.geminiApiKey to enable AI tutoring. For now, I can still help you study by loading the syllabus and MCQs.',
      usedAi: false,
    };
  }

  const model = config.geminiModel?.trim() || 'gemini-1.5-flash';
  const history = (params.chatHistory ?? []).slice(-8).map((item) => `${item.role.toUpperCase()}: ${item.text}`).join('\n');
  const prompt = [
    'You are a concise but helpful exam tutor.',
    params.subject ? `Subject: ${params.subject}` : '',
    params.syllabusContext ? `Syllabus context: ${params.syllabusContext}` : '',
    history ? `Chat history:\n${history}` : '',
    `Student question: ${params.question}`,
    'Give a direct answer, then a short explanation, then one practice tip.',
  ].filter(Boolean).join('\n\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status})`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim();
  return {
    reply: text || 'I could not generate a tutor reply right now.',
    usedAi: true,
  };
}

export function groupBySubject<T extends { subject: string }>(items: T[]): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    if (!groups[item.subject]) {
      groups[item.subject] = [];
    }
    groups[item.subject].push(item);
    return groups;
  }, {});
}