import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { EXAM_MCQ_SEED, EXAM_SYLLABUS_SEED } from '@/mocks/examPreparation';

const EXAM_ATTEMPTS_STORAGE_KEY = 'exam_preparation_attempts_v1';
const EXAM_MCQ_CACHE_KEY = 'exam_mcq_cache_v1';

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
  gasUrl?: string;
  mcqSheetUrl?: string;
  syllabusSheetUrl?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  flashcardsGasUrl?: string;
}

interface SheetRow {
  [key: string]: string;
}

const STORAGE_GAS_URL_KEY = 'exam_gas_url_override';
const STORAGE_GEMINI_KEY = 'gemini_api_key_override';

function readExamPreparationConfig(): ExamPreparationConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { examPreparation?: ExamPreparationConfig };
  return extra.examPreparation ?? {};
}

export async function getStoredGasUrl(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_GAS_URL_KEY)) ?? '';
}

export async function saveGasUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (trimmed) {
    await AsyncStorage.setItem(STORAGE_GAS_URL_KEY, trimmed);
  } else {
    await AsyncStorage.removeItem(STORAGE_GAS_URL_KEY);
  }
}

export async function testGasUrl(url: string): Promise<{ ok: boolean; message: string; count?: number }> {
  try {
    const rows = await fetchFromGasUrl(url.trim());
    return { ok: true, message: `Connected — ${rows.length} questions found.`, count: rows.length };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// ── Gemini API key storage ────────────────────────────────────────────────

export async function getGeminiKey(): Promise<string> {
  const stored = await AsyncStorage.getItem(STORAGE_GEMINI_KEY);
  if (stored?.trim()) return stored.trim();
  const config = readExamPreparationConfig();
  return config.geminiApiKey?.trim() ?? '';
}

export async function saveGeminiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (trimmed) {
    await AsyncStorage.setItem(STORAGE_GEMINI_KEY, trimmed);
  } else {
    await AsyncStorage.removeItem(STORAGE_GEMINI_KEY);
  }
}

// ── AI MCQ generation ─────────────────────────────────────────────────────

export interface AiMcq {
  id: string;
  question: string;
  options: string[];
  correct: number[];   // 0-based indices
  explanation: string;
}

export async function generateAiMcqs(params: {
  topic: string;
  subtopic?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  count: number;
}): Promise<AiMcq[]> {
  const { topic, subtopic, difficulty, count } = params;
  const focusNote = subtopic?.trim() ? ` focusing specifically on "${subtopic.trim()}"` : '';
  const diffNote = difficulty === 'mixed'
    ? 'with a mix of easy, medium, and hard difficulty levels'
    : `at ${difficulty} difficulty`;

  const prompt = `You are a public health MCQ generator. Generate exactly ${count} high-quality multiple choice questions about ${topic}${focusNote}, ${diffNote}.

Some questions may have multiple correct answers (2 or more).

Return ONLY a valid JSON array — no markdown, no explanation, no extra text — with this exact structure:
[
  {
    "question": "full question text",
    "options": ["option A text", "option B text", "option C text", "option D text"],
    "correct": [0],
    "explanation": "concise explanation of the correct answer (1-3 sentences)"
  }
]

Rules:
- "correct" is an array of zero-based indices of the correct answer(s)
- Always provide exactly 4 options
- Multi-correct example: "correct": [0, 2] means options A and C are both correct
- Do NOT prefix options with A., B., 1., 2., etc.
- Questions must be factually accurate and clinically/epidemiologically relevant`;

  // Free AI via Pollinations.ai — no API key required
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  let text = '';
  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'You are a medical education assistant. Respond ONLY with a valid JSON array. ' +
              'No prose, no markdown code fences, no extra text before or after the array.',
          },
          { role: 'user', content: prompt },
        ],
        model: 'openai',
        seed: Math.floor(Math.random() * 99999),
        jsonMode: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      if (response.status === 429) throw new Error('AI service is busy. Wait a moment and try again.');
      throw new Error(`AI service error (${response.status})${errBody ? ': ' + errBody.substring(0, 100) : ''}. Try again.`);
    }

    text = await response.text();
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Request timed out (60 s). Try fewer questions or try again.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  // Handle both plain-text JSON and OpenAI-style response objects
  let content = text.trim();
  try {
    const parsed = JSON.parse(content) as unknown;
    // If it looks like an OpenAI choices object, unwrap it
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const choices = (parsed as { choices?: Array<{ message?: { content?: string } }> }).choices;
      if (choices?.[0]?.message?.content) {
        content = choices[0].message.content;
      }
    } else if (Array.isArray(parsed)) {
      content = text; // already a JSON array string
    }
  } catch {
    // not valid JSON at top level — extract the array substring below
  }

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(
      'AI did not return a question list. ' +
      (content.length > 0 ? `Response: "${content.substring(0, 120)}"` : 'Empty response.') +
      ' Try again.'
    );
  }

  let raw: Array<{ question: string; options: string[]; correct: number[]; explanation: string }>;
  try {
    raw = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Could not parse AI response as JSON. Try again.');
  }

  if (!Array.isArray(raw) || raw.length === 0) throw new Error('AI returned 0 questions. Try again.');

  return raw.map((q, i) => ({
    id: `ai-${Date.now()}-${i}`,
    question: q.question ?? '',
    options: Array.isArray(q.options) ? q.options : [],
    correct: Array.isArray(q.correct) ? q.correct : [q.correct as unknown as number],
    explanation: q.explanation ?? '',
  }));
}

