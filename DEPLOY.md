# Инструкция по деплою FindOrigin на Vercel

## Подготовка

1. Убедитесь, что проект собирается без ошибок:
```powershell
npm run build
```

2. Проверьте, что все зависимости установлены:
```powershell
npm install
```

## Деплой на Vercel

### Шаг 1: Подключение репозитория

1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите "Add New Project"
3. Выберите ваш репозиторий с FindOrigin
4. Vercel автоматически определит Next.js проект

### Шаг 2: Настройка переменных окружения

В настройках проекта Vercel добавьте следующие переменные окружения:

**Обязательные:**
- `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота от BotFather
- `OPENROUTER_API_KEY` - ключ API от OpenRouter

**Опциональные:**
- `TELEGRAM_WEBHOOK_SECRET` - секрет для верификации webhook
- `SEARCH_API_KEY` - ключ для поискового API (Google Custom Search)
- `GOOGLE_CSE_ID` - ID поисковой системы Google
- `NEXT_PUBLIC_APP_URL` - URL вашего приложения на Vercel (например, `https://findorigin.vercel.app`)

### Шаг 3: Настройка проекта

1. **Framework Preset**: Next.js (определяется автоматически)
2. **Root Directory**: `./` (корень проекта)
3. **Build Command**: `npm run build` (по умолчанию)
4. **Output Directory**: `.next` (по умолчанию)
5. **Install Command**: `npm install` (по умолчанию)

### Шаг 4: Деплой

1. Нажмите "Deploy"
2. Дождитесь завершения сборки
3. После успешного деплоя вы получите URL вида: `https://your-project.vercel.app`

### Шаг 5: Настройка Telegram Webhook

После деплоя настройте webhook для вашего бота:

```powershell
$token = "YOUR_TELEGRAM_BOT_TOKEN"
$webhookUrl = "https://your-project.vercel.app/api/webhook"
Invoke-WebRequest -Uri "https://api.telegram.org/bot$token/setWebhook?url=$webhookUrl" -Method GET
```

Или через браузер:
```
https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-project.vercel.app/api/webhook
```

### Шаг 6: Проверка webhook

Проверьте статус webhook:

```powershell
$token = "YOUR_TELEGRAM_BOT_TOKEN"
Invoke-WebRequest -Uri "https://api.telegram.org/bot$token/getWebhookInfo" -Method GET
```

## Локальное тестирование с ngrok

Для тестирования webhook локально используйте ngrok:

1. Установите ngrok: https://ngrok.com/download

2. Запустите локальный сервер:
```powershell
npm run dev
```

3. В другом терминале запустите ngrok:
```powershell
ngrok http 3000
```

4. Скопируйте HTTPS URL (например, `https://abc123.ngrok.io`)

5. Настройте webhook:
```powershell
$token = "YOUR_TELEGRAM_BOT_TOKEN"
$webhookUrl = "https://abc123.ngrok.io/api/webhook"
Invoke-WebRequest -Uri "https://api.telegram.org/bot$token/setWebhook?url=$webhookUrl" -Method GET
```

## Мониторинг

### Логи Vercel

Логи доступны в панели Vercel:
- Functions → выберите функцию → Logs

### Логи приложения

Приложение использует встроенное логирование через `lib/logger.ts`. Логи выводятся в консоль и доступны через Vercel Functions Logs.

## Обновление

Для обновления бота:

1. Внесите изменения в код
2. Закоммитьте и запушьте в репозиторий
3. Vercel автоматически запустит новый деплой
4. После успешного деплоя изменения будут применены

## Troubleshooting

### Ошибка 500 при запросе webhook

1. Проверьте логи в Vercel Functions
2. Убедитесь, что все переменные окружения установлены
3. Проверьте, что `TELEGRAM_BOT_TOKEN` и `OPENROUTER_API_KEY` корректны

### Бот не отвечает

1. Проверьте статус webhook: `getWebhookInfo`
2. Убедитесь, что URL webhook правильный
3. Проверьте логи в Vercel

### Ошибки AI-анализа

1. Проверьте, что `OPENROUTER_API_KEY` установлен и валиден
2. Проверьте баланс на OpenRouter
3. Убедитесь, что модель `google/gemma-3n-e2b-it` доступна

## Производительность

- Кэширование результатов поиска: 10 минут
- Кэширование AI-анализа: 30 минут
- Максимальное время выполнения функции: 30 секунд (настроено в `vercel.json`)

## Безопасность

- Никогда не коммитьте `.env.local` в репозиторий
- Используйте секреты Vercel для хранения API ключей
- Регулярно обновляйте зависимости: `npm audit fix`
