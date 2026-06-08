import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Animated,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Ruler,
  Scale,
  Calendar,
  Users,
  Activity,
  ChevronRight,
  Heart,
  Stethoscope,
  Check,
  Lock,
  Shield,
  Sparkles,
  Mic,
  BarChart3,
  Target,
  Fingerprint,
  Delete,
  Droplets,
  Timer,
  AlertTriangle,
  Brain,
  Moon,
  Info,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { colors, createThemedStyles } from '@/constants/colors';
import { useFood } from '@/contexts/FoodContext';
import { useSettings } from '@/contexts/SettingsContext';
import { ACTIVITY_LEVELS } from '@/constants/config';

const NCD_OPTIONS = [
  { key: 'diabetes', label: 'Diabetes', icon: Droplets, color: '#F59E0B' },
  { key: 'hypertension', label: 'Hypertension', icon: Heart, color: '#EF4444' },
  { key: 'dyslipedemia', label: 'Dyslipidemia', icon: Stethoscope, color: '#0EA5E9' },
  { key: 'heart_disease', label: 'Heart Disease', icon: Heart, color: '#DC2626' },
  { key: 'copd', label: 'COPD', icon: Activity, color: '#0EA5E9' },
  { key: 'asthma', label: 'Asthma', icon: Activity, color: '#06B6D4' },
  { key: 'kidney_disease', label: 'Kidney Disease', icon: Droplets, color: '#3B82F6' },
  { key: 'liver_disease', label: 'Liver Disease', icon: Shield, color: '#F97316' },
  { key: 'thyroid', label: 'Thyroid Disorder', icon: Timer, color: '#6366F1' },
  { key: 'cancer', label: 'Cancer', icon: AlertTriangle, color: '#B91C1C' },
  { key: 'stroke', label: 'Stroke', icon: Brain, color: '#7C3AED' },
  { key: 'arthritis', label: 'Arthritis', icon: Users, color: '#14B8A6' },
  { key: 'dental_problems', label: 'Dental Problems', icon: Check, color: '#0891B2' },
  { key: 'depression', label: 'Depression', icon: Moon, color: '#4F46E5' },
  { key: 'anxiety', label: 'Anxiety', icon: AlertTriangle, color: '#F59E0B' },
  { key: 'obesity', label: 'Obesity', icon: Scale, color: '#F97316' },
  { key: 'other', label: 'Other', icon: Info, color: '#64748B' },
];

type StepType = 'welcome' | 'info' | 'security' | 'profile' | 'body' | 'conditions' | 'activity';

interface StepConfig {
  type: StepType;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  iconBg: string;
  tip?: string;
}

const STEPS: StepConfig[] = [
  {
    type: 'welcome',
    title: 'Welcome to HealthyMe!',
    subtitle: 'Your complete health companion',
    description: 'Track nutrition, activities, weight, and BMI all in one place. Get personalized insights powered by AI to help you reach your health goals.',
    icon: Sparkles,
    iconBg: colors.primary,
  },
  {
    type: 'info',
    title: 'AI-Powered Food Logging',
    subtitle: 'Voice & text input with smart estimation',
    description: 'Just speak or type your meals naturally—our AI instantly estimates calories, protein, carbs, and fat. No barcode scanning required!',
    icon: Mic,
    iconBg: colors.success,
    tip: "Try saying: 'I had 2 eggs with toast and a coffee with milk'",
  },
  {
    type: 'info',
    title: 'Smart Activity Tracking',
    subtitle: 'Exercises + automatic BMR calculation',
    description: 'Log workouts, walks, and any activity. We calculate your Total Daily Energy Expenditure including your Basal Metabolic Rate.',
    icon: Activity,
    iconBg: colors.secondary,
    tip: "Your daily burn includes both activities and your body's natural metabolism",
  },
  {
    type: 'info',
    title: 'Dashboard & Analytics',
    subtitle: 'Visualize your progress with charts',
    description: 'See your personalized daily calorie requirement, track intake vs burned calories, and monitor your net balance with beautiful charts.',
    icon: BarChart3,
    iconBg: colors.primary,
    tip: 'Tap any chart to dive deeper into your nutrition and activity data',
  },
  {
    type: 'info',
    title: 'Personalized Goals',
    subtitle: 'Tailored to your body and lifestyle',
    description: 'Your daily calorie needs are calculated using the Mifflin-St Jeor equation based on your age, gender, height, weight, and activity level.',
    icon: Target,
    iconBg: '#10B981',
    tip: 'Update your profile anytime to recalculate your personalized targets',
  },
  {
    type: 'security',
    title: 'Protect Your Data',
    subtitle: 'Set up app security',
    description: 'Keep your health data private with PIN or fingerprint protection. Only you can access your personal information.',
    icon: Shield,
    iconBg: '#6366F1',
  },
  {
    type: 'profile',
    title: 'Welcome to HealthyMe!',
    subtitle: "Let's set up your profile",
    description: '',
    icon: Heart,
    iconBg: colors.primary,
  },
  {
    type: 'body',
    title: 'Welcome to HealthyMe!',
    subtitle: 'Your body measurements',
    description: '',
    icon: Heart,
    iconBg: colors.primary,
  },
  {
    type: 'conditions',
    title: 'Health Conditions',
    subtitle: 'Any existing conditions?',
    description: '',
    icon: Stethoscope,
    iconBg: '#EF4444',
  },
  {
    type: 'activity',
    title: 'Activity Level',
    subtitle: 'How active are you?',
    description: '',
    icon: Activity,
    iconBg: colors.secondary,
  },
];

