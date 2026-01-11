import { load } from 'cheerio';

/**
 * Извлекает текст из Telegram-поста по ссылке
 * Примечание: Telegram не предоставляет публичный API для получения постов,
 * поэтому эта функция будет работать только для публичных каналов через веб-интерфейс
 */
export async function extractTelegramPost(url: string): Promise<string | null> {
  try {
    // Парсим URL
    const telegramLinkRegex = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/;
    const match = url.match(telegramLinkRegex);
    
    if (!match) {
      return null;
    }

    const channel = match[1];
    const postId = match[2];
    
    // Пытаемся получить пост через веб-интерфейс Telegram
    const webUrl = `https://t.me/${channel}/${postId}`;
    
    const response = await fetch(webUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = load(html);
    
    // Ищем текст поста в структуре Telegram веб-страницы
    const postText = $('.tgme_widget_message_text').first().text().trim();
    
    if (postText) {
      return postText;
    }

    // Альтернативный способ - ищем в мета-тегах
    const metaDescription = $('meta[property="og:description"]').attr('content');
    if (metaDescription) {
      return metaDescription;
    }

    return null;
  } catch (error) {
    console.error('Error extracting Telegram post:', error);
    return null;
  }
}

/**
 * Проверяет, является ли текст ссылкой на Telegram-пост
 */
export function isTelegramLink(text: string): boolean {
  const telegramLinkRegex = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/;
  return telegramLinkRegex.test(text);
}
