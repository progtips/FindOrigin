import { sendMessage } from './telegramApi';
import { extractTelegramPost } from './telegramParser';
import { extractKeyElements } from './textProcessor';
import { searchSources } from './searchEngine';
import { analyzeSourcesWithAI } from './aiAnalyzer';
import { formatFinalMessage } from './messageFormatter';
import { logger } from './logger';

export async function processMessage(chatId: number, messageText: string) {
  const startTime = Date.now();
  logger.info('Processing message', { chatId, messageLength: messageText.length });
  
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

    if (searchResults.length === 0) {
      await sendMessage(chatId, '❌ *Источники не найдены*\n\nНе удалось найти релевантные источники для предоставленного текста.');
      return;
    }

    // Выполняем AI-анализ
    await sendMessage(chatId, '🤖 Анализирую источники с помощью AI...');
    const analysis = await analyzeSourcesWithAI(textToProcess, searchResults);

    // Формируем финальное сообщение с результатами AI-анализа
    const finalMessage = formatFinalMessage(textToProcess, analysis);

    // Отправляем финальные результаты
    await sendMessage(chatId, finalMessage);

    const duration = Date.now() - startTime;
    logger.info('Message processed successfully', { chatId, duration });

  } catch (error) {
    logger.error('Error processing message', { chatId, error });
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
