import { Suspense } from 'react';
import TestPageClient from './TestPageClient';

export default function TestPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>Загрузка...</div>
      </div>
    }>
      <TestPageClient />
    </Suspense>
  );
}
