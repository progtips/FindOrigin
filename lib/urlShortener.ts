/**
 * Сокращает URL для отображения
 * Извлекает домен и показывает его в сокращенном виде
 * Работает как на клиенте, так и на сервере
 */
export function shortenUrl(url: string, maxLength: number = 50): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    // Проверяем, доступен ли URL конструктор (работает в браузере и Node.js 10+)
    if (typeof URL !== 'undefined') {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;
      
      // Если URL короткий, возвращаем как есть
      if (url.length <= maxLength) {
        return url;
      }
      
      // Формируем сокращенную версию: домен + начало пути
      const shortPath = path.length > 20 
        ? path.substring(0, 20) + '...' 
        : path;
      
      const shortUrl = `${domain}${shortPath}`;
      
      // Если все еще длинно, обрезаем домен
      if (shortUrl.length > maxLength) {
        const domainParts = domain.split('.');
        if (domainParts.length >= 2) {
          const mainDomain = domainParts.slice(-2).join('.');
          const remainingLength = maxLength - mainDomain.length - shortPath.length - 3; // 3 для "..."
          if (remainingLength > 0) {
            return `${domainParts[0].substring(0, remainingLength)}...${mainDomain}${shortPath}`;
          }
          return `${mainDomain}${shortPath.substring(0, maxLength - mainDomain.length)}...`;
        }
        return domain.substring(0, maxLength - 3) + '...';
      }
      
      return shortUrl;
    } else {
      // Fallback для старых окружений
      return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
    }
  } catch (error) {
    // Если не удалось распарсить URL, просто обрезаем
    return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
  }
}

/**
 * Форматирует URL для Telegram с использованием Markdown
 * Показывает сокращенный текст, но полная ссылка доступна при клике
 */
export function formatUrlForTelegram(url: string, displayText?: string): string {
  const shortText = displayText || shortenUrl(url, 40);
  return `[${shortText}](${url})`;
}

/**
 * Извлекает домен из URL
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return url;
  }
}
