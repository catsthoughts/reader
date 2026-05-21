import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  Dimensions,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { WordLookupResult } from '../types';
import { getEpubPages } from '../utils/epub';

interface ReaderProps {
  filePath: string;
  currentPosition?: string;
  onPositionChange: (positionId: string, progress: number) => void;
  onWordLookup: (word: string) => Promise<WordLookupResult | null>;
  knownWords?: Record<string, number>;
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'rgba(255, 59, 48, 0.15)',
  2: 'rgba(255, 149, 0, 0.15)',
  3: 'rgba(0, 122, 255, 0.08)',
  4: 'rgba(52, 199, 89, 0.05)',
  5: 'rgba(128, 128, 128, 0.03)',
};

const LEVEL_OPACITY: Record<number, string> = {
  1: '1',
  2: '1',
  3: '0.9',
  4: '0.7',
  5: '0.5',
};

const HTML_WRAPPER = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Georgia', serif;
    font-size: 18px;
    line-height: 1.8;
    padding: 20px;
    color: #333;
    background: #fff;
    word-wrap: break-word;
  }
  p { margin-bottom: 1em; }
  img { max-width: 100%; height: auto; }
  .word {
    cursor: pointer;
    border-radius: 2px;
    transition: background-color 0.15s;
  }
  .word.highlighted {
    background-color: rgba(74, 144, 217, 0.2);
  }
</style>
</head>
<body>
__CONTENT__
<script>
  (function() {
    var words = document.querySelectorAll('.word');
    var lastTap = 0;
    var lastTapTarget = null;

    words.forEach(function(w) {
      w.addEventListener('click', function(e) {
        var now = Date.now();
        var timeSince = now - lastTap;

        if (lastTapTarget === e.target && timeSince < 400) {
          e.preventDefault();
          e.stopPropagation();
          var word = e.target.textContent.trim();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'wordTap',
            word: word
          }));
          lastTap = 0;
          lastTapTarget = null;
          e.target.classList.add('highlighted');
        } else {
          lastTap = now;
          lastTapTarget = e.target;
        }
      });
    });

    document.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
      });
    });
  })();
