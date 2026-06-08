import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2,
  FileText,
  FilePlus2,
  Hash,
  Layers,
  LockOpen,
  Minus,
  Package,
  RotateCw,
  Scissors,
  Trash2,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFDocument, rgb, StandardFonts, degrees } from '@/services/pdfLib';
import { colors, createThemedStyles } from '@/constants/colors';

const TOOL_COLOR = '#DC2626';

type ToolKey =
  | 'merge'
  | 'split'
  | 'rotate'
  | 'remove-pages'
  | 'page-numbers'
  | 'watermark'
  | 'compress'
  | 'unlock';

const TOOL_META: Record<ToolKey, { title: string; subtitle: string; multi: boolean; outputName: string }> = {
  merge: {
    title: 'Merge PDF',
    subtitle: 'Combine multiple PDFs into one document.',
    multi: true,
    outputName: 'merged.pdf',
  },
  split: {
    title: 'Split PDF',
    subtitle: 'Extract a range of pages into a new PDF.',
    multi: false,
    outputName: 'split.pdf',
  },
  rotate: {
    title: 'Rotate PDF',
    subtitle: 'Rotate all pages in the PDF.',
    multi: false,
    outputName: 'rotated.pdf',
  },
  'remove-pages': {
    title: 'Remove Pages',
    subtitle: 'Delete specific pages from the PDF.',
    multi: false,
    outputName: 'pages-removed.pdf',
  },
  'page-numbers': {
    title: 'Add Page Numbers',
    subtitle: 'Insert a page number at the bottom of each page.',
    multi: false,
    outputName: 'numbered.pdf',
  },
  watermark: {
    title: 'Watermark PDF',
    subtitle: 'Stamp a diagonal text watermark on every page.',
    multi: false,
    outputName: 'watermarked.pdf',
  },
  compress: {
    title: 'Compress PDF',
    subtitle: 'Re-save with optimisations to reduce file size.',
    multi: false,
    outputName: 'compressed.pdf',
  },
  unlock: {
    title: 'Unlock PDF',
    subtitle: 'Remove password protection. Provide the current password.',
    multi: false,
    outputName: 'unlocked.pdf',
  },
};

type PickedFile = { name: string; uri: string };

// ── helpers ────────────────────────────────────────────────────────────────

async function readPdfBytes(uri: string): Promise<Uint8Array> {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sharePdf(bytes: Uint8Array, filename: string): Promise<void> {
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  const dest = `${FileSystem.cacheDirectory ?? ''}${filename}`;
  await FileSystem.writeAsStringAsync(dest, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save or share your PDF',
      UTI: 'com.adobe.pdf',
    });
  }
}

function parsePages(input: string, total: number): number[] {
  const indices: number[] = [];
  input.split(',').forEach((part) => {
    const t = part.trim();
    const range = t.split('-');
    if (range.length === 2) {
      const s = parseInt(range[0], 10);
      const e = parseInt(range[1], 10);
      if (!isNaN(s) && !isNaN(e)) {
        for (let i = s; i <= e; i++) {
          if (i >= 1 && i <= total) indices.push(i - 1);
        }
      }
    } else {
      const n = parseInt(t, 10);
      if (!isNaN(n) && n >= 1 && n <= total) indices.push(n - 1);
    }
  });
  return [...new Set(indices)].sort((a, b) => a - b);
}

// ── tool operations ─────────────────────────────────────────────────────────

async function runMerge(files: PickedFile[]): Promise<void> {
  if (files.length < 2) throw new Error('Select at least 2 PDF files to merge.');
  const merged = await PDFDocument.create();
  for (const f of files) {
    const bytes = await readPdfBytes(f.uri);
    const doc = await PDFDocument.load(bytes);
    const copied = await merged.copyPages(doc, doc.getPageIndices());
    copied.forEach((p) => merged.addPage(p));
  }
  await sharePdf(await merged.save(), TOOL_META.merge.outputName);
}

async function runSplit(file: PickedFile, pageInput: string): Promise<void> {
  const bytes = await readPdfBytes(file.uri);
  const doc = await PDFDocument.load(bytes);
  const indices = parsePages(pageInput, doc.getPageCount());
  if (indices.length === 0) throw new Error('No valid page numbers. Use format: 1-3 or 1,3,5');
  const out = await PDFDocument.create();
  const copied = await out.copyPages(doc, indices);
  copied.forEach((p) => out.addPage(p));
  await sharePdf(await out.save(), TOOL_META.split.outputName);
}

async function runRotate(file: PickedFile, deg: number): Promise<void> {
  const bytes = await readPdfBytes(file.uri);
  const doc = await PDFDocument.load(bytes);
  doc.getPages().forEach((p) => {
    p.setRotation(degrees((p.getRotation().angle + deg) % 360));
  });
  await sharePdf(await doc.save(), TOOL_META.rotate.outputName);
}

