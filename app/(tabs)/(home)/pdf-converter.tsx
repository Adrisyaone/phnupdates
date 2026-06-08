import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  FileText,
  Hash,
  Layers,
  LockOpen,
  Minus,
  Package,
  RotateCw,
  ScanLine,
  Scissors,
} from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';

const TOOL_COLOR = '#DC2626';

type PdfTool = {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  toolParam?: string;
  route?: string;
};

type PdfSection = {
  title: string;
  subtitle: string;
  tools: PdfTool[];
};

const PDF_SECTIONS: PdfSection[] = [
  {
    title: 'Organize PDF',
    subtitle: 'Merge, split, rotate, or remove pages — all on-device.',
    tools: [
      {
        key: 'merge',
        title: 'Merge PDF',
        description: 'Combine multiple PDF files into one document.',
        icon: Layers,
        toolParam: 'merge',
      },
      {
        key: 'split',
        title: 'Split PDF',
        description: 'Extract a range of pages into a new PDF.',
        icon: Scissors,
        toolParam: 'split',
      },
      {
        key: 'rotate',
        title: 'Rotate PDF',
        description: 'Rotate all pages 90°, 180°, or 270°.',
        icon: RotateCw,
        toolParam: 'rotate',
      },
      {
        key: 'remove-pages',
        title: 'Remove Pages',
        description: 'Delete specific pages from a PDF.',
        icon: Minus,
        toolParam: 'remove-pages',
      },
    ],
  },
  {
    title: 'Convert to PDF',
    subtitle: 'Turn images from your camera or gallery into PDF.',
    tools: [
      {
        key: 'image-to-pdf',
        title: 'Image to PDF',
        description: 'Pick photos or scan with camera and save as PDF.',
        icon: ScanLine,
        route: '/(tabs)/(home)/camscanner',
      },
    ],
  },
  {
    title: 'Edit PDF',
    subtitle: 'Annotate, compress, or secure your PDF files.',
    tools: [
      {
        key: 'compress',
        title: 'Compress PDF',
        description: 'Re-save with optimisations to reduce file size.',
        icon: Package,
        toolParam: 'compress',
      },
      {
        key: 'page-numbers',
        title: 'Add Page Numbers',
        description: 'Insert a page number at the bottom of each page.',
        icon: Hash,
        toolParam: 'page-numbers',
      },
      {
        key: 'watermark',
        title: 'Watermark PDF',
        description: 'Stamp a diagonal text watermark on every page.',
        icon: FileText,
        toolParam: 'watermark',
      },
      {
        key: 'unlock',
        title: 'Unlock PDF',
        description: 'Remove password protection from a PDF.',
        icon: LockOpen,
        toolParam: 'unlock',
      },
    ],
  },
];

export default function PdfConverterScreen() {
  const router = useRouter();

  const handleToolPress = (tool: PdfTool) => {
    if (tool.route) {
      router.push(tool.route as any);
      return;
    }
    if (tool.toolParam) {
      router.push({
        pathname: '/(tabs)/(home)/pdf-tools',
        params: { tool: tool.toolParam },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { borderColor: TOOL_COLOR + '33', backgroundColor: TOOL_COLOR + '0D' }]}>
          <View style={[styles.heroIcon, { backgroundColor: TOOL_COLOR }]}>
            <FileText size={22} color="#fff" />
          </View>
          <Text style={styles.title}>PDF Converter</Text>
          <Text style={styles.subtitle}>
            Merge, split, compress, add page numbers, watermark, and unlock PDF files — all processed on your device with no internet required.
          </Text>
        </View>

        <View style={styles.sectionList}>
          {PDF_SECTIONS.map((section) => (
            <View key={section.title} style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.groupTitle}>{section.title}</Text>
                <Text style={styles.groupSubtitle}>{section.subtitle}</Text>
              </View>
              <View style={styles.cardList}>
                {section.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <TouchableOpacity
                      key={tool.key}
                      style={[styles.toolCard, { borderColor: TOOL_COLOR + '33' }]}
                      onPress={() => handleToolPress(tool)}
                      activeOpacity={0.88}
                    >
                      <View style={[styles.toolIconWrap, { backgroundColor: TOOL_COLOR + '15' }]}>
                        <Icon size={20} color={TOOL_COLOR} />
                      </View>
                      <View style={styles.toolTextWrap}>
                        <Text style={styles.toolTitle}>{tool.title}</Text>
                        <Text style={styles.toolDescription}>{tool.description}</Text>
                      </View>
                      <ArrowRight size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 30,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800' as const,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionList: {
    gap: 16,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    gap: 4,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  groupSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  cardList: {
    gap: 12,
  },
  toolCard: {
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  toolIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  toolTextWrap: {
    flex: 1,
    gap: 3,
  },
  toolTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  toolDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
}));
