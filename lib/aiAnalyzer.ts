const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = 'openai/gpt-4o-mini';
import { cache, createAnalysisCacheKey } from './cache';
import { logger } from './logger';
import { searchSources } from './searchEngine';

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

type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

/**
 * Анализирует источники с помощью AI для определения релевантности.
 * Теперь именно AI-модель сама выполняет поиск (через Tool Calling),
 * а не получает заранее подобранный список ссылок.
 */
export async function analyzeSourcesWithAI(
  originalText: string,
): Promise<AnalysisResult> {
  // Если ключ не задан — не подменяем анализ псевдо-AI, просто сообщаем, что AI недоступен
  if (!OPENROUTER_API_KEY) {
    logger.warn('OPENROUTER_API_KEY не установлен, AI-анализ будет пропущен');
    return createEmptyAnalysis();
  }

  // Кэшируем только по тексту запроса — сами источники теперь определяет AI
  const cacheKey = createAnalysisCacheKey(originalText, []);
  const cached = cache.get<AnalysisResult>(cacheKey);
  
  if (cached) {
    logger.debug('Cache hit for AI analysis');
    return cached;
  }

  try {
    logger.info('Starting AI analysis', { textLength: originalText.length });
    // Формируем промпт для анализа
    const prompt = createAnalysisPrompt(originalText);

    const systemMessage = {
      role: 'system' as const,
      content:
        'Ты помощник для анализа релевантности источников информации. ' +
        'У тебя есть инструмент google_search, который делает запрос в Google Search API и возвращает топ-результаты. ' +
        'Используй его только тогда, когда это действительно улучшит анализ. ' +
        'В конце верни только JSON, без каких-либо пояснений.',
    };

    const userMessage = {
      role: 'user' as const,
      content: prompt,
    };

    // Первичный запрос с включённым Tool Calling
    const firstResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://findorigin.vercel.app',
        'X-Title': 'FindOrigin Bot',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [systemMessage, userMessage],
        tools: [
          {
            type: 'function',
            function: {
              name: 'google_search',
              description:
                'Выполнить веб-поиск релевантных источников через Google Custom Search API и вернуть краткий список результатов.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Поисковый запрос для Google Search.',
                  },
                  maxResults: {
                    type: 'number',
                    description: 'Максимальное количество результатов (по умолчанию 3).',
                  },
                },
                required: ['query'],
              },
            },
          },
        ],
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!firstResponse.ok) {
      const errorText = await firstResponse.text();
      logger.error('OpenRouter API error (first call)', {
        status: firstResponse.status,
        error: errorText,
      });
      return createEmptyAnalysis();
    }

    const firstData: any = await firstResponse.json();
    const firstMessage = firstData.choices?.[0]?.message;
    const toolCalls: ToolCall[] | undefined = firstMessage?.tool_calls;

    // Если модель запросила инструменты — выполняем их и делаем второй вызов
    if (toolCalls && toolCalls.length > 0) {
      logger.info('AI requested tool calls', {
        tools: toolCalls.map(tc => tc.function.name),
      });

      const toolMessages: any[] = [];

      for (const call of toolCalls) {
        if (call.function.name === 'google_search') {
          try {
            const args = JSON.parse(call.function.arguments || '{}') as {
              query?: string;
              maxResults?: number;
            };

            const query = args.query || originalText;
            const maxResults = args.maxResults && args.maxResults > 0 ? args.maxResults : 3;

            // Выполняем реальный поиск через Google Search API
            const searchResults = await searchSources([query]);
            const limitedResults = searchResults.slice(0, maxResults);

            toolMessages.push({
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({
                query,
                results: limitedResults,
              }),
            });
          } catch (toolError) {
            logger.error('Error executing google_search tool', toolError);
          }
        }
      }

      const secondResponse = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://findorigin.vercel.app',
          'X-Title': 'FindOrigin Bot',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [systemMessage, userMessage, firstMessage, ...toolMessages],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!secondResponse.ok) {
        const errorText = await secondResponse.text();
        logger.error('OpenRouter API error (second call)', {
          status: secondResponse.status,
          error: errorText,
        });
        return createEmptyAnalysis();
      }

      const secondData: any = await secondResponse.json();
      const aiResponse = secondData.choices?.[0]?.message?.content;

      if (!aiResponse) {
        logger.error('Пустой ответ от AI (после Tool Calling)');
        return createEmptyAnalysis();
      }

      const analysis = parseAIResponse(aiResponse);
      cache.set(cacheKey, analysis, 30 * 60 * 1000);
      logger.info('AI analysis completed (with tools)', {
        sourcesAnalyzed: analysis.sources.length,
      });
      return analysis;
    }

    // Если инструменты не вызывались — работаем как раньше
    const aiResponse = firstData.choices?.[0]?.message?.content;

    if (!aiResponse) {
      logger.error('Пустой ответ от AI (без Tool Calling)');
      return createEmptyAnalysis();
    }

    const analysis = parseAIResponse(aiResponse);
    cache.set(cacheKey, analysis, 30 * 60 * 1000);
    logger.info('AI analysis completed (no tools)', {
      sourcesAnalyzed: analysis.sources.length,
    });
    return analysis;
  } catch (error) {
    logger.error('Error analyzing sources with AI', error);
    // Любая ошибка на стороне AI = отсутствие AI-анализа
    return createEmptyAnalysis();
  }
}

