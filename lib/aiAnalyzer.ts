const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = 'google/gemma-3n-e2b-it';
import { cache, createAnalysisCacheKey } from './cache';
import { logger } from './logger';

interface SourceAnalysis {
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number; // 0-100
  confidence: number; // 0-100
  matchDescription: string;
  sourceType?: string;
}

interface AnalysisResult {
  sources: SourceAnalysis[];
  summary: string;
}

/**
 * Анализирует источники с помощью AI для определения релевантности
 */
export async function analyzeSourcesWithAI(
  originalText: string,
  sources: Array<{ title: string; url: string; snippet: string; sourceType?: string }>
): Promise<AnalysisResult> {
  if (!OPENROUTER_API_KEY) {
    logger.warn('OPENROUTER_API_KEY не установлен, возвращаю результаты без AI-анализа');
    return createFallbackAnalysis(sources);
  }

  if (sources.length === 0) {
    return {
      sources: [],
      summary: 'Источники не найдены для анализа.',
    };
  }

  // Проверяем кэш
  const sourceUrls = sources.map(s => s.url);
  const cacheKey = createAnalysisCacheKey(originalText, sourceUrls);
  const cached = cache.get<AnalysisResult>(cacheKey);
  
  if (cached) {
    logger.debug('Cache hit for AI analysis');
    return cached;
  }

  try {
    logger.info('Starting AI analysis', { sourcesCount: sources.length });
    // Формируем промпт для анализа
    const prompt = createAnalysisPrompt(originalText, sources);

    // Вызываем OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://findorigin.vercel.app',
        'X-Title': 'FindOrigin Bot',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Ты помощник для анализа релевантности источников информации. Отвечай только в формате JSON без дополнительных комментариев.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenRouter API error', { status: response.status, error: errorText });
      return createFallbackAnalysis(sources);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      logger.error('Пустой ответ от AI');
      return createFallbackAnalysis(sources);
    }

    // Парсим JSON ответ от AI
    const analysis = parseAIResponse(aiResponse, sources);
    
    // Сохраняем в кэш
    cache.set(cacheKey, analysis, 30 * 60 * 1000); // 30 минут
    
    logger.info('AI analysis completed', { sourcesAnalyzed: analysis.sources.length });
    return analysis;
  } catch (error) {
    logger.error('Error analyzing sources with AI', error);
    return createFallbackAnalysis(sources);
  }
}

/**
 * Создает промпт для анализа источников
 */
function createAnalysisPrompt(
  originalText: string,
  sources: Array<{ title: string; url: string; snippet: string }>
): string {
  const sourcesText = sources
    .map((source, index) => {
      return `Источник ${index + 1}:
Заголовок: ${source.title}
URL: ${source.url}
Описание: ${source.snippet || 'Нет описания'}`;
    })
    .join('\n\n');

  return `Проанализируй следующие источники на предмет их релевантности к исходному тексту.

Исходный текст:
"${originalText}"

Найденные источники:
${sourcesText}

Верни ответ в формате JSON:
{
  "sources": [
    {
      "index": 0,
      "relevanceScore": 85,
      "confidence": 80,
      "matchDescription": "Краткое описание соответствия (2-3 предложения)"
    }
  ],
  "summary": "Общее резюме анализа (1-2 предложения)"
}

Где:
- relevanceScore: оценка релевантности от 0 до 100 (0 - не релевантно, 100 - полностью релевантно)
- confidence: уверенность в оценке от 0 до 100
- matchDescription: краткое описание того, как источник соответствует исходному тексту

Важно: верни только валидный JSON, без markdown форматирования и дополнительных комментариев.`;
}

/**
 * Парсит ответ от AI и создает структурированный результат
 */
function parseAIResponse(
  aiResponse: string,
  sources: Array<{ title: string; url: string; snippet: string; sourceType?: string }>
): AnalysisResult {
  try {
    // Пытаемся извлечь JSON из ответа (может быть обернут в markdown)
    let jsonText = aiResponse.trim();
    
    // Удаляем markdown код блоки если есть
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      const startIndex = lines.findIndex(line => line.includes('{'));
      const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes('}'));
      if (startIndex !== -1 && endIndex !== -1) {
        jsonText = lines.slice(startIndex, endIndex + 1).join('\n');
      }
    }

    // Удаляем все до первой { и после последней }
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonText);

    const analyzedSources: SourceAnalysis[] = sources.map((source, index) => {
      const analysis = parsed.sources?.find((s: any) => s.index === index);
      
      return {
        url: source.url,
        title: source.title,
        snippet: source.snippet || '',
        relevanceScore: analysis?.relevanceScore ?? 50,
        confidence: analysis?.confidence ?? 50,
        matchDescription: analysis?.matchDescription || 'Анализ недоступен',
        sourceType: source.sourceType,
      };
    });

    // Сортируем по релевантности
    analyzedSources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      sources: analyzedSources,
      summary: parsed.summary || 'Анализ завершен.',
    };
  } catch (error) {
    logger.error('Error parsing AI response', { error, aiResponse });
    return createFallbackAnalysis(sources);
  }
}

/**
 * Создает fallback анализ без AI (используется при ошибках)
 */
function createFallbackAnalysis(
  sources: Array<{ title: string; url: string; snippet: string; sourceType?: string }>
): AnalysisResult {
  const analyzedSources: SourceAnalysis[] = sources.map((source) => ({
    url: source.url,
    title: source.title,
    snippet: source.snippet || '',
    relevanceScore: 70, // Средняя оценка по умолчанию
    confidence: 50, // Низкая уверенность без AI
    matchDescription: 'AI-анализ недоступен. Источник найден по поисковому запросу.',
    sourceType: source.sourceType,
  }));

  return {
    sources: analyzedSources,
    summary: 'Анализ выполнен без AI (AI-сервис недоступен).',
  };
}
