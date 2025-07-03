import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  console.log('==== /api/generate-stream HIT ====');
  
  try {
    const {
      prompt = '',
      n = 1,
      size = '1024x1024',
      quality = 'medium',
      partial_images = 2
    } = await req.json();

    console.log('[generate-stream API] Received prompt:', prompt);
    console.log('[generate-stream API] Partial images:', partial_images);

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OpenAI API key' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Responses API allowed sizes
    const allowedSizes = ['1024x1024', '1536x1024', '1024x1536'];
    const finalSize = allowedSizes.includes(String(size)) ? size : '1024x1024';

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const responseStream = await openai.responses.create({
            model: 'gpt-4o',
            input: prompt,
            stream: true,
            tools: [{
              type: 'image_generation',
              partial_images: Math.min(Math.max(partial_images, 1), 3) // Clamp between 1-3
            }]
          });

          for await (const event of responseStream) {
            console.log('[generate-stream] Event type:', event.type);
            
            if (event.type === 'response.image_generation_call.partial_image') {
              const data = {
                type: 'partial_image',
                data: event.partial_image_b64,
                index: event.partial_image_index || 0
              };
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
              );
            } else if (event.type === 'response.image_generation_call.completed') {
              // For completed images, we need to get the final result from the response
              const data = {
                type: 'image_completed',
                index: 0 // Will be updated when we get the final response
              };
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
              );
            } else if (event.type === 'response.completed') {
              // Get the final image from the completed response
              const response = event.response;
              const imageCall = response.output?.find((o: any) => o.type === 'image_generation_call');
              if (imageCall && imageCall.result) {
                const data = {
                  type: 'final_image',
                  data: imageCall.result,
                  index: 0
                };
                
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                );
              }
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              );
              break;
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: String(error) 
            })}\n\n`)
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
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