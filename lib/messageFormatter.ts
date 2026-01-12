import { formatUrlForTelegram } from './urlShortener';

interface SourceAnalysis {
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  confidence: number;
  matchDescription: string;
  sourceType?: string;
}

/**
 * Форматирует финальный ответ для Telegram с результатами AI-анализа
 */
export function formatFinalMessage(
  originalText: string,
  analysis: {
    sources: SourceAnalysis[];
    summary: string;
  }
): string {
  if (analysis.sources.length === 0) {
    return `❌ *Источники не найдены*\n\nНе удалось найти релевантные источники для предоставленного текста.`;
  }

  let message = '✅ *Результаты анализа источников*\n\n';
  message += `📝 *Исходный текст:*\n${truncateText(originalText, 200)}\n\n`;
  message += `📊 *Найдено источников:* ${analysis.sources.length}\n\n`;

  // Добавляем резюме если есть
  if (analysis.summary && !analysis.summary.includes('недоступен')) {
    message += `💡 *Резюме:*\n${analysis.summary}\n\n`;
  }

  message += '🔗 *Источники:*\n\n';

  // Показываем топ-3 источника
  const topSources = analysis.sources.slice(0, 3);

  topSources.forEach((source, index) => {
    const relevanceEmoji = getRelevanceEmoji(source.relevanceScore);
    const confidenceEmoji = getConfidenceEmoji(source.confidence);

    message += `${index + 1}. ${relevanceEmoji} *${source.title}*\n`;
    message += `   ${formatUrlForTelegram(source.url)}\n`;
    
    if (source.snippet) {
      message += `   ${truncateText(source.snippet, 150)}\n`;
    }

    message += `\n   ${confidenceEmoji} *Релевантность:* ${source.relevanceScore}%`;
    message += ` | *Уверенность:* ${source.confidence}%\n`;

    if (source.matchDescription && !source.matchDescription.includes('недоступен')) {
      message += `   📌 ${truncateText(source.matchDescription, 200)}\n`;
    }

    if (source.sourceType) {
      const typeEmoji = getSourceTypeEmoji(source.sourceType);
      message += `   ${typeEmoji} Тип: ${source.sourceType}\n`;
    }

    message += '\n';
  });

  if (analysis.sources.length > 3) {
    message += `\n_Показаны топ-3 источника из ${analysis.sources.length} найденных._`;
  }

  return message;
}

/**
 * Разбивает длинное сообщение на части (Telegram ограничение 4096 символов)
 */
export function splitMessage(message: string, maxLength: number = 4000): string[] {
  if (message.length <= maxLength) {
    return [message];
  }

  const parts: string[] = [];
  const lines = message.split('\n');
  let currentPart = '';

  for (const line of lines) {
    if ((currentPart + line + '\n').length > maxLength) {
      if (currentPart) {
        parts.push(currentPart.trim());
        currentPart = '';
      }
      // Если одна строка слишком длинная, разбиваем её
      if (line.length > maxLength) {
        const words = line.split(' ');
        let currentLine = '';
        for (const word of words) {
          if ((currentLine + word + ' ').length > maxLength) {
            if (currentLine) {
              parts.push(currentLine.trim());
              currentLine = '';
            }
          }
          currentLine += word + ' ';
        }
        if (currentLine) {
          currentPart = currentLine;
        }
      } else {
        currentPart = line + '\n';
      }
    } else {
      currentPart += line + '\n';
    }
  }

  if (currentPart) {
    parts.push(currentPart.trim());
  }

  return parts;
}

/**
 * Обрезает текст до указанной длины
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Возвращает эмодзи для оценки релевантности
 */
function getRelevanceEmoji(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

/**
 * Возвращает эмодзи для уверенности
 */
function getConfidenceEmoji(confidence: number): string {
  if (confidence >= 80) return '✅';
  if (confidence >= 60) return '⚠️';
  return '❓';
}

/**
 * Возвращает эмодзи для типа источника
 */
function getSourceTypeEmoji(sourceType: string): string {
  switch (sourceType) {
    case 'official':
      return '🏛️';
    case 'news':
      return '📰';
    case 'research':
      return '🔬';
    case 'blog':
      return '📝';
    default:
      return '🔗';
  }
}
