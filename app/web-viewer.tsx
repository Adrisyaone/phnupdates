import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Share2, Globe, ExternalLink, RefreshCw } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';

const BLOCKED_AD_HOST_PATTERNS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'adservice.google.',
  'googletagmanager.com',
  'googletagservices.com',
  'adnxs.com',
  'taboola.com',
  'outbrain.com',
  'mgid.com',
  'criteo.com',
  'pubmatic.com',
  'adsystem.com',
];

const BLOG_HOST_PATTERNS = [
  'phnupdates.com',
  'blogspot.com',
];

function getHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function shouldEnableAdBlockForUrl(rawUrl: string): boolean {
  const host = getHostname(rawUrl);
  return BLOG_HOST_PATTERNS.some((pattern) => host.includes(pattern));
}

function isBlockedAdHostUrl(rawUrl: string): boolean {
  const host = getHostname(rawUrl);
  if (!host) return false;
  return BLOCKED_AD_HOST_PATTERNS.some((pattern) => host.includes(pattern));
}

const AD_BLOCK_INJECTED_SCRIPT = `
  (function () {
    var blockedHosts = ${JSON.stringify(BLOCKED_AD_HOST_PATTERNS)};
    function hostFrom(url) {
      try { return new URL(url, location.href).hostname.toLowerCase(); } catch (e) { return ''; }
    }
    function isBlocked(url) {
      var h = hostFrom(url);
      if (!h) return false;
      return blockedHosts.some(function (p) { return h.indexOf(p) !== -1; });
    }
    function removeAds() {
      var selectors = [
        'iframe[src*="doubleclick"]',
        'iframe[src*="googlesyndication"]',
        'ins.adsbygoogle',
        '[id*="ad-"]',
        '[class*="ad-"]',
        '[class*="ads-"]',
        '[id*="google_ads"]',
        '.adsbygoogle',
        '.ad-container',
        '.advertisement'
      ];
      selectors.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (node) {
          if (node && node.style) {
            node.style.display = 'none';
            node.style.visibility = 'hidden';
            node.style.height = '0px';
            node.style.minHeight = '0px';
          }
        });
      });
    }

    var originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (isBlocked(url)) {
          return Promise.reject(new Error('Blocked ad/tracker request'));
        }
        return originalFetch.call(this, input, init);
      };
    }

    var originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      if (isBlocked(url)) {
        return;
      }
      return originalOpen.apply(this, arguments);
    };

    var observer = new MutationObserver(removeAds);
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    removeAds();
  })();
  true;
`;

function getYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    if (host.includes('youtu.be') && pathParts.length > 0) {
      return pathParts[0];
    }

    if (host.includes('youtube.com')) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (pathParts[0] === 'shorts' && pathParts[1]) {
        return pathParts[1];
      }
      if (pathParts[0] === 'embed' && pathParts[1]) {
        return pathParts[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeWebUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : trimmed.startsWith('//')
      ? `https:${trimmed}`
      : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }
    return parsed.toString();
  } catch {
    return withScheme;
  }
}

function decodeParamValue(value: string): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isPdfUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}

// Android's embedded WebView has no built-in PDF plugin (unlike iOS's
// WKWebView, which renders PDFs natively), so a raw .pdf URL just shows a
// blank page there. Route it through Google's embeddable Docs Viewer instead.
function toPdfViewerUrl(rawUrl: string): string {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(rawUrl)}`;
}

function toInAppUrl(rawUrl: string): string {
  const videoId = getYouTubeVideoId(rawUrl);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=https%3A%2F%2Fwww.youtube.com`;
  }
  if (Platform.OS === 'android' && isPdfUrl(rawUrl)) {
    return toPdfViewerUrl(rawUrl);
  }
  return rawUrl;
}

function isYouTubeUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host.includes('youtube.com') || host.includes('youtu.be') || host.includes('youtube-nocookie.com');
  } catch {
    return false;
  }
}

// A standard mobile Chrome UA — many sites (Google Forms/Sign-In, university
// portals, application forms) reject the default Android WebView UA
// ("...wv...") with an "unsupported browser" page, so every page loads with
// this UA rather than only YouTube/Google Search.
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    WebView = require('react-native-webview').default;
  } catch (e) {
    console.log('[WebViewer] WebView not available:', e);
  }
}

