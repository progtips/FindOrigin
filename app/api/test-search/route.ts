import { NextRequest, NextResponse } from 'next/server';
import { extractKeyElements } from '@/lib/textProcessor';
import { searchSources } from '@/lib/searchEngine';
import { shortenUrl } from '@/lib/urlShortener';

export const dynamic = 'force-dynamic';

/**
 * Тестовый endpoint для проверки работы поиска
 * GET /api/test-search?text=текст для поиска
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('text') || 'Генеральный директор Coinbase уволил программистов, не использующих ИИ';

    // Извлекаем ключевые элементы
    const keyElements = extractKeyElements(text);

    // Формируем поисковые запросы
    const searchQueries = generateSearchQueries(keyElements, text);

    // Ищем источники
    const searchResults = await searchSources(searchQueries);

    // Формируем ответ
    const response = {
      input: {
        text,
        keyElements,
        searchQueries,
      },
      results: {
        count: searchResults.length,
        sources: searchResults,
      },
      preview: formatPreviewResults(searchResults, keyElements),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Test search error:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при поиске', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
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
  let message = '📊 Предварительные результаты поиска:\n\n';
  
  if (results.length === 0) {
    return message + '❌ Источники не найдены.';
  }

  message += `🔍 Найдено источников: ${results.length}\n\n`;
  message += 'Извлеченные элементы:\n';
  
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

  message += '\nНайденные источники:\n\n';

  results.forEach((result, index) => {
    message += `${index + 1}. ${result.title}\n`;
    message += `   ${shortenUrl(result.url)} (${result.url})\n`;
    if (result.snippet) {
      message += `   ${result.snippet.substring(0, 100)}...\n`;
    }
    message += `   Тип: ${result.sourceType || 'неизвестно'}\n`;
    message += '\n';
  });

  message += '\n⏳ AI-анализ будет выполнен на следующем этапе...';

  return message;
}