async function resolveGasUrl(): Promise<string | null> {
  const stored = await getStoredGasUrl();
  if (stored) return stored;
  const config = readExamPreparationConfig();
  return config.gasUrl?.trim() || null;
}

async function saveMcqCache(questions: ExamMcqQuestion[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EXAM_MCQ_CACHE_KEY, JSON.stringify(questions));
  } catch {
    // cache write failure is non-fatal
  }
}

async function loadMcqCache(): Promise<ExamMcqQuestion[] | null> {
  try {
    const raw = await AsyncStorage.getItem(EXAM_MCQ_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamMcqQuestion[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
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

async function fetchFromGasUrl(gasUrl: string): Promise<SheetRow[]> {
  const response = await fetch(gasUrl, {
    method: 'GET',
    redirect: 'follow',
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`GAS HTTP ${response.status}: ${text.substring(0, 200)}`);
  }

  // Google returns an HTML login/error page when access is not "Anyone"
  if (text.trimStart().startsWith('<')) {
    const snippet = text.substring(0, 300).replace(/\s+/g, ' ');
    throw new Error(
      `GAS returned HTML (not JSON). Final URL: ${response.url}\n\nHTML snippet: ${snippet}`
    );
  }

  let data: { questions?: SheetRow[]; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`GAS response is not valid JSON: ${text.substring(0, 80)}`);
  }

  if (data.error) {
    throw new Error(`GAS script error: ${data.error}`);
  }

  if (!Array.isArray(data.questions)) {
    throw new Error(`GAS response has no "questions" array. Keys: ${Object.keys(data).join(', ')}`);
  }

  if (data.questions.length === 0) {
    throw new Error(
      'GAS returned 0 questions. Check that sheet tab names contain the columns ' +
      '"Question" and "Option A" in row 1.'
    );
  }

  return data.questions;
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

/**
 * Resolves which option indices are correct for a question.
 * Handles letter-based answers (A, B, C, D), multi-correct ("A, B"),
 * and full option-text answers.
 */
export function resolveCorrectOptionIndices(options: string[], rawAnswer: string): number[] {
  const letterToIndex: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
  const parts = rawAnswer.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);

  const indices: number[] = [];
  for (const part of parts) {
    const byLetter = letterToIndex[part];
    if (byLetter !== undefined && byLetter < options.length) {
      if (!indices.includes(byLetter)) indices.push(byLetter);
      continue;
    }
    const byText = options.findIndex((o) => o.trim().toLowerCase() === part);
    if (byText >= 0 && !indices.includes(byText)) indices.push(byText);
  }

  if (indices.length === 0) {
    const fullText = options.findIndex((o) => o.trim().toLowerCase() === rawAnswer.trim().toLowerCase());
    if (fullText >= 0) indices.push(fullText);
  }

  return indices;
}

export type McqLoadSource = 'gas' | 'google-sheet' | 'cache' | 'local-seed';

export interface McqLoadResult {
  questions: ExamMcqQuestion[];
  source: McqLoadSource;
  error: string | null;
}

export async function loadExamMcqQuestions(): Promise<McqLoadResult> {
  const config = readExamPreparationConfig();
  const gasUrl = await resolveGasUrl();

  // 1. Try Google Apps Script endpoint
  if (gasUrl) {
    try {
      const rows = await fetchFromGasUrl(gasUrl);
      const questions = parseMcqRows(rows, 'gas');
      if (questions.length > 0) {
        const sorted = sortBySubjectAndOrder(questions);
        void saveMcqCache(sorted);
        return { questions: sorted, source: 'gas', error: null };
      }
      return {
        questions: [],
        source: 'gas',
        error: 'GAS returned questions but none could be parsed. Check column headers.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('[ExamPreparation] GAS failed:', message);

      // Try CSV sheet next
      try {
        const rows = await fetchSheetRows(config.mcqSheetUrl);
        const questions = parseMcqRows(rows, 'google-sheet');
        if (questions.length > 0) {
          const sorted = sortBySubjectAndOrder(questions);
          void saveMcqCache(sorted);
          return {
            questions: sorted,
            source: 'google-sheet',
            error: `GAS unavailable (${message}). Loaded from CSV sheet instead.`,
          };
        }
      } catch {
        // fall through to cache
      }

      // Try cached questions from a previous successful load
      const cached = await loadMcqCache();
      if (cached) {
        return {
          questions: cached,
          source: 'cache',
          error: `GAS unavailable: ${message}. Showing previously saved questions.`,
        };
      }

      return { questions: makeSeedQuestions(), source: 'local-seed', error: `GAS unavailable: ${message}` };
    }
  }

  // 2. Try single CSV sheet URL
  try {
    const rows = await fetchSheetRows(config.mcqSheetUrl);
    const questions = parseMcqRows(rows, 'google-sheet');
    if (questions.length > 0) {
      const sorted = sortBySubjectAndOrder(questions);
      void saveMcqCache(sorted);
      return { questions: sorted, source: 'google-sheet', error: null };
    }
  } catch (error) {
    console.log('[ExamPreparation] CSV sheet failed:', error);
  }

  // 3. Try cache
  const cached = await loadMcqCache();
  if (cached) {
    return { questions: cached, source: 'cache', error: null };
  }

  // 4. Local seed fallback
  return { questions: makeSeedQuestions(), source: 'local-seed', error: null };
}

function makeSeedQuestions(): ExamMcqQuestion[] {
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

// ── Flashcards ───────────────────────────────────────────────────────────────

const FLASHCARD_CACHE_KEY = 'exam_flashcards_cache_v1';
const STORAGE_FLASHCARD_GAS_URL_KEY = 'exam_flashcard_gas_url_v1';

export interface Flashcard {
  id: string;
  subject: string;
  term: string;
  definition: string;
  difficulty: string;
}

export interface FlashcardLoadResult {
  cards: Flashcard[];
  error: string | null;
}

export async function getStoredFlashcardGasUrl(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_FLASHCARD_GAS_URL_KEY)) ?? '';
}

export async function saveFlashcardGasUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (trimmed) {
    await AsyncStorage.setItem(STORAGE_FLASHCARD_GAS_URL_KEY, trimmed);
  } else {
    await AsyncStorage.removeItem(STORAGE_FLASHCARD_GAS_URL_KEY);
  }
}

async function fetchFlashcardsFromGas(gasUrl: string): Promise<Flashcard[]> {
  const response = await fetch(gasUrl, { method: 'GET', redirect: 'follow' });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Flashcard GAS HTTP ${response.status}: ${text.substring(0, 200)}`);
  }
  if (text.trimStart().startsWith('<')) {
    throw new Error('Flashcard GAS returned HTML. Ensure deployment access is set to "Anyone".');
  }

  let data: { flashcards?: Array<{ subject: string; term: string; definition: string; difficulty: string }>; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Flashcard GAS response is not valid JSON: ${text.substring(0, 80)}`);
  }

  if (data.error) throw new Error(`Flashcard GAS script error: ${data.error}`);
  if (!Array.isArray(data.flashcards)) {
    throw new Error('Flashcard GAS response missing "flashcards" array. Check the Apps Script code.');
  }

  return data.flashcards
    .filter((item) => item.term?.trim() && item.definition?.trim())
    .map((item, i) => ({
      id: `fc-${item.subject}-${i}-${item.term}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
      subject: item.subject?.trim() || 'General',
      term: item.term.trim(),
      definition: item.definition.trim(),
      difficulty: item.difficulty?.trim() || 'Medium',
    }));
}

export async function loadFlashcards(): Promise<FlashcardLoadResult> {
  const config = readExamPreparationConfig();
  const storedUrl = await getStoredFlashcardGasUrl();
  const gasUrl = storedUrl || config.flashcardsGasUrl?.trim() || null;

  if (gasUrl) {
    try {
      const cards = await fetchFlashcardsFromGas(gasUrl);
      if (cards.length > 0) {
        await AsyncStorage.setItem(FLASHCARD_CACHE_KEY, JSON.stringify(cards)).catch(() => {});
        return { cards, error: null };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        const raw = await AsyncStorage.getItem(FLASHCARD_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as Flashcard[];
          if (cached.length > 0) {
            return { cards: cached, error: `Could not refresh: ${message}. Showing cached cards.` };
          }
        }
      } catch { /* ignore cache read failure */ }
      return { cards: [], error: message };
    }
  }

  try {
    const raw = await AsyncStorage.getItem(FLASHCARD_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as Flashcard[];
      if (cached.length > 0) return { cards: cached, error: null };
    }
  } catch { /* ignore */ }

  return {
    cards: [],
    error: gasUrl
      ? 'No flashcards returned from the GAS URL.'
      : 'No Flashcard GAS URL configured. Add one in Exam Preparation → Settings.',
  };
}