async function runRemovePages(file: PickedFile, pageInput: string): Promise<void> {
  const bytes = await readPdfBytes(file.uri);
  const doc = await PDFDocument.load(bytes);
  const total = doc.getPageCount();
  const indices = parsePages(pageInput, total);
  if (indices.length === 0) throw new Error('No valid page numbers. Use format: 1-3 or 1,3,5');
  if (indices.length >= total) throw new Error('Cannot remove all pages from the document.');
  [...indices].sort((a, b) => b - a).forEach((i) => doc.removePage(i));
  await sharePdf(await doc.save(), TOOL_META['remove-pages'].outputName);
}

async function runPageNumbers(file: PickedFile): Promise<void> {
  const bytes = await readPdfBytes(file.uri);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((page, i) => {
    const { width } = page.getSize();
    const label = String(i + 1);
    const tw = font.widthOfTextAtSize(label, 11);
    page.drawText(label, {
      x: (width - tw) / 2,
      y: 18,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });
  await sharePdf(await doc.save(), TOOL_META['page-numbers'].outputName);
}

async function runWatermark(file: PickedFile, text: string): Promise<void> {
  if (!text.trim()) throw new Error('Enter watermark text first.');
  const bytes = await readPdfBytes(file.uri);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const size = Math.min(width, height) * 0.08;
    const tw = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - tw) / 2,
      y: height / 2 - size / 2,
      size,
      font,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.35,
      rotate: degrees(45),
    });
  });
  await sharePdf(await doc.save(), TOOL_META.watermark.outputName);
}

async function runCompress(file: PickedFile): Promise<void> {
  const bytes = await readPdfBytes(file.uri);
  const doc = await PDFDocument.load(bytes);
  await sharePdf(await doc.save({ useObjectStreams: true }), TOOL_META.compress.outputName);
}

async function runUnlock(file: PickedFile, password: string): Promise<void> {
  const bytes = await readPdfBytes(file.uri);
  const doc = await PDFDocument.load(bytes, { password });
  await sharePdf(await doc.save(), TOOL_META.unlock.outputName);
}

// ── screen ──────────────────────────────────────────────────────────────────

