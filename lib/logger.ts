/**
 * Простое логирование для мониторинга работы бота
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000; // Максимальное количество логов в памяти

  log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // Ограничиваем размер массива логов
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Выводим в консоль
    const consoleMethod = level === 'error' ? console.error : 
                         level === 'warn' ? console.warn : 
                         level === 'debug' ? console.debug : 
                         console.log;
    
    consoleMethod(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, data || '');
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Получить последние N логов
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Получить логи по уровню
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Очистить логи
   */
  clear(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
