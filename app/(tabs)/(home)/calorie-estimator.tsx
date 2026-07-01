import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Camera, Image as ImageIcon, Flame, Mic, MicOff, X } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { estimateCaloriesFromText, estimateCaloriesFromImage } from '@/services/calorieEstimation';
import { colors, createThemedStyles } from '@/constants/colors';
import { AnimatedEntrance, AuroraBackground, PressableScale } from '@/components/ui';

export default function CalorieEstimatorScreen() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const textEstimation = useMutation({
    mutationFn: estimateCaloriesFromText,
    onSuccess: (data) => {
      Keyboard.dismiss();
      setEstimate(data);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to estimate calories. Please try again.');
    },
  });

  const imageEstimation = useMutation({
    mutationFn: estimateCaloriesFromImage,
    onSuccess: (data) => {
      Keyboard.dismiss();
      setEstimate(data);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
    },
  });

  const isLoading = textEstimation.isPending || imageEstimation.isPending;

  const handleAnalyzeText = () => {
    if (!input.trim()) {
      Alert.alert('Input Required', 'Please describe your food');
      return;
    }
    setEstimate(null);
    textEstimation.mutate(input.trim());
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      setEstimate(null);
      if (asset.base64) {
        imageEstimation.mutate(asset.base64);
      }
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      setEstimate(null);
      if (asset.base64) {
        imageEstimation.mutate(asset.base64);
      }
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setEstimate(null);
  };

  const startRecording = async () => {
    try {
      if (isRecording || isTranscribing) return;

      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {
        }
        recordingRef.current = null;
      }

      if (Platform.OS === 'web') {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } else {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
        setIsRecording(true);
      }
    } catch {
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsTranscribing(true);

      if (Platform.OS === 'web') {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) return;

        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => resolve();
          mediaRecorder.stop();
        });

        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (result.text) {
          setInput((prev) => (prev ? `${prev} ${result.text}` : result.text));
        }
      } else {
        const recording = recordingRef.current;
        if (!recording) return;

        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

        const uri = recording.getURI();
        if (!uri) return;

        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const audioFile = {
          uri,
          name: `recording.${fileType}`,
          type: `audio/${fileType}`,
        };

        const formData = new FormData();
        formData.append('audio', audioFile as any);

        const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (result.text) {
          setInput((prev) => (prev ? `${prev} ${result.text}` : result.text));
        }

        recordingRef.current = null;
      }
    } catch {
      Alert.alert('Error', 'Failed to process recording.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Calorie Estimation' }} />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <AuroraBackground tint={colors.secondary} />
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <AnimatedEntrance from="up" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Flame size={22} color={colors.surface} />
              </View>
              <Text style={styles.title}>Calorie Estimation</Text>
              <Text style={styles.subtitle}>Estimate calories from text, photo, or voice. Results are shown only on this screen.</Text>
            </AnimatedEntrance>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Describe your food</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Grilled chicken breast with rice and vegetables"
                  placeholderTextColor={colors.textLight}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity style={[styles.voiceButton, isRecording && styles.voiceButtonActive]} onPress={isRecording ? stopRecording : startRecording} disabled={isTranscribing}>
                  {isTranscribing ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : isRecording ? (
                    <MicOff size={22} color={colors.surface} />
                  ) : (
                    <Mic size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
              {isRecording ? <Text style={styles.helperText}>Recording... Tap mic to stop</Text> : null}
              <PressableScale style={[styles.primaryButton, (!input.trim() || isLoading) && styles.buttonDisabled]} onPress={handleAnalyzeText} disabled={!input.trim() || isLoading} haptic>
                {isLoading && !selectedImage ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <>
                    <Flame size={18} color={colors.surface} />
                    <Text style={styles.primaryButtonText}>Analyze</Text>
                  </>
                )}
              </PressableScale>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Take a photo</Text>
              {selectedImage ? (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.clearImageButton} onPress={clearImage}>
                    <X size={20} color={colors.surface} />
                  </TouchableOpacity>
                  {isLoading ? (
                    <View style={styles.imageOverlay}>
                      <ActivityIndicator color={colors.surface} size="large" />
                      <Text style={styles.helperText}>Analyzing...</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.imageButtons}>
                  <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                    <View style={styles.imageButtonIcon}><Camera size={28} color={colors.primary} /></View>
                    <Text style={styles.imageButtonText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                    <View style={styles.imageButtonIcon}><ImageIcon size={28} color={colors.primary} /></View>
                    <Text style={styles.imageButtonText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {estimate ? (
              <View style={styles.resultCard}>
                <Text style={styles.sectionTitle}>Nutrition Estimate</Text>
                <Text style={styles.estimateName}>{estimate.name}</Text>
                <Text style={styles.estimateServing}>{estimate.servingSize}</Text>
                <Text style={styles.calories}>{estimate.calories} kcal</Text>
                <Text style={styles.nutrientText}>Protein {estimate.protein}g  ·  Carbs {estimate.carbs}g  ·  Fat {estimate.fat}g</Text>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceButtonActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageButtonIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  imageButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    minHeight: 210,
  },
  previewImage: {
    width: '100%',
    height: 210,
  },
  clearImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 8,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  estimateName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  estimateServing: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  calories: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
  },
  nutrientText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
}));