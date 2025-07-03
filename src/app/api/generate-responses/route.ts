import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  console.log('==== /api/generate-responses HIT ====');
  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const {
      prompt = '',
      n = 1,
      size = '1024x1024',
      quality = 'medium',
      response_format = 'b64_json'
    } = await req.json();

    console.log('[generate-responses API] Received prompt:', prompt);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 401 });
    }

    // Responses API allowed sizes
    const allowedSizes = ['1024x1024', '1536x1024', '1024x1536'];
    const finalSize = allowedSizes.includes(String(size)) ? size : '1024x1024';

    try {
      const response = await openai.responses.create({
        model: 'gpt-4o',
        input: prompt,
        tools: [{
          type: 'image_generation'
        }]
      });

      // Parse the response to match old API format
      const imageCall = response.output.find(o => o.type === 'image_generation_call');
      if (!imageCall || !imageCall.result) {
        throw new Error('No image generated');
      }

      // Return in old API format for compatibility
      return NextResponse.json({
        data: [{
          b64_json: imageCall.result,
          url: response_format === 'url' ? imageCall.result : undefined
        }]
      }, { status: 200 });

    } catch (error: Error | unknown) {
      console.error('OpenAI Responses API error', error);
      const errorObj = error as { status?: number };
      return NextResponse.json({ 
        error: 'OpenAI Responses API request failed', 
        details: String(error) 
      }, { status: errorObj?.status || 500 });
    }
  } catch (err) {
    return NextResponse.json({ 
      error: 'Error generating image via Responses API', 
      details: String(err) 
    }, { status: 500 });
  }
}