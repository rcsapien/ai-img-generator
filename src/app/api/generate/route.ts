import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize once per module so the client can be reused across requests
const openai = new OpenAI();

export async function POST(req: NextRequest) {
  console.log('==== /api/generate HIT ====');
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
      style,
      output_format,
      output_compression,
      moderation
    } = await req.json();

    console.log('[generate API] Received prompt:', prompt);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 401 });
    }

    // GPT-IMAGE-1 allowed sizes
    const allowedSizes = ['1024x1024', '1536x1024', '1024x1536', 'auto'];
    const finalSize = allowedSizes.includes(String(size)) ? size : '1024x1024';

    try {
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: n ?? 1,
        size: finalSize,
        quality: quality ?? 'high',
        // Optional parameters
        ...(style && { style }),
        ...(background && { background }),
        ...(output_format && { output_format }),
        ...(typeof output_compression === 'number' && { output_compression }),
        ...(moderation && { moderation }),
      });

      return NextResponse.json(response, { status: 200 });
    } catch (error: any) {
      // Automatically retry once if moderation blocked
      const code = error?.error?.code || error?.error?.type;
      if (code === 'content_policy_violation') {
        console.warn('Moderation blocked request, retrying once...');
        try {
          const retryRes = await openai.images.generate({
            model: 'gpt-image-1',
            prompt,
            n: n ?? 1,
            size: finalSize,
            quality: quality ?? 'high',
            ...(style && { style }),
            ...(background && { background }),
            ...(output_format && { output_format }),
            ...(typeof output_compression === 'number' && { output_compression }),
            ...(moderation && { moderation }),
          });
          return NextResponse.json(retryRes, { status: 200 });
        } catch (err: any) {
          console.error('OpenAI retry failed', err);
          return NextResponse.json({ error: 'OpenAI request failed', details: String(err) }, { status: err?.status || 500 });
        }
      }

      console.error('OpenAI image error', error);
      return NextResponse.json({ error: 'OpenAI request failed', details: String(error) }, { status: error?.status || 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Error generating image', details: String(err) }, { status: 500 });
  }
}
