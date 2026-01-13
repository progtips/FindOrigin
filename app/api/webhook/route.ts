import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/telegram';
import { sendMessage } from '@/lib/telegramApi';

export const dynamic = 'force-dynamic';

/**
 * Обрабатывает команды Telegram-бота
 */
async function handleCommand(chatId: number, command: string): Promise<boolean> {
  const normalizedCommand = command.toLowerCase().trim();

  if (normalizedCommand === '/start') {
    await sendMessage(
      chatId,
      '👋 *Добро пожаловать в FindOrigin Bot!*\n\n' +
      'Я помогаю найти источники информации для проверки фактов.\n\n' +
      '📝 *Как использовать:*\n' +
      '• Отправьте мне текст факта или утверждения\n' +
      '• Или отправьте ссылку на Telegram-пост\n\n' +
      'Я найду и проанализирую релевантные источники информации.'
    );
    return true; // Команда обработана
  }

  // Любая другая команда (начинается с /)
  if (normalizedCommand.startsWith('/')) {
    await sendMessage(
      chatId,
      '❓ Неизвестная команда.\n\n' +
      'Отправьте мне текст факта или ссылку на Telegram-пост для анализа.'
    );
    return true; // Команда обработана
  }

  return false; // Это не команда
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Telegram присылает не только message (edited_message, callback_query и т.д.)
    const msg = body.message ?? body.edited_message;
    if (!msg) return NextResponse.json({ ok: true });

    const chatId = msg?.chat?.id;
    const text = msg?.text;

    if (!chatId || !text) return NextResponse.json({ ok: true });

    // Проверяем, является ли сообщение командой
    const isCommand = await handleCommand(chatId, text);
    if (isCommand) {
      // Команда обработана, не передаём в processMessage
      return NextResponse.json({ ok: true });
    }

    // ВАЖНО: дождаться обработки, иначе Vercel может оборвать выполнение
    await processMessage(chatId, text);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

