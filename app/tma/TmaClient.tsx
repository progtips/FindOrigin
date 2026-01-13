'use client';

import { useState, useEffect } from 'react';

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: () => void;
    hideProgress: () => void;
    setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface SourceAnalysis {
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  confidence: number;
  matchDescription: string;
  sourceType?: string;
}

interface AnalysisResult {
  sources: SourceAnalysis[];
  summary: string;
}

export default function TmaClient() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tgWebApp, setTgWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    // Инициализация Telegram Web App
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.ready();
      webApp.expand();
      setTgWebApp(webApp);

      // Настройка кнопки "Назад"
      webApp.BackButton.onClick(() => {
        setResults(null);
        setText('');
        setError(null);
        webApp.BackButton.hide();
      });

      // Настройка главной кнопки
      webApp.MainButton.setText('Анализировать');
      webApp.MainButton.onClick(handleAnalyze);
      webApp.MainButton.show();

      return () => {
        webApp.BackButton.offClick(() => {});
        webApp.MainButton.offClick(handleAnalyze);
      };
    }
  }, []);

  useEffect(() => {
    // Обновляем состояние главной кнопки при изменении текста
    if (tgWebApp) {
      if (text.trim() && !loading) {
        tgWebApp.MainButton.enable();
      } else {
        tgWebApp.MainButton.disable();
      }
    }
  }, [text, loading, tgWebApp]);

  const handleAnalyze = async () => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResults(null);

    if (tgWebApp) {
      tgWebApp.MainButton.showProgress();
      tgWebApp.MainButton.disable();
    }

    try {
      const response = await fetch(`/api/test-search?text=${encodeURIComponent(text)}`);
      if (!response.ok) {
        throw new Error('Ошибка при выполнении анализа');
      }

      const data = await response.json();
      setResults({
        sources: data.analysis.sources || [],
        summary: data.analysis.summary || '',
      });

      // Показываем кнопку "Назад" после получения результатов
      if (tgWebApp) {
        tgWebApp.BackButton.show();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
      if (tgWebApp) {
        tgWebApp.MainButton.hideProgress();
        tgWebApp.MainButton.enable();
      }
    }
  };

  const theme = tgWebApp?.themeParams || {};
  const bgColor = theme.bg_color || '#ffffff';
  const textColor = theme.text_color || '#000000';
  const hintColor = theme.hint_color || '#999999';
  const buttonColor = theme.button_color || '#3390ec';
  const buttonTextColor = theme.button_text_color || '#ffffff';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: bgColor,
        color: textColor,
        padding: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {!results ? (
          <>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: textColor,
              }}
            >
              🔍 FindOrigin
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: hintColor,
                marginBottom: '24px',
              }}
            >
              Проверка источников информации
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="text-input"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: textColor,
                }}
              >
                Введите текст для проверки:
              </label>
              <textarea
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Например: Илон Маск планирует полет на Марс"
                disabled={loading}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: `1px solid ${hintColor}40`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  backgroundColor: bgColor,
                  color: textColor,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #f87171',
                  borderRadius: '8px',
                  color: '#991b1b',
                  marginBottom: '16px',
                  fontSize: '14px',
                }}
              >
                <strong>Ошибка:</strong> {error}
              </div>
            )}

            {loading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  color: hintColor,
                  fontSize: '14px',
                }}
              >
                🔍 Анализирую запрос...
              </div>
            )}
          </>
        ) : (
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '16px',
                color: textColor,
              }}
            >
              📊 Результаты анализа
            </h2>

            {results.summary && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: `${buttonColor}15`,
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: textColor,
                }}
              >
                {results.summary}
              </div>
            )}

            {results.sources.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {results.sources.map((source, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      backgroundColor: `${hintColor}10`,
                      borderRadius: '8px',
                      border: `1px solid ${hintColor}20`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: textColor,
                          margin: 0,
                          flex: 1,
                        }}
                      >
                        {source.title}
                      </h3>
                      <div
                        style={{
                          fontSize: '12px',
                          color: hintColor,
                          marginLeft: '8px',
                          textAlign: 'right',
                        }}
                      >
                        <div>Релевантность: {source.relevanceScore}%</div>
                        <div>Уверенность: {source.confidence}%</div>
                      </div>
                    </div>

                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: buttonColor,
                        textDecoration: 'none',
                        marginBottom: '8px',
                        wordBreak: 'break-all',
                      }}
                    >
                      {source.url.length > 50 ? `${source.url.substring(0, 50)}...` : source.url}
                    </a>

                    {source.snippet && (
                      <p
                        style={{
                          fontSize: '14px',
                          color: textColor,
                          margin: '8px 0',
                          lineHeight: '1.4',
                        }}
                      >
                        {source.snippet}
                      </p>
                    )}

                    {source.matchDescription && (
                      <p
                        style={{
                          fontSize: '13px',
                          color: hintColor,
                          margin: '8px 0 0 0',
                          fontStyle: 'italic',
                          lineHeight: '1.4',
                        }}
                      >
                        {source.matchDescription}
                      </p>
                    )}

                    {source.sourceType && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '8px',
                          padding: '4px 8px',
                          backgroundColor: `${hintColor}20`,
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: hintColor,
                        }}
                      >
                        {source.sourceType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: hintColor,
                  fontSize: '14px',
                }}
              >
                Источники не найдены
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
