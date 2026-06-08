import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, ExternalLink } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';

const BOOKS = [
  {
    key: 'biostatistics-for-beginners',
    title: 'Biostatistics for beginners',
    description: 'Open the Biostatistics for beginners book resource.',
    url: 'https://biostatisticsforbeginners.netlify.app/',
  },
  {
    key: 'epidemiology-and-biostat-with-r',
    title: 'Epidemiology and Biostat with R',
    description: 'Open the Epidemiology and Biostat with R book resource.',
    url: 'https://epidemiologywithr.netlify.app/',
  },
] as const;

export default function BooksScreen() {
  const router = useRouter();

  const openBookLink = (url: string, title: string) => {
    router.push({
      pathname: '/web-viewer',
      params: {
        url: encodeURIComponent(url),
        title: encodeURIComponent(title),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <BookOpen size={20} color={colors.primary} />
            <Text style={styles.title}>Books</Text>
          </View>
          <Text style={styles.subtitle}>Tap a book below to open it in your browser.</Text>
        </View>

        {BOOKS.map((book) => (
          <TouchableOpacity
            key={book.key}
            style={styles.bookCard}
            onPress={() => { openBookLink(book.url, book.title); }}
            activeOpacity={0.88}
          >
            <View style={styles.bookTextWrap}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookDescription}>{book.description}</Text>
            </View>
            <ExternalLink size={18} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  bookCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bookTextWrap: {
    flex: 1,
    gap: 4,
  },
  bookTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  bookDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
}));