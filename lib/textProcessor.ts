/**
 * Извлекает ключевые элементы из текста:
 * - Ключевые утверждения
 * - Даты
 * - Числа
 * - Имена собственные
 * - Ссылки
 */
export function extractKeyElements(text: string) {
  const elements = {
    statements: [] as string[],
    dates: [] as string[],
    numbers: [] as string[],
    names: [] as string[],
    links: [] as string[],
  };

  // Извлечение ссылок
  const linkRegex = /https?:\/\/[^\s]+/g;
  const links = text.match(linkRegex);
  if (links) {
    elements.links = links;
  }

  // Извлечение дат (различные форматы)
  const datePatterns = [
    /\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}/g, // DD.MM.YYYY, DD/MM/YYYY
    /\d{4}[.\/]\d{1,2}[.\/]\d{1,2}/g, // YYYY.MM.DD, YYYY/MM/DD
    /\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{2,4}/gi,
    /(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье),?\s+\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/gi,
  ];

  datePatterns.forEach(pattern => {
    const dates = text.match(pattern);
    if (dates) {
      elements.dates.push(...dates);
    }
  });

  // Извлечение чисел (исключая даты и ссылки)
  const numberRegex = /\b\d{2,}\b/g;
  const numbers = text.match(numberRegex);
  if (numbers) {
    // Фильтруем числа, которые могут быть частью дат или ссылок
    elements.numbers = numbers.filter(num => {
      const numInt = parseInt(num);
      return numInt > 10 && numInt < 1000000; // Разумные пределы
    });
  }

  // Извлечение имен собственных (слова с заглавной буквы, не в начале предложения)
  // Упрощенный подход: ищем последовательности слов с заглавной буквы
  const namePattern = /\b[А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z][а-яёa-z]+)*\b/g;
  const potentialNames = text.match(namePattern);
  if (potentialNames) {
    // Фильтруем общие слова и оставляем только потенциальные имена
    const commonWords = new Set([
      'Россия', 'России', 'Россию', 'Россией',
      'Москва', 'Москве', 'Москвы', 'Москвой',
      'Санкт-Петербург', 'Петербург',
      'Владимир', 'Путин', 'Медведев',
      'США', 'Соединенных', 'Штатов',
      'Европа', 'Европы', 'Европейский',
      'Китай', 'Китая', 'Китайский',
      'Украина', 'Украины', 'Украину',
    ]);
    
    elements.names = potentialNames
      .filter(name => {
        // Исключаем слишком короткие и слишком длинные
        if (name.length < 3 || name.length > 50) return false;
        // Исключаем общие слова
        if (commonWords.has(name)) return false;
        // Исключаем слова, которые могут быть в начале предложения
        const words = text.split(/\s+/);
        const nameIndex = words.findIndex(w => w.includes(name));
        if (nameIndex === 0 || (nameIndex > 0 && /[.!?]\s*$/.test(words[nameIndex - 1]))) {
          return false;
        }
        return true;
      })
      .slice(0, 10); // Ограничиваем количество
  }

  // Извлечение ключевых утверждений
  // Разбиваем текст на предложения и ищем важные
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Ищем предложения с ключевыми словами
  const keywords = [
    'заявил', 'сообщил', 'объявил', 'подтвердил', 'отметил',
    'сообщается', 'по данным', 'согласно', 'по информации',
    'установлено', 'выяснено', 'обнаружено',
    'произошло', 'случилось', 'началось', 'завершилось',
  ];

  elements.statements = sentences
    .filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return keywords.some(keyword => lowerSentence.includes(keyword)) ||
             sentence.length > 30; // Длинные предложения часто содержат важную информацию
    })
    .map(s => s.trim())
    .slice(0, 5); // Ограничиваем количество

  return elements;
}

/**
 * Обрабатывает текст (для обратной совместимости)
 */
export function processText(text: string) {
  return extractKeyElements(text);
}
