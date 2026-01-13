import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Telegram присылает не только message (edited_message, callback_query и т.д.)
    const msg = body.message ?? body.edited_message;
    if (!msg) return NextResponse.json({ ok: true });

    const chatId = msg?.chat?.id;
    const text = msg?.text;

    if (!chatId || !text) return NextResponse.json({ ok: true });

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

