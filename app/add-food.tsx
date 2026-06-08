import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Camera, Image as ImageIcon, Flame, X, Check, Mic, MicOff } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useFood } from '@/contexts/FoodContext';
import { estimateCaloriesFromText, estimateCaloriesFromImage } from '@/services/calorieEstimation';
import { NutritionEstimate, FoodEntry } from '@/types/food';
import { colors, createThemedStyles } from '@/constants/colors';
import { MEAL_TYPES } from '@/constants/config';

export default function AddFoodScreen() {
  const router = useRouter();
  const { addEntry } = useFood();
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<FoodEntry['mealType']>('lunch');
  const [estimate, setEstimate] = useState<NutritionEstimate | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  const textEstimation = useMutation({
    mutationFn: estimateCaloriesFromText,
    onSuccess: (data) => {
      console.log('[AddFood] Text estimation success:', data);
      Keyboard.dismiss();
      setEstimate(data);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 300, animated: true });
      }, 300);
    },
    onError: (error) => {
      console.error('[AddFood] Text estimation error:', error);
      Alert.alert('Error', 'Failed to estimate calories. Please try again.');
    },
  });

  const imageEstimation = useMutation({
    mutationFn: estimateCaloriesFromImage,
    onSuccess: (data) => {
      console.log('[AddFood] Image estimation success:', data);
      Keyboard.dismiss();
      setEstimate(data);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 300, animated: true });
      }, 300);
    },
    onError: (error) => {
      console.error('[AddFood] Image estimation error:', error);
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

  const handleSave = () => {
    if (!estimate) {
      Alert.alert('No Estimate', 'Please analyze your food first');
      return;
    }

    addEntry({
      name: estimate.name,
      calories: estimate.calories,
      protein: estimate.protein,
      carbs: estimate.carbs,
      fat: estimate.fat,
      servingSize: estimate.servingSize,
      imageUri: selectedImage || undefined,
      mealType: selectedMeal,
    });

    router.back();
  };

  const clearImage = () => {
    setSelectedImage(null);
    setEstimate(null);
  };

  const startRecording = async () => {
    try {
      if (isRecording || isTranscribing) return;
      console.log('[AddFood] Starting recording');

      // Defensive cleanup: only one native Recording can be prepared at a time.
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {
          // Ignore cleanup errors from stale recording objects.
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
        
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecording(true);
      }
    } catch (error) {
      console.error('[AddFood] Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    try {
      console.log('[AddFood] Stopping recording');
      setIsRecording(false);
      setIsTranscribing(true);
      
      if (Platform.OS === 'web') {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) return;
        
        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => resolve();
          mediaRecorder.stop();
        });
        
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        console.log('[AddFood] Transcription result:', result);
        
        if (result.text) {
          setInput(prev => prev ? `${prev} ${result.text}` : result.text);
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
          name: 'recording.' + fileType,
          type: 'audio/' + fileType,
        };
        
        const formData = new FormData();
        formData.append('audio', audioFile as any);
        
        const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        console.log('[AddFood] Transcription result:', result);
        
        if (result.text) {
          setInput(prev => prev ? `${prev} ${result.text}` : result.text);
        }
        
        recordingRef.current = null;
      }
    } catch (error) {
      console.error('[AddFood] Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Food',
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          presentation: 'modal',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Describe your food</Text>
            <View style={styles.inputContainer}>
              <View style={styles.voiceInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Grilled chicken breast with rice and vegetables"
                  placeholderTextColor={colors.textLight}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    isRecording && styles.voiceButtonActive,
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : isRecording ? (
                    <MicOff size={22} color={colors.surface} />
                  ) : (
                    <Mic size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
              {isRecording && (
                <Text style={styles.recordingHint}>Recording... Tap mic to stop</Text>
              )}
              <TouchableOpacity
                style={[styles.analyzeButton, (!input.trim() || isLoading) && styles.buttonDisabled]}
                onPress={handleAnalyzeText}
                disabled={!input.trim() || isLoading}
              >
                {isLoading && !selectedImage ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <>
                    <Flame size={18} color={colors.surface} />
                    <Text style={styles.analyzeButtonText}>Analyze</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Take a photo</Text>
            {selectedImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.clearImageButton} onPress={clearImage}>
                  <X size={20} color={colors.surface} />
                </TouchableOpacity>
                {isLoading && selectedImage && (
                  <View style={styles.imageOverlay}>
                    <ActivityIndicator color={colors.surface} size="large" />
                    <Text style={styles.analyzingText}>Analyzing...</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <View style={styles.imageButtonIcon}>
                    <Camera size={28} color={colors.primary} />
                  </View>
                  <Text style={styles.imageButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <View style={styles.imageButtonIcon}>
                    <ImageIcon size={28} color={colors.primary} />
                  </View>
                  <Text style={styles.imageButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {estimate && (
            <View style={styles.estimateSection}>
              <View style={styles.estimateHeader}>
                <Text style={styles.sectionTitle}>Nutrition Estimate</Text>
                <View style={[styles.confidenceBadge, styles[`confidence_${estimate.confidence}`]]}>
                  <Text style={styles.confidenceText}>{estimate.confidence}</Text>
                </View>
              </View>
              <View style={styles.estimateCard}>
                <Text style={styles.estimateName}>{estimate.name}</Text>
                <Text style={styles.estimateServing}>{estimate.servingSize}</Text>
                <View style={styles.estimateNutrients}>
                  <View style={styles.nutrientItem}>
                    <Text style={styles.nutrientValue}>{estimate.calories}</Text>
                    <Text style={styles.nutrientLabel}>kcal</Text>
                  </View>
                  <View style={styles.nutrientDivider} />
                  <View style={styles.nutrientItem}>
                    <Text style={[styles.nutrientValue, { color: colors.protein }]}>
                      {estimate.protein}g
                    </Text>
                    <Text style={styles.nutrientLabel}>Protein</Text>
                  </View>
                  <View style={styles.nutrientDivider} />
                  <View style={styles.nutrientItem}>
                    <Text style={[styles.nutrientValue, { color: colors.carbs }]}>
                      {estimate.carbs}g
                    </Text>
                    <Text style={styles.nutrientLabel}>Carbs</Text>
                  </View>
                  <View style={styles.nutrientDivider} />
                  <View style={styles.nutrientItem}>
                    <Text style={[styles.nutrientValue, { color: colors.fat }]}>
                      {estimate.fat}g
                    </Text>
                    <Text style={styles.nutrientLabel}>Fat</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.mealSection}>
            <Text style={styles.sectionTitle}>Meal Type</Text>
            <View style={styles.mealTypes}>
              {MEAL_TYPES.map((meal) => (
                <TouchableOpacity
                  key={meal.key}
                  style={[
                    styles.mealButton,
                    selectedMeal === meal.key && styles.mealButtonActive,
                  ]}
                  onPress={() => setSelectedMeal(meal.key)}
                >
                  <Text
                    style={[
                      styles.mealButtonText,
                      selectedMeal === meal.key && styles.mealButtonTextActive,
                    ]}
                  >
                    {meal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !estimate && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!estimate}
          >
            <Check size={20} color={colors.surface} />
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  voiceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  voiceButtonActive: {
    backgroundColor: colors.error,
  },
  recordingHint: {
    fontSize: 12,
    color: colors.error,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.textLight,
  },
  imageSection: {
    marginBottom: 24,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  imageButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  imagePreview: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  clearImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  analyzingText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  estimateSection: {
    marginBottom: 24,
  },
  estimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidence_high: {
    backgroundColor: colors.success + '20',
  },
  confidence_medium: {
    backgroundColor: colors.warning + '20',
  },
  confidence_low: {
    backgroundColor: colors.error + '20',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: colors.textSecondary,
  },
  estimateCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  estimateName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  estimateServing: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  estimateNutrients: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutrientItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutrientDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  nutrientValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  nutrientLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mealSection: {
    marginBottom: 24,
  },
  mealTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mealButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  mealButtonActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  mealButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  mealButtonTextActive: {
    color: colors.primary,
  },
  footer: {
    padding: 20,
    paddingBottom: 36,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.surface,
  },
}));
