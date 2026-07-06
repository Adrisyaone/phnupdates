import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, ExternalLink, Heart, Search, Sparkles } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero, PressableScale } from '@/components/ui';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    WebView = require('react-native-webview').default;
  } catch (e) {
    console.log('[PublicHealthDay] WebView not available:', e);
  }
}

const GOOGLE_UA = 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

// Best-effort scrape of the loaded Google results page: tries a few
// known-ish answer/snippet class names first, then walks up from the first
// organic result heading to find its snippet block, then falls back to any
// leaf (childless) text node of reasonable length. Google's markup is
// unstable and undocumented, so this can legitimately find nothing.
const EXTRACTION_SCRIPT = `
(function () {
  function post(payload) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
  }
  function cleanText(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
  }
  function firstLink(scope) {
    var a = scope ? scope.querySelector('a[href^="http"]') : null;
    return a ? a.href : '';
  }

  var ANSWER_SELECTORS = [
    '.hgKElc', '.LGOjhe', '.Z0LcW', '.zCubwf', '.kno-rdesc span',
    '[data-attrid="wa:/description"]', '[data-attrid*="description"]',
  ];
  var SNIPPET_SELECTORS = ['.VwiC3b', '.MUxGbd', '.yDYNvb', '.lEBKkf'];

  function tryKnownSelectors(selectors, kind) {
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      var text = cleanText(el);
      if (text.length > 40) {
        var container = el.closest('div') || document.body;
        return { kind: kind, text: text.slice(0, 700), sourceUrl: firstLink(container) || firstLink(document.body) };
      }
    }
    return null;
  }

  function tryAttridPanel() {
    var candidates = document.querySelectorAll('[data-attrid]');
    for (var i = 0; i < candidates.length && i < 60; i++) {
      var el = candidates[i];
      if (el.children.length > 6) continue;
      var text = cleanText(el);
      if (text.length > 80 && text.length < 1000) {
        return { kind: 'answer', text: text.slice(0, 700), sourceUrl: firstLink(document.body) };
      }
    }
    return null;
  }

  function tryOrganic() {
    var heading = document.querySelector('h3');
    if (!heading) return null;
    var link = heading.closest('a');
    var container = heading.parentElement;
    for (var hop = 0; hop < 4 && container; hop++) {
      if (cleanText(container).length > 60) break;
      container = container.parentElement;
    }
    var snippetEl = null;
    if (container) {
      for (var i = 0; i < SNIPPET_SELECTORS.length; i++) {
        snippetEl = container.querySelector(SNIPPET_SELECTORS[i]);
        if (snippetEl) break;
      }
    }
    var snippetText = snippetEl ? cleanText(snippetEl) : (container ? cleanText(container) : '');
    return {
      kind: 'organic',
      title: cleanText(heading),
      text: snippetText.slice(0, 700),
      sourceUrl: link ? link.href : (container ? firstLink(container) : ''),
    };
  }

  function tryLeafFallback() {
    var root = document.getElementById('search') || document.body;
    var all = root.querySelectorAll('div, span, p');
    for (var i = 0; i < all.length && i < 600; i++) {
      var el = all[i];
      if (el.children.length > 0) continue;
      var text = cleanText(el);
      if (text.length > 80 && text.length < 700) {
        return { kind: 'answer', text: text, sourceUrl: firstLink(root) };
      }
    }
    return null;
  }

  function tryExtract() {
    return tryKnownSelectors(ANSWER_SELECTORS, 'answer')
      || tryAttridPanel()
      || tryKnownSelectors(SNIPPET_SELECTORS, 'organic')
      || tryOrganic()
      || tryLeafFallback();
  }

  var attempts = 0;
  var maxAttempts = 30;
  var timer = setInterval(function () {
    attempts += 1;
    var result = tryExtract();
    if (result && result.text && result.text.length > 20) {
      clearInterval(timer);
      post(result);
    } else if (attempts >= maxAttempts) {
      clearInterval(timer);
      post({ kind: 'none' });
    }
  }, 450);
  true;
})();
`;

interface ExtractedAnswer {
  kind: 'answer' | 'organic';
  title?: string;
  text: string;
  sourceUrl?: string;
}

type ExtractionStatus = 'loading' | 'found' | 'none';

