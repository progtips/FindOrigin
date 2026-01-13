import { sendMessage } from './telegramApi';
import { extractTelegramPost } from './telegramParser';
import { extractKeyElements } from './textProcessor';
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

    // Раньше здесь был предварительный поиск, теперь источники ищет сама AI-модель через Tool Calling
    await sendMessage(chatId, '🤖 Ищу и анализирую источники с помощью AI...');
    const analysis = await analyzeSourcesWithAI(textToProcess);

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
