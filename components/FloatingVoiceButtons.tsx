import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  Text,
  Animated,
  PanResponder,
  Platform,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Apple, Dumbbell, Scale, Mic, MicOff, X, Check, Camera, ImageIcon, Pill, HeartPulse, Send, Droplets, Timer, Pencil, Plus, Trash2, Clock, TestTube2, Lightbulb, Sparkles, CalendarDays, NotebookPen } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { z } from 'zod';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFood } from '@/contexts/FoodContext';
import { ALL_HEALTH_TIPS } from '@/mocks/healthTips';
import { PUBLIC_HEALTH_QUOTES } from '@/constants/publicHealthQuotes';
import { PUBLIC_HEALTH_DAYS } from '@/constants/publicHealthDays';
import { useMedications } from '@/contexts/MedicationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { colors, createThemedStyles } from '@/constants/colors';
import { appendKeepNote } from '@/services/keepNotes';

const FASTING_NOTIFICATION_ID = 'fasting_persistent';

let FloatingNotifications: typeof import('expo-notifications') | null = null;
if (Platform.OS !== 'web') {
  import('expo-notifications').then(mod => { FloatingNotifications = mod; }).catch(() => {});
}

const BUTTON_SIZE = 52;
const BUTTON_GAP = 8;
const COLLAPSED_SIZE = 56;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

let cachedGenerateObject: ((input: any) => Promise<any>) | null = null;
let cachedEstimateCaloriesFromImage: ((base64: string) => Promise<any>) | null = null;
let cachedIdentifyMedicationFromImage: ((base64: string) => Promise<any>) | null = null;
let cachedIdentifyLipidProfileFromImage: ((base64: string) => Promise<any>) | null = null;

const getGenerateObject = async () => {
  if (cachedGenerateObject) return cachedGenerateObject;
  const toolkit = await import('@rork-ai/toolkit-sdk');
  cachedGenerateObject = toolkit.generateObject;
  return cachedGenerateObject;
};

const getEstimateCaloriesFromImage = async () => {
  if (cachedEstimateCaloriesFromImage) return cachedEstimateCaloriesFromImage;
  const module = await import('@/services/calorieEstimation');
  cachedEstimateCaloriesFromImage = module.estimateCaloriesFromImage;
  return cachedEstimateCaloriesFromImage;
};

const getIdentifyMedicationFromImage = async () => {
  if (cachedIdentifyMedicationFromImage) return cachedIdentifyMedicationFromImage;
  const module = await import('@/services/medicationImageRecognition');
  cachedIdentifyMedicationFromImage = module.identifyMedicationFromImage;
  return cachedIdentifyMedicationFromImage;
};

const getIdentifyLipidProfileFromImage = async () => {
  if (cachedIdentifyLipidProfileFromImage) return cachedIdentifyLipidProfileFromImage;
  const module = await import('@/services/lipidProfileRecognition');
  cachedIdentifyLipidProfileFromImage = module.identifyLipidProfileFromImage;
  return cachedIdentifyLipidProfileFromImage;
};

const FoodSchema = z.object({
  name: z.string().describe('Name of the food item'),
  calories: z.number().describe('Estimated calories'),
  protein: z.number().describe('Estimated protein in grams'),
  carbs: z.number().describe('Estimated carbohydrates in grams'),
  fat: z.number().describe('Estimated fat in grams'),
  servingSize: z.string().describe('Serving size description'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).describe('Type of meal based on context or time of day'),
  dateOffset: z.number().describe('Number of days offset from today. 0 for today, -1 for yesterday, -2 for day before yesterday, etc. Parse from phrases like "yesterday", "last Monday", "2 days ago", "on Friday". Default to 0 if no date mentioned.'),
});

const ActivitySchema = z.object({
  name: z.string().describe('Name of the activity'),
  type: z.enum(['walking', 'running', 'cycling', 'swimming', 'gym', 'sports', 'other']).describe('Type of activity'),
  intensity: z.enum(['light', 'moderate', 'vigorous']).describe('Intensity level'),
  duration: z.number().describe('Duration in minutes'),
  dateOffset: z.number().describe('Number of days offset from today. 0 for today, -1 for yesterday, -2 for day before yesterday, etc. Parse from phrases like "yesterday", "last Monday", "2 days ago", "on Friday". Default to 0 if no date mentioned.'),
});

const WeightSchema = z.object({
  weight: z.number().describe('Weight in kilograms'),
  dateOffset: z.number().describe('Number of days offset from today. 0 for today, -1 for yesterday, -2 for day before yesterday, etc. Parse from phrases like "yesterday", "last Monday", "2 days ago", "on Friday". Default to 0 if no date mentioned.'),
});

const MedicationSchema = z.object({
  name: z.string().describe('Name of the medication'),
  dosage: z.string().describe('Dosage amount, e.g. "500", "10", "1"'),
  unit: z.enum(['mg', 'ml', 'tablet', 'capsule', 'drops', 'puff']).describe('Unit of dosage'),
  frequency: z.enum(['daily', 'twice_daily', 'three_times', 'weekly', 'as_needed']).describe('How often the medication is taken'),
  category: z.enum(['prescription', 'otc', 'supplement', 'vitamin']).describe('Category of medication'),
  notes: z.string().optional().describe('Optional notes about the medication'),
  times: z.array(z.object({
    hour: z.number().describe('Hour in 24h format (0-23)'),
    minute: z.number().describe('Minute (0-59)'),
    label: z.string().describe('Label for this time, e.g. Morning, Evening, Before bed'),
  })).describe('Scheduled times for taking the medication. Generate based on frequency.'),
});

const BPSchema = z.object({
  systolic: z.number().describe('Systolic blood pressure in mmHg'),
  diastolic: z.number().describe('Diastolic blood pressure in mmHg'),
  pulse: z.number().optional().describe('Pulse rate in bpm if mentioned'),
  note: z.string().optional().describe('Any additional note mentioned'),
});

const BP_STORAGE_KEY = 'blood_pressure_entries';
const BG_STORAGE_KEY = 'blood_glucose_entries';
const LIPID_STORAGE_KEY = 'lipid_profile_entries';
const FASTING_STORAGE_KEY = 'fasting_data';
const FASTING_HISTORY_KEY = 'fasting_history';

const FASTING_TYPE_TO_HOURS: Record<string, number> = {
  '12:12': 12,
  '14:10': 14,
  '16:8': 16,
  '18:6': 18,
  '20:4': 20,
  OMAD: 23,
  '36h': 36,
  custom: 0,
};

function stableHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

function chooseCoprimeStep(length: number, seed: string): number {
  if (length <= 1) return 1;
  const preferred = (stableHash(seed) % (length - 1)) + 1;
  if (gcd(preferred, length) === 1) {
    return preferred;
  }

  for (let step = 1; step < length; step += 1) {
    if (gcd(step, length) === 1) {
      return step;
    }
  }

  return 1;
}

function rotatingDailyIndex(daySerial: number, length: number, channel: string): number {
  if (length <= 0) return 0;
  const base = stableHash(`${channel}-base`) % length;
  const step = chooseCoprimeStep(length, `${channel}-step`);
  return (base + ((daySerial % length) * step)) % length;
}

const BGSchema = z.object({
  value: z.number().describe('Blood glucose value'),
  unit: z.enum(['mg/dL', 'mmol/L']).describe('Unit of measurement'),
  type: z.enum(['fasting', 'random', 'pp']).describe('Type of blood glucose reading: fasting (before meal), random (any time), or pp (post-prandial/after meal)'),
  note: z.string().optional().describe('Any additional note mentioned'),
});

const LipidSchema = z.object({
  tg: z.number().describe('Triglycerides value in mg/dL'),
  hdl: z.number().describe('HDL cholesterol value in mg/dL'),
  ldl: z.number().describe('LDL cholesterol value in mg/dL'),
  vldl: z.number().describe('VLDL cholesterol value in mg/dL'),
  totalCholesterol: z.number().describe('Total cholesterol value in mg/dL'),
  dateOffset: z.number().describe('Number of days offset from today. 0 for today, -1 for yesterday, -2 for day before yesterday, etc. Default to 0 if no date is mentioned.'),
  note: z.string().optional().describe('Optional note or context mentioned by the user.'),
});

const FastingSchema = z.object({
  fastingType: z.enum(['12:12', '14:10', '16:8', '18:6', '20:4', 'OMAD', '36h', 'custom']).describe('Type of intermittent fasting plan'),
  targetHours: z.number().describe('Target fasting duration in hours'),
  actualHours: z.number().optional().describe('Actual duration fasted in hours, if user describes a completed fast. E.g. "I fasted 14 hours yesterday" => 14. Leave undefined if starting a new fast.'),
  isCompleted: z.boolean().describe('True if user is describing a completed/past fast they want to log. False if they want to start a new fast now. E.g. "I fasted 16 hours" => true, "start a 16:8 fast" => false.'),
  dateOffset: z.number().describe('Number of days offset from today. 0 for today, -1 for yesterday. Parse from phrases like "yesterday", "2 days ago". Default 0.'),
  note: z.string().optional().describe('Optional note about why fasting'),
});

const NoteSchema = z.object({
  title: z.string().describe('Short, clear title for the note'),
  body: z.string().describe('Clean note text to save'),
  dateOffset: z.number().describe('Number of days offset from today. 0 for today, -1 for yesterday, -2 for two days ago, etc.'),
});

type VoiceInputType = 'food' | 'activity' | 'weight' | 'medication' | 'bp' | 'glucose' | 'lipid' | 'fasting' | 'note';
type ContentModalType = 'quote' | 'healthTip' | 'publicHealthDay' | null;

