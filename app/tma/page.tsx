import TmaClient from './TmaClient';

export const metadata = {
  title: 'FindOrigin - Проверка фактов',
  description: 'Telegram Mini App для проверки источников информации',
};

export default function TmaPage() {
  return <TmaClient />;
}
