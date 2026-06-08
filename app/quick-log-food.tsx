import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, MicOff, Check, ArrowLeft } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';
import { colors, createThemedStyles } from '@/constants/colors';
import { useFood } from '@/contexts/FoodContext';
import { useSettings } from '@/contexts/SettingsContext';

const FoodSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  servingSize: z.string(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});

let cachedGenerateObject: ((input: any) => Promise<any>) | null = null;
const getGenerateObject = async () => {
  if (cachedGenerateObject) return cachedGenerateObject;
  const toolkit = await import('@rork-ai/toolkit-sdk');
  cachedGenerateObject = toolkit.generateObject;
  return cachedGenerateObject;
};

export default function QuickLogFoodScreen() {
  const router = useRouter();
  const { source, token } = useLocalSearchParams<{ source?: string; token?: string }>();
  const { addEntry } = useFood();
  const { lockApp, revokeNotificationQuickLogAccess, isNotificationQuickLogAccessValid } = useSettings();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [estimatedData, setEstimatedData] = useState<any>(null);
  const [error, setError] = useState('');

  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  React.useEffect(() => {
    if (!source) return;
    const sourceValue = Array.isArray(source) ? source[0] : source;
    const tokenValueRaw = Array.isArray(token) ? token[0] : token;
    const sourceOk = sourceValue === 'notification';
    const accessOk = sourceOk && isNotificationQuickLogAccessValid('food', tokenValueRaw);
    if (!accessOk) {
      revokeNotificationQuickLogAccess();
      router.replace('/(tabs)/(home)' as any);
    }
  }, [isNotificationQuickLogAccessValid, lockApp, revokeNotificationQuickLogAccess, router, source, token]);

  const analyzeTextInput = async () => {
    if (!textInput.trim() || isProcessing) return;
    setIsProcessing(true);
    setError('');
    await processTranscription(textInput.trim());
  };

  const closeAndLock = () => {
    revokeNotificationQuickLogAccess();
    lockApp();
    router.replace('/(tabs)/(home)' as any);
  };

  const startRecording = async () => {
    try {
      setError('');
      setEstimatedData(null);
      setTranscribedText('');

      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
      } else {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
      }

      setIsRecording(true);
    } catch {
      setError('Failed to start recording. Please allow microphone permission.');
    }
  };

  const processTranscription = async (text: string) => {
    try {
      setTranscribedText(text);
      const generateObject = await getGenerateObject();
      const currentHour = new Date().getHours();
      let mealContext = 'snack';
      if (currentHour >= 5 && currentHour < 11) mealContext = 'breakfast';
      else if (currentHour >= 11 && currentHour < 15) mealContext = 'lunch';
      else if (currentHour >= 17 && currentHour < 22) mealContext = 'dinner';

      const result = await generateObject({
        messages: [{
          role: 'user',
          content: `Parse this food and estimate calories, protein, carbs, fat, and fiber. Suggested meal context is ${mealContext}. Description: "${text}".`,
        }],
        schema: FoodSchema,
      });
      setEstimatedData(result);
    } catch {
      setError('Failed to analyze food from voice input.');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);

      if (Platform.OS === 'web') {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) throw new Error('No recording');
        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => resolve();
          mediaRecorder.stop();
        });
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        const response = await fetch('https://toolkit.rork.com/stt/transcribe/', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Transcription failed');
        const result = await response.json();
        await processTranscription(result.text || '');
      } else {
        const recording = recordingRef.current;
        if (!recording) throw new Error('No recording');
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = recording.getURI();
        if (!uri) throw new Error('No URI');
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const formData = new FormData();
        formData.append('audio', { uri, name: `recording.${fileType}`, type: `audio/${fileType}` } as any);
        const response = await fetch('https://toolkit.rork.com/stt/transcribe/', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Transcription failed');
        const result = await response.json();
        await processTranscription(result.text || '');
      }
    } catch {
      setError('Failed to process recording.');
      setIsProcessing(false);
    }
  };

  const saveFood = () => {
    if (!estimatedData) return;
    const fiber = Number(estimatedData.fiber) || 0;
    const servingSize = estimatedData.servingSize || '1 serving';
    addEntry({
      name: estimatedData.name,
      calories: Math.max(0, Number(estimatedData.calories) || 0),
      protein: Math.max(0, Number(estimatedData.protein) || 0),
      carbs: Math.max(0, Number(estimatedData.carbs) || 0),
      fat: Math.max(0, Number(estimatedData.fat) || 0),
      servingSize: fiber > 0 ? `${servingSize} | Fiber: ${fiber}g` : servingSize,
      mealType: estimatedData.mealType || 'snack',
    });

    Alert.alert('Saved', 'Food log saved successfully.', [
      { text: 'OK', onPress: closeAndLock },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={closeAndLock} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Quick Food Log</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.help}>Use voice to log food from notification. Macros and fiber are estimated automatically.</Text>

        {!isRecording ? (
          <TouchableOpacity style={styles.recordBtn} onPress={startRecording} disabled={isProcessing}>
            <Mic size={24} color="#fff" />
            <Text style={styles.recordText}>Start Voice Input</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.recordBtn, { backgroundColor: '#EF4444' }]} onPress={stopRecording}>
            <MicOff size={24} color="#fff" />
            <Text style={styles.recordText}>Stop Recording</Text>
          </TouchableOpacity>
        )}

        {isProcessing && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}

        <TextInput
          style={styles.input}
          value={textInput}
          onChangeText={setTextInput}
          multiline
          placeholder="Type food details, e.g. rice and chicken for lunch"
        />
        <TouchableOpacity style={styles.analyzeBtn} onPress={analyzeTextInput} disabled={isProcessing || !textInput.trim()}>
          <Text style={styles.analyzeText}>Analyze Typed Text</Text>
        </TouchableOpacity>

        {transcribedText ? (
          <TextInput
            style={styles.input}
            value={transcribedText}
            onChangeText={setTranscribedText}
            multiline
            placeholder="Transcribed text"
          />
        ) : null}

        {estimatedData ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>Food: {estimatedData.name}</Text>
            <Text style={styles.resultText}>Calories: {estimatedData.calories}</Text>
            <Text style={styles.resultText}>Protein: {estimatedData.protein}g</Text>
            <Text style={styles.resultText}>Carbs: {estimatedData.carbs}g</Text>
            <Text style={styles.resultText}>Fat: {estimatedData.fat}g</Text>
            <Text style={styles.resultText}>Fiber: {estimatedData.fiber}g</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={saveFood}>
              <Check size={18} color="#fff" />
              <Text style={styles.saveText}>Save Food</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16 },
  help: { color: colors.textSecondary, marginBottom: 16 },
  recordBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  recordText: { color: '#fff', fontWeight: '700' },
  input: { marginTop: 12, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, minHeight: 80, color: colors.text },
  resultBox: { marginTop: 14, backgroundColor: colors.background, borderRadius: 10, padding: 12, gap: 4 },
  resultText: { color: colors.text },
  analyzeBtn: { marginTop: 10, backgroundColor: colors.secondary, borderRadius: 10, padding: 12, alignItems: 'center' },
  analyzeText: { color: '#fff', fontWeight: '700' },
  saveBtn: { marginTop: 10, backgroundColor: '#16A34A', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: '#fff', fontWeight: '700' },
  error: { marginTop: 12, color: '#DC2626' },
}));