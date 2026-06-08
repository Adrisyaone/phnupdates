import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { FilePlus2, FileText, ImagePlus, NotebookPen, Plus, Trash2, X } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';

interface KeepNoteAttachment {
  id: string;
  name: string;
  uri: string;
  kind: 'image' | 'pdf';
}

interface KeepNoteItem {
  id: string;
  date: string;
  title: string;
  body: string;
  attachments: KeepNoteAttachment[];
  createdAt: string;
}

interface DraftAttachment {
  id: string;
  name: string;
  uri: string;
  kind: 'image' | 'pdf';
}

const STORAGE_KEY = 'keep_notes_v2';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function loadNotes(): Promise<KeepNoteItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KeepNoteItem[]) : [];
  } catch {
    return [];
  }
}

async function saveNotes(notes: KeepNoteItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export default function KeepNotesScreen() {
  const [notes, setNotes] = useState<KeepNoteItem[]>([]);
  const [date, setDate] = useState(todayIso());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<KeepNoteAttachment | null>(null);

  useEffect(() => {
    void (async () => {
      setNotes(await loadNotes());
    })();
  }, []);

  const sections = useMemo(() => {
    const groups = new Map<string, KeepNoteItem[]>();
    [...notes].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).forEach((note) => {
      const current = groups.get(note.date) || [];
      current.push(note);
      groups.set(note.date, current);
    });
    return Array.from(groups.entries()).map(([sectionTitle, data]) => ({ sectionTitle, data }));
  }, [notes]);

  const addImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery access is required to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const fileName = asset.fileName || `image-${Date.now()}.jpg`;

    setAttachments((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, name: fileName, uri: asset.uri, kind: 'image' }]);
  }, []);

  const addPdf = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const fileName = asset.name || `document-${Date.now()}.pdf`;

    setAttachments((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, name: fileName, uri: asset.uri, kind: 'pdf' }]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const saveNote = useCallback(async () => {
    if (!title.trim() && !body.trim() && attachments.length === 0) {
      Alert.alert('Nothing to save', 'Add a title, note, or attachment first.');
      return;
    }

    const now = new Date().toISOString();
    const nextNote: KeepNoteItem = {
      id: `${Date.now()}`,
      date,
      title: title.trim() || 'Untitled note',
      body: body.trim(),
      attachments: attachments.map((item) => ({ id: item.id, name: item.name, uri: item.uri, kind: item.kind })),
      createdAt: now,
    };

    const nextNotes = [nextNote, ...notes];
    setNotes(nextNotes);
    await saveNotes(nextNotes);
    setTitle('');
    setBody('');
    setAttachments([]);
  }, [attachments, body, date, notes, title]);

  const deleteNote = useCallback(async (id: string) => {
    const nextNotes = notes.filter((item) => item.id !== id);
    setNotes(nextNotes);
    setSelectedNoteId((current) => (current === id ? null : current));
    await saveNotes(nextNotes);
  }, [notes]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const openAttachment = useCallback((attachment: KeepNoteAttachment) => {
    setPreviewAttachment(attachment);
  }, []);

  const closeAttachmentPreview = useCallback(() => {
    setPreviewAttachment(null);
  }, []);

  const openPdfExternally = useCallback(async () => {
    if (!previewAttachment) return;
    try {
      await Linking.openURL(previewAttachment.uri);
    } catch {
      Alert.alert('Unable to open PDF', 'No app is available to open this file.');
    }
  }, [previewAttachment]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <View style={styles.headerWrap}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <NotebookPen size={22} color={colors.surface} />
              </View>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>Keep Notes</Text>
                <Text style={styles.heroSubtitle}>Save day-wise notes and attach images or PDF documents.</Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionLabel}>New note for {formatShortDate(date)}</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor={colors.textLight}
                style={styles.input}
              />
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Write your note"
                placeholderTextColor={colors.textLight}
                style={[styles.input, styles.bodyInput]}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionButton} onPress={() => { void addImage(); }}>
                  <ImagePlus size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => { void addPdf(); }}>
                  <FilePlus2 size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>PDF</Text>
                </TouchableOpacity>
              </View>

              {attachments.length > 0 ? (
                <View style={styles.attachmentList}>
                  {attachments.map((attachment) => (
                    <View key={attachment.id} style={styles.attachmentRow}>
                      {attachment.kind === 'image' ? (
                        <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} contentFit="cover" />
                      ) : (
                        <View style={styles.attachmentPdfIcon}>
                          <FileText size={18} color={colors.primary} />
                        </View>
                      )}
                      <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
                      <TouchableOpacity onPress={() => removeAttachment(attachment.id)}>
                        <X size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity style={styles.saveButton} onPress={() => { void saveNote(); }}>
                <Plus size={16} color={colors.surface} />
                <Text style={styles.saveButtonText}>Save note</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{formatDate(section.sectionTitle)}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.noteCard, selectedNoteId === item.id && styles.noteCardSelected]}
            onPress={() => setSelectedNoteId(item.id)}
            activeOpacity={0.85}
          >
            <View style={styles.noteHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>{item.title}</Text>
                <Text style={styles.noteDate}>{formatShortDate(item.date)}</Text>
              </View>
              <TouchableOpacity onPress={() => { void deleteNote(item.id); }}>
                <Trash2 size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
            {item.body ? <Text style={styles.noteBody} numberOfLines={2}>{item.body}</Text> : null}
            {item.attachments.length > 0 ? (
              <Text style={styles.attachmentSummary}>{item.attachments.length} attachment{item.attachments.length === 1 ? '' : 's'}</Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No notes yet.</Text>
            <Text style={styles.emptySubtitle}>Create day-wise notes and attach image or PDF documents.</Text>
          </View>
        )}
      />

      <Modal
        visible={Boolean(selectedNote)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNoteId(null)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{selectedNote?.title || 'Note'}</Text>
              <TouchableOpacity onPress={() => setSelectedNoteId(null)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.noteDate}>{selectedNote ? formatShortDate(selectedNote.date) : ''}</Text>
            {selectedNote?.body ? <Text style={styles.previewBody}>{selectedNote.body}</Text> : null}
            {selectedNote && selectedNote.attachments.length > 0 ? (
              <View style={styles.savedAttachmentList}>
                {selectedNote.attachments.map((attachment) => (
                  <Pressable key={attachment.id} style={styles.savedAttachmentRow} onPress={() => openAttachment(attachment)}>
                    {attachment.kind === 'image' ? (
                      <Image source={{ uri: attachment.uri }} style={styles.savedAttachmentImage} contentFit="cover" />
                    ) : (
                      <View style={styles.attachmentPdfIcon}>
                        <FileText size={18} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
                      <Text style={styles.attachmentHint}>Tap to open</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(previewAttachment)} transparent animationType="fade" onRequestClose={closeAttachmentPreview}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{previewAttachment?.name || 'Attachment'}</Text>
              <TouchableOpacity onPress={closeAttachmentPreview}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {previewAttachment?.kind === 'image' ? (
              <Image source={{ uri: previewAttachment.uri }} style={styles.previewImage} contentFit="contain" />
            ) : (
              <View style={styles.previewPdfBlock}>
                <FileText size={36} color={colors.primary} />
                <Text style={styles.previewPdfText}>Tap below to open this PDF externally.</Text>
                <TouchableOpacity style={styles.previewPdfButton} onPress={() => { void openPdfExternally(); }}>
                  <Text style={styles.previewPdfButtonText}>Open PDF</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((themeColors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  headerWrap: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: themeColors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: 12,
  },
  sectionLabel: {
    color: themeColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceAlt,
    color: themeColors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  bodyInput: {
    minHeight: 110,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.background,
  },
  actionButtonText: {
    color: themeColors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  attachmentList: {
    gap: 8,
  },
  attachmentRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceAlt,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: themeColors.border,
  },
  attachmentPdfIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background,
  },
  attachmentName: {
    flex: 1,
    color: themeColors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  saveButton: {
    borderRadius: 16,
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: themeColors.surface,
    fontWeight: '800',
    fontSize: 13,
  },
  sectionHeader: {
    color: themeColors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    paddingTop: 8,
    paddingBottom: 4,
  },
  noteCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    padding: 11,
    gap: 8,
  },
  noteCardSelected: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary + '10',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteTitle: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  noteDate: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  noteBody: {
    color: themeColors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  attachmentSummary: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  savedAttachmentList: {
    gap: 8,
  },
  savedAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceAlt,
    padding: 10,
  },
  savedAttachmentImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: themeColors.border,
  },
  attachmentPdfIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background,
  },
  attachmentName: {
    flex: 1,
    color: themeColors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  attachmentHint: {
    color: themeColors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  selectedNoteFooter: {
    gap: 8,
    paddingTop: 6,
    paddingBottom: 18,
  },
  selectedNoteHeader: {
    color: themeColors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 56,
    gap: 4,
  },
  emptyTitle: {
    color: themeColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: themeColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 16,
  },
  previewCard: {
    backgroundColor: themeColors.surface,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    maxHeight: '88%',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewTitle: {
    color: themeColors.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 420,
    borderRadius: 16,
    backgroundColor: themeColors.surfaceAlt,
  },
  previewPdfBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  previewPdfText: {
    color: themeColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  previewPdfButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: themeColors.primary,
  },
  previewPdfButtonText: {
    color: themeColors.surface,
    fontWeight: '800',
    fontSize: 13,
  },
}));
