import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Валидация запроса от Telegram
    if (!body.message) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { chat, text } = body.message;
    
    if (!chat || !text) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const chatId = chat.id;
    const messageText = text;

    // Быстрый возврат 200 OK, обработка асинхронно
    processMessage(chatId, messageText).catch(console.error);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

// Обработка GET для верификации webhook
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
