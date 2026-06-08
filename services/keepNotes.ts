import AsyncStorage from '@react-native-async-storage/async-storage';

export interface KeepNoteAttachment {
  id: string;
  name: string;
  uri: string;
  kind: 'image' | 'pdf';
}

export interface KeepNoteItem {
  id: string;
  date: string;
  title: string;
  body: string;
  attachments: KeepNoteAttachment[];
  createdAt: string;
}

const STORAGE_KEY = 'keep_notes_v2';

export async function loadKeepNotes(): Promise<KeepNoteItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KeepNoteItem[]) : [];
  } catch {
    return [];
  }
}

export async function saveKeepNotes(notes: KeepNoteItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export async function appendKeepNote(note: Omit<KeepNoteItem, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<KeepNoteItem[]> {
  const existingNotes = await loadKeepNotes();
  const nextNote: KeepNoteItem = {
    id: note.id || `${Date.now()}`,
    date: note.date,
    title: note.title,
    body: note.body,
    attachments: note.attachments,
    createdAt: note.createdAt || new Date().toISOString(),
  };
  const nextNotes = [nextNote, ...existingNotes];
  await saveKeepNotes(nextNotes);
  return nextNotes;
}