export default function WebViewerScreen() {
  const { url, title } = useLocalSearchParams<{ url?: string | string[]; title?: string | string[] }>();
  const router = useRouter();
  const rawUrl = Array.isArray(url) ? (url[0] || '') : (url || '');
  const safeUrl = useMemo(() => normalizeWebUrl(decodeParamValue(rawUrl)), [rawUrl]);
  const viewerUrl = useMemo(() => toInAppUrl(safeUrl), [safeUrl]);
  const isYouTube = useMemo(() => isYouTubeUrl(safeUrl), [safeUrl]);
  const safeTitle = Array.isArray(title) ? (title[0] || '') : (title || '');
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(viewerUrl);
  const [pageTitle, setPageTitle] = useState(safeTitle);
  const [adBlockEnabled, setAdBlockEnabled] = useState(shouldEnableAdBlockForUrl(safeUrl));
  const [adBlockFallbackUsed, setAdBlockFallbackUsed] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const webViewRef = React.useRef<any>(null);
  const hasRetriedSecureRef = React.useRef(false);

  const openExternally = useCallback(() => {
    if (!safeUrl) return;
    void Linking.openURL(safeUrl).catch((error) => {
      console.log('[WebViewer] Failed to open externally:', error);
    });
  }, [safeUrl]);

  const toSecureUrl = useCallback((candidate: string): string => {
    if (!candidate) return '';
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
        return parsed.toString();
      }
      return candidate;
    } catch {
      return normalizeWebUrl(candidate);
    }
  }, []);

  const recoverFromLoadError = useCallback(() => {
    if (adBlockEnabled && !adBlockFallbackUsed && shouldEnableAdBlockForUrl(currentUrl)) {
      setAdBlockFallbackUsed(true);
      setAdBlockEnabled(false);
      Alert.alert(
        'Ad block disabled for this page',
        'This page had trouble loading with ad blocking. It has been reopened with ads allowed.'
      );
      setTimeout(() => {
        try {
          webViewRef.current?.reload();
        } catch {
          // No-op: reload is best-effort.
        }
      }, 0);
      return;
    }

    if (!hasRetriedSecureRef.current) {
      const secureCurrent = toSecureUrl(currentUrl);
      if (secureCurrent && secureCurrent !== currentUrl) {
        hasRetriedSecureRef.current = true;
        setCurrentUrl(secureCurrent);
        return;
      }
    }

    if (currentUrl !== safeUrl) {
      setCurrentUrl(safeUrl);
      return;
    }

    // Out of automatic recovery options — let the user know instead of
    // leaving them staring at a blank page.
    setLoadFailed(true);
  }, [adBlockEnabled, adBlockFallbackUsed, currentUrl, safeUrl, toSecureUrl]);

  const retryLoad = useCallback(() => {
    hasRetriedSecureRef.current = false;
    setLoadFailed(false);
    setCurrentUrl(viewerUrl);
    setTimeout(() => {
      try {
        webViewRef.current?.reload();
      } catch {
        // No-op: reload is best-effort.
      }
    }, 0);
  }, [viewerUrl]);

  const handleClose = useCallback(() => {
    try {
      router.back();
    } catch {
      router.replace('/');
    }
  }, [router]);

  const handleShare = useCallback(async () => {
    if (!safeUrl) return;
    try {
      await Share.share({
        url: safeUrl,
        message: Platform.OS === 'android' ? safeUrl : undefined,
        title: pageTitle || 'Shared Link',
      });
    } catch (error) {
      console.log('[WebViewer] Share error:', error);
    }
  }, [safeUrl, pageTitle]);

  React.useEffect(() => {
    hasRetriedSecureRef.current = false;
    setCurrentUrl(viewerUrl);
    setAdBlockEnabled(shouldEnableAdBlockForUrl(viewerUrl));
    setAdBlockFallbackUsed(false);
    setLoadFailed(false);
  }, [viewerUrl]);

  React.useEffect(() => {
    setPageTitle(safeTitle);
  }, [safeTitle]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Globe size={14} color={colors.textSecondary} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {pageTitle || url || 'Web Page'}
              </Text>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={openExternally}>
              <ExternalLink size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <iframe
          src={currentUrl || ''}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' } as any}
          title={pageTitle || 'Web Content'}
        />
      </View>
    );
  }

  if (!WebView) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>WebView is not available</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleClose}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} testID="web-viewer-close">
            <X size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Globe size={14} color={colors.textSecondary} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {pageTitle || 'Loading...'}
            </Text>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare} testID="web-viewer-share">
            <Share2 size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        {loading && (
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        )}
      </SafeAreaView>

      <WebView
        ref={webViewRef}
        source={isYouTube
          ? {
              uri: currentUrl || '',
              headers: {
                Referer: 'https://www.youtube.com/',
                Origin: 'https://www.youtube.com',
              },
            }
          : { uri: currentUrl || '' }}
        originWhitelist={['*']}
        style={styles.webview}
        onLoadStart={() => {
          setLoading(true);
          setLoadFailed(false);
        }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(navState: any) => {
          if (navState.title && navState.title !== url) {
            setPageTitle(navState.title);
          }
        }}
        javaScriptEnabled
        injectedJavaScriptBeforeContentLoaded={adBlockEnabled ? AD_BLOCK_INJECTED_SCRIPT : undefined}
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows
        onOpenWindow={(event: any) => {
          // Sites that use window.open()/target="_blank" (application forms,
          // sign-in popups, "open PDF" links) would otherwise silently do
          // nothing — route the new-window request into this same WebView.
          const targetUrl = event?.nativeEvent?.targetUrl;
          if (targetUrl) setCurrentUrl(targetUrl);
        }}
        onShouldStartLoadWithRequest={(request: any) => {
          if (!adBlockEnabled) return true;
          const requestUrl = request?.url || '';
          if (!requestUrl) return true;
          if (isBlockedAdHostUrl(requestUrl)) {
            return false;
          }
          return true;
        }}
        onError={recoverFromLoadError}
        onHttpError={recoverFromLoadError}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        userAgent={BROWSER_USER_AGENT}
      />

      {loadFailed && (
        <View style={styles.loadErrorOverlay}>
          <Globe size={36} color={colors.textSecondary} />
          <Text style={styles.loadErrorTitle}>Couldn't load this page</Text>
          <Text style={styles.loadErrorText}>
            The site may be blocking in-app browsers, or your connection may have dropped.
          </Text>
          <View style={styles.loadErrorActions}>
            <TouchableOpacity style={styles.retryBtn} onPress={retryLoad}>
              <RefreshCw size={16} color="#fff" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.openExternalBtn} onPress={openExternally}>
              <ExternalLink size={16} color={colors.primary} />
              <Text style={styles.openExternalBtnText}>Open in Browser</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSafe: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: 2,
    width: '40%',
    backgroundColor: colors.primary,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  loadErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 32,
    gap: 8,
  },
  loadErrorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  loadErrorText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  loadErrorActions: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  openExternalBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  openExternalBtnText: {
    color: colors.primary,
    fontWeight: '600' as const,
    fontSize: 15,
  },
}));
