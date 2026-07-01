// template
import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";
import { Compass } from "lucide-react-native";
import { createThemedStyles, colors } from '@/constants/colors';
import { radii, spacing, elevation, glow } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <AuroraBackground />
        <AnimatedEntrance from="up" style={styles.inner}>
          <View style={[styles.iconRing, glow(colors.primary, 0.3)]}>
            <Compass size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
          <Text style={styles.subtitle}>The page you were looking for may have moved or is unavailable.</Text>

          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>Go to home screen</Text>
          </Link>
        </AnimatedEntrance>
      </View>
    </>
  );
}

const styles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  inner: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  link: {
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    ...elevation('md'),
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}));
