'use client';

import { useState } from 'react';
import { shortenUrl } from '@/lib/urlShortener';

export default function TestPage() {
  const [text, setText] = useState('Генеральный директор Coinbase уволил программистов, не использующих ИИ');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Тестирование поиска источников</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label htmlFor="text-input" className="block text-sm font-medium mb-2 text-gray-700">
            Введите текст для поиска:
          </label>
          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Введите текст или ссылку на Telegram-пост..."
          />
        </div>

        <div className="mb-6">
          <button
            onClick={handleSearch}
            disabled={loading || !text.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Поиск...' : 'Найти источники'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {results && (
          <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-4">Извлеченные элементы</h2>
            <div className="space-y-2">
              {results.input.keyElements.statements && results.input.keyElements.statements.length > 0 && (
                <div>
                  <strong>Утверждения:</strong>
                  <ul className="list-disc list-inside ml-4">
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
                  <strong>Числа:</strong> {results.input.keyElements.numbers.join(', ')}
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-4">
              Результаты поиска ({results.results.count} источников)
            </h2>
            <div className="space-y-4">
              {results.results.sources.map((source: any, index: number) => (
                <div key={index} className="bg-white p-4 rounded border border-gray-200">
                  <h3 className="font-semibold text-lg mb-2">{source.title}</h3>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                    title={source.url}
                  >
                    {shortenUrl(source.url, 60)}
                  </a>
                  {source.snippet && (
                    <p className="mt-2 text-gray-700 text-sm">{source.snippet}</p>
                  )}
                  {source.sourceType && (
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-200 rounded text-xs">
                      Тип: {source.sourceType}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Предварительный формат ответа</h2>
            <pre className="whitespace-pre-wrap text-sm bg-white p-4 rounded border border-gray-200">
              {results.preview}
            </pre>
          </div>
          </div>
        )}
      </div>
    </main>
  );
}
