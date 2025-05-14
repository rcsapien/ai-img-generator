import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Streams NDJSON placeholder cards.
export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const { prompt = '', n = 1 } = await req.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < n; i++) {
          const id = uuidv4();
          const card = { id, prompt, status: 'queued' };
          controller.enqueue(encoder.encode(JSON.stringify(card) + '\n'));
        }
        controller.close();
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  } catch (err) {
    return NextResponse.json({ error: 'Error creating cards', details: String(err) }, { status: 500 });
  }
}
