const SEARCH_API_KEY = process.env.SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
import { cache, createSearchCacheKey } from './cache';
import { logger } from './logger';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceType?: 'official' | 'news' | 'blog' | 'research';
}

/**
 * Ищет источники информации по запросам
 */
export async function searchSources(queries: string[]): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];

  for (const query of queries) {
    try {
      // Проверяем кэш
      const cacheKey = createSearchCacheKey(query);
      const cached = cache.get<SearchResult[]>(cacheKey);
      
      if (cached) {
        logger.debug(`Cache hit for query: ${query}`);
        allResults.push(...cached);
        continue;
      }

      logger.info(`Searching for: ${query}`);
      const results = await performSearch(query);
      
      // Сохраняем в кэш
      cache.set(cacheKey, results, 10 * 60 * 1000); // 10 минут
      
      allResults.push(...results);
    } catch (error) {
      logger.error(`Error searching for "${query}":`, error);
    }
  }

  // Удаляем дубликаты по URL
  const uniqueResults = removeDuplicates(allResults);
  
  // Фильтруем и ранжируем результаты
  const filteredResults = filterAndRankResults(uniqueResults);
  
  // Ограничиваем количество результатов (1-3 ссылки)
  return filteredResults.slice(0, 3);
}

/**
 * Выполняет поиск через Google Custom Search API
 */
async function performSearch(query: string): Promise<SearchResult[]> {
  // Если есть Google Custom Search API
  if (SEARCH_API_KEY && GOOGLE_CSE_ID) {
    return await searchWithGoogle(query);
  }

  // Альтернатива: используем DuckDuckGo через HTML парсинг (для демонстрации)
  // В продакшене лучше использовать официальный API
  return await searchWithDuckDuckGo(query);
}

/**
 * Поиск через Google Custom Search API
 */
async function searchWithGoogle(query: string): Promise<SearchResult[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${SEARCH_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=5`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.statusText}`);
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.items) {
      for (const item of data.items) {
        results.push({
          title: item.title,
          url: item.link,
          snippet: item.snippet || '',
          sourceType: categorizeSource(item.link),
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Google Search API error:', error);
    // Fallback на DuckDuckGo
    return await searchWithDuckDuckGo(query);
  }
}

/**
 * Поиск через DuckDuckGo (HTML парсинг, для демонстрации)
 * В продакшене рекомендуется использовать официальный API
 */
async function searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    // DuckDuckGo Instant Answer API (ограниченный, но бесплатный)
    const instantAnswerUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(instantAnswerUrl);
    const data = await response.json();

    const results: SearchResult[] = [];

    // Используем AbstractText если доступен
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        snippet: data.AbstractText,
        sourceType: categorizeSource(data.AbstractURL || ''),
      });
    }

    // Используем RelatedTopics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      for (const topic of data.RelatedTopics.slice(0, 2)) {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.substring(0, 100),
            url: topic.FirstURL,
            snippet: topic.Text,
            sourceType: categorizeSource(topic.FirstURL),
          });
        }
      }
    }

    // Если результатов мало, добавляем заглушку для демонстрации
    if (results.length === 0) {
      results.push({
        title: `Результаты поиска для: ${query}`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: 'Используйте поисковый API для получения реальных результатов',
        sourceType: 'news',
      });
    }

    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

/**
 * Категоризирует источник по URL
 */
function categorizeSource(url: string): 'official' | 'news' | 'blog' | 'research' {
  const lowerUrl = url.toLowerCase();

  // Официальные сайты
  if (lowerUrl.includes('.gov') || lowerUrl.includes('.edu') || 
      lowerUrl.includes('official') || lowerUrl.includes('правительство')) {
    return 'official';
  }

  // Новостные сайты
  if (lowerUrl.includes('news') || lowerUrl.includes('новости') ||
      lowerUrl.includes('rbc') || lowerUrl.includes('ria') ||
      lowerUrl.includes('tass') || lowerUrl.includes('interfax') ||
      lowerUrl.includes('bbc') || lowerUrl.includes('reuters') ||
      lowerUrl.includes('cnn') || lowerUrl.includes('theguardian')) {
    return 'news';
  }

  // Исследования
  if (lowerUrl.includes('research') || lowerUrl.includes('study') ||
      lowerUrl.includes('pubmed') || lowerUrl.includes('arxiv') ||
      lowerUrl.includes('scholar') || lowerUrl.includes('исследование')) {
    return 'research';
  }

  // Блоги (по умолчанию)
  return 'blog';
}

/**
 * Удаляет дубликаты по URL
 */
function removeDuplicates(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    if (seen.has(result.url)) {
      return false;
    }
    seen.add(result.url);
    return true;
  });
}

/**
 * Фильтрует и ранжирует результаты
 */
function filterAndRankResults(results: SearchResult[]): SearchResult[] {
  // Приоритет: official > news > research > blog
  const priority: Record<string, number> = {
    official: 4,
    news: 3,
    research: 2,
    blog: 1,
  };

  return results
    .filter(result => result.url && result.title) // Фильтруем неполные результаты
    .sort((a, b) => {
      const priorityA = priority[a.sourceType || 'blog'] || 0;
      const priorityB = priority[b.sourceType || 'blog'] || 0;
      return priorityB - priorityA; // Сортируем по убыванию приоритета
    });
}
