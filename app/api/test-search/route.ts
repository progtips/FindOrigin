import { NextRequest, NextResponse } from 'next/server';
import { extractKeyElements } from '@/lib/textProcessor';
import { searchSources } from '@/lib/searchEngine';
import { analyzeSourcesWithAI } from '@/lib/aiAnalyzer';
import { formatFinalMessage } from '@/lib/messageFormatter';

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

    // Выполняем AI-анализ
    const analysis = await analyzeSourcesWithAI(text, searchResults);

    // Формируем финальное сообщение
    const finalMessage = formatFinalMessage(text, analysis);

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
      analysis: {
        sources: analysis.sources,
        summary: analysis.summary,
      },
      preview: finalMessage,
      rawAnalysis: analysis,
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
