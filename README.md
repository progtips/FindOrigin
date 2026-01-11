# FindOrigin

Telegram-бот для поиска источников информации.

## Описание

FindOrigin — это Telegram-бот, который получает текст или ссылку на пост и пытается найти источник этой информации.

## Технологии

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Vercel (деплой)

## Установка

1. Установите зависимости:
```powershell
npm install
```

2. Создайте файл `.env.local` на основе `.env.local.example`:
```powershell
Copy-Item .env.local.example .env.local
```

3. Заполните переменные окружения в `.env.local`:
- `TELEGRAM_BOT_TOKEN` - токен бота от BotFather
- `TELEGRAM_WEBHOOK_SECRET` - секрет для верификации webhook
- `AI_API_KEY` - ключ для AI API (OpenAI, Anthropic и т.д.)
- `SEARCH_API_KEY` - ключ для поискового API (Google Custom Search API, SerpAPI и т.д.)
- `GOOGLE_CSE_ID` - Google Custom Search Engine ID (если используется Google)

## Запуск

### Локальная разработка

```powershell
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`

### Тестирование поиска

Для тестирования поиска без Telegram используйте endpoint:
```
GET http://localhost:3000/api/test-search?text=ваш текст для поиска
```

Пример:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/test-search?text=Путин объявил о новых санкциях 15 марта 2024" -Method GET
```

## Деплой на Vercel

1. Подключите репозиторий к Vercel
2. Настройте переменные окружения в настройках проекта Vercel
3. Настройте webhook в Telegram Bot API:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.vercel.app/api/webhook
   ```

## Структура проекта

- `app/api/webhook/` - API endpoint для обработки webhook от Telegram
- `app/api/test-search/` - тестовый endpoint для проверки поиска
- `lib/telegram.ts` - основная логика обработки сообщений
- `lib/telegramApi.ts` - функции для работы с Telegram API
- `lib/telegramParser.ts` - парсинг Telegram-ссылок
- `lib/textProcessor.ts` - извлечение ключевых элементов из текста
- `lib/searchEngine.ts` - поиск источников информации

## Статус реализации

✅ Этап 1: Настройка проекта и инфраструктуры
✅ Этап 2: Реализация Webhook для Telegram
✅ Этап 3: Извлечение и анализ данных
✅ Этап 4: Поиск источников информации (предварительные результаты)

⏳ Этап 5: AI-анализ и сравнение (в разработке)
⏳ Этап 6: Форматирование и отправка ответа (в разработке)
