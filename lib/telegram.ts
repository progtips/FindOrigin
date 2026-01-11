import { sendMessage } from './telegramApi';
import { extractTelegramPost } from './telegramParser';
import { extractKeyElements } from './textProcessor';
import { searchSources } from './searchEngine';
import { formatUrlForTelegram } from './urlShortener';

export async function processMessage(chatId: number, messageText: string) {
  try {
    // Отправляем сообщение о начале обработки
    await sendMessage(chatId, '🔍 Анализирую запрос...');

    let textToProcess = messageText;
    let isTelegramLink = false;

    // Проверяем, является ли сообщение ссылкой на Telegram-пост
    const telegramLinkRegex = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/;
    const match = messageText.match(telegramLinkRegex);

    if (match) {
      isTelegramLink = true;
      await sendMessage(chatId, '📥 Извлекаю текст из Telegram-поста...');
      
      try {
        const postText = await extractTelegramPost(messageText);
        if (postText) {
          textToProcess = postText;
        } else {
          await sendMessage(chatId, '❌ Не удалось извлечь текст из поста. Обрабатываю исходное сообщение.');
        }
      } catch (error) {
        console.error('Error extracting Telegram post:', error);
        await sendMessage(chatId, '⚠️ Ошибка при извлечении поста. Обрабатываю исходное сообщение.');
      }
    }

    // Извлекаем ключевые элементы
    await sendMessage(chatId, '🔎 Извлекаю ключевые элементы...');
    const keyElements = extractKeyElements(textToProcess);

    // Формируем поисковые запросы
    const searchQueries = generateSearchQueries(keyElements, textToProcess);

    // Ищем источники
    await sendMessage(chatId, '🌐 Ищу возможные источники...');
    const searchResults = await searchSources(searchQueries);

    // Формируем предварительные результаты
    const previewMessage = formatPreviewResults(searchResults, keyElements);

    // Отправляем предварительные результаты
    await sendMessage(chatId, previewMessage);

  } catch (error) {
    console.error('Error processing message:', error);
    await sendMessage(chatId, '❌ Произошла ошибка при обработке запроса. Попробуйте позже.');
  }
}

function generateSearchQueries(keyElements: any, originalText: string): string[] {
  const queries: string[] = [];
  
  // Используем ключевые утверждения
  if (keyElements.statements && keyElements.statements.length > 0) {
    keyElements.statements.slice(0, 2).forEach((stmt: string) => {
      queries.push(stmt);
    });
  }

  // Используем имена и даты
  if (keyElements.names && keyElements.names.length > 0) {
    const nameQuery = keyElements.names.slice(0, 2).join(' ');
    if (keyElements.dates && keyElements.dates.length > 0) {
      queries.push(`${nameQuery} ${keyElements.dates[0]}`);
    } else {
      queries.push(nameQuery);
    }
  }

  // Если нет достаточного количества запросов, используем первые слова исходного текста
  if (queries.length < 2) {
    const words = originalText.split(/\s+/).slice(0, 10).join(' ');
    queries.push(words);
  }

  return queries.slice(0, 3); // Максимум 3 запроса
}

function formatPreviewResults(results: any[], keyElements: any): string {
  let message = '📊 *Предварительные результаты поиска:*\n\n';
  
  if (results.length === 0) {
    return message + '❌ Источники не найдены.';
  }

  message += `🔍 *Найдено источников:* ${results.length}\n\n`;
  message += '*Извлеченные элементы:*\n';
  
  if (keyElements.statements && keyElements.statements.length > 0) {
    message += `• Утверждения: ${keyElements.statements.slice(0, 2).join(', ')}\n`;
  }
  if (keyElements.dates && keyElements.dates.length > 0) {
    message += `• Даты: ${keyElements.dates.join(', ')}\n`;
  }
  if (keyElements.names && keyElements.names.length > 0) {
    message += `• Имена: ${keyElements.names.slice(0, 3).join(', ')}\n`;
  }
  if (keyElements.numbers && keyElements.numbers.length > 0) {
    message += `• Числа: ${keyElements.numbers.slice(0, 3).join(', ')}\n`;
  }

  message += '\n*Найденные источники:*\n\n';

  results.forEach((result, index) => {
    message += `${index + 1}. *${result.title}*\n`;
    message += `   ${formatUrlForTelegram(result.url)}\n`;
    if (result.snippet) {
      message += `   ${result.snippet.substring(0, 100)}...\n`;
    }
    message += '\n';
  });

  message += '\n⏳ *AI-анализ будет выполнен на следующем этапе...*';

  return message;
}
