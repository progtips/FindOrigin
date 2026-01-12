// Простое in-memory кэширование для результатов поиска
// В продакшене рекомендуется использовать Redis или другой кэш

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live в миллисекундах
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 минут по умолчанию

  /**
   * Получить значение из кэша
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Проверяем, не истек ли срок действия
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Сохранить значение в кэш
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Удалить значение из кэша
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Очистить устаревшие записи
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Создаем глобальный экземпляр кэша
export const cache = new SimpleCache();

// Периодическая очистка устаревших записей (каждые 10 минут)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * Создает ключ кэша для поискового запроса
 */
export function createSearchCacheKey(query: string): string {
  return `search:${query.toLowerCase().trim()}`;
}

/**
 * Создает ключ кэша для AI-анализа
 */
export function createAnalysisCacheKey(text: string, sources: string[]): string {
  const sourcesHash = sources.sort().join('|');
  const textHash = text.toLowerCase().trim().substring(0, 100);
  return `analysis:${textHash}:${sourcesHash}`;
}