function getDomain(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export default function PublicHealthDayScreen() {
  const params = useLocalSearchParams<{
    month?: string | string[];
    day?: string | string[];
    title?: string | string[];
    type?: string | string[];
  }>();
  const router = useRouter();

  const month = Array.isArray(params.month) ? params.month[0] : params.month;
  const day = Array.isArray(params.day) ? params.day[0] : params.day;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const type = Array.isArray(params.type) ? params.type[0] : params.type;

  const eventTitle = title || 'Public Health Day';
  const eventDate = useMemo(() => {
    if (!month || !day) return 'Date not provided';
    return `${month}/${day}`;
  }, [day, month]);
  const isWeek = type === 'week';

  // Extraction runs against the "igu=1" embed-friendly page (needed to avoid
  // Google's unsupported-browser wall inside the hidden scraping webview).
  // That mode is meant to stay a self-contained widget, though, and tends to
  // suppress normal link navigation, so the visible "browse" webview uses a
  // plain search URL instead -- letting people actually click into results
  // and keep browsing from there.
  const extractionUrl = useMemo(
    () => `https://www.google.com/search?igu=1&q=${encodeURIComponent(`${eventTitle} public health day`)}`,
    [eventTitle]
  );
  const browseUrl = useMemo(
    () => `https://www.google.com/search?q=${encodeURIComponent(`${eventTitle} public health day`)}`,
    [eventTitle]
  );

  const [status, setStatus] = useState<ExtractionStatus>(WebView ? 'loading' : 'none');
  const [answer, setAnswer] = useState<ExtractedAnswer | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStatus(WebView ? 'loading' : 'none');
    setAnswer(null);

    if (!WebView) return undefined;

    timeoutRef.current = setTimeout(() => {
      setStatus((prev) => (prev === 'loading' ? 'none' : prev));
    }, 16000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [extractionUrl]);

  const handleMessage = useCallback((event: any) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload && payload.kind && payload.kind !== 'none' && payload.text) {
        setAnswer(payload);
        setStatus('found');
      } else {
        setStatus('none');
      }
    } catch (e) {
      console.log('[PublicHealthDay] Failed to parse extraction payload:', e);
      setStatus('none');
    }
  }, []);

  const openFullSearch = useCallback(() => {
    router.push({ pathname: '/web-viewer', params: { url: browseUrl, title: eventTitle } });
  }, [router, browseUrl, eventTitle]);

  const openSource = useCallback(() => {
    if (!answer?.sourceUrl) return;
    router.push({ pathname: '/web-viewer', params: { url: answer.sourceUrl, title: eventTitle } });
  }, [router, answer, eventTitle]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />

      {WebView ? (
        <View style={styles.hiddenWebviewWrap} pointerEvents="none">
          <WebView
            source={{ uri: extractionUrl }}
            style={styles.hiddenWebview}
            userAgent={GOOGLE_UA}
            javaScriptEnabled
            domStorageEnabled
            injectedJavaScript={EXTRACTION_SCRIPT}
            onMessage={handleMessage}
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <GradientHero rounded style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroIconWrap}>
              <Heart size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>{eventTitle}</Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.dateBadge}>
                <CalendarDays size={11} color="#FFFFFF" />
                <Text style={styles.dateBadgeText}>{eventDate}</Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {isWeek ? 'Awareness Week' : 'Awareness Day'}
                </Text>
              </View>
            </View>
          </View>
        </GradientHero>

        <View style={styles.body}>

          {/* Loading */}
          {status === 'loading' ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>Looking for a quick answer on Google...</Text>
            </View>
          ) : null}

          {/* Found */}
          {status === 'found' && answer ? (
            <AnimatedEntrance from="up">
              <View style={styles.answerCard}>
                <View style={styles.cardHeader}>
                  <Sparkles size={15} color={colors.secondary} />
                  <Text style={styles.cardHeaderText}>
                    {answer.kind === 'answer' ? 'Quick Answer' : 'Top Result'}
                  </Text>
                </View>
                {answer.title ? <Text style={styles.answerTitle}>{answer.title}</Text> : null}
                <Text style={styles.answerText}>{answer.text}</Text>
                {answer.sourceUrl ? (
                  <PressableScale style={styles.sourcePill} onPress={openSource} haptic>
                    <ExternalLink size={12} color={colors.primary} />
                    <Text style={styles.sourcePillText} numberOfLines={1}>{getDomain(answer.sourceUrl)}</Text>
                  </PressableScale>
                ) : null}
              </View>
            </AnimatedEntrance>
          ) : null}

          {/* Nothing found */}
          {status === 'none' ? (
            <View style={styles.errorCard}>
              <Search size={28} color={colors.textSecondary} />
              <Text style={styles.errorTitle}>No quick answer found</Text>
              <Text style={styles.errorText}>
                We could not pull a summary for this day. You can still view the full Google search results.
              </Text>
            </View>
          ) : null}

          <PressableScale style={styles.fullSearchBtn} onPress={openFullSearch} haptic>
            <Search size={14} color={colors.primary} />
            <Text style={styles.fullSearchBtnText}>View full Google search results</Text>
          </PressableScale>
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
    paddingBottom: 32,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Hidden extraction webview
  hiddenWebviewWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  hiddenWebview: {
    width: 1,
    height: 1,
  },

  // Hero
  hero: {
    paddingBottom: spacing.xl,
  },
  heroInner: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  heroIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF2E',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF26',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  typeBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },

  // Loading
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 14,
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },

  // Answer card
  answerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.secondary + '35',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    ...elevation('md'),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cardHeaderText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  answerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  answerText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  sourcePillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  // No result
  errorCard: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Full search fallback
  fullSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 13,
    ...elevation('sm'),
  },
  fullSearchBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
}));
