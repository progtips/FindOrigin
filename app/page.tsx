'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [text, setText] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      router.push(`/test?text=${encodeURIComponent(text)}`);
    }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>
            FindOrigin Bot
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            Telegram бот для поиска источников информации
          </p>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <label htmlFor="text-input" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
              Введите текст для поиска источников:
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
                fontFamily: 'inherit',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Введите текст или ссылку на Telegram-пост..."
            />
            <button
              type="submit"
              disabled={!text.trim()}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: !text.trim() ? '#9ca3af' : '#2563eb',
                color: '#fff',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: !text.trim() ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '1rem',
                transition: 'background-color 0.2s'
              }}
            >
              Найти источники
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
            <a
              href="/test"
              style={{
                color: '#2563eb',
                textDecoration: 'underline',
                fontSize: '0.875rem'
              }}
            >
              Открыть расширенную страницу тестирования →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
