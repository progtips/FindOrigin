'use client';

import { useState, useEffect } from 'react';

// Безопасная функция для сокращения URL на клиенте
function shortenUrl(url: string, maxLength: number = 50): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    if (typeof URL !== 'undefined') {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;
      
      if (url.length <= maxLength) {
        return url;
      }
      
      const shortPath = path.length > 20 
        ? path.substring(0, 20) + '...' 
        : path;
      
      const shortUrl = `${domain}${shortPath}`;
      
      if (shortUrl.length > maxLength) {
        const domainParts = domain.split('.');
        if (domainParts.length >= 2) {
          const mainDomain = domainParts.slice(-2).join('.');
          const remainingLength = maxLength - mainDomain.length - shortPath.length - 3;
          if (remainingLength > 0) {
            return `${domainParts[0].substring(0, remainingLength)}...${mainDomain}${shortPath}`;
          }
          return `${mainDomain}${shortPath.substring(0, maxLength - mainDomain.length)}...`;
        }
        return domain.substring(0, maxLength - 3) + '...';
      }
      
      return shortUrl;
    }
    return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
  } catch (error) {
    return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
  }
}

export default function TestPage() {
  const [text, setText] = useState('Генеральный директор Coinbase уволил программистов, не использующих ИИ');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`/api/test-search?text=${encodeURIComponent(text)}`);
      if (!response.ok) {
        throw new Error('Ошибка при выполнении поиска');
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '896px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: '#000' }}>
          Тестирование поиска источников
        </h1>
        
        <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <label htmlFor="text-input" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
            Введите текст для поиска:
          </label>
          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              minHeight: '120px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            placeholder="Введите текст или ссылку на Telegram-пост..."
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleSearch}
            disabled={loading || !text.trim()}
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              backgroundColor: loading || !text.trim() ? '#9ca3af' : '#2563eb',
              color: '#fff',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}
          >
            {loading ? 'Поиск...' : 'Найти источники'}
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', borderRadius: '0.5rem' }}>
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.375rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Извлеченные элементы</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {results.input.keyElements.statements && results.input.keyElements.statements.length > 0 && (
                  <div>
                    <strong>Утверждения:</strong>
                    <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                      {results.input.keyElements.statements.map((stmt: string, i: number) => (
                        <li key={i}>{stmt}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.input.keyElements.dates && results.input.keyElements.dates.length > 0 && (
                  <div>
                    <strong>Даты:</strong> {results.input.keyElements.dates.join(', ')}
                  </div>
                )}
                {results.input.keyElements.names && results.input.keyElements.names.length > 0 && (
                  <div>
                    <strong>Имена:</strong> {results.input.keyElements.names.join(', ')}
                  </div>
                )}
                {results.input.keyElements.numbers && results.input.keyElements.numbers.length > 0 && (
                  <div>
                    <strong>Числа:</strong> {results.input.keyElements.numbers.slice(0, 3).join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.375rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Результаты поиска ({results.results.count} источников)
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {results.results.sources.map((source: any, index: number) => (
                  <div key={index} style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '0.5rem' }}>{source.title}</h3>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '0.875rem', wordBreak: 'break-all' }}
                      title={source.url}
                    >
                      {shortenUrl(source.url, 60)}
                    </a>
                    {source.snippet && (
                      <p style={{ marginTop: '0.5rem', color: '#374151', fontSize: '0.875rem' }}>{source.snippet}</p>
                    )}
                    {source.sourceType && (
                      <span style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                        Тип: {source.sourceType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '0.375rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Предварительный формат ответа</h2>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
                {results.preview}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
