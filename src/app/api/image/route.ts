import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Reuse client per module
const openai = new OpenAI();

// Handles actual OpenAI image generation for a single card
export async function POST(req: NextRequest) {
  console.log('==== /api/image HIT ====');
  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const {
      prompt = '',
      n,
      size,
      background,
      quality,
      moderation
    } = await req.json();

    console.log('[image API] Received prompt:', prompt);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 401 });
    }

    const allowedSizes = ['1024x1024', '1536x1024', '1024x1536', 'auto'];
    const finalSize = allowedSizes.includes(String(size)) ? size : '1024x1024';

    try {
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: n ?? 1,
        size: finalSize,
        output_format: 'png',
        quality: quality ?? 'high',
        ...(background && { background }),
        ...(moderation && { moderation })
      });
      return NextResponse.json(response, { status: 200 });
    } catch (error: any) {
      console.error('OpenAI image error', error);
      return NextResponse.json({ error: 'OpenAI request failed', details: String(error) }, { status: error?.status || 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Error generating image', details: String(err) }, { status: 500 });
  }
}