</script>
</body>
</html>
`;

function extractBodyContent(html: string): string {
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  if (bodyMatch) return bodyMatch[1];
  const htmlMatch = /<html[^>]*>([\s\S]*)<\/html>/i.exec(html);
  if (htmlMatch) return htmlMatch[1];
  return html;
}

function wrapWordsInHtml(html: string): string {
  const protectedTags = /<(script|style|svg|video|audio|canvas|math|pre|code)[^>]*>[\s\S]*?<\/\1>/gi;

  const blocks: string[] = [];
  let index = 0;
  const protectedHtml = html.replace(protectedTags, (match) => {
    const placeholder = `\x00PROTECTED${index}\x00`;
    blocks.push(match);
    index++;
    return placeholder;
  });

  let result = protectedHtml.replace(/>([^<]+)</g, (match, text: string) => {
    const wrapped = text.replace(
      /([\p{L}\p{N}'-]+)/gu,
      '<span class="word">$1</span>'
    );
    return `>${wrapped}<`;
  });

  result = result.replace(/\x00PROTECTED(\d+)\x00/g, (_, id) => blocks[parseInt(id)]);

  return result;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 60;

export default function Reader({
  filePath,
  currentPosition,
  onPositionChange,
  onWordLookup,
  knownWords = {},
}: ReaderProps) {
  const webViewRef = useRef<WebView>(null);
  const [pages, setPages] = useState<{ html: string; positionId: string }[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showHUD, setShowHUD] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const hudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(0);
  const pagesRef = useRef(pages);
  const updatingRef = useRef(false);
  const knownWordsRef = useRef(knownWords);

  useEffect(() => {
    currentIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    knownWordsRef.current = knownWords;
  }, [knownWords]);

  const applyHighlighting = useCallback(() => {
    const kw = knownWordsRef.current;
    const wordStyles = Object.entries(kw).map(([word, level]) => {
      const color = LEVEL_COLORS[level] || '';
      const opacity = LEVEL_OPACITY[level] || '1';
      return `"${word.replace(/['"]/g, '')}":{bg:"${color}",op:"${opacity}"}`;
    }).join(',');

    const js = `
      (function() {
        var styles = {${wordStyles}};
        document.querySelectorAll('.word').forEach(function(el) {
          var word = el.textContent.trim().toLowerCase();
          var info = styles[word];
          el.style.backgroundColor = '';
          el.style.opacity = '1';
          if (info) {
            if (info.bg) el.style.backgroundColor = info.bg;
            el.style.opacity = info.op;
          }
        });
      })();
    `;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const showHUDBriefly = useCallback(() => {
    setShowHUD(true);
    if (hudTimer.current) clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setShowHUD(false), 2000);
  }, []);

  const goToNext = useCallback(() => {
    if (updatingRef.current) return;
    updatingRef.current = true;

    const nextIndex = currentIndexRef.current + 1;
    const p = pagesRef.current;
    if (nextIndex >= p.length) {
      updatingRef.current = false;
      return;
    }

    setCurrentPageIndex(nextIndex);
    setPageLoaded(false);
    onPositionChange(p[nextIndex].positionId, nextIndex / p.length);
    showHUDBriefly();

    setTimeout(() => { updatingRef.current = false; }, 300);
  }, [onPositionChange, showHUDBriefly]);

  const goToPrev = useCallback(() => {
    if (updatingRef.current) return;
    updatingRef.current = true;

    const prevIndex = currentIndexRef.current - 1;
    const p = pagesRef.current;
    if (prevIndex < 0) {
      updatingRef.current = false;
      return;
    }

    setCurrentPageIndex(prevIndex);
    setPageLoaded(false);
    onPositionChange(p[prevIndex].positionId, prevIndex / p.length);
    showHUDBriefly();

    setTimeout(() => { updatingRef.current = false; }, 300);
  }, [onPositionChange, showHUDBriefly]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && Math.abs(gs.dx) > 10,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && Math.abs(gs.dx) > 10,
      onPanResponderRelease: (_, gs) => {
        const dx = gs.dx;
        const dy = gs.dy;

        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
          setShowHUD((prev) => !prev);
          return;
        }

        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) {
            goToNext();
          } else {
            goToPrev();
          }
        }
      },
    })
  ).current;

  useEffect(() => {
    loadPages();
  }, [filePath]);

  async function loadPages() {
    try {
      setLoading(true);
      const loadedPages = await getEpubPages(filePath, currentPosition);
      const processedPages = loadedPages.map((p) => ({
        ...p,
        html: wrapWordsInHtml(extractBodyContent(p.html)),
      }));
      setPages(processedPages);

      if (currentPosition) {
        const idx = processedPages.findIndex(
          (p) => p.positionId === currentPosition
        );
        if (idx >= 0) setCurrentPageIndex(idx);
      }

      setLoading(false);
      setPageLoaded(true);
    } catch (err) {
      console.error('Failed to load pages:', err);
      setLoading(false);
    }
  }

  const injectContent = useCallback(() => {
    if (pages.length === 0) return '';
    const page = pages[currentPageIndex];
    return HTML_WRAPPER.replace('__CONTENT__', page.html);
  }, [pages, currentPageIndex]);

  useEffect(() => {
    if (pages.length === 0 || !pageLoaded) return;
    applyHighlighting();
  }, [knownWords, pageLoaded, pages.length]);

  const handleLoadEnd = useCallback(() => {
    setPageLoaded(true);
    applyHighlighting();
  }, [applyHighlighting]);

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'wordTap') {
          const word = data.word.toLowerCase();
          await onWordLookup(word);
        }
      } catch {}
    },
    [onWordLookup]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (pages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Failed to load the book</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <WebView
        ref={webViewRef}
        source={{ html: injectContent() }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        scrollEnabled={true}
        onContentProcessDidTerminate={() => {}}
        onShouldStartLoadWithRequest={(req) => req.url === 'about:blank'}
        onLoadEnd={handleLoadEnd}
      />

      {showHUD && (
        <View style={styles.hud}>
          <View style={styles.hudBar}>
            <View style={[styles.hudBarFill, { width: `${((currentPageIndex + 1) / pages.length) * 100}%` }]} />
          </View>
          <Text style={styles.hudText}>
            {currentPageIndex + 1} / {pages.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  hud: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  hudBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  hudBarFill: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: 2,
  },
  hudText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.4)',
    fontWeight: '500',
  },
});