const TOTAL_STEPS = STEPS.length;
const PIN_LENGTH = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, updateProfile, completeOnboarding } = useFood();
  const { setPin, updateAppLockSettings, biometricAvailable, authenticateWithBiometric } = useSettings();
  const [step, setStep] = useState(0);

  const [editedProfile, setEditedProfile] = useState({
    name: profile.name || '',
    age: profile.age || 25,
    gender: profile.gender || ('male' as 'male' | 'female' | 'other'),
    height: profile.height || 170,
    weight: profile.weight || 70,
    targetWeight: profile.targetWeight || 0,
    activityLevel: profile.activityLevel || ('moderate' as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'),
  });
  const [hasNCDs, setHasNCDs] = useState(false);
  const [selectedNCDs, setSelectedNCDs] = useState<string[]>([]);

  const [securityMode, setSecurityMode] = useState<'choice' | 'pin-create' | 'pin-confirm' | 'complete'>('choice');
  const [pinValue, setPinValue] = useState('');
  const [confirmPinValue, setConfirmPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [securityDone, setSecurityDone] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));

  const currentStepConfig = STEPS[step];

  const toggleNCD = (key: string) => {
    setSelectedNCDs(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const shake = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(100);
    }
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnimation]);

  const handlePinInput = useCallback((digit: string) => {
    if (securityMode === 'pin-create') {
      if (pinValue.length < PIN_LENGTH) {
        const newPin = pinValue + digit;
        setPinValue(newPin);
        setPinError('');
        if (newPin.length === PIN_LENGTH) {
          setTimeout(() => setSecurityMode('pin-confirm'), 200);
        }
      }
    } else if (securityMode === 'pin-confirm') {
      if (confirmPinValue.length < PIN_LENGTH) {
        const newPin = confirmPinValue + digit;
        setConfirmPinValue(newPin);
        setPinError('');
        if (newPin.length === PIN_LENGTH) {
          setTimeout(() => {
            if (newPin === pinValue) {
              handlePinSetupComplete(pinValue);
            } else {
              setPinError('PINs do not match. Try again.');
              shake();
              setConfirmPinValue('');
            }
          }, 200);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [securityMode, pinValue, confirmPinValue, shake]);

  const handlePinDelete = useCallback(() => {
    if (securityMode === 'pin-create') {
      setPinValue(prev => prev.slice(0, -1));
    } else if (securityMode === 'pin-confirm') {
      setConfirmPinValue(prev => prev.slice(0, -1));
    }
    setPinError('');
  }, [securityMode]);

  const handlePinSetupComplete = async (pin: string) => {
    try {
      await setPin(pin);
      await updateAppLockSettings({ enabled: true });
      setSecurityMode('complete');
      setSecurityDone(true);
      console.log('[Onboarding] PIN saved successfully');
    } catch (error) {
      console.log('[Onboarding] Error saving PIN:', error);
      setPinError('Failed to save PIN. Try again.');
      setPinValue('');
      setConfirmPinValue('');
      setSecurityMode('pin-create');
    }
  };

  const handleBiometricSetup = async () => {
    const success = await authenticateWithBiometric();
    if (success) {
      await updateAppLockSettings({ enabled: true, biometricEnabled: true });
      setSecurityMode('pin-create');
    }
  };

  const handleSkipSecurity = () => {
    setSecurityDone(true);
    setStep(step + 1);
  };

  const handleComplete = async () => {
    if (!editedProfile.name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      setStep(6);
      return;
    }
    if (editedProfile.age < 10 || editedProfile.age > 120) {
      Alert.alert('Invalid Age', 'Please enter a valid age.');
      setStep(6);
      return;
    }
    if (editedProfile.height < 100 || editedProfile.height > 250) {
      Alert.alert('Invalid Height', 'Please enter a valid height (100-250 cm).');
      setStep(7);
      return;
    }
    if (editedProfile.weight < 30 || editedProfile.weight > 300) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight (30-300 kg).');
      setStep(7);
      return;
    }

    try {
      await updateProfile({
        ...profile,
        name: editedProfile.name.trim(),
        age: editedProfile.age,
        gender: editedProfile.gender,
        height: editedProfile.height,
        weight: editedProfile.weight,
        targetWeight: editedProfile.targetWeight || 0,
        activityLevel: editedProfile.activityLevel,
        ncds: hasNCDs ? selectedNCDs : [],
      } as any);
      await completeOnboarding();
      console.log('[Onboarding] Profile saved and onboarding completed');
      router.replace('/');
    } catch (error) {
      console.log('[Onboarding] Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const nextStep = () => {
    if (currentStepConfig.type === 'security' && !securityDone) {
      return;
    }
    if (currentStepConfig.type === 'profile') {
      if (!editedProfile.name.trim()) {
        Alert.alert('Name Required', 'Please enter your name.');
        return;
      }
    }
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      if (currentStepConfig.type === 'security') {
        setSecurityMode('choice');
        setPinValue('');
        setConfirmPinValue('');
        setPinError('');
      }
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    if (step < 5) {
      setStep(5);
    }
  };

  const getBMIValue = () => {
    if (editedProfile.height > 0 && editedProfile.weight > 0) {
      return (editedProfile.weight / Math.pow(editedProfile.height / 100, 2)).toFixed(1);
    }
    return '--';
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: colors.warning };
    if (bmi < 25) return { label: 'Normal', color: colors.success };
    if (bmi < 30) return { label: 'Overweight', color: colors.warning };
    return { label: 'Obese', color: colors.error };
  };

  const renderPinDots = (value: string) => (
    <Animated.View
      style={[styles.pinDotsRow, { transform: [{ translateX: shakeAnimation }] }]}
    >
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            value.length > index && styles.pinDotFilled,
            pinError ? styles.pinDotError : null,
          ]}
        />
      ))}
    </Animated.View>
  );

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'delete'],
    ];

    return (
      <View style={styles.pinKeypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.pinKeypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={`empty-${keyIndex}`} style={styles.pinKeyEmpty} />;
              }
              if (key === 'delete') {
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.pinKey}
                    onPress={handlePinDelete}
                    activeOpacity={0.6}
                  >
                    <Delete size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.pinKey}
                  onPress={() => handlePinInput(key)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.pinKeyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderWelcomeOrInfo = () => {
    const IconComp = currentStepConfig.icon;
    return (
      <View style={styles.stepContent}>
        <View style={[styles.featureIconWrap, { backgroundColor: currentStepConfig.iconBg + '20' }]}>
          <IconComp size={48} color={currentStepConfig.iconBg} />
        </View>
        <Text style={styles.featureTitle}>{currentStepConfig.title}</Text>
        <Text style={styles.featureSubtitle}>{currentStepConfig.subtitle}</Text>
        <Text style={styles.featureDesc}>{currentStepConfig.description}</Text>
        {currentStepConfig.tip && (
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>{currentStepConfig.tip}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSecurity = () => {
    if (securityMode === 'complete') {
      return (
        <View style={styles.stepContent}>
          <View style={[styles.featureIconWrap, { backgroundColor: colors.success + '20' }]}>
            <Check size={48} color={colors.success} />
          </View>
          <Text style={styles.featureTitle}>Security Enabled!</Text>
          <Text style={styles.featureSubtitle}>Your app is now protected</Text>
        </View>
      );
    }

    if (securityMode === 'pin-create' || securityMode === 'pin-confirm') {
      const currentValue = securityMode === 'pin-create' ? pinValue : confirmPinValue;
      return (
        <View style={styles.stepContent}>
          <View style={[styles.featureIconWrap, { backgroundColor: '#6366F1' + '20' }]}>
            <Lock size={40} color="#6366F1" />
          </View>
          <Text style={styles.featureTitle}>
            {securityMode === 'pin-create' ? 'Create a 4-digit PIN' : 'Confirm your PIN'}
          </Text>
          <Text style={styles.featureSubtitle}>
            {securityMode === 'pin-create'
              ? 'This PIN will protect your health data'
              : 'Enter the same PIN again to confirm'}
          </Text>

          {renderPinDots(currentValue)}

          {pinError ? (
            <Text style={styles.pinErrorText}>{pinError}</Text>
          ) : (
            <View style={styles.pinErrorPlaceholder} />
          )}

          {renderKeypad()}

          <TouchableOpacity style={styles.skipSecurityBtn} onPress={handleSkipSecurity}>
            <Text style={styles.skipSecurityText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        <View style={[styles.featureIconWrap, { backgroundColor: '#6366F1' + '20' }]}>
          <Shield size={48} color="#6366F1" />
        </View>
        <Text style={styles.featureTitle}>{currentStepConfig.title}</Text>
        <Text style={styles.featureSubtitle}>{currentStepConfig.subtitle}</Text>
        <Text style={styles.featureDesc}>{currentStepConfig.description}</Text>

        <Text style={styles.securityChoiceLabel}>Choose Security Method</Text>

        {biometricAvailable && Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.securityOption} onPress={handleBiometricSetup}>
            <View style={[styles.securityOptionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Fingerprint size={28} color={colors.primary} />
            </View>
            <View style={styles.securityOptionContent}>
              <Text style={styles.securityOptionTitle}>Fingerprint + PIN</Text>
              <Text style={styles.securityOptionDesc}>Use fingerprint with PIN backup</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.securityOption} onPress={() => setSecurityMode('pin-create')}>
          <View style={[styles.securityOptionIcon, { backgroundColor: '#6366F1' + '15' }]}>
            <Lock size={28} color="#6366F1" />
          </View>
          <View style={styles.securityOptionContent}>
            <Text style={styles.securityOptionTitle}>PIN Only</Text>
            <Text style={styles.securityOptionDesc}>Secure with a 4-digit PIN</Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipSecurityBtn} onPress={handleSkipSecurity}>
          <Text style={styles.skipSecurityText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderProfile = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputCard}>
        <View style={styles.inputRow}>
          <View style={[styles.inputIcon, { backgroundColor: colors.primary + '15' }]}>
            <User size={20} color={colors.primary} />
          </View>
          <View style={styles.inputContent}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={editedProfile.name}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
              placeholder="Enter your name"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.inputRow}>
          <View style={[styles.inputIcon, { backgroundColor: colors.secondary + '15' }]}>
            <Calendar size={20} color={colors.secondary} />
          </View>
          <View style={styles.inputContent}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={String(editedProfile.age)}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, age: parseInt(text) || 0 })}
              keyboardType="number-pad"
              placeholder="25"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.inputRow}>
          <View style={[styles.inputIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
            <Users size={20} color="#8B5CF6" />
          </View>
          <View style={styles.inputContent}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderButtons}>
              {(['male', 'female', 'other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderButton, editedProfile.gender === g && styles.genderButtonActive]}
                  onPress={() => setEditedProfile({ ...editedProfile, gender: g })}
                >
                  <Text style={[styles.genderButtonText, editedProfile.gender === g && styles.genderButtonTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderBody = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputCard}>
        <View style={styles.inputRow}>
          <View style={[styles.inputIcon, { backgroundColor: colors.success + '15' }]}>
            <Ruler size={20} color={colors.success} />
          </View>
          <View style={styles.inputContent}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={String(editedProfile.height)}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, height: parseInt(text) || 0 })}
              keyboardType="number-pad"
              placeholder="170"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.inputRow}>
          <View style={[styles.inputIcon, { backgroundColor: colors.primary + '15' }]}>
            <Scale size={20} color={colors.primary} />
          </View>
          <View style={styles.inputContent}>
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={String(editedProfile.weight)}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, weight: parseFloat(text) || 0 })}
              keyboardType="decimal-pad"
              placeholder="70"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.inputRow}>
          <View style={[styles.inputIcon, { backgroundColor: colors.success + '15' }]}>
            <Target size={20} color={colors.success} />
          </View>
          <View style={styles.inputContent}>
            <Text style={styles.inputLabel}>Target Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={editedProfile.targetWeight ? String(editedProfile.targetWeight) : ''}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, targetWeight: parseFloat(text) || 0 })}
              keyboardType="decimal-pad"
              placeholder="Optional"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>
      </View>

      <View style={styles.bmiPreview}>
        <Text style={styles.bmiPreviewLabel}>Your BMI</Text>
        <Text style={styles.bmiPreviewValue}>{getBMIValue()}</Text>
        {editedProfile.height > 0 && editedProfile.weight > 0 && (
          <Text style={[styles.bmiPreviewCategory, { color: getBMICategory(parseFloat(getBMIValue())).color }]}>
            {getBMICategory(parseFloat(getBMIValue())).label}
          </Text>
        )}
      </View>
    </View>
  );

  const renderConditions = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputCard}>
        <View style={styles.ncdHeader}>
          <View style={[styles.inputIcon, { backgroundColor: '#EF4444' + '15' }]}>
            <Stethoscope size={20} color="#EF4444" />
          </View>
          <View style={styles.ncdHeaderContent}>
            <Text style={styles.ncdHeaderTitle}>Health Conditions</Text>
            <Text style={styles.ncdHeaderDesc}>Do you have any existing NCDs?</Text>
          </View>
          <Switch
            value={hasNCDs}
            onValueChange={setHasNCDs}
            trackColor={{ false: colors.border, true: '#EF4444' + '60' }}
            thumbColor={hasNCDs ? '#EF4444' : colors.textLight}
          />
        </View>

        {hasNCDs && (
          <View style={styles.ncdGrid}>
            {NCD_OPTIONS.map((ncd) => (
              <TouchableOpacity
                key={ncd.key}
                style={[
                  styles.ncdChip,
                  selectedNCDs.includes(ncd.key) && styles.ncdChipActive,
                ]}
                onPress={() => toggleNCD(ncd.key)}
              >
                <View
                  style={[
                    styles.ncdChipIconWrap,
                    { backgroundColor: selectedNCDs.includes(ncd.key) ? '#FFFFFF22' : ncd.color + '20' },
                  ]}
                >
                  <ncd.icon
                    size={13}
                    color={selectedNCDs.includes(ncd.key) ? '#FFFFFF' : ncd.color}
                  />
                </View>
                <Text style={[
                  styles.ncdChipText,
                  selectedNCDs.includes(ncd.key) && styles.ncdChipTextActive,
                ]}>
                  {ncd.label}
                </Text>
                {selectedNCDs.includes(ncd.key) && (
                  <Check size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!hasNCDs && (
          <View style={styles.noNcdMessage}>
            <Text style={styles.noNcdText}>No worries! You can update this later in your profile.</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderActivityLevel = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputCard}>
        <View style={styles.activityHeader}>
          <Activity size={20} color={colors.primary} />
          <Text style={styles.activityTitle}>How active are you?</Text>
        </View>
        {ACTIVITY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.key}
            style={[
              styles.activityOption,
              editedProfile.activityLevel === level.key && styles.activityOptionActive,
            ]}
            onPress={() => setEditedProfile({ ...editedProfile, activityLevel: level.key as any })}
          >
            <View style={styles.activityOptionContent}>
              <Text style={[
                styles.activityOptionTitle,
                editedProfile.activityLevel === level.key && styles.activityOptionTitleActive,
              ]}>
                {level.label}
              </Text>
              <Text style={styles.activityOptionDesc}>
                {level.key === 'sedentary' ? 'Little or no exercise' :
                 level.key === 'light' ? 'Light exercise 1-3 days/week' :
                 level.key === 'moderate' ? 'Moderate exercise 3-5 days/week' :
                 level.key === 'active' ? 'Hard exercise 6-7 days/week' :
                 'Very hard exercise, physical job'}
              </Text>
            </View>
            {editedProfile.activityLevel === level.key && (
              <View style={styles.activityCheck}>
                <Check size={18} color={colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStepConfig.type) {
      case 'welcome':
      case 'info':
        return renderWelcomeOrInfo();
      case 'security':
        return renderSecurity();
      case 'profile':
        return renderProfile();
      case 'body':
        return renderBody();
      case 'conditions':
        return renderConditions();
      case 'activity':
        return renderActivityLevel();
      default:
        return null;
    }
  };

  const isSecurityStep = currentStepConfig.type === 'security';
  const isIntroStep = currentStepConfig.type === 'welcome' || currentStepConfig.type === 'info';
  const isProfileSection = ['profile', 'body', 'conditions', 'activity'].includes(currentStepConfig.type);
  const isLastStep = step === TOTAL_STEPS - 1;
  const showFooter = !isSecurityStep || securityDone;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isProfileSection && (
              <View style={styles.header}>
                <View style={styles.logoWrap}>
                  <Image
                    source={require('@/assets/images/logo.png')}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.headerTitle}>{currentStepConfig.title}</Text>
                <Text style={styles.headerAppTag}>{currentStepConfig.subtitle}</Text>
              </View>
            )}

            <View style={styles.progressBar}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
              ))}
            </View>

            {renderStepContent()}
          </ScrollView>

          {showFooter && (
            <View style={styles.footer}>
              {isIntroStep && !isLastStep && (
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              )}
              {isProfileSection && step > 6 && (
                <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              {isSecurityStep && securityDone && (
                <View />
              )}
              <TouchableOpacity style={[styles.nextButton, (isIntroStep && !isLastStep) ? {} : styles.nextButtonFull]} onPress={nextStep}>
                <Text style={styles.nextButtonText}>
                  {isLastStep ? "Let's Go!" : 'Next'}
                </Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  logoImage: {
    width: 52,
    height: 52,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerAppTag: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
  },
  progressDot: {
    width: 24,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    gap: 16,
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  tipBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    width: '100%',
    marginTop: 8,
  },
  tipText: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  securityChoiceLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: 8,
    marginBottom: 16,
  },
  securityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  securityOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  securityOptionContent: {
    flex: 1,
  },
  securityOptionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  securityOptionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  skipSecurityBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  skipSecurityText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  pinDotError: {
    borderColor: colors.error,
  },
  pinErrorText: {
    fontSize: 13,
    color: colors.error,
    marginBottom: 8,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  pinErrorPlaceholder: {
    height: 18,
    marginBottom: 8,
  },
  pinKeypad: {
    width: 260,
  },
  pinKeypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pinKey: {
    width: 70,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinKeyEmpty: {
    width: 70,
    height: 56,
    backgroundColor: 'transparent',
  },
  pinKeyText: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: colors.text,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 6,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  inputIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  input: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  genderButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  genderButtonActive: {
    backgroundColor: colors.primary,
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  genderButtonTextActive: {
    color: '#FFFFFF',
  },
  bmiPreview: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bmiPreviewLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bmiPreviewValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  bmiPreviewCategory: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  ncdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  ncdHeaderContent: {
    flex: 1,
  },
  ncdHeaderTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  ncdHeaderDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ncdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
    paddingTop: 4,
  },
  ncdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ncdChipActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  ncdChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.text,
  },
  ncdChipTextActive: {
    color: '#FFFFFF',
  },
  ncdChipIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noNcdMessage: {
    padding: 20,
    alignItems: 'center',
  },
  noNcdText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    paddingBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 6,
    borderRadius: 14,
    marginBottom: 4,
  },
  activityOptionActive: {
    backgroundColor: colors.primary + '10',
  },
  activityOptionContent: {
    flex: 1,
  },
  activityOptionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
  },
  activityOptionTitleActive: {
    color: colors.primary,
  },
  activityOptionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityCheck: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
}));