/**
 * Создает промпт для анализа источников.
 * Источники модель находит сама с помощью инструмента google_search.
 */
function createAnalysisPrompt(
  originalText: string,
): string {
  return `Проанализируй, какие источники подтверждают или опровергают следующий текст.

Исходный текст:
"${originalText}"

Верни ответ в формате JSON:
{
  "sources": [
    {
      "title": "Заголовок источника",
      "url": "https://example.com/article",
      "snippet": "Краткое описание содержания источника.",
      "relevanceScore": 85,
      "confidence": 80,
      "matchDescription": "Краткое описание соответствия (2-3 предложения)",
      "sourceType": "news"
    }
  ],
  "summary": "Общее резюме анализа (1-2 предложения)"
}

Где:
– сначала при необходимости используй инструмент google_search, чтобы найти кандидатов-источников;
- relevanceScore: оценка релевантности от 0 до 100 (0 - не релевантно, 100 - полностью релевантно)
- confidence: уверенность в оценке от 0 до 100
- matchDescription: краткое описание того, как источник соответствует исходному тексту

Важно: в массиве "sources" верни только те источники, которые ты считаешь действительно релевантными исходному тексту,
и верни только валидный JSON, без markdown форматирования и дополнительных комментариев.`;
}

/**
 * Парсит ответ от AI и создает структурированный результат.
 * Ожидаем, что AI уже вернул полный список источников в JSON.
 */
function parseAIResponse(
  aiResponse: string,
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

    const analyzedSources: SourceAnalysis[] = (parsed.sources || []).map((s: any) => ({
      url: s.url || '',
      title: s.title || 'Без заголовка',
      snippet: s.snippet || '',
      relevanceScore: typeof s.relevanceScore === 'number' ? s.relevanceScore : 50,
      confidence: typeof s.confidence === 'number' ? s.confidence : 50,
      matchDescription: s.matchDescription || 'Анализ недоступен',
      sourceType: s.sourceType,
    }));

    // Сортируем по релевантности
    analyzedSources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      sources: analyzedSources,
      summary: parsed.summary || 'Анализ завершен.',
    };
  } catch (error) {
    logger.error('Error parsing AI response', { error, aiResponse });
    // Если не смогли распарсить ответ, считаем, что AI-анализа нет
    return createEmptyAnalysis();
  }
}

/**
 * Создает «пустой» анализ, сигнализирующий, что AI не сработал.
 * Источники при этом остаются только в разделе results, а не в analysis.
 */
function createEmptyAnalysis(): AnalysisResult {
  return {
    sources: [],
    summary: 'AI-анализ недоступен (ошибка или отсутствует ключ).',
  };
}
