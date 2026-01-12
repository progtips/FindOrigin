const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Отправляет сообщение в Telegram
 * Автоматически разбивает длинные сообщения на части
 */
export async function sendMessage(chatId: number, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return;
  }

  // Разбиваем сообщение если оно слишком длинное (Telegram лимит 4096 символов)
  const maxLength = 4000; // Оставляем запас
  const messages = splitMessage(text, maxLength);

  for (let i = 0; i < messages.length; i++) {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: messages[i],
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Telegram API error:', error);
        
        // Если ошибка из-за форматирования, пробуем без Markdown
        if (error.description?.includes('parse')) {
          await sendMessagePlain(chatId, messages[i]);
        } else {
          throw new Error(`Telegram API error: ${error.description || 'Unknown error'}`);
        }
      }

      // Небольшая задержка между сообщениями
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Error sending message to Telegram:', error);
      // Пробуем отправить как plain text
      try {
        await sendMessagePlain(chatId, messages[i]);
      } catch (plainError) {
        throw error; // Бросаем оригинальную ошибку
      }
    }
  }
}

/**
 * Отправляет сообщение без Markdown форматирования
 */
async function sendMessagePlain(chatId: number, text: string): Promise<void> {
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${error.description || 'Unknown error'}`);
  }
}

/**
 * Разбивает сообщение на части
 */
function splitMessage(message: string, maxLength: number): string[] {
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