export default function PdfToolsScreen() {
  const { tool } = useLocalSearchParams<{ tool?: string }>();
  const toolKey = (tool ?? 'merge') as ToolKey;
  const meta = TOOL_META[toolKey] ?? TOOL_META.merge;

  const [files, setFiles] = useState<PickedFile[]>([]);
  const [pageInput, setPageInput] = useState('');
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);
  const [watermarkText, setWatermarkText] = useState('');
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(false);

  const pickFiles = async () => {
    if (Platform.OS === 'web') {
      setStatus('File picking is only available on iOS and Android.');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: meta.multi,
    });
    if (result.canceled) return;
    const picked: PickedFile[] = result.assets.map((a) => ({ name: a.name, uri: a.uri }));
    setFiles(meta.multi ? [...files, ...picked] : [picked[0]]);
    setStatus('');
    setDone(false);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setDone(false);
  };

  const process = async () => {
    if (Platform.OS === 'web') {
      setStatus('PDF processing is only available on iOS and Android.');
      return;
    }
    if (files.length === 0) {
      Alert.alert('No file selected', 'Pick a PDF file first.');
      return;
    }
    setProcessing(true);
    setStatus('Processing…');
    setDone(false);
    try {
      switch (toolKey) {
        case 'merge':        await runMerge(files); break;
        case 'split':        await runSplit(files[0], pageInput); break;
        case 'rotate':       await runRotate(files[0], rotation); break;
        case 'remove-pages': await runRemovePages(files[0], pageInput); break;
        case 'page-numbers': await runPageNumbers(files[0]); break;
        case 'watermark':    await runWatermark(files[0], watermarkText); break;
        case 'compress':     await runCompress(files[0]); break;
        case 'unlock':       await runUnlock(files[0], password); break;
      }
      setStatus('Done — share sheet opened.');
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Failed: ${msg}`);
      Alert.alert('Error', msg);
    } finally {
      setProcessing(false);
    }
  };

  const canProcess = files.length > 0 && !processing;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <Stack.Screen options={{ title: meta.title }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={[styles.heroCard, { borderColor: TOOL_COLOR + '33', backgroundColor: TOOL_COLOR + '0D' }]}>
          <View style={[styles.heroIcon, { backgroundColor: TOOL_COLOR }]}>
            {toolKey === 'merge' && <Layers size={20} color="#fff" />}
            {toolKey === 'split' && <Scissors size={20} color="#fff" />}
            {toolKey === 'rotate' && <RotateCw size={20} color="#fff" />}
            {toolKey === 'remove-pages' && <Minus size={20} color="#fff" />}
            {toolKey === 'page-numbers' && <Hash size={20} color="#fff" />}
            {toolKey === 'watermark' && <FileText size={20} color="#fff" />}
            {toolKey === 'compress' && <Package size={20} color="#fff" />}
            {toolKey === 'unlock' && <LockOpen size={20} color="#fff" />}
          </View>
          <Text style={styles.heroTitle}>{meta.title}</Text>
          <Text style={styles.heroSubtitle}>{meta.subtitle}</Text>
        </View>

        {/* File picker */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            {meta.multi ? 'PDF Files' : 'PDF File'}
          </Text>

          <TouchableOpacity style={styles.pickButton} onPress={() => { void pickFiles(); }}>
            <FilePlus2 size={18} color={TOOL_COLOR} />
            <Text style={styles.pickButtonText}>
              {meta.multi ? 'Add PDFs' : (files.length === 0 ? 'Pick PDF' : 'Replace PDF')}
            </Text>
          </TouchableOpacity>

          {files.length > 0 && (
            <View style={styles.fileList}>
              {files.map((f, i) => (
                <View key={`${f.uri}-${i}`} style={styles.fileRow}>
                  <FileText size={16} color={TOOL_COLOR} />
                  <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => removeFile(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tool-specific config */}
        {(toolKey === 'split' || toolKey === 'remove-pages') && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              {toolKey === 'split' ? 'Pages to Keep' : 'Pages to Remove'}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 1-3, 5, 7-9"
              placeholderTextColor={colors.textLight}
              value={pageInput}
              onChangeText={setPageInput}
              keyboardType="default"
            />
            <Text style={styles.inputHint}>Separate ranges with commas. Example: 1-3, 5, 7</Text>
          </View>
        )}

        {toolKey === 'rotate' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Rotation</Text>
            <View style={styles.rotationRow}>
              {([90, 180, 270] as const).map((deg) => (
                <TouchableOpacity
                  key={deg}
                  style={[styles.rotationButton, rotation === deg && styles.rotationButtonActive]}
                  onPress={() => setRotation(deg)}
                >
                  <Text style={[styles.rotationButtonText, rotation === deg && styles.rotationButtonTextActive]}>
                    {deg}°
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {toolKey === 'watermark' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Watermark Text</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. CONFIDENTIAL"
              placeholderTextColor={colors.textLight}
              value={watermarkText}
              onChangeText={setWatermarkText}
              autoCapitalize="characters"
            />
          </View>
        )}

        {toolKey === 'unlock' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Current Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter PDF password"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Text style={styles.inputHint}>Works for PDFs with standard (RC4/128-bit) protection.</Text>
          </View>
        )}

        {/* Action */}
        <View style={styles.actionCard}>
          <TouchableOpacity
            style={[styles.processButton, !canProcess && styles.processButtonDisabled]}
            onPress={() => { void process(); }}
            disabled={!canProcess}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                {done
                  ? <CheckCircle2 size={18} color="#fff" />
                  : <FileText size={18} color="#fff" />}
                <Text style={styles.processButtonText}>
                  {done ? 'Done — Run Again' : meta.title}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {status ? (
            <Text style={[styles.statusText, done && styles.statusTextSuccess]}>{status}</Text>
          ) : null}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 30 },

  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: '800' as const },
  heroSubtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },

  pickButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderWidth: 1,
    borderColor: TOOL_COLOR,
    borderRadius: 12,
    backgroundColor: TOOL_COLOR + '10',
    paddingVertical: 11,
  },
  pickButtonText: { color: TOOL_COLOR, fontWeight: '700' as const, fontSize: 14 },

  fileList: { gap: 8 },
  fileRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fileName: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '500' as const,
  },

  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.background,
  },
  inputHint: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },

  rotationRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  rotationButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center' as const,
    backgroundColor: colors.surfaceAlt,
  },
  rotationButtonActive: {
    borderColor: TOOL_COLOR,
    backgroundColor: TOOL_COLOR + '15',
  },
  rotationButtonText: {
    color: colors.textSecondary,
    fontWeight: '700' as const,
    fontSize: 14,
  },
  rotationButtonTextActive: { color: TOOL_COLOR },

  actionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  processButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: TOOL_COLOR,
    borderRadius: 12,
    paddingVertical: 14,
  },
  processButtonDisabled: { opacity: 0.45 },
  processButtonText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },

  statusText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  statusTextSuccess: { color: colors.success ?? '#16A34A' },
}));
