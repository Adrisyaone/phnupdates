import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Link, RefreshCw, Save, Trash2, XCircle } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { getStoredGasUrl, saveGasUrl, testGasUrl } from '@/services/examPreparation';

export default function ExamSettingsScreen() {
  const [url, setUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    const stored = await getStoredGasUrl();
    setUrl(stored);
    setSavedUrl(stored);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGasUrl(url);
      setSavedUrl(url.trim());
      setTestResult(null);
      Alert.alert('Saved', 'GAS URL saved. Pull to refresh on the Practice MCQs screen.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const target = url.trim();
    if (!target) {
      Alert.alert('No URL', 'Enter a URL first.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testGasUrl(target);
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    Alert.alert('Clear URL', 'Remove the saved GAS URL? The app will fall back to built-in sample questions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await saveGasUrl('');
          setUrl('');
          setSavedUrl('');
          setTestResult(null);
        },
      },
    ]);
  };

  const isDirty = url.trim() !== savedUrl;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* URL input card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Link size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Google Apps Script URL</Text>
          </View>
          <Text style={styles.hint}>
            Paste your deployed Apps Script URL (ends in <Text style={styles.mono}>/exec</Text>).
            {'\n'}Make sure deployment access is set to{' '}
            <Text style={styles.bold}>Anyone</Text> (no sign-in required).
          </Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={url}
            onChangeText={(text) => { setUrl(text); setTestResult(null); }}
            placeholder="https://script.google.com/macros/s/.../exec"
            placeholderTextColor={colors.textSecondary + '88'}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />

          {/* Test result */}
          {testResult ? (
            <View style={[styles.resultBanner, testResult.ok ? styles.resultOk : styles.resultErr]}>
              {testResult.ok
                ? <CheckCircle2 size={15} color={colors.success} />
                : <XCircle size={15} color={colors.error} />}
              <Text style={[styles.resultText, testResult.ok ? styles.resultTextOk : styles.resultTextErr]}>
                {testResult.message}
              </Text>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleTest}
              disabled={testing || !url.trim()}
            >
              {testing
                ? <ActivityIndicator size={14} color={colors.primary} />
                : <RefreshCw size={14} color={colors.primary} />}
              <Text style={styles.btnSecondaryText}>Test</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, !isDirty && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving || !isDirty}
            >
              {saving
                ? <ActivityIndicator size={14} color="#fff" />
                : <Save size={14} color="#fff" />}
              <Text style={styles.btnPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Clear saved URL */}
        {savedUrl ? (
          <TouchableOpacity style={styles.clearRow} onPress={handleClear}>
            <Trash2 size={14} color={colors.error} />
            <Text style={styles.clearText}>Clear saved URL</Text>
          </TouchableOpacity>
        ) : null}

        {/* Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to get the URL</Text>
          <Text style={styles.step}>1. Open your Google Apps Script project</Text>
          <Text style={styles.step}>2. Click <Text style={styles.bold}>Deploy → Manage deployments</Text></Text>
          <Text style={styles.step}>3. Edit the deployment → set <Text style={styles.bold}>Who has access</Text> to <Text style={styles.bold}>Anyone</Text> (no sign-in)</Text>
          <Text style={styles.step}>4. Click Deploy → copy the Web app URL</Text>
          <Text style={styles.step}>5. Paste it above, tap Test, then Save</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14 },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },

  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  bold: { fontWeight: '700', color: colors.text },

  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
    textAlignVertical: 'top',
  },

  resultBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
  },
  resultOk: { borderColor: colors.success + '55', backgroundColor: colors.success + '14' },
  resultErr: { borderColor: colors.error + '55', backgroundColor: colors.error + '14' },
  resultText: { flex: 1, fontSize: 13, lineHeight: 18 },
  resultTextOk: { color: colors.success },
  resultTextErr: { color: colors.error },

  actionRow: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    paddingVertical: 11,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: {
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnSecondaryText: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  clearText: { color: colors.error, fontSize: 13, fontWeight: '600' },

  step: { color: colors.textSecondary, fontSize: 13, lineHeight: 22 },
}));