export function FloatingVoiceButtons() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { addEntryWithDate, addActivityWithDate, addWeightEntryWithDate } = useFood();
  const { addMedication } = useMedications();
  const { floatingTabs, fastingSavings, isLocked, appLockSettings, notificationQuickLogAccess } = useSettings();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandDirection, setExpandDirection] = useState<'left' | 'right'>('left');
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceInputType, setVoiceInputType] = useState<VoiceInputType>('food');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [estimatedData, setEstimatedData] = useState<any>(null);
  const [voiceError, setVoiceError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [noteDraft, setNoteDraft] = useState<{ title: string; body: string; dateOffset: number }>({
    title: '',
    body: '',
    dateOffset: 0,
  });
  const enabledButtonCount = useMemo(() => Object.values(floatingTabs).filter(Boolean).length + 1, [floatingTabs]);
  const [contentModalVisible, setContentModalVisible] = useState(false);
  const [contentModalType, setContentModalType] = useState<ContentModalType>(null);

  const shouldHideOnLockScreen = isLocked && appLockSettings.enabled && !notificationQuickLogAccess;
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  
  const pan = useRef(new Animated.ValueXY({
    x: SCREEN_WIDTH - COLLAPSED_SIZE - 16,
    y: SCREEN_HEIGHT - 200 - insets.bottom,
  })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;
        
        const expandedWidth = isExpanded ? (BUTTON_SIZE * enabledButtonCount + BUTTON_GAP * (enabledButtonCount - 1) + 16) : COLLAPSED_SIZE;
        const minX = 8;
        const maxX = SCREEN_WIDTH - expandedWidth - 8;
        const minY = insets.top + 60;
        const maxY = SCREEN_HEIGHT - 120 - insets.bottom;
        
        const clampedX = Math.max(minX, Math.min(maxX, currentX));
        const clampedY = Math.max(minY, Math.min(maxY, currentY));
        
        Animated.spring(pan, {
          toValue: { x: clampedX, y: clampedY },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    })
  ).current;

  const toggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;
    
    if (newExpanded) {
      const currentX = (pan.x as any)._value;
      const expandedWidth = BUTTON_SIZE * enabledButtonCount + BUTTON_GAP * (enabledButtonCount - 1) + 16;
      const spaceOnRight = SCREEN_WIDTH - currentX - COLLAPSED_SIZE;
      const spaceOnLeft = currentX;
      
      if (spaceOnRight >= expandedWidth - COLLAPSED_SIZE) {
        setExpandDirection('right');
      } else if (spaceOnLeft >= expandedWidth - COLLAPSED_SIZE) {
        setExpandDirection('left');
      } else {
        setExpandDirection(spaceOnLeft > spaceOnRight ? 'left' : 'right');
      }
    }
    
    setIsExpanded(newExpanded);
    Animated.spring(expandAnim, {
      toValue: newExpanded ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [isExpanded, expandAnim, pan.x, enabledButtonCount]);

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulseAnimation = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const openVoiceModal = useCallback((type: VoiceInputType) => {
    setVoiceInputType(type);
    setTranscribedText('');
    if (type === 'fasting') {
      setEstimatedData({
        fastingType: '16:8',
        targetHours: FASTING_TYPE_TO_HOURS['16:8'],
        actualHours: undefined,
        isCompleted: false,
        dateOffset: 0,
        note: '',
      });
    } else {
      setEstimatedData(null);
    }
    if (type === 'note') {
      setNoteDraft({
        title: '',
        body: '',
        dateOffset: 0,
      });
    }
    setVoiceError('');
    setSelectedImage(null);
    setTextInput('');
    setVoiceModalVisible(true);
  }, []);

  const closeVoiceModal = useCallback(() => {
    setVoiceModalVisible(false);
    setIsRecording(false);
    setIsProcessing(false);
    setTranscribedText('');
    setEstimatedData(null);
    setVoiceError('');
    setSelectedImage(null);
    setTextInput('');
    setNoteDraft({ title: '', body: '', dateOffset: 0 });
    stopPulseAnimation();
  }, [stopPulseAnimation]);

  const takePhoto = async () => {
    try {
      setVoiceError('');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setVoiceError('Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].uri);
        await processImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('[FloatingVoice] Camera error:', error);
      setVoiceError('Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      setVoiceError('');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setVoiceError('Gallery permission is required to pick images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].uri);
        await processImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('[FloatingVoice] Image picker error:', error);
      setVoiceError('Failed to pick image. Please try again.');
    }
  };

  const takeMedPhoto = async () => {
    try {
      setVoiceError('');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setVoiceError('Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].uri);
        await processMedImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('[FloatingVoice] Med camera error:', error);
      setVoiceError('Failed to take photo. Please try again.');
    }
  };

  const pickMedImage = async () => {
    try {
      setVoiceError('');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setVoiceError('Gallery permission is required to pick images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].uri);
        await processMedImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('[FloatingVoice] Med image picker error:', error);
      setVoiceError('Failed to pick image. Please try again.');
    }
  };

  const takeLipidPhoto = async () => {
    try {
      setVoiceError('');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setVoiceError('Camera permission is required to scan reports.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].uri);
        await processLipidImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('[FloatingVoice] Lipid camera error:', error);
      setVoiceError('Failed to scan lipid report. Please try again.');
    }
  };

  const pickLipidImage = async () => {
    try {
      setVoiceError('');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setVoiceError('Gallery permission is required to select report images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].uri);
        await processLipidImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('[FloatingVoice] Lipid gallery error:', error);
      setVoiceError('Failed to select report image. Please try again.');
    }
  };

  const getDefaultTimesForFrequency = (frequency: string) => {
    switch (frequency) {
      case 'daily': return [{ hour: 8, minute: 0, label: 'Morning' }];
      case 'twice_daily': return [{ hour: 8, minute: 0, label: 'Morning' }, { hour: 20, minute: 0, label: 'Evening' }];
      case 'three_times': return [{ hour: 8, minute: 0, label: 'Morning' }, { hour: 14, minute: 0, label: 'Afternoon' }, { hour: 20, minute: 0, label: 'Evening' }];
      case 'weekly': return [{ hour: 8, minute: 0, label: 'Morning' }];
      case 'as_needed': return [];
      default: return [{ hour: 8, minute: 0, label: 'Morning' }];
    }
  };

  const handleMedFrequencyChange = useCallback((frequency: string) => {
    const newTimes = getDefaultTimesForFrequency(frequency);
    setEstimatedData((prev: any) => prev ? { ...prev, frequency, times: newTimes } : prev);
  }, []);

  const updateMedTime = useCallback((index: number, field: string, value: any) => {
    setEstimatedData((prev: any) => {
      if (!prev) return prev;
      const times = [...(prev.times || [])];
      times[index] = { ...times[index], [field]: value };
      return { ...prev, times };
    });
  }, []);

  const addMedTime = useCallback(() => {
    setEstimatedData((prev: any) => {
      if (!prev) return prev;
      const times = [...(prev.times || []), { hour: 12, minute: 0, label: '' }];
      return { ...prev, times };
    });
  }, []);

  const removeMedTime = useCallback((index: number) => {
    setEstimatedData((prev: any) => {
      if (!prev) return prev;
      const times = (prev.times || []).filter((_: any, i: number) => i !== index);
      return { ...prev, times };
    });
  }, []);

  const formatTimeDisplay = (hour: number, minute: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const processMedImage = async (base64: string) => {
    try {
      setIsProcessing(true);
      console.log('[FloatingVoice] Processing medication image...');

      const identifyMedicationFromImage = await getIdentifyMedicationFromImage();
      const result = await identifyMedicationFromImage(base64);
      console.log('[FloatingVoice] Medication image result:', result);

      if (!result.isValid || result.name === 'unknown') {
        setVoiceError('Unable to find medicine details. Please try again with a clearer image or enter details manually.');
        setIsProcessing(false);
        setSelectedImage(null);
        return;
      }

      const defaultFreq = 'daily';
      setEstimatedData({
        name: result.name,
        dosage: result.dosage,
        unit: result.unit,
        category: result.category,
        frequency: defaultFreq,
        notes: `Identified from image (${result.confidence} confidence)`,
        times: getDefaultTimesForFrequency(defaultFreq),
      });
      setIsProcessing(false);
    } catch (error) {
      console.error('[FloatingVoice] Medication image processing error:', error);
      setVoiceError('Unable to find medicine details. Please try again with a clearer image or enter manually.');
      setIsProcessing(false);
      setSelectedImage(null);
    }
  };

  const processImage = async (base64: string) => {
    try {
      setIsProcessing(true);
      console.log('[FloatingVoice] Processing image for calorie estimation...');

      const estimateCaloriesFromImage = await getEstimateCaloriesFromImage();
      const result = await estimateCaloriesFromImage(base64);
      console.log('[FloatingVoice] Image estimation result:', result);

      const currentHour = new Date().getHours();
      let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'snack';
      if (currentHour >= 5 && currentHour < 11) mealType = 'breakfast';
      else if (currentHour >= 11 && currentHour < 15) mealType = 'lunch';
      else if (currentHour >= 17 && currentHour < 22) mealType = 'dinner';

      setEstimatedData({
        ...result,
        mealType,
      });
      setIsProcessing(false);
    } catch (error) {
      console.error('[FloatingVoice] Image processing error:', error);
      setVoiceError('Failed to analyze image. Please try again.');
      setIsProcessing(false);
      setSelectedImage(null);
    }
  };

  const processLipidImage = async (base64: string) => {
    try {
      setIsProcessing(true);
      console.log('[FloatingVoice] Processing lipid report image...');

      const identifyLipidProfileFromImage = await getIdentifyLipidProfileFromImage();
      const result = await identifyLipidProfileFromImage(base64);
      console.log('[FloatingVoice] Lipid image result:', result);

      if (!result.isValid || (!result.tg && !result.hdl && !result.ldl && !result.vldl && !result.totalCholesterol)) {
        setVoiceError('Unable to extract the lipid values from this image. Please try a clearer report or enter values manually.');
        setIsProcessing(false);
        setSelectedImage(null);
        return;
      }

      setEstimatedData({
        tg: result.tg || 0,
        hdl: result.hdl || 0,
        ldl: result.ldl || 0,
        vldl: result.vldl || 0,
        totalCholesterol: result.totalCholesterol || 0,
        dateOffset: 0,
        note: '',
      });
      setIsProcessing(false);
    } catch (error) {
      console.error('[FloatingVoice] Lipid image processing error:', error);
      setVoiceError('Unable to extract lipid values from this report image. Please try again or enter values manually.');
      setIsProcessing(false);
      setSelectedImage(null);
    }
  };

  const startRecording = async () => {
    try {
      setVoiceError('');
      setTranscribedText('');
      setEstimatedData(null);

      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
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
      }

      setIsRecording(true);
      startPulseAnimation();
      console.log('[FloatingVoice] Recording started');
    } catch (error) {
      console.error('[FloatingVoice] Failed to start recording:', error);
      setVoiceError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      stopPulseAnimation();
      setIsProcessing(true);

      let audioBlob: Blob;

      if (Platform.OS === 'web') {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) throw new Error('No recording found');

        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => resolve();
          mediaRecorder.stop();
        });

        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      } else {
        const recording = recordingRef.current;
        if (!recording) throw new Error('No recording found');

        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        
        const uri = recording.getURI();
        if (!uri) throw new Error('No recording URI');

        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        const formData = new FormData();
        formData.append('audio', {
          uri,
          name: 'recording.' + fileType,
          type: 'audio/' + fileType,
        } as any);

        console.log('[FloatingVoice] Sending audio for transcription...');
        const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Transcription failed');
        const result = await response.json();
        await processTranscription(result.text);
        return;
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      console.log('[FloatingVoice] Sending audio for transcription...');
      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Transcription failed');
      const result = await response.json();
      await processTranscription(result.text);
    } catch (error) {
      console.error('[FloatingVoice] Recording/transcription error:', error);
      setVoiceError('Failed to process recording. Please try again.');
      setIsProcessing(false);
    }
  };

  const processTranscription = async (text: string) => {
    try {
      setTranscribedText(text);
      console.log('[FloatingVoice] Transcribed text:', text);

      if (!text.trim()) {
        setVoiceError('No speech detected. Please try again.');
        setIsProcessing(false);
        return;
      }

      const currentHour = new Date().getHours();
      let mealContext = 'snack';
      if (currentHour >= 5 && currentHour < 11) mealContext = 'breakfast';
      else if (currentHour >= 11 && currentHour < 15) mealContext = 'lunch';
      else if (currentHour >= 17 && currentHour < 22) mealContext = 'dinner';

      const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const generateObject = await getGenerateObject();

      if (voiceInputType === 'note') {
        try {
          const result = await generateObject({
            messages: [{
              role: 'user',
              content: `Turn this spoken or typed note into a clean keep-note entry. Make the title short and useful. Keep the body clear and readable. If the user mentions a date reference like yesterday, today, last Monday, or 2 days ago, set dateOffset accordingly; otherwise use 0. Today is ${todayStr}. Note: "${text}"`,
            }],
            schema: NoteSchema,
          });
          setNoteDraft({
            title: result.title?.trim() || 'Quick note',
            body: result.body?.trim() || text.trim(),
            dateOffset: Number(result.dateOffset) || 0,
          });
        } catch (noteError) {
          console.log('[FloatingVoice] Note parsing failed, using plain text:', noteError);
          const fallbackWords = text.trim().split(/\s+/).slice(0, 6).join(' ');
          setNoteDraft({
            title: fallbackWords ? fallbackWords.slice(0, 40) : 'Quick note',
            body: text.trim(),
            dateOffset: 0,
          });
        }
        setIsProcessing(false);
        return;
      }

      if (voiceInputType === 'food') {
        const result = await generateObject({
          messages: [{
            role: 'user',
            content: `Parse this food description and estimate nutrition. Current time suggests ${mealContext}. Today is ${todayStr}. Description: "${text}". Provide reasonable estimates for a typical serving. IMPORTANT: If the user mentions a specific date or day (like "yesterday", "last Monday", "2 days ago", "on Friday"), calculate the dateOffset as negative days from today. If no date is mentioned, use 0.`,
          }],
          schema: FoodSchema,
        });
        console.log('[FloatingVoice] Food estimation:', result);
        setEstimatedData(result);
      } else if (voiceInputType === 'activity') {
        const result = await generateObject({
          messages: [{
            role: 'user',
            content: `Parse this physical activity description. Today is ${todayStr}. Description: "${text}". Extract the activity type, intensity, and duration in minutes. If duration is not mentioned, estimate a reasonable duration. IMPORTANT: If the user mentions a specific date or day (like "yesterday", "last Monday", "2 days ago", "on Friday"), calculate the dateOffset as negative days from today. If no date is mentioned, use 0.`,
          }],
          schema: ActivitySchema,
        });
        console.log('[FloatingVoice] Activity estimation:', result);
        setEstimatedData(result);
      } else if (voiceInputType === 'weight') {
        const result = await generateObject({
          messages: [{
            role: 'user',
            content: `Extract the weight value from this description. Today is ${todayStr}. Description: "${text}". Convert to kilograms if needed. If ambiguous, assume kilograms. IMPORTANT: If the user mentions a specific date or day (like "yesterday", "last Monday", "2 days ago", "on Friday"), calculate the dateOffset as negative days from today. If no date is mentioned, use 0.`,
          }],
          schema: WeightSchema,
        });
        console.log('[FloatingVoice] Weight estimation:', result);
        setEstimatedData(result);
      } else if (voiceInputType === 'medication') {
        const result = await generateObject({
          messages: [{
            role: 'user',
            content: `Parse this medication description. Description: "${text}". Extract the medication name, dosage, unit, frequency, category, and generate appropriate scheduled times based on the frequency. If times are mentioned, use those. Otherwise generate sensible defaults (e.g. 8:00 AM for daily, 8:00 AM and 8:00 PM for twice daily).`,
          }],
          schema: MedicationSchema,
        });
        console.log('[FloatingVoice] Medication estimation:', result);
        setEstimatedData(result);
      } else if (voiceInputType === 'bp') {
        const result = await generateObject({
          messages: [{
            role: 'user',
            content: `Parse this blood pressure reading. Description: "${text}". Extract systolic and diastolic values. If pulse is mentioned, include it. Common patterns: "120 over 80", "BP is 130/85", "my blood pressure is 140 90 pulse 72".`,
          }],
          schema: BPSchema,
        });
        console.log('[FloatingVoice] BP estimation:', result);
        setEstimatedData(result);
      } else if (voiceInputType === 'glucose') {
        const result = await generateObject({
          messages: [{
            role: 'user',
            content: `Parse this blood glucose reading. Description: "${text}". Extract glucose value, unit (mg/dL or mmol/L), and type (fasting, random, or pp/post-prandial). Common patterns: "fasting glucose 110 mg/dL", "blood sugar 140 after meal", "random glucose 6.5 mmol/L". If unit not mentioned, default to mg/dL. If type not mentioned, default to random.`,
          }],
          schema: BGSchema,
        });
        console.log('[FloatingVoice] Glucose estimation:', result);
        setEstimatedData(result);
      } else if (voiceInputType === 'lipid') {
        const result = await generateObject({
          messages: [{
            role: 'user',
            content: `Parse this lipid profile description. Today is ${todayStr}. Description: "${text}". Extract triglycerides (TG), HDL, LDL, VLDL, and total cholesterol values in mg/dL. Common patterns: "TG 180 HDL 42 LDL 120 VLDL 36 total cholesterol 198", "my triglycerides were 160, HDL 55, LDL 98, total cholesterol 190 yesterday". If the user mentions a specific date or day, calculate dateOffset as negative days from today. If no date is mentioned, use 0. If a value is not mentioned, return 0.`,
          }],
          schema: LipidSchema,
        });
        console.log('[FloatingVoice] Lipid estimation:', result);
        setEstimatedData(result);
      } else if (voiceInputType === 'fasting') {
        const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const result = await generateObject({
          messages: [{
            role: 'user',
            content: `Parse this fasting description. Today is ${todayStr}. Description: "${text}". Determine if user is STARTING a new fast or LOGGING a completed/past fast. Examples of starting: "start a 16:8 fast", "begin fasting for 18 hours". Examples of completed: "I fasted 16 hours yesterday", "did a 14 hour fast", "fasted from 8pm to 10am". Extract fasting type and hours. If completed, set actualHours to the duration fasted. IMPORTANT: If the user mentions a date (like "yesterday"), calculate dateOffset as negative days from today. Default to 0.`,
          }],
          schema: FastingSchema,
        });
        console.log('[FloatingVoice] Fasting estimation:', result);
        setEstimatedData(result);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('[FloatingVoice] AI estimation error:', error);
      setVoiceError('Failed to estimate values. Please try again.');
      setIsProcessing(false);
    }
  };

  const getTargetTimestamp = (dateOffset: number): number => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dateOffset);
    targetDate.setHours(12, 0, 0, 0);
    return targetDate.getTime();
  };

  const formatDateOffset = (offset: number): string => {
    if (offset === 0) return 'Today';
    if (offset === -1) return 'Yesterday';
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + offset);
    return targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const updateEstimatedField = useCallback((field: string, value: any) => {
    setEstimatedData((prev: any) => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const handleFastingTypeSelect = useCallback((fastingType: string) => {
    setEstimatedData((prev: any) => {
      if (!prev) return prev;
      const mappedHours = FASTING_TYPE_TO_HOURS[fastingType];
      return {
        ...prev,
        fastingType,
        targetHours: fastingType === 'custom'
          ? (Number(prev.targetHours) || 0)
          : (typeof mappedHours === 'number' ? mappedHours : Number(prev.targetHours) || 0),
      };
    });
  }, []);

  const confirmVoiceInput = async () => {
    if (voiceInputType === 'note') {
      try {
        const noteBody = noteDraft.body.trim() || transcribedText.trim() || textInput.trim();
        const noteTitle = noteDraft.title.trim() || noteBody.split(/\s+/).slice(0, 6).join(' ').slice(0, 40) || 'Quick note';
        if (!noteBody) {
          setVoiceError('Please type or speak a note before saving.');
          return;
        }

        const dateOffset = Number(noteDraft.dateOffset) || 0;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dateOffset);
        const date = targetDate.toISOString().slice(0, 10);

        await appendKeepNote({
          date,
          title: noteTitle,
          body: noteBody,
          attachments: [],
        });

        closeVoiceModal();
      } catch (error) {
        console.error('[FloatingVoice] Failed to save note:', error);
        setVoiceError('Failed to save the note. Please try again.');
      }
      return;
    }

    if (!estimatedData) return;

    try {
      const dateOffset = estimatedData.dateOffset || 0;
      const targetTimestamp = getTargetTimestamp(dateOffset);
      console.log('[FloatingVoice] Saving to date offset:', dateOffset, 'timestamp:', targetTimestamp);

      if (voiceInputType === 'food') {
        addEntryWithDate({
          name: estimatedData.name,
          calories: estimatedData.calories,
          protein: estimatedData.protein,
          carbs: estimatedData.carbs,
          fat: estimatedData.fat,
          servingSize: estimatedData.servingSize,
          mealType: estimatedData.mealType,
        }, targetTimestamp);
        console.log('[FloatingVoice] Food entry added:', estimatedData);
      } else if (voiceInputType === 'activity') {
        addActivityWithDate({
          name: estimatedData.name,
          type: estimatedData.type,
          intensity: estimatedData.intensity,
          duration: estimatedData.duration,
        }, targetTimestamp);
        console.log('[FloatingVoice] Activity added:', estimatedData);
      } else if (voiceInputType === 'weight') {
        addWeightEntryWithDate(estimatedData.weight, targetTimestamp);
        console.log('[FloatingVoice] Weight entry added:', estimatedData);
      } else if (voiceInputType === 'medication') {
        const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
        const times = (estimatedData.times || []).map((t: { hour: number; minute: number; label: string }) => ({
          id: genId(),
          hour: t.hour,
          minute: t.minute,
          label: t.label,
        }));
        addMedication({
          name: estimatedData.name,
          dosage: estimatedData.dosage,
          unit: estimatedData.unit,
          frequency: estimatedData.frequency,
          category: estimatedData.category,
          notes: estimatedData.notes || undefined,
          notificationsEnabled: true,
          startDate: Date.now(),
          refillReminder: false,
          times: times.length > 0 ? times : undefined,
        });
        console.log('[FloatingVoice] Medication added:', estimatedData);
      } else if (voiceInputType === 'bp') {
        const newEntry = {
          id: Date.now().toString(),
          systolic: estimatedData.systolic,
          diastolic: estimatedData.diastolic,
          pulse: estimatedData.pulse,
          timestamp: Date.now(),
          note: estimatedData.note,
        };
        try {
          const stored = await AsyncStorage.getItem(BP_STORAGE_KEY);
          const existing = stored ? JSON.parse(stored) : [];
          const updated = [newEntry, ...existing];
          await AsyncStorage.setItem(BP_STORAGE_KEY, JSON.stringify(updated));
          console.log('[FloatingVoice] BP entry saved:', newEntry);
        } catch (e) {
          console.log('[FloatingVoice] Failed to save BP:', e);
        }
      } else if (voiceInputType === 'glucose') {
        const newEntry = {
          id: Date.now().toString(),
          value: estimatedData.value,
          unit: estimatedData.unit,
          type: estimatedData.type,
          timestamp: Date.now(),
          note: estimatedData.note,
        };
        try {
          const stored = await AsyncStorage.getItem(BG_STORAGE_KEY);
          const existing = stored ? JSON.parse(stored) : [];
          const updated = [newEntry, ...existing];
          await AsyncStorage.setItem(BG_STORAGE_KEY, JSON.stringify(updated));
          console.log('[FloatingVoice] Glucose entry saved:', newEntry);
        } catch (e) {
          console.log('[FloatingVoice] Failed to save glucose:', e);
        }
      } else if (voiceInputType === 'lipid') {
        const newEntry = {
          id: Date.now().toString(),
          tg: Number(estimatedData.tg) || 0,
          hdl: Number(estimatedData.hdl) || 0,
          ldl: Number(estimatedData.ldl) || 0,
          vldl: Number(estimatedData.vldl) || 0,
          totalCholesterol: Number(estimatedData.totalCholesterol) || 0,
          timestamp: targetTimestamp,
          note: estimatedData.note || undefined,
        };

        const stored = await AsyncStorage.getItem(LIPID_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        const existing = Array.isArray(parsed) ? parsed : [];
        const updated = [newEntry, ...existing];
        await AsyncStorage.setItem(LIPID_STORAGE_KEY, JSON.stringify(updated));
        console.log('[FloatingVoice] Lipid entry saved:', newEntry);
      } else if (voiceInputType === 'fasting') {
        if (estimatedData.isCompleted && estimatedData.actualHours) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + (estimatedData.dateOffset || 0));
          targetDate.setHours(8, 0, 0, 0);
          const startTime = targetDate.getTime();
          const endTime = startTime + (estimatedData.actualHours * 3600000);
          const completedSession = {
            id: Date.now().toString(),
            startTime,
            endTime,
            targetDuration: estimatedData.targetHours,
            fastingType: estimatedData.fastingType,
            completed: estimatedData.actualHours >= estimatedData.targetHours,
            note: estimatedData.note,
          };
          try {
            const stored = await AsyncStorage.getItem(FASTING_HISTORY_KEY);
            const existing = stored ? JSON.parse(stored) : [];
            const updated = [completedSession, ...existing].slice(0, 50);
            await AsyncStorage.setItem(FASTING_HISTORY_KEY, JSON.stringify(updated));
            console.log('[FloatingVoice] Completed fasting session logged:', completedSession);
          } catch (e) {
            console.log('[FloatingVoice] Failed to log completed fasting:', e);
          }
        } else {
          const session = {
            id: Date.now().toString(),
            startTime: Date.now(),
            endTime: null,
            targetDuration: estimatedData.targetHours,
            fastingType: estimatedData.fastingType,
            completed: false,
            note: estimatedData.note,
          };
          try {
            await AsyncStorage.setItem(FASTING_STORAGE_KEY, JSON.stringify(session));
            if (Platform.OS !== 'web' && FloatingNotifications) {
              const startStr = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              await FloatingNotifications.dismissNotificationAsync(FASTING_NOTIFICATION_ID).catch(() => {});
              await FloatingNotifications.cancelScheduledNotificationAsync(FASTING_NOTIFICATION_ID).catch(() => {});
              await FloatingNotifications.scheduleNotificationAsync({
                identifier: FASTING_NOTIFICATION_ID,
                content: {
                  title: `Fasting in Progress (${session.fastingType})`,
                  body: `Started at ${startStr} \u2014 Target: ${session.targetDuration}h. Stay strong!`,
                  sticky: true,
                  sound: false,
                  ...(Platform.OS === 'android' ? { ongoing: true } : {}),
                } as any,
                trigger: null,
              });
            }
            console.log('[FloatingVoice] Fasting session started:', session);
          } catch (e) {
            console.log('[FloatingVoice] Failed to start fasting:', e);
          }
        }
      }

      closeVoiceModal();
    } catch (error) {
      console.error('[FloatingVoice] Error saving data:', error);
      setVoiceError('Failed to save. Please try again.');
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    await processTranscription(textInput.trim());
    setTextInput('');
  };

  const getVoiceModalTitle = () => {
    switch (voiceInputType) {
      case 'food': return 'Log Food';
      case 'activity': return 'Log Activity';
      case 'weight': return 'Log Weight';
      case 'medication': return 'Add Medication';
      case 'bp': return 'Log Blood Pressure';
      case 'glucose': return 'Log Blood Glucose';
      case 'lipid': return 'Log Lipid Profile';
      case 'fasting': return 'Start Fasting';
      case 'note': return 'Chat Note';
    }
  };

  const getVoiceModalHint = () => {
    switch (voiceInputType) {
      case 'food': return 'Say what you ate, e.g., "I had a chicken sandwich with fries"';
      case 'activity': return 'Describe your activity, e.g., "I went running for 30 minutes"';
      case 'weight': return 'Say your weight, e.g., "My weight is 72 kilos"';
      case 'medication': return 'Describe your medication, e.g., "Metformin 500mg twice daily"';
      case 'bp': return 'Say your reading, e.g., "Blood pressure 120 over 80, pulse 72"';
      case 'glucose': return 'Say your reading, e.g., "Fasting glucose 110 mg/dL"';
      case 'lipid': return 'Say your report, e.g., "TG 180, HDL 42, LDL 120"';
      case 'fasting': return 'Say your plan, e.g., "Start a 16:8 fast" or "Fast for 18 hours"';
      case 'note': return 'Type or speak a note, then save it to Keep Notes';
    }
  };

  const visibleButtons = useMemo(() => {
    const buttons: { type: VoiceInputType; icon: React.ComponentType<{ size: number; color: string }>; style: object }[] = [];
    if (floatingTabs.medication) buttons.push({ type: 'medication', icon: Pill, style: styles.medicationButton });
    if (floatingTabs.food) buttons.push({ type: 'food', icon: Apple, style: styles.foodButton });
    if (floatingTabs.activity) buttons.push({ type: 'activity', icon: Dumbbell, style: styles.activityButton });
    if (floatingTabs.weight) buttons.push({ type: 'weight', icon: Scale, style: styles.weightButton });
    if (floatingTabs.bp) buttons.push({ type: 'bp', icon: HeartPulse, style: styles.bpButton });
    if (floatingTabs.glucose) buttons.push({ type: 'glucose', icon: Droplets, style: styles.glucoseButton });
    if (floatingTabs.lipid) buttons.push({ type: 'lipid', icon: TestTube2, style: styles.lipidButton });
    if (floatingTabs.fasting) buttons.push({ type: 'fasting', icon: Timer, style: styles.fastingButton });
    buttons.push({ type: 'note', icon: NotebookPen, style: styles.noteButton });
    // New content buttons (use contentType to distinguish from voice input types)
    if (floatingTabs.healthTips) buttons.push({ type: 'fasting', icon: Lightbulb, style: styles.tipButton, contentType: 'healthTip' } as any);
    if (floatingTabs.quotes) buttons.push({ type: 'fasting', icon: Sparkles, style: styles.quoteButton, contentType: 'quote' } as any);
    if (floatingTabs.publicHealthDays) buttons.push({ type: 'fasting', icon: CalendarDays, style: styles.publicHealthButton, contentType: 'publicHealthDay' } as any);
    return buttons;
  }, [floatingTabs]);

  const buttonCount = visibleButtons.length;
  const expandedWidth = useMemo(
    () => BUTTON_SIZE * buttonCount + BUTTON_GAP * Math.max(0, buttonCount - 1) + 16,
    [buttonCount]
  );
  
  const containerWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_SIZE, expandedWidth],
  });
  
  const containerTranslateX = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, expandDirection === 'left' ? -(expandedWidth - COLLAPSED_SIZE) : 0],
  });

  const shouldHideOnRoute = useMemo(() => {
    const hiddenRoutes = new Set(['/onboarding', '/add-food', '/quick-log', '/web-viewer']);
    return hiddenRoutes.has(pathname);
  }, [pathname]);

  if (shouldHideOnRoute || shouldHideOnLockScreen) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { translateX: containerTranslateX },
            ],
            width: containerWidth,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {!isExpanded ? (
          <TouchableOpacity
            style={styles.mainButton}
            onPress={toggleExpand}
            activeOpacity={0.9}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.expandedContainer, expandDirection === 'left' && styles.expandedContainerReversed]}>
            {visibleButtons.map((btn, idx) => {
              const BtnIcon = btn.icon as any;
              const handlePress = () => {
                // If this button represents a content modal, open it
                if ((btn as any).contentType) {
                  setContentModalType((btn as any).contentType as ContentModalType);
                  setContentModalVisible(true);
                  return;
                }
                openVoiceModal((btn.type as any) as VoiceInputType);
              };

              return (
                <TouchableOpacity
                  key={`${btn.type}-${idx}`}
                  style={[styles.actionButton, btn.style]}
                  onPress={handlePress}
                  activeOpacity={0.8}
                >
                  <BtnIcon size={22} color="#fff" />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.collapseButton, expandDirection === 'left' && styles.collapseButtonLeft]}
              onPress={toggleExpand}
              activeOpacity={0.8}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Content modal for quotes, tips, and public health days */}
      <Modal
        visible={contentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setContentModalVisible(false); setContentModalType(null); }}
      >
        <SafeAreaView style={styles.contentModalContainer}>
          <View style={styles.contentModalHeader}>
            <Text style={styles.contentModalTitle}>{contentModalType === 'quote' ? "Today's Quote" : contentModalType === 'healthTip' ? 'Health Tips' : 'Public Health Days'}</Text>
            <TouchableOpacity onPress={() => { setContentModalVisible(false); setContentModalType(null); }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.contentModalBody} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {contentModalType === 'quote' && (
              (() => {
                const now = new Date();
                const daySerial = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
                const idx = rotatingDailyIndex(daySerial, PUBLIC_HEALTH_QUOTES.length, 'quote');
                const q = PUBLIC_HEALTH_QUOTES[idx];

                return (
                  <>
                    <View style={styles.featuredCard}>
                      <Text style={styles.quoteText}>&quot;{q?.quote}&quot;</Text>
                      <Text style={styles.quoteAuthor}>- {q?.author}</Text>
                    </View>

                    <Text style={styles.sectionLabel}>More Quotes</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 8 }} contentContainerStyle={{ gap: 12 }}>
                      {PUBLIC_HEALTH_QUOTES.slice(0, 24).map((qq, i) => (
                        <View key={`q-${i}`} style={styles.smallCard}>
                          <Text style={styles.smallCardText} numberOfLines={3}>&quot;{qq.quote}&quot;</Text>
                          <Text style={styles.smallCardAuthor}>- {qq.author}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </>
                );
              })()
            )}

            {contentModalType === 'healthTip' && (
              (() => {
                const now = new Date();
                const daySerial = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
                const idx = rotatingDailyIndex(daySerial, ALL_HEALTH_TIPS.length, 'tip');
                const tip = ALL_HEALTH_TIPS[idx];

                return (
                  <>
                    <View style={styles.featuredCard}>
                      <Text style={styles.tipModalText}>{tip?.tip}</Text>
                    </View>

                    <Text style={styles.sectionLabel}>All Tips</Text>
                    <View style={styles.gridRow}>
                      {ALL_HEALTH_TIPS.slice(0, 20).map((t, i) => (
                        <View key={`t-${i}`} style={styles.tipCard}>
                          <Lightbulb size={18} color={colors.primary} />
                          <Text style={styles.tipCardText}>{t.tip}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                );
              })()
            )}

            {contentModalType === 'publicHealthDay' && (
              (() => {
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const monthList = PUBLIC_HEALTH_DAYS.filter((d) => d.month === currentMonth).sort((a, b) => a.day - b.day);

                if (monthList.length === 0) {
                  return <Text style={styles.emptyText}>No public health days listed for this month.</Text>;
                }

                const stringHash = (s: string) => {
                  let h = 0;
                  for (let i = 0; i < s.length; i++) {
                    h = ((h << 5) - h) + s.charCodeAt(i);
                    h |= 0;
                  }
                  return Math.abs(h);
                };

                return (
                  <>
                    <Text style={styles.sectionLabel}>This Month</Text>
                    <View style={{ gap: 12 }}>
                      {monthList.map((item) => (
                        <TouchableOpacity
                          key={`${item.month}-${item.day}-${item.title}`}
                          style={styles.pubDayCard}
                          onPress={() => {
                            try {
                              const route = `/public-health-day?month=${item.month}&day=${item.day}&title=${encodeURIComponent(item.title)}&type=${item.type}`;
                              (global as any).open?.(route) || (window as any)?.location && ((window as any).location.href = route);
                            } catch (e) {}
                          }}
                        >
                          <View style={styles.pubDayCardHeader}>
                            <Text style={styles.pubDayCardDate}>{`${item.day}/${item.month}`}</Text>
                            <Text style={styles.pubDayCardType}>{item.type}</Text>
                          </View>
                          <Text style={styles.pubDayCardTitle}>{item.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                );
              })()
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={voiceModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeVoiceModal}
      >
        <View style={styles.voiceModalContainer}>
          <View style={styles.voiceModalHeader}>
            <Text style={styles.voiceModalTitle}>{getVoiceModalTitle()}</Text>
            <TouchableOpacity onPress={closeVoiceModal}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.voiceModalContent}>
            {(voiceInputType === 'food' || voiceInputType === 'medication') && !isProcessing && !estimatedData ? (
              <View style={styles.splitContainer}>
                <View style={styles.voiceSection}>
                  <View style={styles.sectionHeader}>
                    <Mic size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Voice</Text>
                  </View>
                  <Text style={styles.sectionHint}>
                    {voiceInputType === 'food' ? 'Say what you ate' : 'Describe your medication'}
                  </Text>
                  
                  {!isRecording ? (
                    <TouchableOpacity
                      style={styles.recordButtonSmall}
                      onPress={startRecording}
                      activeOpacity={0.8}
                    >
                      <View style={styles.recordButtonInnerSmall}>
                        <Mic size={28} color="#fff" />
                      </View>
                      <Text style={styles.recordButtonTextSmall}>Tap to Record</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.recordingActiveContainerSmall}
                      onPress={stopRecording}
                      activeOpacity={0.8}
                    >
                      <Animated.View style={[styles.recordingPulseSmall, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.recordingActiveButtonSmall}>
                          <MicOff size={28} color="#fff" />
                        </View>
                      </Animated.View>
                      <Text style={styles.recordingTextSmall}>Tap to Stop</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.photoSection}>
                  <View style={styles.sectionHeader}>
                    <Camera size={20} color={voiceInputType === 'medication' ? '#8B5CF6' : colors.secondary} />
                    <Text style={styles.sectionTitle}>
                      {voiceInputType === 'medication' ? 'Scan' : 'Photo'}
                    </Text>
                  </View>
                  <Text style={styles.sectionHint}>
                    {voiceInputType === 'medication' ? 'Scan medication label' : 'Snap or pick an image'}
                  </Text>
                  
                  <View style={styles.photoButtons}>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={voiceInputType === 'medication' ? takeMedPhoto : takePhoto}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.photoButtonInner, voiceInputType === 'medication' && { backgroundColor: '#8B5CF6' }]}>
                        <Camera size={24} color="#fff" />
                      </View>
                      <Text style={styles.photoButtonText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={voiceInputType === 'medication' ? pickMedImage : pickImage}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.photoButtonInner, styles.galleryButtonInnerSmall, voiceInputType === 'medication' && { borderColor: '#8B5CF6' + '50' }]}>
                        <ImageIcon size={24} color={voiceInputType === 'medication' ? '#8B5CF6' : colors.secondary} />
                      </View>
                      <Text style={styles.photoButtonText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : voiceInputType === 'lipid' && !isProcessing && !estimatedData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.voiceModalHint}>{getVoiceModalHint()}</Text>

                <View style={styles.photoSection}>
                  <View style={styles.sectionHeader}>
                    <Camera size={20} color="#0EA5E9" />
                    <Text style={styles.sectionTitle}>Report Image</Text>
                  </View>
                  <Text style={styles.sectionHint}>Scan or pick a lipid lab report to autofill TG, HDL, and LDL</Text>

                  <View style={styles.photoButtons}>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={takeLipidPhoto}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.photoButtonInner, { backgroundColor: '#0EA5E9' }]}>
                        <Camera size={24} color="#fff" />
                      </View>
                      <Text style={styles.photoButtonText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={pickLipidImage}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.photoButtonInner, styles.galleryButtonInnerSmall, { borderColor: '#0EA5E950' }]}>
                        <ImageIcon size={24} color="#0EA5E9" />
                      </View>
                      <Text style={styles.photoButtonText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.textInputDivider}>
                  <View style={styles.textInputDividerLine} />
                  <Text style={styles.textInputDividerText}>or use voice or text</Text>
                  <View style={styles.textInputDividerLine} />
                </View>

                <View style={styles.recordingArea}>
                  {!isRecording ? (
                    <TouchableOpacity
                      style={styles.recordButton}
                      onPress={startRecording}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.recordButtonInner, { backgroundColor: '#0EA5E9', shadowColor: '#0EA5E9' }]}>
                        <Mic size={40} color="#fff" />
                      </View>
                      <Text style={styles.recordButtonText}>Tap to Record</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.recordingActiveContainer}
                      onPress={stopRecording}
                      activeOpacity={0.8}
                    >
                      <Animated.View style={[styles.recordingPulse, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.recordingActiveButton}>
                          <MicOff size={40} color="#fff" />
                        </View>
                      </Animated.View>
                      <Text style={styles.recordingText}>Recording... Tap to Stop</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.textInputArea}>
                  <TextInput
                    style={styles.textInputField}
                    value={textInput}
                    onChangeText={setTextInput}
                    placeholder={getVoiceModalHint()}
                    placeholderTextColor={colors.textLight}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.textSubmitButton, !textInput.trim() && styles.textSubmitButtonDisabled]}
                    onPress={handleTextSubmit}
                    disabled={!textInput.trim()}
                  >
                    <Send size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : voiceInputType === 'note' && !isProcessing ? (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.voiceModalHint}>{getVoiceModalHint()}</Text>

                <View style={styles.recordingArea}>
                  {!isRecording ? (
                    <TouchableOpacity
                      style={styles.recordButton}
                      onPress={startRecording}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.recordButtonInner, { backgroundColor: '#0F766E', shadowColor: '#0F766E' }]}>
                        <Mic size={40} color="#fff" />
                      </View>
                      <Text style={styles.recordButtonText}>Tap to Record</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.recordingActiveContainer}
                      onPress={stopRecording}
                      activeOpacity={0.8}
                    >
                      <Animated.View style={[styles.recordingPulse, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={[styles.recordingActiveButton, { backgroundColor: '#0F766E' }]}>
                          <MicOff size={40} color="#fff" />
                        </View>
                      </Animated.View>
                      <Text style={styles.recordingText}>Recording... Tap to Stop</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.textInputArea}>
                  <TextInput
                    style={styles.textInputField}
                    value={textInput}
                    onChangeText={setTextInput}
                    placeholder="Type a note and tap send"
                    placeholderTextColor={colors.textLight}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.textSubmitButton, !textInput.trim() && styles.textSubmitButtonDisabled]}
                    onPress={handleTextSubmit}
                    disabled={!textInput.trim()}
                  >
                    <Send size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {transcribedText && !isProcessing ? (
                  <View style={styles.transcriptionBox}>
                    <Text style={styles.transcriptionLabel}>Transcript</Text>
                    <Text style={styles.transcriptionText}>{transcribedText}</Text>
                  </View>
                ) : null}

                <View style={styles.estimationBox}>
                  <View style={styles.estimationTitleRow}>
                    <NotebookPen size={16} color={colors.primary} />
                    <Text style={styles.estimationTitle}>Save Note</Text>
                  </View>

                  <View style={styles.editFieldGroup}>
                    <Text style={styles.editFieldLabel}>Title</Text>
                    <TextInput
                      style={styles.editFieldInput}
                      value={noteDraft.title}
                      onChangeText={(value) => setNoteDraft((prev) => ({ ...prev, title: value }))}
                      placeholder="Short title"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.editFieldGroup}>
                    <Text style={styles.editFieldLabel}>Note</Text>
                    <TextInput
                      style={[styles.editFieldInput, { minHeight: 120, textAlignVertical: 'top' }]}
                      value={noteDraft.body}
                      onChangeText={(value) => setNoteDraft((prev) => ({ ...prev, body: value }))}
                      placeholder="Write or transcribe your note"
                      placeholderTextColor={colors.textLight}
                      multiline
                    />
                  </View>

                  <View style={styles.editFieldGroup}>
                    <Text style={styles.editFieldLabel}>Day</Text>
                    <View style={styles.chipRow}>
                      {([
                        { label: 'Today', value: 0 },
                        { label: 'Yesterday', value: -1 },
                        { label: '2 Days Ago', value: -2 },
                      ] as const).map((option) => (
                        <TouchableOpacity
                          key={option.label}
                          style={[styles.chip, noteDraft.dateOffset === option.value && styles.chipActive]}
                          onPress={() => setNoteDraft((prev) => ({ ...prev, dateOffset: option.value }))}
                        >
                          <Text style={[styles.chipText, noteDraft.dateOffset === option.value && styles.chipTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Text style={[styles.editFieldLabel, { color: colors.secondary }]}>Date: {formatDateOffset(noteDraft.dateOffset)}</Text>

                  <TouchableOpacity style={styles.confirmButton} onPress={confirmVoiceInput}>
                    <Check size={18} color="#fff" />
                    <Text style={styles.confirmButtonText}>Save Note</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : voiceInputType !== 'food' && voiceInputType !== 'medication' && voiceInputType !== 'lipid' && !isProcessing && !estimatedData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.voiceModalHint}>{getVoiceModalHint()}</Text>
                <View style={styles.recordingArea}>
                  {!isRecording ? (
                    <TouchableOpacity
                      style={styles.recordButton}
                      onPress={startRecording}
                      activeOpacity={0.8}
                    >
                      <View style={styles.recordButtonInner}>
                        <Mic size={40} color="#fff" />
                      </View>
                      <Text style={styles.recordButtonText}>Tap to Record</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.recordingActiveContainer}
                      onPress={stopRecording}
                      activeOpacity={0.8}
                    >
                      <Animated.View style={[styles.recordingPulse, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.recordingActiveButton}>
                          <MicOff size={40} color="#fff" />
                        </View>
                      </Animated.View>
                      <Text style={styles.recordingText}>Recording... Tap to Stop</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.textInputDivider}>
                  <View style={styles.textInputDividerLine} />
                  <Text style={styles.textInputDividerText}>or type below</Text>
                  <View style={styles.textInputDividerLine} />
                </View>

                <View style={styles.textInputArea}>
                  <TextInput
                    style={styles.textInputField}
                    value={textInput}
                    onChangeText={setTextInput}
                    placeholder={getVoiceModalHint()}
                    placeholderTextColor={colors.textLight}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.textSubmitButton, !textInput.trim() && styles.textSubmitButtonDisabled]}
                    onPress={handleTextSubmit}
                    disabled={!textInput.trim()}
                  >
                    <Send size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}

            {isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.processingText}>
                  {selectedImage ? 'Analyzing image...' : 'Processing your voice...'}
                </Text>
              </View>
            )}

            {voiceError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{voiceError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => {
                  setVoiceError('');
                  setSelectedImage(null);
                }}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {transcribedText && !isProcessing && (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionLabel}>You said:</Text>
                <Text style={styles.transcriptionText}>&ldquo;{transcribedText}&rdquo;</Text>
              </View>
            )}

            {selectedImage && !isProcessing && (
              <View style={styles.imagePreviewBox}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              </View>
            )}

            {estimatedData && !isProcessing && (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.estimationBox}>
                <View style={styles.estimationTitleRow}>
                  <Pencil size={16} color={colors.primary} />
                  <Text style={styles.estimationTitle}>Edit & Confirm</Text>
                </View>
                
                {voiceInputType === 'food' && (
                  <View style={styles.estimationContent}>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Food Name</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.name} onChangeText={(v) => updateEstimatedField('name', v)} placeholder="Food name" placeholderTextColor={colors.textLight} />
                    </View>
                    <View style={styles.editFieldRow}>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Calories (kcal)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.calories)} onChangeText={(v) => updateEstimatedField('calories', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Protein (g)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.protein)} onChangeText={(v) => updateEstimatedField('protein', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                    </View>
                    <View style={styles.editFieldRow}>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Carbs (g)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.carbs)} onChangeText={(v) => updateEstimatedField('carbs', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Fat (g)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.fat)} onChangeText={(v) => updateEstimatedField('fat', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Serving Size</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.servingSize} onChangeText={(v) => updateEstimatedField('servingSize', v)} placeholderTextColor={colors.textLight} />
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Meal Type</Text>
                      <View style={styles.chipRow}>
                        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mt) => (
                          <TouchableOpacity key={mt} style={[styles.chip, estimatedData.mealType === mt && styles.chipActive]} onPress={() => updateEstimatedField('mealType', mt)}>
                            <Text style={[styles.chipText, estimatedData.mealType === mt && styles.chipTextActive]}>{mt.charAt(0).toUpperCase() + mt.slice(1)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    {estimatedData.dateOffset !== 0 && (
                      <View style={styles.editFieldGroup}>
                        <Text style={[styles.editFieldLabel, { color: colors.secondary }]}>Date: {formatDateOffset(estimatedData.dateOffset)}</Text>
                      </View>
                    )}
                  </View>
                )}

                {voiceInputType === 'activity' && (
                  <View style={styles.estimationContent}>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Activity Name</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.name} onChangeText={(v) => updateEstimatedField('name', v)} placeholderTextColor={colors.textLight} />
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Type</Text>
                      <View style={styles.chipRow}>
                        {(['walking', 'running', 'cycling', 'swimming', 'gym', 'sports', 'other'] as const).map((at) => (
                          <TouchableOpacity key={at} style={[styles.chip, estimatedData.type === at && styles.chipActive]} onPress={() => updateEstimatedField('type', at)}>
                            <Text style={[styles.chipText, estimatedData.type === at && styles.chipTextActive]}>{at.charAt(0).toUpperCase() + at.slice(1)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Intensity</Text>
                      <View style={styles.chipRow}>
                        {(['light', 'moderate', 'vigorous'] as const).map((il) => (
                          <TouchableOpacity key={il} style={[styles.chip, estimatedData.intensity === il && styles.chipActive]} onPress={() => updateEstimatedField('intensity', il)}>
                            <Text style={[styles.chipText, estimatedData.intensity === il && styles.chipTextActive]}>{il.charAt(0).toUpperCase() + il.slice(1)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Duration (min)</Text>
                      <TextInput style={styles.editFieldInput} value={String(estimatedData.duration)} onChangeText={(v) => updateEstimatedField('duration', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                    </View>
                    {estimatedData.dateOffset !== 0 && (
                      <View style={styles.editFieldGroup}>
                        <Text style={[styles.editFieldLabel, { color: colors.secondary }]}>Date: {formatDateOffset(estimatedData.dateOffset)}</Text>
                      </View>
                    )}
                  </View>
                )}

                {voiceInputType === 'weight' && (
                  <View style={styles.estimationContent}>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Weight (kg)</Text>
                      <TextInput style={styles.editFieldInput} value={String(estimatedData.weight)} onChangeText={(v) => updateEstimatedField('weight', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                    </View>
                    {estimatedData.dateOffset !== 0 && (
                      <View style={styles.editFieldGroup}>
                        <Text style={[styles.editFieldLabel, { color: colors.secondary }]}>Date: {formatDateOffset(estimatedData.dateOffset)}</Text>
                      </View>
                    )}
                  </View>
                )}

                {voiceInputType === 'medication' && (
                  <View style={styles.estimationContent}>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Medication Name</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.name} onChangeText={(v) => updateEstimatedField('name', v)} placeholderTextColor={colors.textLight} />
                    </View>
                    <View style={styles.editFieldRow}>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Dosage</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.dosage)} onChangeText={(v) => updateEstimatedField('dosage', v)} placeholderTextColor={colors.textLight} />
                      </View>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Unit</Text>
                        <View style={styles.chipRow}>
                          {(['mg', 'ml', 'tablet', 'capsule'] as const).map((u) => (
                            <TouchableOpacity key={u} style={[styles.chipSmall, estimatedData.unit === u && styles.chipActive]} onPress={() => updateEstimatedField('unit', u)}>
                              <Text style={[styles.chipTextSmall, estimatedData.unit === u && styles.chipTextActive]}>{u}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Frequency</Text>
                      <View style={styles.chipRow}>
                        {([{ key: 'daily', label: 'Daily' }, { key: 'twice_daily', label: 'Twice Daily' }, { key: 'three_times', label: '3x Daily' }, { key: 'weekly', label: 'Weekly' }, { key: 'as_needed', label: 'As Needed' }] as const).map((f) => (
                          <TouchableOpacity key={f.key} style={[styles.chip, estimatedData.frequency === f.key && styles.chipActive]} onPress={() => handleMedFrequencyChange(f.key)}>
                            <Text style={[styles.chipText, estimatedData.frequency === f.key && styles.chipTextActive]}>{f.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Scheduled Times</Text>
                      {(estimatedData.times || []).map((t: { hour: number; minute: number; label: string }, idx: number) => (
                        <View key={idx} style={styles.timeRow}>
                          <View style={styles.timeIconWrap}>
                            <Clock size={16} color={colors.primary} />
                          </View>
                          <View style={styles.timeFieldsWrap}>
                            <TextInput
                              style={styles.timeLabelInput}
                              value={t.label}
                              onChangeText={(v) => updateMedTime(idx, 'label', v)}
                              placeholder="Label (e.g. Morning)"
                              placeholderTextColor={colors.textLight}
                            />
                            <View style={styles.timePickerRow}>
                              <View style={styles.timePickerField}>
                                <TextInput
                                  style={styles.timeNumInput}
                                  value={String(t.hour)}
                                  onChangeText={(v) => {
                                    const num = Math.min(23, Math.max(0, Number(v) || 0));
                                    updateMedTime(idx, 'hour', num);
                                  }}
                                  keyboardType="numeric"
                                  maxLength={2}
                                  placeholderTextColor={colors.textLight}
                                />
                                <Text style={styles.timeNumLabel}>Hr</Text>
                              </View>
                              <Text style={styles.timeColon}>:</Text>
                              <View style={styles.timePickerField}>
                                <TextInput
                                  style={styles.timeNumInput}
                                  value={String(t.minute).padStart(2, '0')}
                                  onChangeText={(v) => {
                                    const num = Math.min(59, Math.max(0, Number(v) || 0));
                                    updateMedTime(idx, 'minute', num);
                                  }}
                                  keyboardType="numeric"
                                  maxLength={2}
                                  placeholderTextColor={colors.textLight}
                                />
                                <Text style={styles.timeNumLabel}>Min</Text>
                              </View>
                              <Text style={styles.timeAmPm}>{formatTimeDisplay(t.hour, t.minute)}</Text>
                            </View>
                          </View>
                          <TouchableOpacity style={styles.timeRemoveBtn} onPress={() => removeMedTime(idx)}>
                            <Trash2 size={16} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity style={styles.addTimeBtn} onPress={addMedTime}>
                        <Plus size={16} color={colors.primary} />
                        <Text style={styles.addTimeBtnText}>Add Time</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Category</Text>
                      <View style={styles.chipRow}>
                        {([{ key: 'prescription', label: 'Prescription' }, { key: 'otc', label: 'OTC' }, { key: 'supplement', label: 'Supplement' }, { key: 'vitamin', label: 'Vitamin' }] as const).map((c) => (
                          <TouchableOpacity key={c.key} style={[styles.chip, estimatedData.category === c.key && styles.chipActive]} onPress={() => updateEstimatedField('category', c.key)}>
                            <Text style={[styles.chipText, estimatedData.category === c.key && styles.chipTextActive]}>{c.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Notes</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.notes || ''} onChangeText={(v) => updateEstimatedField('notes', v)} placeholder="Optional notes" placeholderTextColor={colors.textLight} />
                    </View>
                  </View>
                )}

                {voiceInputType === 'bp' && (
                  <View style={styles.estimationContent}>
                    <View style={styles.editFieldRow}>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Systolic (mmHg)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.systolic)} onChangeText={(v) => updateEstimatedField('systolic', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Diastolic (mmHg)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.diastolic)} onChangeText={(v) => updateEstimatedField('diastolic', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Pulse (bpm)</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.pulse ? String(estimatedData.pulse) : ''} onChangeText={(v) => updateEstimatedField('pulse', v ? Number(v) || 0 : undefined)} keyboardType="numeric" placeholder="Optional" placeholderTextColor={colors.textLight} />
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Note</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.note || ''} onChangeText={(v) => updateEstimatedField('note', v)} placeholder="Optional note" placeholderTextColor={colors.textLight} />
                    </View>
                  </View>
                )}

                {voiceInputType === 'glucose' && (
                  <View style={styles.estimationContent}>
                    <View style={styles.editFieldRow}>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Glucose Value</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.value)} onChangeText={(v) => updateEstimatedField('value', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Unit</Text>
                        <View style={styles.chipRow}>
                          {(['mg/dL', 'mmol/L'] as const).map((u) => (
                            <TouchableOpacity key={u} style={[styles.chip, estimatedData.unit === u && styles.chipActive]} onPress={() => updateEstimatedField('unit', u)}>
                              <Text style={[styles.chipText, estimatedData.unit === u && styles.chipTextActive]}>{u}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Reading Type</Text>
                      <View style={styles.chipRow}>
                        {([{ key: 'fasting', label: 'Fasting' }, { key: 'random', label: 'Random' }, { key: 'pp', label: 'Post-Prandial' }] as const).map((t) => (
                          <TouchableOpacity key={t.key} style={[styles.chip, estimatedData.type === t.key && styles.chipActive]} onPress={() => updateEstimatedField('type', t.key)}>
                            <Text style={[styles.chipText, estimatedData.type === t.key && styles.chipTextActive]}>{t.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Note</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.note || ''} onChangeText={(v) => updateEstimatedField('note', v)} placeholder="Optional note" placeholderTextColor={colors.textLight} />
                    </View>
                  </View>
                )}

                {voiceInputType === 'lipid' && (
                  <View style={styles.estimationContent}>
                    <View style={styles.editFieldRow}>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>TG (mg/dL)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.tg)} onChangeText={(v) => updateEstimatedField('tg', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>HDL (mg/dL)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.hdl)} onChangeText={(v) => updateEstimatedField('hdl', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>LDL (mg/dL)</Text>
                      <TextInput style={styles.editFieldInput} value={String(estimatedData.ldl)} onChangeText={(v) => updateEstimatedField('ldl', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                    </View>
                    <View style={styles.editFieldRow}>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>VLDL Cholesterol (mg/dL)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.vldl || 0)} onChangeText={(v) => updateEstimatedField('vldl', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                      <View style={styles.editFieldGroupHalf}>
                        <Text style={styles.editFieldLabel}>Total Cholesterol (mg/dL)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.totalCholesterol || 0)} onChangeText={(v) => updateEstimatedField('totalCholesterol', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Calculated Automatically</Text>
                      <Text style={styles.textSecondary}>LDL / HDL Ratio: {estimatedData.hdl > 0 && estimatedData.ldl > 0 ? (estimatedData.ldl / estimatedData.hdl).toFixed(2) : '--'}</Text>
                      <Text style={styles.textSecondary}>Total Cholesterol / HDL Ratio: {estimatedData.hdl > 0 && estimatedData.totalCholesterol > 0 ? (estimatedData.totalCholesterol / estimatedData.hdl).toFixed(2) : '--'}</Text>
                      <Text style={styles.textSecondary}>Non-HDL Cholesterol: {estimatedData.totalCholesterol > 0 && estimatedData.hdl > 0 ? (estimatedData.totalCholesterol - estimatedData.hdl).toFixed(0) : '--'}</Text>
                    </View>
                    {estimatedData.dateOffset !== 0 && (
                      <View style={styles.editFieldGroup}>
                        <Text style={[styles.editFieldLabel, { color: colors.secondary }]}>Date: {formatDateOffset(estimatedData.dateOffset)}</Text>
                      </View>
                    )}
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Additional Notes (Optional)</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.note || ''} onChangeText={(v) => updateEstimatedField('note', v)} placeholder="" placeholderTextColor={colors.textLight} />
                    </View>
                  </View>
                )}

                {voiceInputType === 'fasting' && (
                  <View style={styles.estimationContent}>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Mode</Text>
                      <View style={styles.chipRow}>
                        <TouchableOpacity style={[styles.chip, !estimatedData.isCompleted && styles.chipActive]} onPress={() => updateEstimatedField('isCompleted', false)}>
                          <Text style={[styles.chipText, !estimatedData.isCompleted && styles.chipTextActive]}>Start New Fast</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chip, estimatedData.isCompleted && styles.chipActive]} onPress={() => updateEstimatedField('isCompleted', true)}>
                          <Text style={[styles.chipText, estimatedData.isCompleted && styles.chipTextActive]}>Log Completed</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Fasting Plan</Text>
                      <View style={styles.chipRow}>
                        {(['12:12', '14:10', '16:8', '18:6', '20:4', 'OMAD', '36h', 'custom'] as const).map((ft) => (
                          <TouchableOpacity key={ft} style={[styles.chip, estimatedData.fastingType === ft && styles.chipActive]} onPress={() => handleFastingTypeSelect(ft)}>
                            <Text style={[styles.chipText, estimatedData.fastingType === ft && styles.chipTextActive]}>{ft}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Target Duration (hours)</Text>
                      <TextInput style={styles.editFieldInput} value={String(estimatedData.targetHours)} onChangeText={(v) => updateEstimatedField('targetHours', Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textLight} />
                    </View>
                    {estimatedData.isCompleted && (
                      <View style={styles.editFieldGroup}>
                        <Text style={styles.editFieldLabel}>Actual Duration Fasted (hours)</Text>
                        <TextInput style={styles.editFieldInput} value={String(estimatedData.actualHours || '')} onChangeText={(v) => updateEstimatedField('actualHours', Number(v) || 0)} keyboardType="numeric" placeholder="e.g. 16" placeholderTextColor={colors.textLight} />
                      </View>
                    )}
                    {estimatedData.isCompleted && (estimatedData.actualHours || 0) > 0 && (
                      <View style={[styles.editFieldGroup, { backgroundColor: '#22C55E' + '10', borderRadius: 12, padding: 14 }]}>
                        <Text style={[styles.editFieldLabel, { color: '#16A34A' }]}>Estimated Savings</Text>
                        <Text style={{ fontSize: 22, fontWeight: '800' as const, color: '#16A34A' }}>
                          {fastingSavings.currencySymbol}{((estimatedData.actualHours || 0) * fastingSavings.ratePerHour).toFixed(2)}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#16A34A', marginTop: 2 }}>
                          {(estimatedData.actualHours || 0).toFixed(1)}h x {fastingSavings.currencySymbol}{fastingSavings.ratePerHour}/hr
                        </Text>
                      </View>
                    )}
                    {estimatedData.isCompleted && estimatedData.dateOffset !== 0 && (
                      <View style={styles.editFieldGroup}>
                        <Text style={[styles.editFieldLabel, { color: colors.secondary }]}>Date: {formatDateOffset(estimatedData.dateOffset)}</Text>
                      </View>
                    )}
                    <View style={styles.editFieldGroup}>
                      <Text style={styles.editFieldLabel}>Note</Text>
                      <TextInput style={styles.editFieldInput} value={estimatedData.note || ''} onChangeText={(v) => updateEstimatedField('note', v)} placeholder="Optional note" placeholderTextColor={colors.textLight} />
                    </View>
                  </View>
                )}

                <View style={styles.confirmButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEstimatedData(null);
                      setTranscribedText('');
                      setSelectedImage(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Re-record</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={confirmVoiceInput}
                  >
                    <Check size={18} color="#fff" />
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
              </ScrollView>
              </KeyboardAvoidingView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = createThemedStyles((colors) => ({
  container: {
    position: 'absolute',
    zIndex: 9999,
    backgroundColor: colors.surface,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    height: COLLAPSED_SIZE,
  },
  mainButton: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: '100%',
    gap: BUTTON_GAP,
  },
  expandedContainerReversed: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodButton: {
    backgroundColor: colors.success,
  },
  activityButton: {
    backgroundColor: colors.secondary,
  },
  weightButton: {
    backgroundColor: colors.primary,
  },
  medicationButton: {
    backgroundColor: '#8B5CF6',
  },
  bpButton: {
    backgroundColor: '#EF4444',
  },
  glucoseButton: {
    backgroundColor: '#F59E0B',
  },
  lipidButton: {
    backgroundColor: '#0EA5E9',
  },
  fastingButton: {
    backgroundColor: '#8B5CF6',
  },
  noteButton: {
    backgroundColor: '#0F766E',
  },
  tipButton: {
    backgroundColor: '#06B6D4',
  },
  quoteButton: {
    backgroundColor: '#F97316',
  },
  publicHealthButton: {
    backgroundColor: '#10B981',
  },
  collapseButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  collapseButtonLeft: {
    right: undefined,
    left: -8,
  },
  voiceModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  voiceModalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
  },
  voiceModalContent: {
    flex: 1,
    padding: 20,
  },
  voiceModalHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 32,
    lineHeight: 20,
  },
  splitContainer: {
    flex: 1,
  },
  voiceSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  photoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  recordButtonSmall: {
    alignItems: 'center',
  },
  recordButtonInnerSmall: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  recordButtonTextSmall: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  recordingActiveContainerSmall: {
    alignItems: 'center',
  },
  recordingPulseSmall: {
    padding: 6,
  },
  recordingActiveButtonSmall: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingTextSmall: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.error,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 24,
  },
  photoButton: {
    alignItems: 'center',
  },
  photoButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  contentModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contentModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  contentModalBody: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 4,
    marginBottom: 4,
  },
  featuredCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quoteText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  quoteAuthor: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  smallCard: {
    width: 220,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallCardText: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 6,
  },
  smallCardAuthor: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tipCard: {
    width: '48%',
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  tipCardText: {
    color: colors.text,
    fontSize: 13,
  },
  pubDayCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pubDayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pubDayCardDate: {
    color: colors.primary,
    fontWeight: '700' as const,
  },
  pubDayCardType: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  pubDayCardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  pubDayQuoteWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  pubDayQuote: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  pubDayQuoteAuthor: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  quoteText: {
    color: colors.text,
    fontSize: 16,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  tipModalText: {
    color: colors.text,
    fontSize: 15,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  pubDayItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pubDayTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  photoButtonText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  galleryButtonInnerSmall: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.secondary + '50',
    shadowOpacity: 0,
    elevation: 0,
  },
  recordingArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  recordButton: {
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordButtonText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  imagePreviewBox: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  recordingActiveContainer: {
    alignItems: 'center',
  },
  recordingPulse: {
    padding: 10,
  },
  recordingActiveButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.error,
  },
  processingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center' as const,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  transcriptionBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  transcriptionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 16,
    color: colors.text,
    fontStyle: 'italic' as const,
    lineHeight: 22,
  },
  estimationBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  estimationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  estimationTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  estimationContent: {
    gap: 10,
  },
  estimationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimationLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  estimationValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    maxWidth: '60%',
    textAlign: 'right' as const,
  },
  dateHighlight: {
    color: colors.secondary,
    fontWeight: '700' as const,
  },
  editFieldGroup: {
    marginBottom: 12,
  },
  editFieldGroupHalf: {
    flex: 1,
    marginBottom: 12,
  },
  editFieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editFieldInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600' as const,
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipTextSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  textInputDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  textInputDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  textInputDividerText: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500' as const,
  },
  textInputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInputField: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 50,
    maxHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  textSubmitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSubmitButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  timeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  timeFieldsWrap: {
    flex: 1,
    gap: 8,
  },
  timeLabelInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timePickerField: {
    alignItems: 'center',
  },
  timeNumInput: {
    width: 44,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    textAlign: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeNumLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
  timeColon: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  timeAmPm: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.primary,
    marginLeft: 6,
    marginBottom: 12,
  },
  timeRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addTimeBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
}));
