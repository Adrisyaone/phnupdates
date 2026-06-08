import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SendHorizonal } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { askGeminiTutor } from '@/services/examPreparation';

type ChatMessage = { role: 'user' | 'assistant'; text: string };

export default function ExamTutorScreen() {
  const [subject, setSubject] = useState('Biostatistics');
  const [question, setQuestion] = useState('Explain the difference between mean and median.');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Ask about a topic, formula, or MCQ and I will explain it like a study tutor.' },
  ]);
  const [loading, setLoading] = useState(false);

  const canSend = useMemo(() => question.trim().length > 0 && !loading, [loading, question]);

  const sendQuestion = async () => {
    if (!question.trim()) return;
    const userMessage: ChatMessage = { role: 'user', text: question.trim() };
    const history = [...messages, userMessage];
    setMessages(history);
    setLoading(true);
    setQuestion('');

    try {
      const result = await askGeminiTutor({
        question: userMessage.text,
        subject,
        chatHistory: history,
      });
      setMessages((current) => [...current, { role: 'assistant', text: result.reply }]);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: 'The tutor could not respond right now. Check your Gemini API key and network connection.' }]);
      console.log('[ExamPreparation] Tutor error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Gemini tutor</Text>
            <Text style={styles.infoText}>
              Use this page to ask subject-specific study questions. If the Gemini API key is not configured yet, the app will show a setup message.
            </Text>
          </View>

          <View style={styles.chatCard}>
            {messages.map((message, index) => (
              <View key={`${message.role}-${index}-${message.text.slice(0, 12)}`} style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.messageRole, message.role === 'user' ? styles.userRole : styles.assistantRole]}>{message.role === 'user' ? 'You' : 'Tutor'}</Text>
                <Text style={styles.messageText}>{message.text}</Text>
              </View>
            ))}
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Subject</Text>
            <TextInput value={subject} onChangeText={setSubject} style={styles.input} placeholder="Biostatistics" placeholderTextColor={colors.textSecondary} />
            <Text style={styles.label}>Question</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              style={[styles.input, styles.multilineInput]}
              placeholder="Ask something about your exam topic"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <TouchableOpacity disabled={!canSend} onPress={() => { void sendQuestion(); }} style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
              <SendHorizonal size={16} color={colors.surface} />
              <Text style={styles.sendButtonText}>Ask the tutor</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  infoCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  chatCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  userBubble: {
    backgroundColor: colors.primary + '18',
  },
  assistantBubble: {
    backgroundColor: colors.surfaceAlt,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userRole: {
    color: colors.primary,
  },
  assistantRole: {
    color: colors.textSecondary,
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  formCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  sendButton: {
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.55,
  },
  sendButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
}));