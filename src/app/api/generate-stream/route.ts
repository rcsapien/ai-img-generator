import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = 'edge'; // Use edge runtime for faster response times

export async function POST(req: Request) {
  console.log('==== /api/generate-stream HIT ====');
  
  try {
    const {
      prompt = '',
      n = 1,
      size = '1024x1024',
      quality = 'standard',
      style
    } = await req.json();

    console.log('[generate-stream API] Received prompt:', prompt);

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OpenAI API key' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // GPT-IMAGE-1 allowed sizes
    const allowedSizes = ['1024x1024', '1536x1024', '1024x1536'];
    const finalSize = allowedSizes.includes(String(size)) ? size : '1024x1024';

    // Start streaming generation using official OpenAI approach
    const stream = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n,
      size: finalSize as any,
      quality: quality as any,
      ...(style && { style: style as any }),
      response_format: 'b64_json',
      stream: true,
      stream_options: { include_usage: true }
    });

    // Create a readable stream to pipe the OpenAI stream to client
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Forward the exact OpenAI chunk format to client
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
          
          // Send done signal
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = `data: ${JSON.stringify({ error: 'Stream failed', details: String(error) })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Stream setup error:', err);
    return new Response(JSON.stringify({ 
      error: 'Error setting up stream', 
      details: String(err) 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}